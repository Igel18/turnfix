import { EventEmitter } from 'events';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { restoreBackup, validateRestoreFiles } from '../../src/utils/backupRestore';
import { parseRestoreArguments } from '../../src/scripts/restoreBackup';
import { postgresEnvironment } from '../../src/utils/backup';

const query = jest.fn();
const disconnect = jest.fn();
const prismaConstructor = jest.fn();
let useRealPrisma = false;

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation((options: unknown) => {
    prismaConstructor(options);
    if (useRealPrisma) return new (jest.requireActual('@prisma/client').PrismaClient)(options);
    return { $queryRaw: query, $disconnect: disconnect };
  })
}));
jest.mock('child_process', () => ({ spawn: jest.fn() }));

describe('offline backup restore', () => {
  let root: string;
  let backupPath: string;
  let stagingPath: string;
  let targetConfigPath: string;
  const databaseUrl = 'postgresql://restore_user:secret%40password@localhost:5432/empty_restore';

  const options = () => ({ backupPath, stagingPath, targetConfigPath, confirmEmptyDatabase: 'empty_restore' });
  const restoreProcess = (exitCode: number) => {
    const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
    child.stderr = new EventEmitter();
    process.nextTick(() => child.emit('close', exitCode));
    return child;
  };

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-restore-test-'));
    backupPath = path.join(root, 'backup');
    stagingPath = path.join(root, 'staging');
    targetConfigPath = path.join(root, 'target.json');
    await fs.mkdir(backupPath);
    await fs.mkdir(stagingPath);
    await fs.mkdir(path.join(backupPath, 'uploads'));
    await fs.writeFile(path.join(backupPath, 'uploads', 'image.txt'), 'image');
    await fs.writeFile(path.join(backupPath, 'server-env'), 'private');
    await fs.writeFile(path.join(backupPath, 'database.dump'), 'dump');
    await fs.writeFile(path.join(backupPath, 'manifest.json'), JSON.stringify({ createdAt: '2026-01-01', database: 'original', sources: ['uploads', 'server-env', 'exports'] }));
    await fs.writeFile(targetConfigPath, JSON.stringify({ databaseUrl }));
    query.mockResolvedValue([{ occupied: false, otherConnections: BigInt(0) }]);
    disconnect.mockResolvedValue(undefined);
    (spawn as jest.Mock).mockImplementation(() => restoreProcess(0));
  });

  afterEach(async () => {
    useRealPrisma = false;
    await fs.rm(root, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('restores into the explicit database and stages named sources only after success', async () => {
    await restoreBackup(options());
    expect(prismaConstructor).toHaveBeenCalledWith(expect.objectContaining({ datasources: { db: { url: databaseUrl } } }));
    expect(spawn).toHaveBeenCalledTimes(1);
    const [command, args, spawnOptions] = (spawn as jest.Mock).mock.calls[0];
    expect(command).toMatch(/pg_restore/);
    expect(args).toContain('--exit-on-error');
    expect(args).toContain('--single-transaction');
    expect(args.join(' ')).not.toContain('secret');
    expect(spawnOptions.shell).not.toBe(true);
    expect(spawnOptions.env.PGPASSWORD).toBe('secret@password');
    expect(spawnOptions.env.PGDATABASE).toBe('empty_restore');
    expect(await fs.readFile(path.join(stagingPath, 'uploads', 'image.txt'), 'utf8')).toBe('image');
    expect(await fs.readFile(path.join(stagingPath, 'server-env'), 'utf8')).toBe('private');
    expect(await fs.readdir(stagingPath)).toEqual(expect.arrayContaining(['uploads', 'server-env']));
    expect(disconnect).toHaveBeenCalled();
  });

  it('requires explicit confirmation and absolute paths', async () => {
    await expect(restoreBackup({ ...options(), confirmEmptyDatabase: '' })).rejects.toThrow();
    await expect(restoreBackup({ ...options(), confirmEmptyDatabase: 'wrong_database' })).rejects.toThrow();
    await expect(restoreBackup({ ...options(), backupPath: 'relative' })).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects a nonempty target database and other connections before restoring', async () => {
    query.mockResolvedValueOnce([{ occupied: true, otherConnections: BigInt(0) }]);
    await expect(restoreBackup(options())).rejects.toThrow();
    query.mockResolvedValueOnce([{ occupied: false, otherConnections: BigInt(1) }]);
    await expect(restoreBackup(options())).rejects.toThrow();
    expect(spawn).not.toHaveBeenCalled();
    expect(await fs.readdir(stagingPath)).toEqual([]);
  });

  it('does not alter staging when the database restore fails', async () => {
    (spawn as jest.Mock).mockImplementation(() => restoreProcess(1));
    await expect(restoreBackup(options())).rejects.toThrow();
    expect(await fs.readdir(stagingPath)).toEqual([]);
  });

  it('rejects a nonempty or overlapping staging directory', async () => {
    await fs.writeFile(path.join(stagingPath, 'existing'), 'keep');
    await expect(restoreBackup(options())).rejects.toThrow();
    await expect(restoreBackup({ ...options(), stagingPath: backupPath })).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('validates the custom dump signature during wizard preflight', async () => {
    await expect(validateRestoreFiles({ backupPath, stagingPath }, true)).rejects.toThrow('Invalid PostgreSQL custom dump');
    await fs.writeFile(path.join(backupPath, 'database.dump'), 'PGDMPdata');
    await expect(validateRestoreFiles({ backupPath, stagingPath }, true)).resolves.toMatchObject({ backupPath, stagingPath });
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['../escape', 'database.dump', 'nested/name', 'uploads/../../escape'])('rejects unsafe manifest source %s', async source => {
    await fs.writeFile(path.join(backupPath, 'manifest.json'), JSON.stringify({ sources: [source] }));
    await expect(restoreBackup(options())).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects symbolic links inside backup sources', async () => {
    try {
      await fs.symlink(path.join(root, 'target.json'), path.join(backupPath, 'uploads', 'link'), 'file');
    } catch (error: any) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) return;
      throw error;
    }
    await expect(restoreBackup(options())).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('executes the catalog check against the populated dedicated Jest database', async () => {
    useRealPrisma = true;
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.search = '';
    await fs.writeFile(targetConfigPath, JSON.stringify({ databaseUrl: url.toString() }));
    await expect(restoreBackup({ ...options(), confirmEmptyDatabase: decodeURIComponent(url.pathname.slice(1)) })).rejects.toThrow('Target database is not empty or has other connections');
    expect(spawn).not.toHaveBeenCalled();
    expect(await fs.readdir(stagingPath)).toEqual([]);
  });

  it('accepts a separately prepared empty database using the real catalog check', async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.search = '';
    const databaseName = `turnfix_restore_test_${process.pid}`;
    const ActualPrisma = jest.requireActual('@prisma/client').PrismaClient;
    const admin = new ActualPrisma({ datasources: { db: { url: url.toString() } } });
    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
      url.pathname = `/${databaseName}`;
      await fs.writeFile(targetConfigPath, JSON.stringify({ databaseUrl: url.toString() }));
      useRealPrisma = true;
      await restoreBackup({ ...options(), confirmEmptyDatabase: databaseName });
      expect(spawn).toHaveBeenCalledTimes(1);
      expect(await fs.readFile(path.join(stagingPath, 'server-env'), 'utf8')).toBe('private');
    } finally {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.$disconnect();
    }
  });

  it('restores a real custom-format PostgreSQL dump into a fresh database', async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.search = '';
    const databaseName = `turnfix_restore_e2e_${process.pid}`;
    const ActualPrisma = jest.requireActual('@prisma/client').PrismaClient;
    const childProcess = jest.requireActual('child_process') as typeof import('child_process');
    const admin = new ActualPrisma({ datasources: { db: { url: url.toString() } } });
    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
      const dumpCommands = ['pg_dump'];
      if (process.platform === 'win32') {
        const postgresRoot = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
        const versions = await fs.readdir(postgresRoot).catch(() => [] as string[]);
        versions.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
        dumpCommands.push(...versions.map(version => path.join(postgresRoot, version, 'bin', 'pg_dump.exe')));
      }
      let dump = childProcess.spawnSync(dumpCommands[0], ['--format=custom', '--no-owner', '--no-privileges', '--file', path.join(backupPath, 'database.dump')], { env: postgresEnvironment(url.toString()), encoding: 'utf8' });
      for (const command of dumpCommands.slice(1)) {
        if ((dump.error as NodeJS.ErrnoException | undefined)?.code !== 'ENOENT') break;
        dump = childProcess.spawnSync(command, ['--format=custom', '--no-owner', '--no-privileges', '--file', path.join(backupPath, 'database.dump')], { env: postgresEnvironment(url.toString()), encoding: 'utf8' });
      }
      if (dump.error) throw dump.error;
      expect(dump.status).toBe(0);
      url.pathname = `/${databaseName}`;
      await fs.writeFile(targetConfigPath, JSON.stringify({ databaseUrl: url.toString() }));
      useRealPrisma = true;
      (spawn as jest.Mock).mockImplementation(childProcess.spawn);
      await restoreBackup({ ...options(), confirmEmptyDatabase: databaseName });
      const restored = new ActualPrisma({ datasources: { db: { url: url.toString() } } });
      try {
        const tables = await restored.$queryRaw`SELECT count(*) AS count FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'`;
        expect(BigInt(tables[0].count)).toBeGreaterThan(BigInt(0));
      } finally {
        await restored.$disconnect();
      }
      expect(await fs.readFile(path.join(stagingPath, 'server-env'), 'utf8')).toBe('private');
    } finally {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.$disconnect();
    }
  }, 60000);

  it('requires exactly the four named CLI options', () => {
    expect(parseRestoreArguments(['--backup', backupPath, '--target-config', targetConfigPath, '--staging', stagingPath, '--confirm-empty-database', 'empty_restore'])).toEqual(options());
    expect(() => parseRestoreArguments(['--backup', backupPath])).toThrow();
    expect(() => parseRestoreArguments(['--backup', backupPath, '--backup', backupPath])).toThrow();
  });
});