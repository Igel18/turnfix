console.log('=== PostgreSQL Connection Diagnostics ===\n');

// Check environment variables
console.log('Current DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');

// Try to find PostgreSQL installation
const { execSync } = require('child_process');

try {
  // Check if PostgreSQL service is running
  console.log('\n=== Service Check ===');
  const services = execSync('Get-Service postgresql*', { encoding: 'utf8', shell: 'powershell' });
  console.log('PostgreSQL Services:');
  console.log(services);
} catch (error) {
  console.log('Could not check PostgreSQL services:', error.message);
}

// Common PostgreSQL paths on Windows
const commonPaths = [
  'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\psql.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe'
];

console.log('\n=== Looking for PostgreSQL installation ===');
const fs = require('fs');

for (const path of commonPaths) {
  if (fs.existsSync(path)) {
    console.log('✅ Found PostgreSQL at:', path);
    
    try {
      // Try to get PostgreSQL version
      const version = execSync(`"${path}" --version`, { encoding: 'utf8' });
      console.log('Version:', version.trim());
    } catch (e) {
      console.log('Could not get version');
    }
    break;
  }
}

console.log('\n=== Database Connection Troubleshooting ===');
console.log('Please verify the following:');
console.log('1. PostgreSQL username (default: postgres)');
console.log('2. PostgreSQL password (you set during installation)');
console.log('3. Database name "turnfix" exists');
console.log('4. PostgreSQL is listening on localhost:5432');
console.log('');
console.log('Common passwords to try:');
console.log('- postgres');
console.log('- admin');
console.log('- UG2-UA.de (original from .env)');
console.log('- (empty/no password)');
console.log('');
console.log('To create the database if it doesn\'t exist, connect to PostgreSQL and run:');
console.log('CREATE DATABASE turnfix;');
