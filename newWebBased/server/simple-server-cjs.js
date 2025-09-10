const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: 'development'
    });
});

// Mock API endpoints
app.get('/api/disciplines', (req, res) => {
    res.json([
        { id: 1, var_name: 'Boden', var_kuerzel: 'FX' },
        { id: 2, var_name: 'Pferd', var_kuerzel: 'PH' },
        { id: 3, var_name: 'Ringe', var_kuerzel: 'SR' },
        { id: 4, var_name: 'Sprung', var_kuerzel: 'VT' },
        { id: 5, var_name: 'Barren', var_kuerzel: 'PB' },
        { id: 6, var_name: 'Reck', var_kuerzel: 'HB' }
    ]);
});

app.get('/api/regions', (req, res) => {
    res.json([
        { int_regionid: 1, var_name: 'Bayern', var_kuerzel: 'BAY' },
        { int_regionid: 2, var_name: 'Baden-Württemberg', var_kuerzel: 'BW' },
        { int_regionid: 3, var_name: 'Nordrhein-Westfalen', var_kuerzel: 'NRW' },
        { int_regionid: 4, var_name: 'Hessen', var_kuerzel: 'HE' },
        { int_regionid: 5, var_name: 'Niedersachsen', var_kuerzel: 'NI' }
    ]);
});

app.get('/api/regions/data/verbaende', (req, res) => {
    res.json([
        { int_verbaendeid: 1, var_name: 'Bayerischer Turnverband', var_kuerzel: 'BTV' },
        { int_verbaendeid: 2, var_name: 'Schwäbischer Turnerbund', var_kuerzel: 'STB' },
        { int_verbaendeid: 3, var_name: 'Westdeutscher Turnerbund', var_kuerzel: 'WTB' },
        { int_verbaendeid: 4, var_name: 'Hessischer Turnverband', var_kuerzel: 'HTV' },
        { int_verbaendeid: 5, var_name: 'Niedersächsischer Turner-Bund', var_kuerzel: 'NTB' }
    ]);
});

app.get('/api/events', (req, res) => {
    res.json([
        {
            int_turnveranstaltungid: 1,
            var_name: 'Landesmeisterschaft Bayern 2024',
            var_veranstaltungsort: 'München',
            dt_datum: '2024-06-15',
            var_status: 'Geplant'
        },
        {
            int_turnveranstaltungid: 2,
            var_name: 'Bezirksliga Oberbayern',
            var_veranstaltungsort: 'Augsburg',
            dt_datum: '2024-07-20',
            var_status: 'Aktiv'
        }
    ]);
});

app.get('/api/admin/database-config', (req, res) => {
    res.json({
        host: 'localhost',
        port: 5432,
        database: 'turnfix',
        username: 'postgres',
        schema: 'public'
    });
});

app.post('/api/admin/database-config', (req, res) => {
    res.json({
        success: true,
        message: 'Database configuration updated successfully'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Simple Mock Server running on port ${PORT}`);
    console.log(`📊 Environment: development`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});
