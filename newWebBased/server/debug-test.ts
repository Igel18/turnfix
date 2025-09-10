// Debug test for server issues
import { PrismaClient } from '@prisma/client';

console.log('Starting debug test...');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful:', result);
    await prisma.$disconnect();
    console.log('Debug test completed successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
