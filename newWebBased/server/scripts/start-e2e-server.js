const path = require('path');

process.env.TURNFIX_ENV_FILE = process.env.TURNFIX_ENV_FILE || '.env.test';
process.env.TURNFIX_RUNTIME_PORT = process.env.TURNFIX_RUNTIME_PORT || process.env.PORT || '3001';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

require(path.resolve(__dirname, '../dist/index.js'));