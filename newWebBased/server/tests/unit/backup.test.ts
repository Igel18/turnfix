import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { createBackup, defaultBackupSettings, postgresEnvironment, validateBackupSettings } from '../../src/utils/backup';

jest.mock('child_process', () => ({ spawn: jest.fn() }));

describe('backup settings', () => {
  it('keeps 20 backups by default', () => {
    expect(defaultBackupSettings.retention_count).toBe(20);
  });
  it('is disabled by default and requires an absolute destination when enabled', () => {
    expect(validateBackupSettings(defaultBackupSettings)).toBeNull();
    expect(validateBackupSettings({ ...defaultBackupSettings, enabled: true })).not.toBeNull();
    expect(validateBackupSettings({ ...defaultBackupSettings, enabled: true, destination: 'relative' })).not.toBeNull();
  });

  it('rejects invalid intervals and retention counts', () => {
    expect(validateBackupSettings({ ...defaultBackupSettings, interval_minutes: 0 })).not.toBeNull();
    expect(validateBackupSettings({ ...defaultBackupSettings, retention_count: 0 })).not.toBeNull();
    expect(validateBackupSettings({ ...defaultBackupSettings, interval_minutes: 1.5 })).not.toBeNull();
  });

  it('passes decoded credentials through the environment and preserves SSL', () => {
    const env = postgresEnvironment('postgresql://user:p%40ss@localhost:5433/turnfix?schema=public&sslmode=require');
    expect(env).toMatchObject({ PGHOST: 'localhost', PGPORT: '5433', PGUSER: 'user', PGPASSWORD: 'p@ss', PGDATABASE: 'turnfix', PGSSLMODE: 'require' });
  });

  it('does not inherit PostgreSQL connection overrides from the server environment', () => {
    const previousHostAddress = process.env.PGHOSTADDR;
    const previousOptions = process.env.PGOPTIONS;
    process.env.PGHOSTADDR = '192.0.2.1';
    process.env.PGOPTIONS = '--search_path=unexpected';
    try {
      const env = postgresEnvironment('postgresql://user:pass@localhost:5432/turnfix');
      expect(env.PGHOSTADDR).toBeUndefined();
      expect(env.PGOPTIONS).toBeUndefined();
    } finally {
      if (previousHostAddress === undefined) delete process.env.PGHOSTADDR;
      else process.env.PGHOSTADDR = previousHostAddress;
      if (previousOptions === undefined) delete process.env.PGOPTIONS;
      else process.env.PGOPTIONS = previousOptions;
    }
  });

  it('rejects a destination inside a source directory before creating files', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-backup-test-'));
    try {
      await expect(createBackup({ ...defaultBackupSettings, destination: path.join(root, 'backups') }, 'postgresql://user:pass@localhost/db', [{ name: 'uploads', path: root }])).rejects.toThrow('source directory');
      await expect(fs.access(path.join(root, 'backups'))).rejects.toThrow();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe('backup creation and retention', () => {
  const databaseUrl = 'postgresql://user:secret@localhost/db';
  const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;
  let root: string;

  const backupName = (day: number) => `turnfix-backup-2026-01-${String(day).padStart(2, '0')}T00-00-00-000Z-00000000-0000-4000-8000-00000000000${day}`;

  async function existingBackup(day: number) {
    const directory = path.join(root, backupName(day));
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, 'database.dump'), 'PGDMPdump');
    await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ createdAt: `2026-01-${String(day).padStart(2, '0')}T00:00:00.000Z`, database: 'db', sources: [] }));
    return directory;
  }

  function mockDump(outcomes: Array<{ stderr?: string; error?: NodeJS.ErrnoException }> = []) {
    let attempt = 0;
    mockedSpawn.mockImplementation(((_command: string, args: string[], options: any) => {
      expect(options.shell).not.toBe(true);
      expect(args.join(' ')).not.toContain('secret');
      expect(options.env.PGPASSWORD).toBe('secret');
      const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
      child.stderr = new EventEmitter();
      const outcome = outcomes[attempt++] || {};
      const output = args[args.indexOf('--file') + 1];
      void fs.writeFile(output, 'PGDMPpartial dump').then(() => {
        if (outcome.error) child.emit('error', outcome.error);
        else {
          if (outcome.stderr) child.stderr.emit('data', outcome.stderr);
          child.emit('close', outcome.stderr ? 1 : 0);
        }
      });
      return child as any;
    }) as typeof spawn);
  }

  async function names() {
    return (await fs.readdir(root)).sort();
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-backup-test-'));
    mockedSpawn.mockReset();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  it.each([
    'pg_dump: error: could not write to output file: No space left on device',
    'pg_dump: error: could not write to output file: There is not enough space on the disk.',
    'pg_dump: Fehler: konnte nicht in Ausgabedatei schreiben: Auf dem Datentr\u00e4ger ist nicht gen\u00fcgend Speicherplatz vorhanden.'
  ])('retries pg_dump after deleting only the oldest completed backup for stderr: %s', async stderr => {
    await existingBackup(1);
    await existingBackup(2);
    await existingBackup(3);
    const remove = jest.spyOn(fs, 'rm');
    mockDump([{ stderr }, { stderr }]);

    const result = await createBackup({ ...defaultBackupSettings, destination: root }, databaseUrl, []);

    expect(mockedSpawn).toHaveBeenCalledTimes(3);
    expect(await names()).toEqual([backupName(3), path.basename(result)].sort());
    expect(await fs.readFile(path.join(result, 'database.dump'), 'utf8')).toBe('PGDMPpartial dump');
    const removed = remove.mock.calls.map(call => path.basename(String(call[0])));
    expect(removed).toHaveLength(4);
    expect(removed[0]).toMatch(/^\.turnfix-backup-.*\.partial$/);
    expect(removed[1]).toBe(backupName(1));
    expect(removed[2]).toMatch(/^\.turnfix-backup-.*\.partial$/);
    expect(removed[3]).toBe(backupName(2));
  });

  it('cleans the partial directory and never deletes the last completed backup', async () => {
    await existingBackup(1);
    await existingBackup(2);
    mockDump([{ stderr: 'could not write to output file: No space left on device' }, { stderr: 'could not write to output file: No space left on device' }]);

    await expect(createBackup({ ...defaultBackupSettings, destination: root }, databaseUrl, [])).rejects.toThrow('No space left on device');
    expect(mockedSpawn).toHaveBeenCalledTimes(2);
    expect(await names()).toEqual([backupName(2)]);
  });

  it.each([0, 1])('does not delete any backup on ENOSPC when only %i complete backup exists', async count => {
    if (count) await existingBackup(1);
    mockDump([{ error: Object.assign(new Error('disk full'), { code: 'ENOSPC' }) }]);
    await expect(createBackup({ ...defaultBackupSettings, destination: root }, databaseUrl, [])).rejects.toMatchObject({ code: 'ENOSPC' });
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    expect(await names()).toEqual(count ? [backupName(1)] : []);
  });

  it('does not count or delete unverified directories during ENOSPC recovery', async () => {
    await existingBackup(1);
    const incomplete = path.join(root, backupName(2));
    await fs.mkdir(incomplete);
    await fs.writeFile(path.join(incomplete, 'important.txt'), 'keep');
    mockDump([{ stderr: 'could not write to output file: No space left on device' }]);
    await expect(createBackup({ ...defaultBackupSettings, destination: root }, databaseUrl, [])).rejects.toThrow('No space left on device');
    expect(await names()).toEqual([backupName(1), backupName(2)]);
    expect(await fs.readFile(path.join(incomplete, 'important.txt'), 'utf8')).toBe('keep');
  });

  it('does not delete completed backups when partial cleanup fails', async () => {
    await existingBackup(1);
    await existingBackup(2);
    mockDump([{ stderr: 'could not write to output file: No space left on device' }]);
    const originalRemove = fs.rm.bind(fs);
    jest.spyOn(fs, 'rm').mockImplementation(async (target, options) => {
      if (String(target).endsWith('.partial')) throw Object.assign(new Error('cleanup denied'), { code: 'EACCES' });
      return originalRemove(target, options);
    });
    await expect(createBackup({ ...defaultBackupSettings, destination: root }, databaseUrl, [])).rejects.toThrow('cleanup denied');
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    expect((await names()).filter(name => !name.endsWith('.partial'))).toEqual([backupName(1), backupName(2)]);
  });

  it('retries Node ENOSPC during source copying and removes the failed partial tree', async () => {
    await existingBackup(1);
    await existingBackup(2);
    const source = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-source-test-'));
    await fs.writeFile(path.join(source, 'data'), 'content');
    mockDump();
    const originalCopy = fs.cp.bind(fs);
    let attempts = 0;
    jest.spyOn(fs, 'cp').mockImplementation(async (...args) => {
      if (attempts++ === 0) {
        await fs.mkdir(args[1] as string);
        await fs.writeFile(path.join(args[1] as string, 'partial'), 'content');
        throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      }
      return originalCopy(...args);
    });
    try {
      const result = await createBackup({ ...defaultBackupSettings, destination: root }, databaseUrl, [{ name: 'uploads', path: source }]);
      expect(mockedSpawn).toHaveBeenCalledTimes(2);
      expect(await names()).toEqual([backupName(2), path.basename(result)].sort());
      expect(await fs.readFile(path.join(result, 'uploads', 'data'), 'utf8')).toBe('content');
      await expect(fs.access(path.join(result, 'uploads', 'partial'))).rejects.toThrow();
    } finally {
      await fs.rm(source, { recursive: true, force: true });
    }
  });

  it.each([
    { stderr: 'pg_dump: permission denied' },
    { stderr: 'pg_dump: server error: No space left on device' },
    { error: Object.assign(new Error('access denied'), { code: 'EACCES' }) }
  ])('does not delete completed backups for other failures: %o', async outcome => {
    await existingBackup(1);
    await existingBackup(2);
    mockDump([outcome]);
    await expect(createBackup({ ...defaultBackupSettings, destination: root }, databaseUrl, [])).rejects.toThrow();
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    expect(await names()).toEqual([backupName(1), backupName(2)]);
  });

  it('only removes valid completed own backups during retention', async () => {
    await existingBackup(1);
    await existingBackup(2);
    const incomplete = path.join(root, backupName(3));
    const badManifest = path.join(root, backupName(4));
    const similar = path.join(root, 'turnfix-backup-2026-01-01Tuser-files');
    const emptyDump = path.join(root, backupName(5));
    const nullManifest = path.join(root, backupName(6));
    const invalidDate = path.join(root, backupName(7).replace('2026-01-07', '2026-02-31'));
    const invalidDump = path.join(root, backupName(8));
    await fs.mkdir(incomplete);
    await fs.mkdir(badManifest);
    await fs.writeFile(path.join(badManifest, 'database.dump'), 'dump');
    await fs.writeFile(path.join(badManifest, 'manifest.json'), 'not json');
    await fs.mkdir(similar);
    await fs.writeFile(path.join(similar, 'important.txt'), 'keep');
    for (const directory of [emptyDump, nullManifest, invalidDate, invalidDump]) {
      await fs.mkdir(directory);
      await fs.writeFile(path.join(directory, 'database.dump'), directory === emptyDump ? '' : directory === invalidDump ? 'not a dump' : 'PGDMPdump');
      await fs.writeFile(path.join(directory, 'manifest.json'), directory === nullManifest ? 'null' : JSON.stringify({ createdAt: '2026-01-01T00:00:00.000Z', database: 'db', sources: [] }));
    }
    await fs.writeFile(path.join(root, 'user-file.txt'), 'keep');
    mockDump();

    const result = await createBackup({ ...defaultBackupSettings, destination: root, retention_count: 1 }, databaseUrl, []);

    expect(await names()).toEqual([path.basename(incomplete), path.basename(badManifest), path.basename(similar), path.basename(emptyDump), path.basename(nullManifest), path.basename(invalidDate), path.basename(invalidDump), 'user-file.txt', path.basename(result)].sort());
    expect(await fs.readFile(path.join(similar, 'important.txt'), 'utf8')).toBe('keep');
  });

  it('keeps the newly completed backup even when an existing backup is dated in the future', async () => {
    const future = await existingBackup(1);
    const futureName = backupName(1).replace('2026-01-01', '9999-01-01');
    await fs.rename(future, path.join(root, futureName));
    mockDump();
    const result = await createBackup({ ...defaultBackupSettings, destination: root, retention_count: 1 }, databaseUrl, []);
    expect(await names()).toEqual([path.basename(result)]);
  });

  it('serializes concurrent backups targeting the same destination', async () => {
    let active = 0;
    let maxActive = 0;
    mockedSpawn.mockImplementation(((_command: string, args: string[]) => {
      const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
      child.stderr = new EventEmitter();
      active++;
      maxActive = Math.max(maxActive, active);
      const output = args[args.indexOf('--file') + 1];
      void fs.writeFile(output, 'PGDMPdump').then(() => {
        active--;
        child.emit('close', 0);
      });
      return child as any;
    }) as typeof spawn);
    const settings = { ...defaultBackupSettings, destination: root };
    await Promise.all([createBackup(settings, databaseUrl, []), createBackup(settings, databaseUrl, [])]);
    expect(maxActive).toBe(1);
    expect(await names()).toHaveLength(2);
  });

  it('releases the destination lock when a backup fails', async () => {
    mockDump([{ stderr: 'pg_dump: permission denied' }, {}]);
    const settings = { ...defaultBackupSettings, destination: root };
    const results = await Promise.allSettled([createBackup(settings, databaseUrl, []), createBackup(settings, databaseUrl, [])]);
    expect(results.map(result => result.status)).toEqual(['rejected', 'fulfilled']);
    expect(mockedSpawn).toHaveBeenCalledTimes(2);
    expect(await names()).toHaveLength(1);
  });
});