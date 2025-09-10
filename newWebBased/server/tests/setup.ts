import { PrismaClient } from '@prisma/client';

// Global test setup
let prisma: PrismaClient;

global.beforeAll(async () => {
  // Setup test database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      }
    }
  });
  
  // Connect to database
  await prisma.$connect();
  
  // Make prisma available globally for tests
  (global as any).prisma = prisma;
});

global.afterAll(async () => {
  // Cleanup
  if (prisma) {
    await prisma.$disconnect();
  }
});

global.beforeEach(async () => {
  // Clean up test data before each test if needed
  // This depends on your testing strategy
});

global.afterEach(async () => {
  // Clean up test data after each test if needed
});
