import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createBackup, defaultBackupSettings } from '../../src/utils/backup';
import { parse } from 'dotenv';

const { backupInstallation } = require('../../../../setup/installer/scripts/pre-upgrade-backup');

it('creates a real PostgreSQL dump and copies persistent files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-backup-integration-'));
  try {
    const source = path.join(root, 'source');
    const destination = path.join(root, 'destination');
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, 'settings.json'), '{"test":true}');
    const result = await createBackup({ ...defaultBackupSettings, destination }, process.env.TEST_DATABASE_URL!, [{ name: 'config', path: source }]);
    expect(await fs.readFile(path.join(result, 'config', 'settings.json'), 'utf8')).toBe('{"test":true}');
    expect((await fs.readFile(path.join(result, 'database.dump'))).subarray(0, 5).toString()).toBe('PGDMP');
    expect(JSON.parse(await fs.readFile(path.join(result, 'manifest.json'), 'utf8')).sources).toEqual(['config']);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 60000);

it('creates an installer backup of the configured database', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-installer-backup-'));
  try {
    const server = path.join(root, 'server');
    const destination = path.join(root, 'backups');
    await fs.mkdir(path.join(server, 'config'), { recursive: true });
    await fs.writeFile(path.join(server, '.env'), `DATABASE_URL="${process.env.TEST_DATABASE_URL}"\n`);
    await fs.writeFile(path.join(server, 'config', 'app-config.json'), JSON.stringify({ backup: { enabled: false, destination } }));
    const result = await backupInstallation(root, path.join(root, 'fallback'), { parseEnv: parse, createBackup, defaultBackupSettings });
    expect(path.dirname(result)).toBe(path.join(destination, 'setup'));
    expect((await fs.readFile(path.join(result, 'database.dump'))).subarray(0, 5).toString()).toBe('PGDMP');
    expect(await fs.readFile(path.join(result, 'server-env'), 'utf8')).toContain('DATABASE_URL=');
    expect(JSON.parse(await fs.readFile(path.join(result, 'manifest.json'), 'utf8')).database).toBe(new URL(process.env.TEST_DATABASE_URL!).pathname.slice(1));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 60000);