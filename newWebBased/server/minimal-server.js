const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        res.json({ success: true, result });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Simple regions endpoint with real database
app.get('/api/regions', async (req, res) => {
    try {
        console.log('Fetching regions...');
        const regions = await prisma.$queryRaw`
            SELECT int_regionid, var_name, var_kuerzel 
            FROM tfx_gaue 
            ORDER BY var_name 
            LIMIT 10
        `;
        console.log('Regions fetched:', regions.length);
        res.json(regions);
    } catch (error) {
        console.error('Error fetching regions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Simple disciplines endpoint with real database
app.get('/api/disciplines', async (req, res) => {
    try {
        console.log('Fetching disciplines...');
        const disciplines = await prisma.$queryRaw`
            SELECT int_disziplinid as id, var_name, var_kuerzel 
            FROM tfx_disziplinen 
            ORDER BY var_name
        `;
        console.log('Disciplines fetched:', disciplines.length);
        res.json(disciplines);
    } catch (error) {
        console.error('Error fetching disciplines:', error);
        res.status(500).json({ error: error.message });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Minimal Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
});
