const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Configuration file path
const CONFIG_FILE = path.join(process.cwd(), 'config', 'app-config.json');
const CONFIG_DIR = path.dirname(CONFIG_FILE);

// Encryption key for sensitive data (in production, use environment variable)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'turnfix-config-key-2024-secret-key';

// Utility functions for encryption/decryption
const encrypt = (text) => {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decrypt = (text) => {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
};

// Ensure config directory exists
const ensureConfigDir = async () => {
  try {
    await fs.access(CONFIG_DIR);
  } catch (error) {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
};

// Load configuration from file
const loadConfig = async () => {
  try {
    await ensureConfigDir();
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    
    // Decrypt sensitive fields
    if (config.database && config.database.db_password) {
      config.database.db_password = decrypt(config.database.db_password);
    }
    
    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Return default configuration if file doesn't exist
      return getDefaultConfig();
    }
    throw error;
  }
};

// Save configuration to file
const saveConfig = async (config) => {
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

// Get default configuration
const getDefaultConfig = () => {
  return {
    database: {
      db_host: process.env.DATABASE_HOST || 'localhost',
      db_port: parseInt(process.env.DATABASE_PORT) || 5432,
      db_name: process.env.DATABASE_NAME || 'turnfix',
      db_user: process.env.DATABASE_USER || 'postgres',
      db_password: process.env.DATABASE_PASSWORD || '',
      db_ssl: process.env.DATABASE_SSL === 'true' || false
    },
    application: {
      app_name: 'TurnFix',
      app_version: '2.0.0',
      debug_mode: process.env.DEBUG === 'true' || false,
      server_port: parseInt(process.env.PORT) || 3001,
      client_port: parseInt(process.env.CLIENT_PORT) || 5173
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
  } catch (error) {
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
    const config = req.body;
    
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
  } catch (error) {
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
    const { PrismaClient } = require('@prisma/client');
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
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      details: process.env.DEBUG === 'true' ? error.message : 'Please check your database configuration'
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
  } catch (error) {
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
  } catch (error) {
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
    const importedConfig = req.body;
    
    // Validate imported configuration structure
    const requiredSections = ['database', 'application', 'localization'];
    for (const section of requiredSections) {
      if (!importedConfig[section]) {
        return res.status(400).json({ 
          error: `Missing required configuration section: ${section}` 
        });
      }
    }
    
    // Merge with current configuration to preserve any missing sections
    const currentConfig = await loadConfig();
    const mergedConfig = { ...currentConfig, ...importedConfig };
    
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
  } catch (error) {
    console.error('Error importing configuration:', error);
    res.status(500).json({ 
      error: 'Failed to import configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

module.exports = router;
