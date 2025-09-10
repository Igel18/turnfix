import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Get all events - using tfx_veranstaltungen (the actual events table)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE LOWER(v.var_name) LIKE LOWER($${paramIndex}) OR LOWER(v.var_veranstalter) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_veranstaltungen v
      ${whereClause}
    `;
    
    const countResult = await (prisma as any).$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        v.var_veranstalter as var_location,
        '' as var_description,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      ${whereClause}
      ORDER BY v.dat_von DESC, v.var_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit as string), parseInt(offset as string));
    const events = await (prisma as any).$queryRawUnsafe(dataQuery, ...params);
    
    // Convert BigInt values and dates for JSON serialization to match client expectations
    const formattedEvents = events.map((event: any) => ({
      ...event,
      int_eventid: Number(event.int_eventid),
      participant_count: Number(event.participant_count),
      score_count: Number(event.score_count),
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null
    }));
    
    console.log(`=== EVENTS DEBUG: Sending ${formattedEvents.length} events to client ===`);
    console.log('First event sample:', JSON.stringify(formattedEvents[0], null, 2));
    
    const response = {
      events: formattedEvents,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      }
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get event by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const query = `
      SELECT 
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        v.var_veranstalter as var_location,
        COALESCE(v.txt_hinweise, '') as var_description,
        (SELECT COUNT(*) FROM tfx_teilnehmer t 
         JOIN tfx_wettkaempfe w ON t.int_wkid = w.int_wettkaempfeid 
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wkid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      WHERE v.int_veranstaltungenid = $1
    `;
    
    const events = await (prisma as any).$queryRawUnsafe(query, id);
    
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];
    const formattedEvent = {
      ...event,
      int_eventid: Number(event.int_eventid),
      participant_count: Number(event.participant_count),
      score_count: Number(event.score_count),
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null
    };

    res.json(formattedEvent);
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event participants
router.get('/:id/participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const query = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname as first_name,
        t.var_nachname as last_name,
        t.dat_geburtstag as birth_date,
        w.var_name as competition_name,
        w.var_nummer as competition_number
      FROM tfx_teilnehmer t
      JOIN tfx_wettkaempfe w ON t.int_wkid = w.int_wettkaempfeid
      WHERE w.int_veranstaltungenid = $1
      ORDER BY t.var_nachname, t.var_vorname
    `;
    
    const participants = await (prisma as any).$queryRawUnsafe(query, id);
    
    // Convert BigInt values and dates for JSON serialization
    const formattedParticipants = participants.map((participant: any) => ({
      ...participant,
      int_teilnehmerid: Number(participant.int_teilnehmerid),
      birth_date: participant.birth_date ? new Date(participant.birth_date).toISOString().split('T')[0] : null
    }));

    res.json(formattedParticipants);
  } catch (error: any) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
