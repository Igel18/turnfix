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

    const dataQuery = `
      SELECT 
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        v.var_veranstalter as var_location,
        '' as var_description,
        0 as participant_count,
        0 as score_count
      FROM tfx_veranstaltungen v
      ORDER BY v.dat_von DESC, v.var_name
      LIMIT $1 OFFSET $2
    `;
    
    const events = await (prisma as any).$queryRawUnsafe(dataQuery, parseInt(limit as string), parseInt(offset as string));
    
    // Format events
    const formattedEvents = events.map((event: any) => ({
      int_eventid: Number(event.int_eventid),
      var_eventname: event.var_eventname,
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
      var_location: event.var_location,
      var_description: event.var_description,
      participant_count: Number(event.participant_count),
      score_count: Number(event.score_count)
    }));
    
    console.log(`=== SIMPLE EVENTS API: Sending ${formattedEvents.length} events ===`);
    console.log('Sample event:', JSON.stringify(formattedEvents[0], null, 2));
    
    res.json({
      events: formattedEvents,
      pagination: {
        total: formattedEvents.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/events`);
});
