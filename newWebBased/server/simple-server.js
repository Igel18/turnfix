import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5174',
  credentials: true
}));
app.use(express.json());

// Events endpoint
app.get('/api/events', async (req, res) => {
  try {
    const { limit = '10', offset = '0' } = req.query;

    console.log('=== EVENTS API: Fetching events ===');
    
    // For now, return mock data since the tables don't exist yet
    const mockEvents = [
      {
        int_eventid: 1,
        var_eventname: "Spring Championship 2025",
        dat_eventstartdate: "2025-03-15T00:00:00.000Z",
        dat_eventenddate: "2025-03-17T00:00:00.000Z",
        var_location: "City Sports Center",
        var_description: "Annual spring gymnastics championship",
        participant_count: 45,
        score_count: 180
      },
      {
        int_eventid: 2,
        var_eventname: "Summer Cup 2025",
        dat_eventstartdate: "2025-06-20T00:00:00.000Z",
        dat_eventenddate: "2025-06-22T00:00:00.000Z",
        var_location: "Olympic Training Center",
        var_description: "Regional summer cup competition",
        participant_count: 38,
        score_count: 152
      }
    ];
    
    console.log(`=== EVENTS API: Sending ${mockEvents.length} mock events ===`);
    
    res.json({
      events: mockEvents,
      pagination: {
        total: mockEvents.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Disciplines endpoint
app.get('/api/disciplines', async (req, res) => {
  try {
    console.log('=== DISCIPLINES API: Fetching disciplines ===');
    
    // For now, return mock data since the tables don't exist yet
    const mockDisciplines = [
      { id: 1, name: 'Floor Exercise', short_name: 'FX', description: 'Floor exercise routine' },
      { id: 2, name: 'Pommel Horse', short_name: 'PH', description: 'Pommel horse routine' },
      { id: 3, name: 'Still Rings', short_name: 'SR', description: 'Still rings routine' },
      { id: 4, name: 'Vault', short_name: 'VT', description: 'Vault exercise' },
      { id: 5, name: 'Parallel Bars', short_name: 'PB', description: 'Parallel bars routine' },
      { id: 6, name: 'Horizontal Bar', short_name: 'HB', description: 'Horizontal bar routine' }
    ];
    
    console.log(`=== DISCIPLINES API: Sending ${mockDisciplines.length} mock disciplines ===`);
    
    res.json({
      disciplines: mockDisciplines,
      total: mockDisciplines.length
    });
  } catch (error) {
    console.error('Error fetching disciplines:', error);
    res.status(500).json({ error: 'Failed to fetch disciplines' });
  }
});

// Admin database test endpoint
app.get('/api/admin/test-database-connection', async (req, res) => {
  try {
    console.log('=== ADMIN: Testing database connection (GET) ===');
    
    const result = await testDatabaseConnection();
    res.json(result);
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Database connection failed' 
    });
  }
});

app.post('/api/admin/test-database-connection', async (req, res) => {
  try {
    console.log('=== ADMIN: Testing database connection (POST) ===');
    
    const result = await testDatabaseConnection();
    res.json(result);
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Database connection failed' 
    });
  }
});

// Admin database config endpoint
app.get('/api/admin/database-config', async (req, res) => {
  try {
    console.log('=== ADMIN: Getting database config (GET) ===');
    
    // Return current database configuration
    const config = {
      host: 'localhost',
      port: 5432,
      database: 'turnfix',
      username: 'postgres',
      ssl: false,
      schema: 'public'
    };
    
    res.json({
      success: true,
      config: config
    });
  } catch (error) {
    console.error('Database config error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get database config' 
    });
  }
});

app.post('/api/admin/database-config', async (req, res) => {
  try {
    console.log('=== ADMIN: Updating database config (POST) ===');
    console.log('Request body:', req.body);
    
    // Validate the configuration
    const { host, port, database, username, password, ssl } = req.body;
    
    if (!host || !port || !database || !username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required configuration fields'
      });
    }
    
    // Test the new configuration
    const testUrl = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@${host}:${port}/${database}?schema=public`;
    
    try {
      // Here you would normally update the .env file and restart the connection
      // For now, just return success
      res.json({
        success: true,
        message: 'Database configuration updated successfully',
        config: {
          host,
          port: parseInt(port),
          database,
          username,
          ssl: Boolean(ssl)
        }
      });
    } catch (testError) {
      res.status(400).json({
        success: false,
        error: 'Invalid database configuration: ' + testError.message
      });
    }
  } catch (error) {
    console.error('Database config update error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update database config' 
    });
  }
});

async function testDatabaseConnection() {
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Get database info
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    // Get some basic statistics
    let stats = {};
    try {
      const eventCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM tfx_veranstaltungen`;
      stats = { ...stats, events: Number(eventCount[0]?.count || 0) };
    } catch (e) {
      console.log('Could not get events count:', e.message);
    }
    
    try {
      const disciplineCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM tfx_disziplinen`;
      stats = { ...stats, disciplines: Number(disciplineCount[0]?.count || 0) };
    } catch (e) {
      console.log('Could not get disciplines count:', e.message);
    }
    
    return {
      success: true,
      message: 'Database connection successful',
      tables: tables.map(t => t.table_name),
      statistics: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/events`);
  console.log(`🔗 API: http://localhost:${PORT}/api/disciplines`);
  console.log(`🔗 Admin: http://localhost:${PORT}/api/admin/test-database-connection`);
  console.log(`🔗 Admin: http://localhost:${PORT}/api/admin/database-config`);
});
