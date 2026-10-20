const { execSync } = require('child_process');
const path = require('path');

module.exports = function globalTeardownDatabase() {
  const serverRoot = path.resolve(__dirname, '../../server');
  execSync('npm run test:drop-db', {
    cwd: serverRoot,
    env: process.env,
    stdio: 'inherit',
  });
};