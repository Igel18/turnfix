import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createResultSchema = z.object({
  competitionId: z.number().int().positive(),
  participantId: z.number().int().positive(),
  disciplineId: z.number().int().positive(),
  score: z.number(),
  rank: z.number().int().optional(),
  notes: z.string().optional()
});

const updateResultSchema = createResultSchema.partial();

// Get all results with pagination
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const competitionId = req.query.competitionId as string;
    const participantId = req.query.participantId as string;

    // Build WHERE conditions for raw SQL query
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (competitionId) {
      whereConditions.push(`w.int_wettkaempfeid = $${paramIndex}`);
      params.push(parseInt(competitionId));
      paramIndex++;
    }
    if (participantId) {
      whereConditions.push(`w.int_teilnehmerid = $${paramIndex}`);
      params.push(parseInt(participantId));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        w.int_wertungenid,
        w.int_wettkaempfeid,
        w.int_teilnehmerid,
        w.int_mannschaftenid,
        w.int_statusid,
        w.int_runde,
        w.int_startnummer,
        w.var_riege,
        w.var_comment,
        wk.var_name as competition_name,
        t.var_vorname,
        t.var_nachname
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      ${whereClause}
      ORDER BY w.int_wertungenid DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const results = await prisma.$queryRawUnsafe(query, ...params);

    res.json({
      results: results,
      pagination: {
        limit,
        offset,
        total: 0 // TODO: Add count query
      }
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
});

// Get result statistics
router.get('/statistics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const stats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as total_results,
        COUNT(DISTINCT int_wettkaempfeid)::int as competitions_with_results,
        COUNT(DISTINCT int_teilnehmerid)::int as participants_with_results
      FROM tfx_wertungen
    `);

    res.json(Array.isArray(stats) && stats.length > 0 ? stats[0] : {
      total_results: 0,
      competitions_with_results: 0,
      participants_with_results: 0
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get event rankings
router.get('/rankings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const rankings = await prisma.$queryRawUnsafe(`
      SELECT 
        w.int_wertungenid,
        w.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        w.int_startnummer,
        w.var_riege
      FROM tfx_wertungen w
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE w.int_wettkaempfeid = $1
      ORDER BY w.int_startnummer
    `, parseInt(eventId));

    res.json(rankings || []);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Get a specific result by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid result ID' });
    }

    const result = await prisma.$queryRawUnsafe(`
      SELECT 
        w.int_wertungenid,
        w.int_wettkaempfeid,
        w.int_teilnehmerid,
        w.int_mannschaftenid,
        w.int_statusid,
        w.int_runde,
        w.int_startnummer,
        w.var_riege,
        w.var_comment,
        wk.var_name as competition_name,
        t.var_vorname,
        t.var_nachname
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE w.int_wertungenid = $1
    `, id);

    if (!Array.isArray(result) || result.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

// Create a new result
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createResultSchema.parse(req.body);
    
    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO tfx_wertungen (
        int_wettkaempfeid,
        int_teilnehmerid,
        int_statusid,
        var_comment
      ) VALUES ($1, $2, $3, $4)
      RETURNING int_wertungenid
    `, 
      validatedData.competitionId,
      validatedData.participantId,
      1, // Default status
      validatedData.notes || ''
    );

    if (Array.isArray(result) && result.length > 0) {
      res.status(201).json({ 
        id: (result[0] as any).int_wertungenid,
        message: 'Result created successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to create result' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    console.error('Error creating result:', error);
    res.status(500).json({ error: 'Failed to create result' });
  }
});

// Update a result
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid result ID' });
    }

    const validatedData = updateResultSchema.parse(req.body);
    
    // Check if result exists
    const existing = await prisma.$queryRawUnsafe(`
      SELECT int_wertungenid FROM tfx_wertungen WHERE int_wertungenid = $1
    `, id);

    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (validatedData.competitionId !== undefined) {
      updates.push(`int_wettkaempfeid = $${paramIndex}`);
      params.push(validatedData.competitionId);
      paramIndex++;
    }
    if (validatedData.participantId !== undefined) {
      updates.push(`int_teilnehmerid = $${paramIndex}`);
      params.push(validatedData.participantId);
      paramIndex++;
    }
    if (validatedData.notes !== undefined) {
      updates.push(`var_comment = $${paramIndex}`);
      params.push(validatedData.notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const updateQuery = `
      UPDATE tfx_wertungen 
      SET ${updates.join(', ')}
      WHERE int_wertungenid = $${paramIndex}
    `;

    await prisma.$queryRawUnsafe(updateQuery, ...params);

    res.json({ message: 'Result updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    console.error('Error updating result:', error);
    res.status(500).json({ error: 'Failed to update result' });
  }
});

// Delete a result
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid result ID' });
    }

    // Check if result exists
    const existing = await prisma.$queryRawUnsafe(`
      SELECT int_wertungenid FROM tfx_wertungen WHERE int_wertungenid = $1
    `, id);

    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }

    await prisma.$queryRawUnsafe(`
      DELETE FROM tfx_wertungen WHERE int_wertungenid = $1
    `, id);

    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
});

export default router;
