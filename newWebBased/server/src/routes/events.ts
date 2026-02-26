/**
 * Event CRUD Routes — Manages gymnastics events (Veranstaltungen).
 *
 * Routes:
 *   GET    /              - List all events (with pagination + search)
 *   POST   /              - Create new event
 *   PUT    /:id           - Update event
 *   DELETE /:id           - Delete event (with cascade option)
 *   GET    /:id           - Get single event by ID
 *   GET    /:id/statistics - Event statistics
 *   GET    /:id/participants - Deprecated compatibility redirect
 *   PUT    /:id/generate-start-numbers - Auto-assign start numbers
 *   POST   /:id/export-timeplan - Export time plan (placeholder)
 *
 * GymNet XML import routes are delegated to gymnetImport.ts.
 *
 * Refactored from original 3179-line monolith (SoC).
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { z } from 'zod';
import prisma from '../lib/prisma';
import gymnetImportRouter from './gymnetImport';
import { generateStartNumbersForEvent } from '../utils/startNumberUtils';

const router = Router();

// Mount GymNet import routes (POST /import-gymnet, GET /import-gymnet-test, POST /import-test)
router.use('/', gymnetImportRouter);

// ============================================================================
// Start Number Generation
// ============================================================================

router.put('/:id/generate-start-numbers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const count = await generateStartNumbersForEvent(eventId);

    return res.json({ success: true, count });
  } catch (error) {
    console.error('Error generating start numbers:', error);
    return res.status(500).json({ error: 'Failed to generate start numbers' });
  }
});

// ============================================================================
// Validation Schemas
// ============================================================================

const createEventSchema = z.object({
  var_eventname: z.string().min(1, 'Event name is required'),
  dat_eventstartdate: z.string().min(1, 'Start date is required'),
  dat_eventenddate: z.string().min(1, 'End date is required'),
  var_location: z.string().min(1, 'Location is required'),
  var_description: z.string().nullable().optional(),
  var_veranstalter: z.string().nullable().optional(),
  dat_meldeschluss: z.string().nullable().optional(),
  int_wettkampforteid: z.number().nullable().optional(),
  int_ansprechpartner: z.number().nullable().optional(),
  int_meldung_an: z.number().nullable().optional(),
  int_kampfrichter: z.number().nullable().optional(),
  int_helfer: z.number().nullable().optional(),
  int_edv: z.number().nullable().optional(),
  txt_hinweise: z.string().nullable().optional()
});

const updateEventSchema = createEventSchema.partial();

// ============================================================================
// GET / — List All Events
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
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
      SELECT COUNT(*) as total FROM tfx_veranstaltungen v ${whereClause}
    `;
    const countResult = await (prisma as any).$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        COALESCE(wf.var_name, v.var_veranstalter, '') as var_location,
        COALESCE(v.txt_hinweise, '') as var_description,
        v.var_veranstalter,
        wf.var_name as venue_name,
        wf.var_adresse as venue_address,
        wf.var_plz as venue_postal_code,
        wf.var_ort as venue_city,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count,
        (SELECT COUNT(DISTINCT t.int_vereineid) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         JOIN tfx_teilnehmer t ON wr.int_teilnehmerid = t.int_teilnehmerid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid AND t.int_vereineid IS NOT NULL) as club_count
      FROM tfx_veranstaltungen v
      LEFT JOIN tfx_wettkampforte wf ON v.int_wettkampforteid = wf.int_wettkampforteid
      ${whereClause}
      ORDER BY v.dat_von DESC, v.var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit as string), parseInt(offset as string));
    const events = await (prisma as any).$queryRawUnsafe(dataQuery, ...params);

    const formattedEvents = events.map((event: any) => {
      const now = new Date();
      const startDate = new Date(event.dat_eventstartdate);
      const endDate = new Date(event.dat_eventenddate);

      let status = 'upcoming';
      if (now > endDate) status = 'completed';
      else if (now >= startDate && now <= endDate) status = 'active';

      return {
        ...event,
        int_eventid: Number(event.int_eventid),
        participant_count: Number(event.participant_count || 0),
        score_count: Number(event.score_count || 0),
        club_count: Number(event.club_count || 0),
        dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
        dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
        status
      };
    });

    console.log(`=== EVENTS: Sending ${formattedEvents.length} events to client ===`);
    console.log('First event sample:', formattedEvents[0]?.var_eventname || 'No events available');

    res.json({
      events: formattedEvents,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      }
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================================================
// POST / — Create New Event
// ============================================================================

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createEventSchema.parse(req.body);

    const startDate = new Date(validatedData.dat_eventstartdate);
    const endDate = new Date(validatedData.dat_eventenddate);
    const registrationDeadline = validatedData.dat_meldeschluss ? new Date(validatedData.dat_meldeschluss) : null;

    let venueId = 1;
    if (validatedData.var_location) {
      const venue = await prisma.tfx_wettkampforte.findFirst({
        where: { var_name: validatedData.var_location }
      });
      if (venue) {
        venueId = venue.int_wettkampforteid;
        console.log(`🏢 Found venue for new event: ${venue.var_name} (ID: ${venue.int_wettkampforteid})`);
      }
    }

    const newEvent = await prisma.tfx_veranstaltungen.create({
      data: {
        var_name: validatedData.var_eventname,
        dat_von: startDate,
        dat_bis: endDate,
        txt_hinweise: validatedData.var_description || null,
        dat_meldeschluss: registrationDeadline,
        int_wettkampforteid: venueId,
        int_runde: 1
      }
    });

    const venue = newEvent.int_wettkampforteid !== null
      ? await prisma.tfx_wettkampforte.findUnique({
          where: { int_wettkampforteid: newEvent.int_wettkampforteid }
        })
      : null;

    const response = {
      int_eventid: newEvent.int_veranstaltungenid,
      var_eventname: newEvent.var_name,
      dat_eventstartdate: newEvent.dat_von?.toISOString(),
      dat_eventenddate: newEvent.dat_bis?.toISOString(),
      var_location: venue?.var_name || '',
      var_description: newEvent.txt_hinweise || '',
      dat_meldeschluss: newEvent.dat_meldeschluss?.toISOString() || null,
      var_veranstalter: newEvent.var_veranstalter,
      participant_count: 0,
      score_count: 0
    };

    console.log('✅ Event created successfully:', {
      id: newEvent.int_veranstaltungenid,
      name: newEvent.var_name,
      dates: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`
    });

    res.status(201).json({ event: response });
  } catch (error: any) {
    console.error('Error creating event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================================================
// PUT /:id — Update Event
// ============================================================================

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const validatedData = updateEventSchema.parse(req.body);

    const updateData: any = {};

    if (validatedData.var_eventname !== undefined) updateData.var_name = validatedData.var_eventname;
    if (validatedData.dat_eventstartdate !== undefined) updateData.dat_von = new Date(validatedData.dat_eventstartdate);
    if (validatedData.dat_eventenddate !== undefined) updateData.dat_bis = new Date(validatedData.dat_eventenddate);
    if (validatedData.int_wettkampforteid !== undefined) updateData.int_wettkampforteid = validatedData.int_wettkampforteid;
    if (validatedData.var_location !== undefined && !validatedData.int_wettkampforteid) {
      const venue = await prisma.tfx_wettkampforte.findFirst({
        where: { var_name: validatedData.var_location }
      });
      if (venue) {
        updateData.int_wettkampforteid = venue.int_wettkampforteid;
      }
    }
    if (validatedData.var_description !== undefined) updateData.txt_hinweise = validatedData.var_description || null;
    if (validatedData.txt_hinweise !== undefined) updateData.txt_hinweise = validatedData.txt_hinweise || null;
    if (validatedData.var_veranstalter !== undefined) updateData.var_veranstalter = validatedData.var_veranstalter;
    if (validatedData.dat_meldeschluss !== undefined) {
      updateData.dat_meldeschluss = validatedData.dat_meldeschluss ? new Date(validatedData.dat_meldeschluss) : null;
    }
    if (validatedData.int_ansprechpartner !== undefined) updateData.int_ansprechpartner = validatedData.int_ansprechpartner;
    if (validatedData.int_meldung_an !== undefined) updateData.int_meldung_an = validatedData.int_meldung_an;
    if (validatedData.int_kampfrichter !== undefined) updateData.int_kampfrichter = validatedData.int_kampfrichter;
    if (validatedData.int_helfer !== undefined) updateData.int_helfer = validatedData.int_helfer;
    if (validatedData.int_edv !== undefined) updateData.int_edv = validatedData.int_edv;

    const updatedEvent = await prisma.tfx_veranstaltungen.update({
      where: { int_veranstaltungenid: id },
      data: updateData
    });

    const venue = updatedEvent.int_wettkampforteid ? await prisma.tfx_wettkampforte.findUnique({
      where: { int_wettkampforteid: updatedEvent.int_wettkampforteid }
    }) : null;

    const contactPerson = updatedEvent.int_ansprechpartner ? await prisma.tfx_personen.findUnique({
      where: { int_personenid: updatedEvent.int_ansprechpartner }
    }) : null;

    const registrationContact = updatedEvent.int_meldung_an ? await prisma.tfx_personen.findUnique({
      where: { int_personenid: updatedEvent.int_meldung_an }
    }) : null;

    const response = {
      int_eventid: updatedEvent.int_veranstaltungenid,
      var_eventname: updatedEvent.var_name,
      dat_eventstartdate: updatedEvent.dat_von?.toISOString(),
      dat_eventenddate: updatedEvent.dat_bis?.toISOString(),
      var_location: venue?.var_name || '',
      var_description: updatedEvent.txt_hinweise || '',
      dat_meldeschluss: updatedEvent.dat_meldeschluss?.toISOString() || null,
      var_veranstalter: updatedEvent.var_veranstalter,
      int_wettkampforteid: updatedEvent.int_wettkampforteid,
      int_ansprechpartner: updatedEvent.int_ansprechpartner,
      int_meldung_an: updatedEvent.int_meldung_an,
      int_kampfrichter: updatedEvent.int_kampfrichter,
      int_helfer: updatedEvent.int_helfer,
      int_edv: updatedEvent.int_edv,
      txt_hinweise: updatedEvent.txt_hinweise,
      venue_name: venue?.var_name,
      venue_address: venue?.var_adresse,
      venue_postal_code: venue?.var_plz,
      venue_city: venue?.var_ort,
      contact_person_name: contactPerson ? `${contactPerson.var_vorname || ''} ${contactPerson.var_nachname || ''}`.trim() : null,
      registration_contact_name: registrationContact ? `${registrationContact.var_vorname || ''} ${registrationContact.var_nachname || ''}`.trim() : null
    };

    console.log('✅ Event updated successfully:', { id: updatedEvent.int_veranstaltungenid, name: updatedEvent.var_name });

    // Emit Socket.IO event for real-time update
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`competition-${updatedEvent.int_veranstaltungenid}`).emit('event-updated', {
          eventId: updatedEvent.int_veranstaltungenid,
          updated: true
        });
      }
    } catch (err) {
      // Socket.IO not available, skip notification
    }

    res.json({ event: response });
  } catch (error: any) {
    console.error('Error updating event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================================================
// GET /:id/statistics — Event Statistics
// ============================================================================

router.get('/:id/statistics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);

    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const { squadName, gender, club } = req.query;
    console.log(`📊 Getting statistics for event ${eventId}`, { squadName, gender, club });

    let whereConditions = ['wk.int_veranstaltungenid = $1'];
    let queryParams: any[] = [eventId];
    let paramIndex = 1;

    let squadFilter = '';
    if (squadName && typeof squadName === 'string') {
      paramIndex++;
      if (squadName === 'm') {
        squadFilter = `AND w.var_riege LIKE $${paramIndex}`;
        queryParams.push('m%');
      } else if (squadName === 'w') {
        squadFilter = `AND w.var_riege LIKE $${paramIndex}`;
        queryParams.push('w%');
      } else {
        squadFilter = `AND w.var_riege = $${paramIndex}`;
        queryParams.push(squadName);
      }
    }

    if (gender && typeof gender === 'string') {
      paramIndex++;
      if (gender === 'male' || gender === 'm' || gender === '1') {
        whereConditions.push(`t.int_geschlecht = $${paramIndex}`);
        queryParams.push(1);
      } else if (gender === 'female' || gender === 'w' || gender === '2') {
        whereConditions.push(`t.int_geschlecht = $${paramIndex}`);
        queryParams.push(2);
      }
    }

    if (club && typeof club === 'string') {
      paramIndex++;
      whereConditions.push(`t.int_vereineid = $${paramIndex}`);
      queryParams.push(parseInt(club));
    }

    const whereClause = whereConditions.join(' AND ');

    // Total participants (always full event stats, no squad filter)
    const participantStatsQuery = `
      SELECT 
        COUNT(DISTINCT w.int_teilnehmerid) as total_participants,
        COUNT(DISTINCT CASE WHEN t.int_geschlecht = 1 THEN w.int_teilnehmerid END) as male_participants,
        COUNT(DISTINCT CASE WHEN t.int_geschlecht = 2 THEN w.int_teilnehmerid END) as female_participants,
        COUNT(DISTINCT t.int_vereineid) as total_clubs
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1
    `;
    const participantStats = await prisma.$queryRawUnsafe(participantStatsQuery, eventId) as any[];
    const stats = participantStats[0] || { total_participants: 0, male_participants: 0, female_participants: 0, total_clubs: 0 };

    // Competitions count
    const competitionsCount = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total_competitions FROM tfx_wettkaempfe WHERE int_veranstaltungenid = $1`, eventId
    ) as any[];
    const competitions = competitionsCount[0] || { total_competitions: 0 };

    // Discipline breakdown
    const disciplineStatsQuery = `
      SELECT d.var_name as discipline_name, COUNT(DISTINCT w.int_teilnehmerid) as participant_count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_wettkaempfe_x_disziplinen wxd ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
      INNER JOIN tfx_disziplinen d ON wxd.int_disziplinenid = d.int_disziplinenid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE ${whereClause} ${squadFilter}
      GROUP BY d.int_disziplinenid, d.var_name
      ORDER BY participant_count DESC
    `;
    const disciplineStats = await prisma.$queryRawUnsafe(disciplineStatsQuery, ...queryParams) as any[];

    // Age groups
    const ageGroupStatsQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 1 AND 6 THEN w.int_teilnehmerid END) as "1_6",
        COUNT(DISTINCT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 7 AND 8 THEN w.int_teilnehmerid END) as "7_8",
        COUNT(DISTINCT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 9 AND 10 THEN w.int_teilnehmerid END) as "9_10",
        COUNT(DISTINCT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 11 AND 12 THEN w.int_teilnehmerid END) as "11_12",
        COUNT(DISTINCT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 13 AND 14 THEN w.int_teilnehmerid END) as "13_14",
        COUNT(DISTINCT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 15 AND 16 THEN w.int_teilnehmerid END) as "15_16",
        COUNT(DISTINCT CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 17 AND 18 THEN w.int_teilnehmerid END) as "17_18"
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE ${whereClause} ${squadFilter} AND t.dat_geburtstag IS NOT NULL
    `;
    const ageGroupStats = await prisma.$queryRawUnsafe(ageGroupStatsQuery, ...queryParams) as any[];
    const ageGroups = ageGroupStats[0] || { "1_6": 0, "7_8": 0, "9_10": 0, "11_12": 0, "13_14": 0, "15_16": 0, "17_18": 0 };

    // Club breakdown
    const clubBreakdownQuery = `
      SELECT v.var_name as club_name, COUNT(DISTINCT w.int_teilnehmerid) as participant_count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      INNER JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE ${whereClause} ${squadFilter}
      GROUP BY v.int_vereineid, v.var_name
      ORDER BY participant_count DESC
    `;
    const clubBreakdown = await prisma.$queryRawUnsafe(clubBreakdownQuery, ...queryParams) as any[];

    // Riegen count
    const riegenCountQuery = `
      SELECT COUNT(DISTINCT w.var_riege) as total_groups
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE ${whereClause} ${squadFilter} AND w.var_riege IS NOT NULL AND w.var_riege != ''
    `;
    const riegenCount = await prisma.$queryRawUnsafe(riegenCountQuery, ...queryParams) as any[];
    const groups = riegenCount[0] || { total_groups: 0 };

    const result = {
      totalParticipants: Number(stats.total_participants),
      maleParticipants: Number(stats.male_participants),
      femaleParticipants: Number(stats.female_participants),
      totalClubs: Number(stats.total_clubs),
      totalCompetitions: Number(competitions.total_competitions),
      totalGroups: Number(groups.total_groups),
      filters: { squadName: squadName || null, gender: gender || null, club: club || null },
      disciplines: disciplineStats.map((d: any) => ({ name: d.discipline_name, count: Number(d.participant_count) })),
      ageGroups: {
        "1-6": Number(ageGroups["1_6"]),
        "7-8": Number(ageGroups["7_8"]),
        "9-10": Number(ageGroups["9_10"]),
        "11-12": Number(ageGroups["11_12"]),
        "13-14": Number(ageGroups["13_14"]),
        "15-16": Number(ageGroups["15_16"]),
        "17-18": Number(ageGroups["17_18"])
      },
      clubBreakdown: clubBreakdown.map((c: any) => ({ clubName: c.club_name, count: Number(c.participant_count) }))
    };

    console.log(`📊 Event ${eventId} statistics:`, result);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching event statistics:', error);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

// ============================================================================
// GET /:id — Get Single Event (must be after all specific /:id/xxx routes)
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
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
        COALESCE(wf.var_name, v.var_veranstalter, '') as var_location,
        COALESCE(v.txt_hinweise, '') as var_description,
        v.dat_meldeschluss,
        v.var_veranstalter,
        v.int_wettkampforteid,
        v.int_ansprechpartner,
        v.int_meldung_an,
        v.int_kampfrichter,
        v.int_helfer,
        v.int_edv,
        v.txt_hinweise,
        wf.var_name as venue_name,
        wf.var_adresse as venue_address,
        wf.var_plz as venue_postal_code,
        wf.var_ort as venue_city,
        cp.var_vorname as contact_person_firstname,
        cp.var_nachname as contact_person_lastname,
        cp.var_email as contact_person_email,
        cp.var_telefon as contact_person_phone,
        rcp.var_vorname as registration_contact_firstname,
        rcp.var_nachname as registration_contact_lastname,
        rcp.var_email as registration_contact_email,
        rcp.var_telefon as registration_contact_phone,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      LEFT JOIN tfx_wettkampforte wf ON v.int_wettkampforteid = wf.int_wettkampforteid
      LEFT JOIN tfx_personen cp ON v.int_ansprechpartner = cp.int_personenid
      LEFT JOIN tfx_personen rcp ON v.int_meldung_an = rcp.int_personenid
      WHERE v.int_veranstaltungenid = $1
    `;

    const events = await prisma.$queryRawUnsafe(query, id);

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];
    const now = new Date();
    const startDate = new Date(event.dat_eventstartdate);
    const endDate = new Date(event.dat_eventenddate);

    let status = 'upcoming';
    if (now > endDate) status = 'completed';
    else if (now >= startDate && now <= endDate) status = 'active';

    const formattedEvent = {
      ...event,
      int_eventid: Number(event.int_eventid),
      int_wettkampforteid: event.int_wettkampforteid ? Number(event.int_wettkampforteid) : null,
      int_ansprechpartner: event.int_ansprechpartner ? Number(event.int_ansprechpartner) : null,
      int_meldung_an: event.int_meldung_an ? Number(event.int_meldung_an) : null,
      int_kampfrichter: event.int_kampfrichter ? Number(event.int_kampfrichter) : null,
      int_helfer: event.int_helfer ? Number(event.int_helfer) : null,
      int_edv: event.int_edv ? Number(event.int_edv) : null,
      txt_hinweise: event.txt_hinweise,
      participant_count: Number(event.participant_count || 0),
      score_count: Number(event.score_count || 0),
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
      dat_meldeschluss: event.dat_meldeschluss ? event.dat_meldeschluss.toISOString() : null,
      contact_person_name: event.contact_person_firstname && event.contact_person_lastname
        ? `${event.contact_person_lastname}, ${event.contact_person_firstname}`
        : null,
      registration_contact_name: event.registration_contact_firstname && event.registration_contact_lastname
        ? `${event.registration_contact_lastname}, ${event.registration_contact_firstname}`
        : null,
      status
    };

    res.json(formattedEvent);
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /:id/participants — Deprecated Compatibility Endpoint
// ============================================================================

router.get('/:id/participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const existingEvent = await prisma.tfx_veranstaltungen.findUnique({
      where: { int_veranstaltungenid: eventId }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(200).json({
      message: 'This endpoint is deprecated. Use /api/event-participants?eventId=' + eventId,
      redirect: `/api/event-participants?eventId=${eventId}`,
      participants: []
    });
  } catch (error: any) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// DELETE /:id — Delete Event
// ============================================================================

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const forceDelete = req.query.force === 'true';

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const existingEvent = await prisma.tfx_veranstaltungen.findUnique({
      where: { int_veranstaltungenid: eventId }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const scoresCount = await prisma.tfx_wertungen.count({
      where: { tfx_wettkaempfe: { int_veranstaltungenid: eventId } }
    });

    if (scoresCount > 0 && !forceDelete) {
      return res.status(409).json({
        error: 'Cannot delete event with existing scores. Delete scores first.',
        hasScores: true,
        scoresCount,
        hint: 'Use ?force=true to delete event with all associated data'
      });
    }

    // Force delete: remove all associated data
    if (forceDelete && scoresCount > 0) {
      console.log(`🗑️ Force deleting event ${existingEvent.var_name} with ${scoresCount} scores...`);

      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_wertungen_details WHERE int_wertungenid IN (
          SELECT w.int_wertungenid FROM tfx_wertungen w
          JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
        )
      `, eventId);

      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_jury_results WHERE int_wertungenid IN (
          SELECT w.int_wertungenid FROM tfx_wertungen w
          JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
        )
      `, eventId);

      await prisma.tfx_wertungen.deleteMany({
        where: { tfx_wettkaempfe: { int_veranstaltungenid: eventId } }
      });

      console.log(`🗑️ Deleted ${scoresCount} scores for event ${eventId}`);
    }

    // Delete competitions and child records
    const competitionsCount = await prisma.tfx_wettkaempfe.count({
      where: { int_veranstaltungenid: eventId }
    });

    if (competitionsCount > 0) {
      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_mannschaften WHERE int_wettkaempfeid IN (
          SELECT int_wettkaempfeid FROM tfx_wettkaempfe WHERE int_veranstaltungenid = $1
        )
      `, eventId);

      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_wettkaempfe_dispos WHERE int_wettkaempfe_x_disziplinenid IN (
          SELECT wxd.int_wettkaempfe_x_disziplinenid 
          FROM tfx_wettkaempfe_x_disziplinen wxd
          JOIN tfx_wettkaempfe wk ON wxd.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
        )
      `, eventId);

      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_wettkaempfe_x_disziplinen WHERE int_wettkaempfeid IN (
          SELECT int_wettkaempfeid FROM tfx_wettkaempfe WHERE int_veranstaltungenid = $1
        )
      `, eventId);

      await prisma.tfx_wettkaempfe.deleteMany({
        where: { int_veranstaltungenid: eventId }
      });
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM tfx_riegen_x_disziplinen WHERE int_veranstaltungenid = $1
    `, eventId);

    await prisma.tfx_veranstaltungen.delete({
      where: { int_veranstaltungenid: eventId }
    });

    console.log(`🗑️ Event ${existingEvent.var_name} (ID: ${eventId}) deleted successfully`);

    res.json({
      message: 'Event deleted successfully',
      eventId,
      eventName: existingEvent.var_name,
      deletedScores: forceDelete ? scoresCount : 0,
      deletedCompetitions: competitionsCount
    });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// POST /:id/export-timeplan — Export Time Plan (placeholder)
// ============================================================================

router.post('/:id/export-timeplan', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const { sessionGroups, timeSettings, deviceSchedule } = req.body;

    console.log('[EXPORT-TIMEPLAN] Export requested for event:', eventId);
    console.log('[EXPORT-TIMEPLAN] Session groups:', sessionGroups?.length || 0);
    console.log('[EXPORT-TIMEPLAN] Time settings:', timeSettings);
    console.log('[EXPORT-TIMEPLAN] Device schedule items:', deviceSchedule?.length || 0);

    // TODO: Implement actual export logic (PDF, Excel, etc.)
    res.json({
      success: true,
      message: 'Timeplan export functionality coming soon',
      data: {
        eventId,
        sessionGroupsCount: sessionGroups?.length || 0,
        deviceScheduleCount: deviceSchedule?.length || 0
      }
    });
  } catch (error: any) {
    console.error('❌ Export timeplan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

