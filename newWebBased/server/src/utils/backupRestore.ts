import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { postgresEnvironment } from './backup';

export interface RestoreOptions {
  backupPath: string;
  stagingPath: string;
  targetConfigPath: string;
  confirmEmptyDatabase: string;
}

async function assertNoLinks(absolutePath: string): Promise<void> {
  const parsed = path.parse(absolutePath);
  let current = parsed.root;
  for (const part of absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symbolic links and junctions are not allowed');
  }
}

async function validateTree(entry: string): Promise<void> {
  const stat = await fs.lstat(entry);
  if (stat.isSymbolicLink()) throw new Error('Symbolic links and junctions are not allowed');
  if (stat.isDirectory()) {
    for (const name of await fs.readdir(entry)) await validateTree(path.join(entry, name));
  } else if (!stat.isFile()) {
    throw new Error('Only regular files and directories are allowed');
  }
}

function contains(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export async function readRestoreTarget(targetConfigPath: string): Promise<string> {
  if (!path.isAbsolute(targetConfigPath)) throw new Error('Target configuration path must be absolute');
  await assertNoLinks(path.resolve(targetConfigPath));
  const stat = await fs.lstat(targetConfigPath);
  if (!stat.isFile()) throw new Error('Target configuration must be a regular file');
  let config: unknown;
  try { config = JSON.parse(await fs.readFile(targetConfigPath, 'utf8')); } catch { throw new Error('Could not read valid target configuration'); }
  if (!config || typeof config !== 'object' || !('databaseUrl' in config) || typeof config.databaseUrl !== 'string') {
    throw new Error('Target configuration must contain databaseUrl');
  }
  let url: URL;
  try { url = new URL(config.databaseUrl); } catch { throw new Error('Invalid target database URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !/^[a-z0-9_][a-z0-9_$-]{0,62}$/i.test(decodeURIComponent(url.pathname.slice(1))) || url.hash || [...url.searchParams.keys()].some(key => key !== 'sslmode')) {
    throw new Error('Target must be an explicit PostgreSQL URL with only an optional sslmode');
  }
  postgresEnvironment(config.databaseUrl);
  return config.databaseUrl;
}

async function assertEmptyDatabase(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const result = await prisma.$queryRaw<{ occupied: boolean; otherConnections: bigint }[]>`
      SELECT (
        EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE left(n.nspname, 3) <> 'pg_' AND n.nspname NOT IN ('information_schema', 'public')) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_operator o JOIN pg_catalog.pg_namespace n ON n.oid = o.oprnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_collation c JOIN pg_catalog.pg_namespace n ON n.oid = c.collnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_conversion c JOIN pg_catalog.pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_opclass c JOIN pg_catalog.pg_namespace n ON n.oid = c.opcnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_opfamily f JOIN pg_catalog.pg_namespace n ON n.oid = f.opfnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_ts_config c JOIN pg_catalog.pg_namespace n ON n.oid = c.cfgnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_ts_dict d JOIN pg_catalog.pg_namespace n ON n.oid = d.dictnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_ts_parser p JOIN pg_catalog.pg_namespace n ON n.oid = p.prsnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_ts_template t JOIN pg_catalog.pg_namespace n ON n.oid = t.tmplnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_extension e WHERE e.extname <> 'plpgsql') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_event_trigger) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_publication) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_subscription) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_data_wrapper) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_server) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_cast c JOIN pg_catalog.pg_type t ON t.oid = c.castsource JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_language WHERE lanname NOT IN ('internal', 'c', 'sql', 'plpgsql')) OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_largeobject_metadata)
      ) AS occupied,
      (SELECT count(*) FROM pg_catalog.pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()) AS "otherConnections"`;
    if (result.length !== 1 || result[0].occupied !== false || BigInt(result[0].otherConnections) !== BigInt(0)) {
      throw new Error('Target database is not empty or has other connections');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Target database is not empty or has other connections') throw error;
    throw new Error('Could not verify that the target database is empty and offline');
  } finally {
    await prisma.$disconnect();
  }
}

async function restoreDatabase(dumpPath: string, databaseUrl: string): Promise<void> {
  const environment = postgresEnvironment(databaseUrl);
  const explicit = new URL(databaseUrl);
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase().startsWith('PG') && !['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'].includes(key)) delete environment[key];
  }
  if (explicit.searchParams.has('sslmode')) environment.PGSSLMODE = explicit.searchParams.get('sslmode')!;
  delete environment.DATABASE_URL;
  const commands = ['pg_restore'];
  if (process.platform === 'win32') {
    const root = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
    const versions = await fs.readdir(root).catch(() => [] as string[]);
    versions.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    commands.push(...versions.map(version => path.join(root, version, 'bin', 'pg_restore.exe')));
  }
  for (const command of commands) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(command, ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--dbname', environment.PGDATABASE!, dumpPath], { env: environment, shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        child.stderr.on('data', () => undefined);
        child.on('error', reject);
        child.on('close', code => code === 0 ? resolve() : reject(new Error('pg_restore failed; target transaction was not committed')));
      });
      return;
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw new Error('pg_restore failed; staging was not changed');
    }
  }
  throw new Error('pg_restore not found');
}

export async function restoreBackup(options: RestoreOptions): Promise<void> {
  if (!options.confirmEmptyDatabase) throw new Error('Explicit confirmation of an empty target database is required');
  for (const value of [options.backupPath, options.stagingPath, options.targetConfigPath]) {
    if (!path.isAbsolute(value)) throw new Error('All paths must be absolute');
  }
  const backupPath = path.resolve(options.backupPath);
  const stagingPath = path.resolve(options.stagingPath);
  const targetConfigPath = path.resolve(options.targetConfigPath);
  if (contains(backupPath, stagingPath) || contains(stagingPath, backupPath) || contains(stagingPath, targetConfigPath)) {
    throw new Error('Backup, staging and target configuration must not overlap');
  }
  await assertNoLinks(backupPath);
  await assertNoLinks(stagingPath);
  if (!(await fs.lstat(backupPath)).isDirectory() || !(await fs.lstat(stagingPath)).isDirectory() || (await fs.readdir(stagingPath)).length !== 0) {
    throw new Error('Backup and empty staging directories must already exist');
  }
  const manifestPath = path.join(backupPath, 'manifest.json');
  const dumpPath = path.join(backupPath, 'database.dump');
  await validateTree(manifestPath);
  await validateTree(dumpPath);
  if (!(await fs.lstat(manifestPath)).isFile() || !(await fs.lstat(dumpPath)).isFile()) throw new Error('Backup manifest and dump must be files');
  const manifest: unknown = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || !('sources' in manifest) || !Array.isArray(manifest.sources)) throw new Error('Invalid backup manifest');
  const names = new Set<string>();
  const sources: string[] = [];
  for (const name of manifest.sources) {
    if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name) || ['database', 'manifest'].includes(name.toLowerCase()) || names.has(name.toLowerCase())) {
      throw new Error('Invalid backup source name');
    }
    names.add(name.toLowerCase());
    const sourcePath = path.join(backupPath, name);
    try {
      await validateTree(sourcePath);
      sources.push(name);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const databaseUrl = await readRestoreTarget(targetConfigPath);
  if (options.confirmEmptyDatabase !== decodeURIComponent(new URL(databaseUrl).pathname.slice(1))) {
    throw new Error('Confirmation must match the target database name');
  }
  await assertEmptyDatabase(databaseUrl);
  await restoreDatabase(dumpPath, databaseUrl);
  for (const name of sources) {
    await fs.cp(path.join(backupPath, name), path.join(stagingPath, name), { recursive: true, errorOnExist: true, force: false, dereference: false });
  }
}