import path from 'path';
import { BackupSettings, createBackup, defaultBackupSettings } from './backup';
import { BackupScheduler } from './backupScheduler';
import { CONFIG_DIR, CONFIG_FILE, ENV_FILE, loadConfig } from './configurationUtils';

const serverRoot = path.resolve(__dirname, '../..');
const projectRoot = path.resolve(serverRoot, '../..');

export function readBackupSettings(config: { backup?: Partial<BackupSettings> }): BackupSettings {
  return { ...defaultBackupSettings, ...config.backup };
}

export function getBackupSources(): { name: string; path: string }[] {
  const requestedEnv = process.env.TURNFIX_ENV_FILE;
  const envFile = requestedEnv ? path.resolve(serverRoot, requestedEnv) : ENV_FILE;
  return [
    { name: 'server-config', path: CONFIG_DIR },
    { name: 'app-config', path: CONFIG_FILE },
    { name: 'app-settings', path: process.env.TURNFIX_APP_SETTINGS_FILE_PATH || path.join(serverRoot, 'config', 'app-settings.json') },
    { name: 'server-env', path: envFile },
    { name: 'uploads', path: path.join(process.cwd(), 'uploads') },
    { name: 'server-icons', path: path.join(serverRoot, 'public', 'icons') },
    { name: 'root-config', path: path.join(projectRoot, 'config') },
    { name: 'exports', path: path.join(process.cwd(), 'exports') }
  ].map(source => ({ ...source, path: path.resolve(source.path) }));
}

export const backupScheduler = new BackupScheduler(
  async () => readBackupSettings(await loadConfig()),
  async settings => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
    return createBackup(settings, process.env.DATABASE_URL, getBackupSources());
  }
);