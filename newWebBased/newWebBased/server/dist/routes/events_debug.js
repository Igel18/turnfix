"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authBypass_1 = require("../middleware/authBypass");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all events - using tfx_veranstaltungen (the actual events table)
router.get('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const { search, limit = '50', offset = '0' } = req.query;
        let whereClause = '';
        const params = [];
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
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
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
        params.push(parseInt(limit), parseInt(offset));
        const events = await prisma.$queryRawUnsafe(dataQuery, ...params);
        // Convert BigInt values and dates for JSON serialization to match client expectations
        const formattedEvents = events.map((event) => ({
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
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Get event by ID
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
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
        const events = await prisma.$queryRawUnsafe(query, id);
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
    }
    catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get event participants
router.get('/:id/participants', authBypass_1.authenticateToken, async (req, res) => {
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
        const participants = await prisma.$queryRawUnsafe(query, id);
        // Convert BigInt values and dates for JSON serialization
        const formattedParticipants = participants.map((participant) => ({
            ...participant,
            int_teilnehmerid: Number(participant.int_teilnehmerid),
            birth_date: participant.birth_date ? new Date(participant.birth_date).toISOString().split('T')[0] : null
        }));
        res.json(formattedParticipants);
    }
    catch (error) {
        console.error('Error fetching event participants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=events_debug.js.map