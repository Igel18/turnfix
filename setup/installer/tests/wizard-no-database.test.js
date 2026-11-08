const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

test('production server serves settings without a working database', { timeout: 45000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-no-database-'));
  const serverRoot = path.resolve(__dirname, '../../../newWebBased/server');
  const entry = path.join(serverRoot, 'dist', 'index.js');
  let child;
  let output = '';
  try {
    await fs.access(entry);
    const portServer = net.createServer();
    await new Promise((resolve, reject) => portServer.once('error', reject).listen(0, '127.0.0.1', resolve));
    const port = portServer.address().port;
    await new Promise((resolve, reject) => portServer.close(error => error ? reject(error) : resolve()));
    const envFile = path.join(root, '.env');
    await fs.writeFile(envFile, `DATABASE_URL="postgresql://test:test@127.0.0.1:1/unavailable?connect_timeout=1"\nPORT=${port}\nNODE_ENV=production\n`);
    const environment = { ...process.env, TURNFIX_ENV_FILE: envFile, TURNFIX_CONFIG_FILE_PATH: path.join(root, 'config', 'app-config.json'), TURNFIX_APP_SETTINGS_FILE_PATH: path.join(root, 'app-settings.json'), TURNFIX_RUNTIME_PORT: String(port), NODE_ENV: 'production' };
    delete environment.PM2_HOME;
    delete environment.pm_id;
    delete environment.TURNFIX_E2E_DATABASE_URL;
    child = spawn(process.execPath, [entry], {
      cwd: root,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
    });
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const base = `http://127.0.0.1:${port}`;
    let response;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Server exited before starting: ${output}`);
      try {
        response = await fetch(`${base}/api/configuration`);
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    assert.ok(response, `Server did not start: ${output}`);
    assert.equal(response.status, 200);
    const configuration = await response.json();
    assert.equal(configuration.database.db_name, 'unavailable');
    assert.equal(configuration.database.db_port, 1);
    const appSettings = await fetch(`${base}/api/app-settings`);
    assert.equal(appSettings.status, 200);
    assert.equal(typeof await appSettings.json(), 'object');
    const page = await fetch(`${base}/configuration`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    await fs.rm(root, { recursive: true, force: true });
  }
});