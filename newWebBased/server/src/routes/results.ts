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
        w.int_wertungid,
        w.int_wettkaempfeid,
        w.int_teilnehmerid,
        w.dec_note,
        w.int_rang,
        w.var_bemerkung,
        wk.var_name as competition_name,
        t.var_vorname,
        t.var_nachname
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      ${whereClause}
      ORDER BY w.int_wertungid DESC
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

export default router;
