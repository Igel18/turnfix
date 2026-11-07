import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface BackupSettings {
  enabled: boolean;
  interval_minutes: number;
  destination: string;
  retention_count: number;
}

export const defaultBackupSettings: BackupSettings = {
  enabled: false,
  interval_minutes: 30,
  destination: '',
  retention_count: 20
};

export function validateBackupSettings(settings: BackupSettings): string | null {
  if (typeof settings.enabled !== 'boolean') return 'Invalid enabled setting';
  if (!Number.isInteger(settings.interval_minutes) || settings.interval_minutes < 1 || settings.interval_minutes > 10080) return 'Interval must be between 1 and 10080 minutes';
  if (!Number.isInteger(settings.retention_count) || settings.retention_count < 1 || settings.retention_count > 1000) return 'Retention count must be between 1 and 1000';
  if (typeof settings.destination !== 'string' || (settings.enabled && (!settings.destination.trim() || !path.isAbsolute(settings.destination)))) return 'An absolute backup destination is required';
  return null;
}

export function postgresEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.pathname.slice(1)) throw new Error('Invalid PostgreSQL connection URL');
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase().startsWith('PG')) delete environment[key];
  }
  return {
    ...environment,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    ...(url.searchParams.get('sslmode') ? { PGSSLMODE: url.searchParams.get('sslmode')! } : {})
  };
}

async function findDumpCommands(): Promise<string[]> {
  const commands = ['pg_dump'];
  if (process.platform === 'win32') {
    const root = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
    const versions = await fs.readdir(root).catch(() => [] as string[]);
    versions.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    commands.push(...versions.map(version => path.join(root, version, 'bin', 'pg_dump.exe')));
  }
  return commands;
}

async function dumpDatabase(output: string, databaseUrl: string): Promise<void> {
  const environment = postgresEnvironment(databaseUrl);
  for (const command of await findDumpCommands()) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(command, ['--format=custom', '--no-owner', '--no-privileges', '--file', output], { env: environment, windowsHide: true });
        let errorOutput = '';
        child.stderr.on('data', data => { errorOutput += String(data); });
        child.on('error', reject);
        child.on('close', code => {
          if (code === 0) return resolve();
          const error: NodeJS.ErrnoException = new Error(`pg_dump failed (${code}): ${errorOutput.trim()}`);
          if (/(?:could not write|error writing|write failed|(?:konnte|fehler beim).{0,80}schreiben)/i.test(errorOutput) && /(?:no space left on device|not enough (?:free )?space on the disk|disk is full|kein speicherplatz|nicht gen\u00fcgend speicherplatz)/i.test(errorOutput)) error.code = 'ENOSPC';
          reject(error);
        });
      });
      return;
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw new Error('pg_dump not found. Install PostgreSQL client tools or add them to PATH.');
}

async function completedBackups(destination: string): Promise<string[]> {
  const entries = await fs.readdir(destination, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    const match = /^turnfix-backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(entry.name);
    if (!entry.isDirectory() || !match) continue;
    const timestamp = match[1].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
    const parsedDate = new Date(timestamp);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString() !== timestamp) continue;
    const directory = path.join(destination, entry.name);
    try {
      const [manifestStat, dumpStat, manifestText] = await Promise.all([
        fs.lstat(path.join(directory, 'manifest.json')),
        fs.lstat(path.join(directory, 'database.dump')),
        fs.readFile(path.join(directory, 'manifest.json'), 'utf8')
      ]);
      const manifest = JSON.parse(manifestText);
      if (!manifest || !manifestStat.isFile() || !dumpStat.isFile() || dumpStat.size < 5 || typeof manifest.createdAt !== 'string' || Number.isNaN(Date.parse(manifest.createdAt)) || typeof manifest.database !== 'string' || !manifest.database.length || !Array.isArray(manifest.sources) || !manifest.sources.every((source: unknown) => typeof source === 'string')) continue;
      const dump = await fs.open(path.join(directory, 'database.dump'), 'r');
      try {
        const header = Buffer.alloc(5);
        const { bytesRead } = await dump.read(header, 0, header.length, 0);
        if (bytesRead === header.length && header.toString('ascii') === 'PGDMP') names.push(entry.name);
      } finally {
        await dump.close();
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
  }
  return names.sort();
}

const backupLocks = new Map<string, Promise<void>>();

export async function createBackup(settings: BackupSettings, databaseUrl: string, sources: { name: string; path: string }[]): Promise<string> {
  const validationError = validateBackupSettings({ ...settings, enabled: true });
  if (validationError) throw new Error(validationError);
  const destination = path.resolve(settings.destination);
  const key = process.platform === 'win32' ? destination.toLowerCase() : destination;
  const previous = backupLocks.get(key) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  const tail = previous.then(() => current);
  backupLocks.set(key, tail);
  await previous;
  try {
    return await createBackupUnlocked(settings, databaseUrl, sources);
  } finally {
    release();
    if (backupLocks.get(key) === tail) backupLocks.delete(key);
  }
}

async function createBackupUnlocked(settings: BackupSettings, databaseUrl: string, sources: { name: string; path: string }[]): Promise<string> {
  const destination = path.resolve(settings.destination);
  for (const source of sources) {
    const relative = path.relative(path.resolve(source.path), destination);
    if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new Error('Backup destination must not be inside a source directory');
    }
  }
  await fs.mkdir(destination, { recursive: true });
  let completed: string;
  while (true) {
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
    const temporary = path.join(destination, `.turnfix-backup-${id}.partial`);
    completed = path.join(destination, `turnfix-backup-${id}`);
    let created = false;
    try {
      await fs.mkdir(temporary);
      created = true;
      await dumpDatabase(path.join(temporary, 'database.dump'), databaseUrl);
      for (const source of sources) {
        try {
          await fs.access(source.path);
        } catch (error: any) {
          if (error.code === 'ENOENT') continue;
          throw error;
        }
        await fs.cp(source.path, path.join(temporary, source.name), { recursive: true, errorOnExist: true });
      }
      await fs.writeFile(path.join(temporary, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), database: new URL(databaseUrl).pathname.slice(1), sources: sources.map(source => source.name) }, null, 2));
      await fs.rename(temporary, completed);
      break;
    } catch (error: any) {
      if (created) await fs.rm(temporary, { recursive: true, force: true });
      if (error.code !== 'ENOSPC') throw error;
      const backups = await completedBackups(destination);
      if (backups.length < 2) throw error;
      await fs.rm(path.join(destination, backups[0]), { recursive: true, force: true });
    }
  }
  const backups = (await completedBackups(destination)).filter(backup => backup !== path.basename(completed));
  for (const oldBackup of backups.slice(0, Math.max(0, backups.length - settings.retention_count + 1))) {
    await fs.rm(path.join(destination, oldBackup), { recursive: true, force: true });
  }
  return completed;
}