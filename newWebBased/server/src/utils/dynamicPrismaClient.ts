/**
 * Dynamic Prisma Client - Create temporary Prisma clients with custom database connections
 * 
 * Used in wizard scenarios where operations need to target a different database
 * than the one configured in DATABASE_URL.
 * 
 * @example
 * const client = createDynamicPrismaClient({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'new_turnfix_db',
 *   user: 'postgres',
 *   password: 'password'
 * });
 * await client.$connect();
 * // ... use client ...
 * await client.$disconnect();
 */

import { PrismaClient } from '@prisma/client';

export interface DatabaseConfig {
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
}

/**
 * Creates a new Prisma client with a custom database connection string
 * @param config Database connection configuration
 * @returns A new PrismaClient instance connected to the specified database
 */
export function createDynamicPrismaClient(config: DatabaseConfig): PrismaClient {
  const connectionString = buildConnectionString(config);
  
  if (process.env.DEBUG === 'true') {
    console.log('[DEBUG] Creating dynamic Prisma client for database:', config.db_name);
    console.log('[DEBUG] Connection string (password masked):', maskPassword(connectionString));
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString
      }
    }
  });
}

/**
 * Builds a PostgreSQL connection string from config
 * @param config Database connection configuration
 * @returns PostgreSQL connection string
 */
export function buildConnectionString(config: DatabaseConfig): string {
  const { db_host, db_port, db_name, db_user, db_password } = config;
  return `postgresql://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}?schema=public`;
}

/**
 * Masks the password in a connection string for logging
 * @param connectionString Full connection string
 * @returns Connection string with password replaced by asterisks
 */
function maskPassword(connectionString: string): string {
  return connectionString.replace(/:([^@]+)@/, ':****@');
}

/**
 * Parses DATABASE_URL environment variable into config object
 * @param databaseUrl Connection string from environment
 * @returns Parsed database configuration
 */
export function parseConnectionString(databaseUrl: string): DatabaseConfig {
  // Format: postgresql://user:password@host:port/database
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
  const match = databaseUrl.match(regex);
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }

  return {
    db_user: match[1],
    db_password: match[2],
    db_host: match[3],
    db_port: parseInt(match[4], 10),
    db_name: match[5]
  };
}

/**
 * Creates database config from current DATABASE_URL but with different database name
 * Useful for wizard operations that need to target a newly created database
 * 
 * @param newDatabaseName Name of the new/target database
 * @returns Database configuration with new database name
 */
export function createConfigForNewDatabase(newDatabaseName: string): DatabaseConfig {
  const currentUrl = process.env.DATABASE_URL;
  if (!currentUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const config = parseConnectionString(currentUrl);
  return {
    ...config,
    db_name: newDatabaseName
  };
}
