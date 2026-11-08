const assert = require('assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const { backupInstallation } = require('../scripts/pre-upgrade-backup');

test('backs up the installed database even when scheduled backups are disabled', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-upgrade-test-'));
  try {
    const server = path.join(root, 'server');
    await fs.mkdir(path.join(server, 'config'), { recursive: true });
    await fs.writeFile(path.join(server, '.env'), 'DATABASE_URL=postgresql://user:secret@host/existing');
    await fs.writeFile(path.join(server, 'config', 'app-config.json'), JSON.stringify({ backup: { enabled: false, destination: path.join(root, 'configured-backups') } }));
    let captured;
    const result = await backupInstallation(root, path.join(root, 'fallback'), {
      parseEnv: () => ({ DATABASE_URL: 'postgresql://user:secret@host/existing' }),
      defaultBackupSettings: { enabled: false, destination: '', retention_count: 20, interval_minutes: 30 },
      createBackup: async (settings, url, sources) => { captured = { settings, url, sources }; return 'backup-path'; }
    });
    assert.equal(result, 'backup-path');
    assert.equal(captured.url, 'postgresql://user:secret@host/existing');
    assert.equal(captured.settings.destination, path.join(root, 'configured-backups', 'setup'));
    assert.equal(captured.settings.enabled, false);
    assert.ok(captured.sources.some(source => source.path === path.join(server, '.env')));
    await fs.rm(path.join(server, 'config', 'app-config.json'));
    await backupInstallation(root, path.join(root, 'fallback'), {
      parseEnv: () => ({ DATABASE_URL: 'postgresql://user:secret@host/existing' }),
      defaultBackupSettings: { destination: '' },
      createBackup: async settings => { assert.equal(settings.destination, path.join(root, 'fallback', 'setup')); return 'backup-path'; }
    });
    await assert.rejects(backupInstallation(root, path.join(root, 'fallback'), {
      parseEnv: () => ({}), defaultBackupSettings: {}, createBackup: async () => 'unexpected'
    }), /DATABASE_URL/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});