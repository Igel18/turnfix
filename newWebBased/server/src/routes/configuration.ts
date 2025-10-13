import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Configuration file path
const CONFIG_FILE = path.join(process.cwd(), 'config', 'app-config.json');
const CONFIG_DIR = path.dirname(CONFIG_FILE);

// Encryption key for sensitive data (in production, use environment variable)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'turnfix-config-key-2024-secret-key';

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
      message: 'Configuration imported successfully',
      config: mergedConfig 
    });
  } catch (error: any) {
    console.error('Error importing configuration:', error);
    res.status(500).json({ 
      error: 'Failed to import configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

export default router;
