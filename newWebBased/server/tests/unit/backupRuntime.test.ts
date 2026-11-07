import path from 'path';
import { getBackupSources, readBackupSettings } from '../../src/utils/backupRuntime';

describe('backup runtime integration', () => {
  it('uses defaults for legacy settings and preserves configured values', () => {
    expect(readBackupSettings({})).toEqual({ enabled: false, interval_minutes: 30, destination: '', retention_count: 20 });
    expect(readBackupSettings({ backup: { enabled: true, interval_minutes: 5, destination: path.resolve('backup'), retention_count: 3 } })).toEqual({ enabled: true, interval_minutes: 5, destination: path.resolve('backup'), retention_count: 3 });
  });

  it('includes persistent configuration, environment, uploads, icons and exports', () => {
    const sources = getBackupSources();
    expect(sources.map(source => source.name)).toEqual(expect.arrayContaining(['server-config', 'server-env', 'app-settings', 'uploads', 'server-icons', 'root-config', 'exports']));
    expect(sources.every(source => path.isAbsolute(source.path))).toBe(true);
  });
});