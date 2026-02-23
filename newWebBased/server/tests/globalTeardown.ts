/**
 * Jest Global Teardown
 * 
 * Runs ONCE after all test suites have finished.
 * Drops the test database to leave no trace.
 */

import path from 'path';
import dotenv from 'dotenv';

export default async function globalTeardown(): Promise<void> {
  // Load test environment
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Jest Global Teardown — Cleaning up');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Wait for Prisma connections to close gracefully
  // (avoids "connection aborted by administrator" noise)
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { dropTestDatabase } = require('./scripts/setup-test-db');
  await dropTestDatabase();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
