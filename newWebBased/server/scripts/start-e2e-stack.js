const { execSync } = require('child_process');
const path = require('path');

const serverRoot = path.resolve(__dirname, '..');

execSync('npm run test:setup-db', {
  cwd: serverRoot,
  stdio: 'inherit',
});

require(path.resolve(__dirname, './start-e2e-server.js'));