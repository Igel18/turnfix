/**
 * Test Database Setup Script
 * 
 * Creates the test database `turnfix_test`, applies the Prisma schema,
 * and seeds it with realistic test data.
 * 
 * This runs automatically via Jest globalSetup, but can also be invoked
 * directly:   npx ts-node tests/scripts/setup-test-db.ts
 */

import { execSync } from 'child_process';
import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const DB_NAME = process.env.DATABASE_NAME || 'turnfix_test';
const DB_USER = process.env.DATABASE_USER || 'postgres';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT || '5432', 10);

/**
 * Connect to the default `postgres` database to create/drop the test DB.
 */
async function getAdminClient(): Promise<Client> {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres', // Connect to default DB for admin operations
  });
  await client.connect();
  return client;
}

/**
 * Drop the test database if it exists, then recreate it.
 */
export async function createTestDatabase(): Promise<void> {
  const client = await getAdminClient();

  try {
    // Terminate existing connections to the test DB
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${DB_NAME}'
        AND pid <> pg_backend_pid()
    `).catch(() => { /* ignore if DB doesn't exist */ });

    // Drop the test database if it exists
    await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
    console.log(`🗑️  Dropped existing test database "${DB_NAME}"`);

    // Create fresh test database
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`✅ Created test database "${DB_NAME}"`);
  } finally {
    await client.end();
  }
}

/**
 * Apply Prisma schema to the test database using `prisma db push`.
 * This creates all tables without generating migration files.
 */
export async function applySchema(): Promise<void> {
  const serverDir = path.resolve(__dirname, '../..');
  const testDbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

  console.log('📐 Applying Prisma schema to test database...');

  execSync(`npx prisma db push --skip-generate --accept-data-loss`, {
    cwd: serverDir,
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
    stdio: 'pipe', // suppress verbose output
  });

  // Also generate the Prisma client (needed if not done yet)
  execSync(`npx prisma generate`, {
    cwd: serverDir,
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
    stdio: 'pipe',
  });

  console.log('✅ Schema applied successfully');
}

/**
 * Drop the test database entirely (cleanup).
 */
export async function dropTestDatabase(): Promise<void> {
  const client = await getAdminClient();

  try {
    // Terminate existing connections
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${DB_NAME}'
        AND pid <> pg_backend_pid()
    `).catch(() => {});

    await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
    console.log(`🗑️  Dropped test database "${DB_NAME}"`);
  } finally {
    await client.end();
  }
}

/**
 * Truncate all tables in the test database (faster than drop/recreate
 * for resetting between test suites).
 */
export async function truncateAllTables(): Promise<void> {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  try {
    // Get all table names from the public schema
    const tables: Array<{ tablename: string }> = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'tfx_%'
    `;

    if (tables.length > 0) {
      const tableNames = tables.map(t => `"${t.tablename}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE`);
      console.log(`🧹 Truncated ${tables.length} tables`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Full setup: create DB → apply schema → seed data.
 */
export async function setupTestDatabase(): Promise<void> {
  console.log('\n🚀 Setting up test database...\n');

  await createTestDatabase();
  await applySchema();

  // Seed test data (imported dynamically to avoid Prisma import order issues)
  const { seedTestData } = require('../fixtures/seed-test-data');
  await seedTestData();

  console.log('\n✅ Test database ready!\n');
}

// Allow direct execution
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to setup test database:', err);
      process.exit(1);
    });
}
