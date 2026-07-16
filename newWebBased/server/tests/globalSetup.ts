/**
 * Jest Global Setup
 * 
 * Runs ONCE before all test suites.
 * Creates the test database, applies schema, and seeds data.
 */

import path from 'path';
import dotenv from 'dotenv';

export default async function globalSetup(): Promise<void> {
  // 1. Load test environment FIRST so all subsequent imports use the test DB
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

  // Also set DATABASE_URL explicitly so Prisma uses the test DB
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Jest Global Setup — Test Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. Run the database setup (create → schema → seed)
  const { setupTestDatabase } = require('./scripts/setup-test-db');
  await setupTestDatabase();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
