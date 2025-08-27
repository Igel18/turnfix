// Load environment variables
require('dotenv').config();

// Minimal test server to validate our routes
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test our new areas route
app.get('/api/areas', async (req, res) => {
  try {
    const areas = await prisma.tfx_bereiche.findMany({ take: 10 });
    res.json({ areas: areas, count: areas.length });
  } catch (error) {
    console.error('Areas API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Test our new sports route  
app.get('/api/sports', async (req, res) => {
  try {
    const sports = await prisma.tfx_sport.findMany({ take: 10 });
    res.json({ sports: sports, count: sports.length });
  } catch (error) {
    console.error('Sports API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Test disciplines (existing route)
app.get('/api/disciplines', async (req, res) => {
  try {
    const disciplines = await prisma.tfx_disziplinen.findMany({ 
      take: 10,
      select: {
        int_disziplinenid: true,
        var_name: true,
        var_kurz1: true,
        int_sportid: true
      }
    });
    res.json({ disciplines: disciplines, count: disciplines.length });
  } catch (error) {
    console.error('Disciplines API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Admin routes - handle both GET and POST
app.route('/api/admin/test-database-connection')
  .get(async (req, res) => {
    await testDatabaseConnection(req, res);
  })
  .post(async (req, res) => {
    await testDatabaseConnection(req, res);
  });

async function testDatabaseConnection(req, res) {
  try {
    // Test the database connection by running a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Try to get some basic stats, but handle table not found errors
    let statistics = {};
    
    try {
      const areas = await prisma.tfx_gaue.count();
      statistics.areas = areas;
    } catch (error) {
      statistics.areas = `Error: ${error.message}`;
    }
    
    try {
      const sports = await prisma.tfx_sport.count();
      statistics.sports = sports;
    } catch (error) {
      statistics.sports = `Error: ${error.message}`;
    }
    
    try {
      const disciplines = await prisma.tfx_disziplinen.count();
      statistics.disciplines = disciplines;
    } catch (error) {
      statistics.disciplines = `Error: ${error.message}`;
    }
    
    // List available tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name`;
    
    res.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      statistics: statistics,
      available_tables: tables,
      test_query_result: result
    });
  } catch (error) {
    console.error('Database connection test error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

const PORT = 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Areas: http://localhost:${PORT}/api/areas`);
  console.log(`🔗 Sports: http://localhost:${PORT}/api/sports`);  
  console.log(`🔗 Disciplines: http://localhost:${PORT}/api/disciplines`);
  console.log(`🔧 Admin DB Test: http://localhost:${PORT}/api/admin/test-database-connection`);
});
