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

const PORT = 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Areas: http://localhost:${PORT}/api/areas`);
  console.log(`🔗 Sports: http://localhost:${PORT}/api/sports`);  
  console.log(`🔗 Disciplines: http://localhost:${PORT}/api/disciplines`);
});
