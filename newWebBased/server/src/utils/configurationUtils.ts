/**
 * Configuration utility functions for TurnFix application.
 * 
 * Extracted from routes/configuration.ts for Separation of Concerns.
 * Contains: encryption, config file I/O, .env management, DATABASE_URL parsing, defaults.
 */

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { exec } from 'child_process';

// Configuration file path
export const CONFIG_FILE = path.join(process.cwd(), 'config', 'app-config.json');
export const CONFIG_DIR = path.dirname(CONFIG_FILE);

// .env file path
export const ENV_FILE = path.join(process.cwd(), '.env');

// Encryption key for sensitive data (in production, use environment variable)
export const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'turnfix-config-key-2024-secret-key';

// Configuration interface
export interface AppConfig {
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
    label_rows?: number;
    label_columns?: number;
    label_width?: number;
    label_height?: number;
    label_margin_top?: number;
    label_margin_bottom?: number;
    label_margin_left?: number;
    label_margin_right?: number;
    label_show_borders?: boolean;
  };
  logging: {
    log_level: string;
    log_retention: number;
    enable_audit_log: boolean;
    log_database_queries: boolean;
  };
}

/**
 * Encrypt sensitive text using AES-256-CBC
 */
export const encrypt = (text: string): string => {
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

/**
 * Decrypt text encrypted with encrypt()
 */
export const decrypt = (text: string): string => {
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

/**
 * Ensure config directory exists
 */
export const ensureConfigDir = async (): Promise<void> => {
  try {
    await fs.access(CONFIG_DIR);
  } catch (error) {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
};

/**
 * Parse DATABASE_URL into components
 */
export const parseDatabaseUrl = (url: string): { host: string; port: number; database: string; user: string; password: string; ssl: boolean } | null => {
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

/**
 * Get default configuration, reading from environment variables if available
 */
export const getDefaultConfig = (): AppConfig => {
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
      include_watermark: false,
      label_rows: 16,
      label_columns: 4,
      label_width: 48.5,
      label_height: 16.9,
      label_margin_top: 13,
      label_margin_bottom: 13,
      label_margin_left: 8,
      label_margin_right: 8,
      label_show_borders: true
    },
    logging: {
      log_level: 'info',
      log_retention: 30,
      enable_audit_log: true,
      log_database_queries: false
    }
  };
};

/**
 * Load configuration from file
 */
export const loadConfig = async (): Promise<AppConfig> => {
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

/**
 * Update .env file with new database configuration
 */
export const updateEnvFile = async (config: AppConfig): Promise<void> => {
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

/**
 * Save configuration to file, update .env, and trigger Prisma regeneration + PM2 restart
 */
export const saveConfig = async (config: AppConfig): Promise<boolean> => {
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
