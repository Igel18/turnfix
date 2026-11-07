import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createBackup, defaultBackupSettings } from '../../src/utils/backup';

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