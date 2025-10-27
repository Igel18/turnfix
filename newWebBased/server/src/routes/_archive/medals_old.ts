import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';

const router = Router();

// Validation schemas
const createMedalSchema = z.object({
  eventId: z.number().int().positive(),
  participantId: z.number().int().positive(),
  disciplineId: z.number().int().positive(),
  position: z.number().int().min(1).max(3),
  medalType: z.enum(['gold', 'silver', 'bronze']),
  notes: z.string().optional()
});

// Get all medals with filtering
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const eventId = req.query.eventId as string;
    const medalType = req.query.type as string;

    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (eventId) {
      whereConditions.push(`e.int_veranstaltungenid = $${paramIndex}`);
      params.push(parseInt(eventId));
      paramIndex++;
    }
    if (medalType) {
      whereConditions.push(`CASE 
        WHEN w.int_platz = 1 THEN 'gold'
        WHEN w.int_platz = 2 THEN 'silver'
        WHEN w.int_platz = 3 THEN 'bronze'
        ELSE 'none'
      END = $${paramIndex}`);
      params.push(medalType);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        w.int_wertungenid as id,
        e.int_veranstaltungenid as event_id,
        e.var_name as event_name,
        t.int_teilnehmerid as participant_id,
        t.var_vorname as first_name,
        t.var_nachname as last_name,
        wk.int_wettkaempfeid as competition_id,
        wk.var_name as competition_name,
        w.int_platz as position,
        CASE 
          WHEN w.int_platz = 1 THEN 'gold'
          WHEN w.int_platz = 2 THEN 'silver'
          WHEN w.int_platz = 3 THEN 'bronze'
          ELSE 'none'
        END as medal_type
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_veranstaltungen e ON wk.int_veranstaltungenid = e.int_veranstaltungenid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      ${whereClause}
      AND w.int_platz IN (1, 2, 3)
      ORDER BY e.int_veranstaltungenid, w.int_platz
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const medals = await prisma.$queryRawUnsafe(query, ...params);

    res.json({
      medals: medals || [],
      pagination: {
        limit,
        offset,
        total: 0 // TODO: Add count query
      }
    });
  } catch (error) {
    console.error('Error fetching medals:', error);
    res.status(500).json({ error: 'Failed to fetch medals' });
  }
});

// Create a new medal award
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createMedalSchema.parse(req.body);
    
    // Check if medal already exists for this participant/event/discipline
    const existing = await prisma.$queryRawUnsafe(`
      SELECT w.int_wertungenid
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 
      AND w.int_teilnehmerid = $2 
      AND w.int_platz BETWEEN 1 AND 3
    `, validatedData.eventId, validatedData.participantId);

    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({ error: 'Medal already awarded to this participant for this event' });
    }

    // Award the medal by updating the result
    await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET int_platz = $1
      WHERE int_wettkaempfeid IN (
        SELECT int_wettkaempfeid FROM tfx_wettkaempfe WHERE int_veranstaltungenid = $2
      )
      AND int_teilnehmerid = $3
    `, validatedData.position, validatedData.eventId, validatedData.participantId);

    res.status(201).json({ 
      message: 'Medal awarded successfully',
      medal: {
        eventId: validatedData.eventId,
        participantId: validatedData.participantId,
        position: validatedData.position,
        medalType: validatedData.medalType
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    console.error('Error awarding medal:', error);
    res.status(500).json({ error: 'Failed to award medal' });
  }
});

// Get medal standings for an event
router.get('/standings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    console.log(`Fetching medal standings for event ${eventId}`);

    const standings = await prisma.$queryRawUnsafe(`
      SELECT 
        v.var_name as club_name,
        COUNT(CASE WHEN w.int_platz = 1 THEN 1 END)::int as gold_count,
        COUNT(CASE WHEN w.int_platz = 2 THEN 1 END)::int as silver_count,
        COUNT(CASE WHEN w.int_platz = 3 THEN 1 END)::int as bronze_count,
        COUNT(CASE WHEN w.int_platz BETWEEN 1 AND 3 THEN 1 END)::int as total_medals
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_vereine v ON t.int_vereinid = v.int_vereinid
      WHERE wk.int_veranstaltungenid = $1
      AND w.int_platz BETWEEN 1 AND 3
      GROUP BY v.int_vereinid, v.var_name
      ORDER BY gold_count DESC, silver_count DESC, bronze_count DESC
    `, parseInt(eventId));

    res.json(standings || []);
  } catch (error) {
    console.error('Error fetching medal standings:', error);
    res.status(500).json({ error: 'Failed to fetch medal standings' });
  }
});

// Get medal statistics
router.get('/statistics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    const clubId = req.query.clubId as string;

    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (eventId) {
      whereConditions.push(`wk.int_veranstaltungenid = $${paramIndex}`);
      params.push(parseInt(eventId));
      paramIndex++;
    }
    if (clubId) {
      whereConditions.push(`t.int_vereinid = $${paramIndex}`);
      params.push(parseInt(clubId));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')} AND` : 'WHERE';

    const stats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(CASE WHEN w.int_platz = 1 THEN 1 END)::int as total_gold,
        COUNT(CASE WHEN w.int_platz = 2 THEN 1 END)::int as total_silver,
        COUNT(CASE WHEN w.int_platz = 3 THEN 1 END)::int as total_bronze,
        COUNT(CASE WHEN w.int_platz BETWEEN 1 AND 3 THEN 1 END)::int as total_medals,
        COUNT(DISTINCT t.int_vereinid)::int as participating_clubs
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      ${whereClause} w.int_platz BETWEEN 1 AND 3
    `, ...params);

    res.json(Array.isArray(stats) && stats.length > 0 ? stats[0] : {
      total_gold: 0,
      total_silver: 0,
      total_bronze: 0,
      total_medals: 0,
      participating_clubs: 0
    });
  } catch (error) {
    console.error('Error fetching medal statistics:', error);
    res.status(500).json({ error: 'Failed to fetch medal statistics' });
  }
});

// Revoke a medal
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid medal ID' });
    }

    // Remove medal by setting position to null or > 3
    await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET int_platz = NULL
      WHERE int_wertungenid = $1 AND int_platz BETWEEN 1 AND 3
    `, id);

    res.json({ message: 'Medal revoked successfully' });
  } catch (error) {
    console.error('Error revoking medal:', error);
    res.status(500).json({ error: 'Failed to revoke medal' });
  }
});

// Get comprehensive medal report
router.get('/comprehensive-report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const report = await prisma.$queryRawUnsafe(`
      SELECT 
        e.var_name as event_name,
        wk.var_name as competition_name,
        t.var_vorname as first_name,
        t.var_nachname as last_name,
        v.var_name as club_name,
        w.int_platz as position,
        CASE 
          WHEN w.int_platz = 1 THEN 'gold'
          WHEN w.int_platz = 2 THEN 'silver'
          WHEN w.int_platz = 3 THEN 'bronze'
        END as medal_type
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_veranstaltungen e ON wk.int_veranstaltungenid = e.int_veranstaltungenid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_vereine v ON t.int_vereinid = v.int_vereinid
      WHERE e.int_veranstaltungenid = $1
      AND w.int_platz BETWEEN 1 AND 3
      ORDER BY wk.var_name, w.int_platz
    `, parseInt(eventId));

    res.json({
      event_id: eventId,
      medal_awards: report || []
    });
  } catch (error) {
    console.error('Error generating comprehensive medal report:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive medal report' });
  }
});

export default router;
