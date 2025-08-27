require('dotenv').config();

// Test different password combinations
const testPasswords = [
  '', // no password
  'postgres',
  'pgadmin',
  'admin', 
  'UG2-UA.de',
  'password',
  '123456',
  'root'
];

const { PrismaClient } = require('@prisma/client');

async function testPassword(password) {
  const dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@localhost:5432/turnfix?schema=public`;
  
  // Create a new Prisma client with this specific connection string
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  });

  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`✅ SUCCESS with password: "${password}"`);
    console.log(`Use this DATABASE_URL: ${dbUrl}`);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Failed with password: "${password}"`);
    await prisma.$disconnect();
    return false;
  }
}

async function findCorrectPassword() {
  console.log('=== Testing PostgreSQL Passwords ===\n');
  
  for (const password of testPasswords) {
    const success = await testPassword(password);
    if (success) {
      break;
    }
  }
  
  console.log('\n=== Manual Test Instructions ===');
  console.log('If none of the above passwords worked, you can:');
  console.log('1. Run this command to connect manually:');
  console.log('   & "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" -h localhost -U postgres -d turnfix');
  console.log('2. Enter the correct password when prompted');
  console.log('3. If it works, update the .env file with that password');
}

findCorrectPassword();
