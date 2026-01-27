import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client'; // Still needed for test connections
import { exec, execSync } from 'child_process';

const router = express.Router();


import { applyGymNetPreset } from '../utils/gymnetPreset';
import { applyProductionDisciplines } from '../utils/productionDisciplinesImport';
import { applyProductionStatuses } from '../utils/productionStatusesImport';

// POST /api/configuration/gymnet-preset - Geräte/Formeln für GymNet anlegen
router.post('/gymnet-preset', async (req, res) => {
  let customClient = null;
  try {
    const { dbConfig } = req.body;
    
    // If custom DB config provided (from wizard), create temporary client
    if (dbConfig) {
      const { createDynamicPrismaClient } = require('../utils/dynamicPrismaClient');
      customClient = createDynamicPrismaClient(dbConfig);
      await customClient.$connect();
      console.log('[Configuration] Using custom database connection for GymNet preset');
    }
    
    const result = await applyGymNetPreset(customClient);
    res.json({ success: true, result });
  } catch (error: any) {
    // Backend-Log mit Stacktrace
    console.error('GymNet preset failed:', error && (error.stack || error));
    // Fehlerdetails möglichst ausführlich an den Client zurückgeben
    res.status(500).json({
      error: 'Failed to apply GymNet preset',
      details: error?.message || String(error),
      stack: error?.stack || null
    });
  } finally {
    // Clean up custom client
    if (customClient) {
      await customClient.$disconnect();
    }
  }
});

// POST /api/configuration/production-disciplines - Import all production disciplines
router.post('/production-disciplines', async (req, res) => {
  let customClient = null;
  try {
    const { dbConfig } = req.body;
    
    // If custom DB config provided (from wizard), create temporary client
    if (dbConfig) {
      const { createDynamicPrismaClient } = require('../utils/dynamicPrismaClient');
      customClient = createDynamicPrismaClient(dbConfig);
      await customClient.$connect();
      console.log('[Configuration] Using custom database connection for production disciplines');
    }
    
    const result = await applyProductionDisciplines(customClient);
    res.json(result);
  } catch (error: any) {
    console.error('Production disciplines import failed:', error && (error.stack || error));
    res.status(500).json({
      error: 'Failed to import production disciplines',
      details: error?.message || String(error),
      stack: error?.stack || null
    });
  } finally {
    // Clean up custom client
    if (customClient) {
      await customClient.$disconnect();
    }
  }
});

// POST /api/configuration/production-statuses - Import all production statuses
router.post('/production-statuses', async (req, res) => {
  let customClient = null;
  try {
    const { dbConfig } = req.body;
    
    // If custom DB config provided (from wizard), create temporary client
    if (dbConfig) {
      const { createDynamicPrismaClient } = require('../utils/dynamicPrismaClient');
      customClient = createDynamicPrismaClient(dbConfig);
      await customClient.$connect();
      console.log('[Configuration] Using custom database connection for production statuses');
    }
    
    const result = await applyProductionStatuses(customClient);
    res.json(result);
  } catch (error: any) {
    console.error('Production statuses import failed:', error && (error.stack || error));
    res.status(500).json({
      error: 'Failed to import production statuses',
      details: error?.message || String(error),
      stack: error?.stack || null
    });
  } finally {
    // Clean up custom client
    if (customClient) {
      await customClient.$disconnect();
    }
  }
});



// Configuration file path
const CONFIG_FILE = path.join(process.cwd(), 'config', 'app-config.json');
const CONFIG_DIR = path.dirname(CONFIG_FILE);

// Encryption key for sensitive data (in production, use environment variable)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'turnfix-config-key-2024-secret-key';

// .env file path
const ENV_FILE = path.join(process.cwd(), '.env');

// Utility functions for encryption/decryption
const encrypt = (text: string): string => {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Fallback to unencrypted text
  }
};

const decrypt = (text: string): string => {
  try {
    // Handle unencrypted text (backward compatibility)
    if (!text.includes(':')) {
      return text;
    }
    
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, encryptedText] = text.split(':');
    
    if (!ivHex || !encryptedText) {
      return text; // Fallback if format is invalid
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return text; // Fallback to original text
  }
};

// Configuration interface
interface AppConfig {
  database: {
    db_host: string;
    db_port: number;
    db_name: string;
    db_user: string;
    db_password: string;
    db_ssl: boolean;
  };
  application: {
    app_name: string;
    app_version: string;
    debug_mode: boolean;
    server_port: number;
    client_port: number;
  };
  localization: {
    default_language: string;
    date_format: string;
    timezone: string;
  };
  security: {
    session_timeout: number;
    password_min_length: number;
    max_login_attempts: number;
    require_https: boolean;
  };
  imports: {
    max_file_size: number;
    allowed_file_types: string;
    auto_backup: boolean;
    validate_imports: boolean;
  };
  printing: {
    default_page_size: string;
    default_orientation: string;
    pdf_quality: string;
    include_watermark: boolean;
  };
  logging: {
    log_level: string;
    log_retention: number;
    enable_audit_log: boolean;
    log_database_queries: boolean;
  };
}

// Ensure config directory exists
const ensureConfigDir = async (): Promise<void> => {
  try {
    await fs.access(CONFIG_DIR);
  } catch (error) {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
};

// Load configuration from file
const loadConfig = async (): Promise<AppConfig> => {
  try {
    await ensureConfigDir();
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    
    // Decrypt sensitive fields
    if (config.database && config.database.db_password) {
      config.database.db_password = decrypt(config.database.db_password);
    }
    
    if (process.env.DEBUG === 'true') {
      console.log('🔧 DEBUG: Loaded config from file with database:', config.database?.db_name);
    }
    return config;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Return default configuration if file doesn't exist
      const defaultConfig = getDefaultConfig();
      if (process.env.DEBUG === 'true') {
        console.log('🔧 DEBUG: No config file found, using default config with database:', defaultConfig.database?.db_name);
        console.log('🔧 DEBUG: Environment DATABASE_URL:', process.env.DATABASE_URL);
        console.log('🔧 DEBUG: Environment DATABASE_NAME:', process.env.DATABASE_NAME);
      }
      return defaultConfig;
    }
    throw error;
  }
};

// Update .env file with new database configuration
const updateEnvFile = async (config: AppConfig): Promise<void> => {
  try {
    // Read current .env file
    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_FILE, 'utf-8');
    } catch (error) {
      // File doesn't exist, will create new one
      console.log('📝 .env file not found, creating new one');
    }

    // Build new DATABASE_URL
    const sslParam = config.database.db_ssl ? 'sslmode=require' : '';
    const baseParams = 'schema=public&connection_limit=20&pool_timeout=10';
    const allParams = sslParam ? `${baseParams}&${sslParam}` : baseParams;
    const newDatabaseUrl = `postgresql://${config.database.db_user}:${config.database.db_password}@${config.database.db_host}:${config.database.db_port}/${config.database.db_name}?${allParams}`;

    // Parse existing .env content into key-value pairs
    const envLines = envContent.split('\n');
    const envVars: { [key: string]: string } = {};
    
    for (const line of envLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          envVars[key] = value;
        }
      }
    }

    // Update database-related variables
    envVars['DATABASE_URL'] = `"${newDatabaseUrl}"`;
    envVars['DATABASE_HOST'] = `"${config.database.db_host}"`;
    envVars['DATABASE_PORT'] = `"${config.database.db_port}"`;
    envVars['DATABASE_NAME'] = `"${config.database.db_name}"`;
    envVars['DATABASE_USER'] = `"${config.database.db_user}"`;
    envVars['DATABASE_PASSWORD'] = `"${config.database.db_password}"`;
    envVars['DATABASE_SSL'] = `"${config.database.db_ssl}"`;

    // Update application port if changed
    if (config.application && config.application.server_port) {
      envVars['PORT'] = `"${config.application.server_port}"`;
    }

    // Rebuild .env file content
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Write updated .env file
    await fs.writeFile(ENV_FILE, newEnvContent + '\n');

    // Update process.env for immediate effect
    process.env.DATABASE_URL = newDatabaseUrl;
    process.env.DATABASE_HOST = config.database.db_host;
    process.env.DATABASE_PORT = config.database.db_port.toString();
    process.env.DATABASE_NAME = config.database.db_name;
    process.env.DATABASE_USER = config.database.db_user;
    process.env.DATABASE_PASSWORD = config.database.db_password;
    process.env.DATABASE_SSL = config.database.db_ssl.toString();

    if (process.env.DEBUG === 'true') {
      console.log('✅ .env file updated successfully');
      console.log('📝 New DATABASE_URL:', newDatabaseUrl.replace(config.database.db_password, '***'));
    }
  } catch (error) {
    console.error('❌ Error updating .env file:', error);
    throw error;
  }
};

// Save configuration to file
const saveConfig = async (config: AppConfig): Promise<boolean> => {
  try {
    await ensureConfigDir();
    
    // Clone config to avoid modifying original
    const configToSave = JSON.parse(JSON.stringify(config));
    
    // Encrypt sensitive fields
    if (configToSave.database && configToSave.database.db_password) {
      configToSave.database.db_password = encrypt(configToSave.database.db_password);
    }
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    
    // Update .env file with database configuration
    if (config.database) {
      await updateEnvFile(config);

      // Automatically regenerate Prisma client after .env update
      exec('npx prisma generate', { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (process.env.DEBUG === 'true') {
          if (error) {
            console.error('❌ Error running npx prisma generate:', error);
          } else {
            console.log('✅ Prisma client generated successfully.');
            if (stdout) console.log('Prisma generate output:', stdout);
            if (stderr) console.log('Prisma generate stderr:', stderr);
          }
        }
      });

      // Restart server via PM2 after DB config change
      exec('pm2 restart turnfix-server', { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (process.env.DEBUG === 'true') {
          if (error) {
            console.error('❌ Error running pm2 restart turnfix-server:', error);
          } else {
            console.log('✅ Server restarted via PM2.');
            if (stdout) console.log('PM2 restart output:', stdout);
            if (stderr) console.log('PM2 restart stderr:', stderr);
          }
        }
      });
    }

    // Update environment variables for immediate effect
    if (config.application && config.application.debug_mode !== undefined) {
      process.env.DEBUG = config.application.debug_mode ? 'true' : 'false';
    }

    return true;
  } catch (error) {
    console.error('Error saving configuration:', error);
    throw error;
  }
};

// Helper function to parse DATABASE_URL
const parseDatabaseUrl = (url: string): { host: string; port: number; database: string; user: string; password: string; ssl: boolean } | null => {
  try {
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(?:\?(.+))?/;
    const match = url.match(regex);
    
    if (!match) return null;
    
    const queryParams = match[6] ? new URLSearchParams(match[6]) : new URLSearchParams();
    const ssl = queryParams.get('sslmode') === 'require' || queryParams.get('ssl') === 'true';
    
    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4]),
      database: match[5],
      ssl
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
};

// Get default configuration
const getDefaultConfig = (): AppConfig => {
  // Parse DATABASE_URL if available
  let dbConfig = {
    db_host: 'localhost',
    db_port: 5432,
    db_name: 'turnfix',
    db_user: 'postgres',
    db_password: '',
    db_ssl: false
  };

  if (process.env.DATABASE_URL) {
    const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
    if (parsed) {
      dbConfig = {
        db_host: parsed.host,
        db_port: parsed.port,
        db_name: parsed.database,
        db_user: parsed.user,
        db_password: parsed.password,
        db_ssl: parsed.ssl
      };
      if (process.env.DEBUG === 'true') {
        console.log('🔧 DEBUG: Using DATABASE_URL with db_name:', parsed.database);
      }
    }
  } else {
    // Fallback to individual environment variables
    dbConfig = {
      db_host: process.env.DATABASE_HOST || 'localhost',
      db_port: parseInt(process.env.DATABASE_PORT || '5432'),
      db_name: process.env.DATABASE_NAME || 'turnfix',
      db_user: process.env.DATABASE_USER || 'postgres',
      db_password: process.env.DATABASE_PASSWORD || '',
      db_ssl: process.env.DATABASE_SSL === 'true'
    };
    if (process.env.DEBUG === 'true') {
      console.log('🔧 DEBUG: Using individual env vars with db_name:', process.env.DATABASE_NAME || 'turnfix');
    }
  }

  return {
    database: dbConfig,
    application: {
      app_name: 'TurnFix',
      app_version: '2.0.0',
      debug_mode: process.env.DEBUG === 'true',
      server_port: parseInt(process.env.PORT || '3001'),
      client_port: parseInt(process.env.CLIENT_PORT || '5173')
    },
    localization: {
      default_language: 'de',
      date_format: 'DD.MM.YYYY',
      timezone: 'Europe/Berlin'
    },
    security: {
      session_timeout: 480,
      password_min_length: 8,
      max_login_attempts: 5,
      require_https: false
    },
    imports: {
      max_file_size: 50,
      allowed_file_types: 'xml,csv,xlsx,pdf',
      auto_backup: true,
      validate_imports: true
    },
    printing: {
      default_page_size: 'A4',
      default_orientation: 'portrait',
      pdf_quality: 'high',
      include_watermark: false
    },
    logging: {
      log_level: 'info',
      log_retention: 30,
      enable_audit_log: true,
      log_database_queries: false
    }
  };
};

// GET /api/configuration - Load configuration
router.get('/', async (req, res) => {
  try {
    const config = await loadConfig();
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration loaded:', {
        sections: Object.keys(config),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(config);
  } catch (error: any) {
    console.error('Error loading configuration:', error);
    res.status(500).json({ 
      error: 'Failed to load configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

// POST /api/configuration/save - Save configuration
router.post('/save', async (req, res) => {
  try {
    const config: AppConfig = req.body;
    
    // Validate required fields
    if (!config.database || !config.database.db_host || !config.database.db_name) {
      return res.status(400).json({ 
        error: 'Missing required database configuration fields' 
      });
    }
    
    await saveConfig(config);
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration saved successfully:', {
        sections: Object.keys(config),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Configuration saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ 
      error: 'Failed to save configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

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

// GET /api/configuration/reset - Reset configuration to defaults
router.get('/reset', async (req, res) => {
  try {
    const defaultConfig = getDefaultConfig();
    await saveConfig(defaultConfig);
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration reset to defaults');
    }
    
    res.json({ 
      success: true, 
      message: 'Configuration reset to defaults',
      config: defaultConfig 
    });
  } catch (error: any) {
    console.error('Error resetting configuration:', error);
    res.status(500).json({ 
      error: 'Failed to reset configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

// GET /api/configuration/export - Export configuration (excluding sensitive data)
router.get('/export', async (req, res) => {
  try {
    const config = await loadConfig();
    
    // Remove sensitive information for export
    const exportConfig = JSON.parse(JSON.stringify(config));
    if (exportConfig.database) {
      delete exportConfig.database.db_password;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="turnfix-config-export.json"');
    res.json(exportConfig);
  } catch (error: any) {
    console.error('Error exporting configuration:', error);
    res.status(500).json({ 
      error: 'Failed to export configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

// POST /api/configuration/import - Import configuration
router.post('/import', async (req, res) => {
  try {
    const importedConfig: Partial<AppConfig> = req.body;
    
    // Validate imported configuration structure
    const requiredSections = ['database', 'application', 'localization'];
    for (const section of requiredSections) {
      if (!importedConfig[section as keyof AppConfig]) {
        return res.status(400).json({ 
          error: `Missing required configuration section: ${section}` 
        });
      }
    }
    
    // Merge with current configuration to preserve any missing sections
    const currentConfig = await loadConfig();
    const mergedConfig: AppConfig = { ...currentConfig, ...importedConfig } as AppConfig;
    
    await saveConfig(mergedConfig);
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration imported successfully:', {
        sections: Object.keys(importedConfig),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true,
      message: 'Configuration imported successfully'
    });
  } catch (error: any) {
    console.error('Error importing configuration:', error);
    res.status(500).json({ 
      error: 'Failed to import configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
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
    const { execSync } = require('child_process');
    
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
      
      // Run Prisma db push to create schema directly from schema.prisma
      const output = execSync('npx prisma db push --skip-generate', {
        cwd: process.cwd(),
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
      exec('npx prisma migrate deploy', { cwd: process.cwd() }, (error, stdout, stderr) => {
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


