const { execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');

const serverRoot = path.resolve(__dirname, '..');
const testDatabaseName = process.env.TURNFIX_TEST_DATABASE_NAME || `turnfix_e2e_${process.pid}_${Date.now()}`;
process.env.TURNFIX_TEST_DATABASE_NAME = testDatabaseName;
dotenv.config({ path: path.resolve(serverRoot, '.env.test'), override: true });
const testDatabaseUrl = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
testDatabaseUrl.pathname = `/${testDatabaseName}`;
const testConfigDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'turnfix-e2e-config-'));
fs.copyFileSync(
  path.resolve(serverRoot, 'config', 'app-settings.json'),
  path.join(testConfigDirectory, 'app-settings.json'),
);
process.env.DATABASE_NAME = testDatabaseName;
process.env.DATABASE_URL = testDatabaseUrl.toString();
process.env.TEST_DATABASE_URL = testDatabaseUrl.toString();
process.env.TURNFIX_CONFIG_FILE_PATH = path.join(testConfigDirectory, 'app-config.json');
process.env.TURNFIX_APP_SETTINGS_FILE_PATH = path.join(testConfigDirectory, 'app-settings.json');
process.env.TURNFIX_ENV_FILE_PATH = path.join(testConfigDirectory, '.env');

let serverProcess;
let cleanupStarted = false;
let stopRequested = false;

async function cleanup(exitCode) {
  if (cleanupStarted) return;
  cleanupStarted = true;

  try {
    execSync('npm run test:drop-db', {
      cwd: serverRoot,
      env: process.env,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('❌ Could not drop the isolated E2E database:', error);
    exitCode = 1;
  }

  try {
    fs.rmSync(testConfigDirectory, { recursive: true, force: true });
  } catch (error) {
    console.error('❌ Could not remove isolated E2E configuration files:', error);
    exitCode = 1;
  }

  process.exitCode = exitCode;
}

async function stopServer(signal) {
  stopRequested = true;
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill(signal);
  }
}

process.once('SIGINT', () => { void stopServer('SIGINT'); });
process.once('SIGTERM', () => { void stopServer('SIGINT'); });

async function main() {
  try {
    execSync('npm run test:setup-db', {
      cwd: serverRoot,
      env: process.env,
      stdio: 'inherit',
    });
    if (stopRequested) {
      await cleanup(130);
      return;
    }

    serverProcess = spawn(process.execPath, [path.resolve(__dirname, 'start-e2e-server.js')], {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TURNFIX_E2E_DATABASE_URL: process.env.DATABASE_URL,
        TURNFIX_RUNTIME_PORT: process.env.TURNFIX_RUNTIME_PORT || '3001',
      },
      stdio: 'inherit',
    });

    serverProcess.once('error', (error) => {
      console.error('❌ Failed to start E2E server:', error);
      void cleanup(1);
    });
    serverProcess.once('exit', (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      void cleanup(exitCode);
    });
  } catch (error) {
    console.error('❌ Failed to prepare isolated E2E database:', error);
    await cleanup(1);
  }
}

void main();