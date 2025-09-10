import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const router = Router();
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema: string;
}

// Helper function to generate DATABASE_URL
function generateDatabaseUrl(config: DatabaseConfig): string {
  return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?schema=${config.schema}`;
}

// Helper function to parse DATABASE_URL
function parseDatabaseUrl(url: string): DatabaseConfig | null {
  try {
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)\?schema=(.+)/;
    const match = url.match(regex);
    
    if (!match) return null;
    
    return {
      username: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4]),
      database: match[5],
      schema: match[6]
    };
  } catch (error) {
    return null;
  }
}

// Helper function to read current .env file
async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await readFile(envPath, 'utf-8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^"(.*)"$/, '$1');
          envVars[key.trim()] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    return {};
  }
}

// Helper function to write .env file
async function writeEnvFile(envVars: Record<string, string>): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');
  
  await writeFile(envPath, envContent, 'utf-8');
}

// GET /api/admin/database-config - Get current database configuration
router.get('/database-config', async (req: Request, res: Response) => {
  try {
    const envVars = await readEnvFile();
    const databaseUrl = envVars.DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return res.status(404).json({ 
        message: 'No database configuration found',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'turnfix3',
          username: 'postgres',
          password: '',
          schema: 'public'
        }
      });
    }
    
    const config = parseDatabaseUrl(databaseUrl);
    
    if (!config) {
      return res.status(400).json({ message: 'Invalid database URL format' });
    }
    
    // Don't send the password back for security
    const safeConfig = { ...config, password: '' };
    
    res.json(safeConfig);
  } catch (error) {
    console.error('Error reading database configuration:', error);
    res.status(500).json({ message: 'Failed to read database configuration' });
  }
});

// POST /api/admin/database-config - Save database configuration
router.post('/database-config', async (req: Request, res: Response) => {
  try {
    const config: DatabaseConfig = req.body;
    
    // Validate required fields
    if (!config.host || !config.port || !config.database || !config.username || !config.schema) {
      return res.status(400).json({ message: 'Missing required configuration fields' });
    }
    
    // Generate new DATABASE_URL
    const newDatabaseUrl = generateDatabaseUrl(config);
    
    // Read current .env file
    const envVars = await readEnvFile();
    
    // Update DATABASE_URL
    envVars.DATABASE_URL = newDatabaseUrl;
    
    // Write updated .env file
    await writeEnvFile(envVars);
    
    res.json({ 
      message: 'Database configuration saved successfully. Please restart the server for changes to take effect.',
      databaseUrl: newDatabaseUrl.replace(/:([^@]+)@/, ':***@') // Hide password in response
    });
  } catch (error) {
    console.error('Error saving database configuration:', error);
    res.status(500).json({ message: 'Failed to save database configuration' });
  }
});

// POST /api/admin/test-database-connection - Test database connection
router.post('/test-database-connection', async (req: Request, res: Response) => {
  let testPrisma: PrismaClient | null = null;
  
  try {
    const config: DatabaseConfig = req.body;
    
    // Validate required fields
    if (!config.host || !config.port || !config.database || !config.username || !config.schema) {
      return res.status(400).json({ message: 'Missing required configuration fields' });
    }
    
    // Generate test DATABASE_URL
    const testDatabaseUrl = generateDatabaseUrl(config);
    
    // Create a new Prisma client with the test configuration
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      }
    });
    
    // Test the connection by running a simple query
    await testPrisma.$queryRaw`SELECT 1 as test`;
    
    // Try to check if our tables exist
    const tables = await testPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ${config.schema} 
      AND table_type = 'BASE TABLE'
      LIMIT 5
    ` as any[];
    
    await testPrisma.$disconnect();
    
    res.json({ 
      message: `Connection successful! Found ${tables.length} tables in schema '${config.schema}'.`,
      tablesFound: tables.length,
      sampleTables: tables.slice(0, 3).map((t: any) => t.table_name)
    });
  } catch (error) {
    if (testPrisma) {
      await testPrisma.$disconnect();
    }
    
    console.error('Database connection test failed:', error);
    
    let errorMessage = 'Connection failed';
    if (error instanceof Error) {
      if (error.message.includes('password authentication failed')) {
        errorMessage = 'Authentication failed: Invalid username or password';
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        errorMessage = 'Database does not exist';
      } else if (error.message.includes('connection refused')) {
        errorMessage = 'Connection refused: Is PostgreSQL running?';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout: Check host and port';
      } else {
        errorMessage = `Connection failed: ${error.message}`;
      }
    }
    
    res.status(400).json({ message: errorMessage });
  }
});

// GET /api/admin/server-status - Get server and database status
router.get('/server-status', async (req: Request, res: Response) => {
  try {
    const envVars = await readEnvFile();
    const databaseUrl = envVars.DATABASE_URL || process.env.DATABASE_URL;
    
    let dbStatus = 'Not configured';
    let dbConfig = null;
    
    if (databaseUrl) {
      dbConfig = parseDatabaseUrl(databaseUrl);
      if (dbConfig) {
        dbConfig.password = '***'; // Hide password
        dbStatus = 'Configured';
      }
    }
    
    res.json({
      server: {
        port: process.env.PORT || 3002,
        nodeEnv: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      },
      database: {
        status: dbStatus,
        config: dbConfig
      }
    });
  } catch (error) {
    console.error('Error getting server status:', error);
    res.status(500).json({ message: 'Failed to get server status' });
  }
});

export default router;
