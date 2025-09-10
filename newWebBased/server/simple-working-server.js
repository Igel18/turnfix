const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Disciplines route
app.get('/api/disciplines', async (req, res) => {
    try {
        console.log('📚 Fetching disciplines...');
        
        const disciplines = await prisma.$queryRaw`
            SELECT 
                int_disziplinenid as id,
                var_name as name,
                var_kurz1 as shortName,
                var_kurz2 as displayName,
                bol_m as maleAllowed,
                bol_w as femaleAllowed,
                var_icon as icon,
                var_formel as formula,
                var_maske as inputMask,
                var_einheit as unit,
                int_sportid as sportId
            FROM tfx_disziplinen 
            ORDER BY var_name ASC
            LIMIT 50
        `;
        
        console.log(`✅ Found ${disciplines.length} disciplines`);
        res.json(disciplines);
    } catch (error) {
        console.error('❌ Error fetching disciplines:', error);
        res.status(500).json({ error: 'Failed to fetch disciplines' });
    }
});

// Regions route
app.get('/api/regions', async (req, res) => {
    try {
        console.log('🌍 Fetching regions...');
        
        const regions = await prisma.$queryRaw`
            SELECT 
                g.int_gaueid,
                g.var_name,
                g.var_kuerzel,
                g.int_verbaendeid,
                v.var_name as verband_name,
                v.var_kuerzel as verband_kuerzel
            FROM tfx_gaue g
            LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
            ORDER BY g.var_name ASC
        `;
        
        console.log(`✅ Found ${regions.length} regions`);
        res.json({ 
            regions,
            pagination: {
                total: regions.length,
                limit: 50,
                offset: 0,
                hasMore: false
            }
        });
    } catch (error) {
        console.error('❌ Error fetching regions:', error);
        res.status(500).json({ error: 'Failed to fetch regions' });
    }
});

// Verbaende (Associations) route
app.get('/api/regions/data/verbaende', async (req, res) => {
    try {
        console.log('🏛️ Fetching verbaende (associations)...');
        
        const verbaende = await prisma.$queryRaw`
            SELECT 
                int_verbaendeid,
                var_name,
                var_kuerzel
            FROM tfx_verbaende
            ORDER BY var_name ASC
        `;
        
        console.log(`✅ Found ${verbaende.length} verbaende`);
        res.json(verbaende);
    } catch (error) {
        console.error('❌ Error fetching verbaende:', error);
        res.status(500).json({ error: 'Failed to fetch verbaende' });
    }
});

// Events route
app.get('/api/events', async (req, res) => {
    try {
        console.log('🎪 Fetching events...');
        
        const { limit = '50', offset = '0', search } = req.query;
        
        let whereClause = '';
        let params = [];
        let paramIndex = 1;
        
        if (search) {
            whereClause = `WHERE LOWER(var_name) LIKE LOWER($${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM tfx_veranstaltungen
            ${whereClause}
        `;
        
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
        const total = parseInt(countResult[0]?.total || '0');
        
        // Get events data
        const dataQuery = `
            SELECT 
                int_veranstaltungenid as int_eventid,
                var_name as var_eventname,
                dat_von as dat_eventstartdate,
                dat_bis as dat_eventenddate,
                var_veranstalter as var_location,
                COALESCE(txt_hinweise, '') as var_description,
                (SELECT COUNT(*) FROM tfx_wertungen wr
                 JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
                 WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
                (SELECT COUNT(*) FROM tfx_wertungen wr
                 JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
                 WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
            FROM tfx_veranstaltungen v
            ${whereClause}
            ORDER BY dat_von DESC, var_name ASC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        const events = await prisma.$queryRawUnsafe(dataQuery, ...params);
        
        // Format events for frontend - add status based on dates
        const formattedEvents = events.map((event) => {
            // Determine status based on dates
            const now = new Date();
            const startDate = new Date(event.dat_eventstartdate);
            const endDate = new Date(event.dat_eventenddate);
            
            let status = 'upcoming';
            if (now > endDate) {
                status = 'completed';
            } else if (now >= startDate && now <= endDate) {
                status = 'active';
            }
            
            return {
                ...event,
                int_eventid: Number(event.int_eventid),
                participant_count: Number(event.participant_count || 0),
                score_count: Number(event.score_count || 0),
                dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
                dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
                status
            };
        });
        
        console.log(`✅ Found ${formattedEvents.length} events`);
        
        res.json({
            events: formattedEvents,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });
    } catch (error) {
        console.error('❌ Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Get event by ID
app.get('/api/events/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        
        console.log(`🎪 Fetching event with ID ${id}...`);
        
        const events = await prisma.$queryRaw`
            SELECT 
                int_veranstaltungenid as int_eventid,
                var_name as var_eventname,
                dat_von as dat_eventstartdate,
                dat_bis as dat_eventenddate,
                var_veranstalter as var_location,
                COALESCE(txt_hinweise, '') as var_description,
                (SELECT COUNT(*) FROM tfx_wertungen wr
                 JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
                 WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
                (SELECT COUNT(*) FROM tfx_wertungen wr
                 JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
                 WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
            FROM tfx_veranstaltungen v
            WHERE int_veranstaltungenid = ${id}
        `;
        
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const event = events[0];
        
        // Determine status based on dates
        const now = new Date();
        const startDate = new Date(event.dat_eventstartdate);
        const endDate = new Date(event.dat_eventenddate);
        
        let status = 'upcoming';
        if (now > endDate) {
            status = 'completed';
        } else if (now >= startDate && now <= endDate) {
            status = 'active';
        }
        
        const formattedEvent = {
            ...event,
            int_eventid: Number(event.int_eventid),
            participant_count: Number(event.participant_count || 0),
            score_count: Number(event.score_count || 0),
            dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
            dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
            status
        };
        
        console.log(`✅ Found event: ${formattedEvent.var_eventname}`);
        res.json(formattedEvent);
    } catch (error) {
        console.error('❌ Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Simple server running on port ${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
});

// Handle process termination
process.on('SIGINT', async () => {
    console.log('🔄 Shutting down server...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});
