const fs = require('fs/promises');
const path = require('path');

async function backupInstallation(installDir, fallbackDestination, dependencies) {
  const serverRoot = path.join(installDir, 'server');
  const envFile = path.join(serverRoot, '.env');
  const configFile = path.join(serverRoot, 'config', 'app-config.json');
  const env = dependencies.parseEnv(await fs.readFile(envFile));
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is missing from the existing server .env');

  let config = {};
  try {
    config = JSON.parse(await fs.readFile(configFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const settings = { ...dependencies.defaultBackupSettings, ...config.backup };
  if (!settings.destination) settings.destination = fallbackDestination;
  settings.destination = path.join(settings.destination, 'setup');
  const sources = [
    { name: 'server-config', path: path.dirname(configFile) },
    { name: 'app-config', path: configFile },
    { name: 'app-settings', path: path.join(serverRoot, 'config', 'app-settings.json') },
    { name: 'server-env', path: envFile },
    { name: 'uploads', path: path.join(serverRoot, 'uploads') },
    { name: 'server-icons', path: path.join(serverRoot, 'public', 'icons') },
    { name: 'root-config', path: path.join(installDir, 'config') },
    { name: 'exports', path: path.join(serverRoot, 'exports') }
  ];
  return dependencies.createBackup(settings, env.DATABASE_URL, sources);
}

if (require.main === module) {
  const [installDir, fallbackDestination, backupModule, resultFile] = process.argv.slice(2);
  Promise.resolve().then(async () => {
    const backup = require(backupModule);
    const dotenv = require(path.join(installDir, 'server', 'node_modules', 'dotenv'));
    return backupInstallation(installDir, fallbackDestination, { ...backup, parseEnv: dotenv.parse });
  }).then(async result => {
    if (resultFile) await fs.writeFile(resultFile, result, 'utf8');
    else process.stdout.write(result);
  }).catch(async error => {
    if (resultFile) await fs.writeFile(resultFile, error.message || String(error), 'utf8').catch(() => {});
    else console.error(error.message || String(error));
    process.exitCode = 1;
  });
}

module.exports = { backupInstallation };