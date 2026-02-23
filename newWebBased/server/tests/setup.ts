import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment so DATABASE_URL points at turnfix_test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Global test setup — runs once per test file
let prisma: PrismaClient;

global.beforeAll(async () => {
  // Connect to the TEST database (already created by globalSetup)
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      }
    },
    log: ['error'],
  });

  await prisma.$connect();

  // Make prisma available globally for tests
  (global as any).prisma = prisma;
});

global.afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

global.beforeEach(async () => {
  // Test data from the seed file is preserved.
  // Additional data created during a test should be cleaned up in afterEach
  // via TestUtils.cleanupCreatedRecords().
});

global.afterEach(async () => {
  // Nothing to do globally — individual tests use TestUtils for cleanup
});
