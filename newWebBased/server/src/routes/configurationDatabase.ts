/**
 * Configuration database management routes for TurnFix.
 * 
 * Extracted from routes/configuration.ts for Separation of Concerns.
 * Handles database lifecycle endpoints: test connection, create database,
 * create schema (Prisma db push), and full initialization.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { exec, execSync } from 'child_process';
import path from 'path';
import { applyGymNetPreset } from '../utils/gymnetPreset';

const router = express.Router();

// Server root directory — where prisma/schema.prisma lives
// __dirname at runtime = server/dist/routes → up 2 = server/
const serverRoot = path.resolve(__dirname, '..', '..');

// POST /api/configuration/test-database - Test database connection
router.post('/test-database', async (req, res) => {
  try {
    const dbConfig = req.body;
    
    if (process.env.DEBUG === 'true') {
      console.log('Testing database connection:', {
        host: dbConfig.db_host,
        port: dbConfig.db_port,
        database: dbConfig.db_name,
        user: dbConfig.db_user,
        ssl: dbConfig.db_ssl
      });
    }
    
    // Create a test Prisma client with the provided configuration
    const testDatabaseUrl = `postgresql://${dbConfig.db_user}:${dbConfig.db_password}@${dbConfig.db_host}:${dbConfig.db_port}/${dbConfig.db_name}${dbConfig.db_ssl ? '?sslmode=require' : ''}`;
    
    // Test connection by running a simple query
    const testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      }
    });
    
    try {
      // Test the connection with a simple query
      await testPrisma.$queryRaw`SELECT 1 as test`;
      await testPrisma.$disconnect();
      
      if (process.env.DEBUG === 'true') {
        console.log('Database connection test successful');
      }
      
      res.json({ 
        success: true, 
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      await testPrisma.$disconnect();
      throw dbError;
    }
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    
    // Provide more specific error messages based on the error type
    let userMessage = 'Database connection failed';
    let errorCode = 'CONNECTION_FAILED';
    
    if (error.message) {
      if (error.message.includes('Authentication failed') || error.message.includes('credentials')) {
        userMessage = 'Authentication failed - Invalid username or password';
        errorCode = 'AUTH_FAILED';
      } else if (error.message.includes('Connection refused') || error.message.includes('ECONNREFUSED')) {
        userMessage = 'Cannot connect to database server - Server may be down or wrong host/port';
        errorCode = 'CONNECTION_REFUSED';
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        userMessage = 'Database does not exist - Please check the database name';
        errorCode = 'DB_NOT_FOUND';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Connection timeout - Server may be unreachable';
        errorCode = 'TIMEOUT';
      }
    }
    
    res.status(500).json({ 
      error: userMessage,
      errorCode,
      details: process.env.DEBUG === 'true' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/configuration/create-database - Create database if it doesn't exist
router.post('/create-database', async (req, res) => {
  try {
    const dbConfig = req.body;
    
    if (process.env.DEBUG === 'true') {
      console.log('Creating database:', {
        host: dbConfig.db_host,
        port: dbConfig.db_port,
        database: dbConfig.db_name,
        user: dbConfig.db_user
      });
    }
    
    // First, connect to the 'postgres' system database to create the new database
    const systemDatabaseUrl = `postgresql://${dbConfig.db_user}:${dbConfig.db_password}@${dbConfig.db_host}:${dbConfig.db_port}/postgres${dbConfig.db_ssl ? '?sslmode=require' : ''}`;
    
    const systemPrisma = new PrismaClient({
      datasources: {
        db: {
          url: systemDatabaseUrl
        }
      }
    });
    
    try {
      // Check if database already exists
      const existingDbs = await systemPrisma.$queryRaw<Array<{ datname: string }>>`
        SELECT datname FROM pg_database WHERE datname = ${dbConfig.db_name}
      `;
      
      if (existingDbs && existingDbs.length > 0) {
        await systemPrisma.$disconnect();
        
        if (process.env.DEBUG === 'true') {
          console.log(`Database '${dbConfig.db_name}' already exists`);
        }
        
        return res.status(400).json({ 
          error: `Database '${dbConfig.db_name}' already exists`,
          errorCode: 'DB_ALREADY_EXISTS',
          timestamp: new Date().toISOString()
        });
      }
      
      // Create the database
      await systemPrisma.$executeRawUnsafe(`CREATE DATABASE "${dbConfig.db_name}"`);
      await systemPrisma.$disconnect();
      
      if (process.env.DEBUG === 'true') {
        console.log(`Database '${dbConfig.db_name}' created successfully`);
      }
      
      // Now connect to the newly created database to run migrations
      const newDatabaseUrl = `postgresql://${dbConfig.db_user}:${dbConfig.db_password}@${dbConfig.db_host}:${dbConfig.db_port}/${dbConfig.db_name}${dbConfig.db_ssl ? '?sslmode=require' : ''}`;
      
      const newDbPrisma = new PrismaClient({
        datasources: {
          db: {
            url: newDatabaseUrl
          }
        }
      });
      
      try {
        // Test connection to new database
        await newDbPrisma.$queryRaw`SELECT 1 as test`;
        await newDbPrisma.$disconnect();
        
        if (process.env.DEBUG === 'true') {
          console.log('Successfully connected to new database');
        }
        
        res.json({ 
          success: true, 
          message: `Database '${dbConfig.db_name}' created successfully. Please run Prisma migrations to set up the schema.`,
          nextSteps: [
            'The database has been created',
            'Run "npm run prisma:migrate" in the server directory to create the database schema',
            'Restart the server to use the new database'
          ],
          timestamp: new Date().toISOString()
        });
      } catch (newDbError) {
        await newDbPrisma.$disconnect();
        throw newDbError;
      }
    } catch (dbError) {
      await systemPrisma.$disconnect();
      throw dbError;
    }
  } catch (error: any) {
    console.error('Database creation failed:', error);
    
    // Provide more specific error messages based on the error type
    let userMessage = 'Database creation failed';
    let errorCode = 'CREATION_FAILED';
    
    if (error.message) {
      if (error.message.includes('permission denied') || error.message.includes('must be owner')) {
        userMessage = 'Permission denied - User does not have permission to create databases';
        errorCode = 'PERMISSION_DENIED';
      } else if (error.message.includes('Authentication failed') || error.message.includes('credentials')) {
        userMessage = 'Authentication failed - Invalid username or password';
        errorCode = 'AUTH_FAILED';
      } else if (error.message.includes('Connection refused') || error.message.includes('ECONNREFUSED')) {
        userMessage = 'Cannot connect to database server - Server may be down or wrong host/port';
        errorCode = 'CONNECTION_REFUSED';
      } else if (error.message.includes('already exists')) {
        userMessage = `Database already exists`;
        errorCode = 'DB_ALREADY_EXISTS';
      }
    }
    
    res.status(500).json({ 
      error: userMessage,
      errorCode,
      details: process.env.DEBUG === 'true' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/configuration/create-schema - Datenbankschema direkt aus schema.prisma generieren
router.post('/create-schema', async (req, res) => {
  try {
    console.log('[Configuration] Starting database schema creation from schema.prisma...');
    
    // Check if custom database config provided (from wizard)
    const dbConfig = req.body.dbConfig;
    
    // Use Prisma's db push which generates all tables directly from schema.prisma
    try {
      // Build environment with custom DATABASE_URL if provided
      const env = { ...process.env };
      if (dbConfig) {
        const { db_host, db_port, db_name, db_user, db_password } = dbConfig;
        env.DATABASE_URL = `postgresql://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}?schema=public`;
        console.log('[Configuration] Using custom database:', db_name);
        if (process.env.DEBUG === 'true') {
          console.log('[DEBUG] Custom DATABASE_URL (password masked):', env.DATABASE_URL.replace(/:([^@]+)@/, ':****@'));
        }
      }
      
      // Run Prisma db push to create schema directly from schema.prisma.
      // Use the local Prisma CLI so this works even when npx is unavailable.
      // Use serverRoot as cwd so Prisma finds prisma/schema.prisma.
      const schemaPath = path.join(serverRoot, 'prisma', 'schema.prisma');
      const prismaExecutable = process.platform === 'win32'
        ? path.join(serverRoot, 'node_modules', '.bin', 'prisma.cmd')
        : path.join(serverRoot, 'node_modules', '.bin', 'prisma');
      const output = execSync(`"${prismaExecutable}" db push --schema="${schemaPath}"`, {
        cwd: serverRoot,
        encoding: 'utf-8',
        env
      });
      
      console.log('[Configuration] Database schema created successfully from schema.prisma');
      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG] Schema push output:', output);
      }
      
      res.json({
        success: true,
        message: 'Database schema created successfully',
        details: 'All tables and relationships initialized from schema.prisma'
      });
    } catch (execError: any) {
      const errorOutput = execError.stderr || execError.stdout || execError.message;
      
      // Check if schema already exists
      if (errorOutput && (errorOutput.includes('already exists') || errorOutput.includes('Your database is now in sync'))) {
        console.log('[Configuration] Schema already exists - database is in sync');
        return res.json({
          success: true,
          message: 'Database schema already exists',
          details: 'All tables are already present in database'
        });
      }
      
      throw execError;
    }
  } catch (error: any) {
    console.error('[Configuration] Error creating schema:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create database schema',
      details: error.message || 'Unknown error occurred',
      stack: process.env.DEBUG === 'true' ? error.stack : undefined
    });
  }
});

// POST /api/configuration/init-database - Kompletter DB-Initialisierungsprozess
router.post('/init-database', async (req, res) => {
  try {
    console.log('[Configuration] Starting complete database initialization...');
    
    // 1. Create schema
    const schemaResult = await new Promise((resolve, reject) => {
      const schemaPath = path.join(serverRoot, 'prisma', 'schema.prisma');
      const prismaExecutable = process.platform === 'win32'
        ? path.join(serverRoot, 'node_modules', '.bin', 'prisma.cmd')
        : path.join(serverRoot, 'node_modules', '.bin', 'prisma');
      exec(`"${prismaExecutable}" migrate deploy --schema="${schemaPath}"`, { cwd: serverRoot }, (error, stdout, stderr) => {
        if (error) reject({ error: 'Schema creation failed', details: stderr || error.message });
        else resolve({ success: true, step: 'schema', output: stdout });
      });
    });

    console.log('[Configuration] Schema created');

    // 2. Apply GymNet preset
    const presetResult = await applyGymNetPreset();
    
    console.log('[Configuration] GymNet preset applied');

    res.json({
      success: true,
      message: 'Database initialization completed successfully',
      steps: {
        schema: schemaResult,
        preset: presetResult
      }
    });
  } catch (error: any) {
    console.error('Error during database initialization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize database',
      details: error?.details || error?.message || String(error),
      stack: process.env.DEBUG === 'true' ? error?.stack : undefined
    });
  }
});

export default router;
