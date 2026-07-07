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
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Jest Global Teardown — Cleaning up');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Disconnect all Prisma clients before dropping the database.
  // On Windows, Prisma's connection pool takes a while to fully close.
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    await prisma.$disconnect();
  } catch { /* ignore */ }

  // Wait a bit longer for all connection pools to drain
  await new Promise(resolve => setTimeout(resolve, 3000));

  const { dropTestDatabase } = require('./scripts/setup-test-db');
  await dropTestDatabase();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
