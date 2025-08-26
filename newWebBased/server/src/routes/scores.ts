import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const scoreCreateSchema = z.object({
  competitionId: z.number().int(),
  participantId: z.number().int(),
  disciplineId: z.number().int(),
  score: z.number(),
  attempt: z.number().int().default(1),
  notes: z.string().optional()
});

const scoreUpdateSchema = scoreCreateSchema.partial();

const scoreQuerySchema = z.object({
  competitionId: z.string().transform(Number).optional(),
  participantId: z.string().transform(Number).optional(),
  disciplineId: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(100),
  offset: z.string().transform(Number).default(0)
});

// Get scores with filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const query = scoreQuerySchema.parse(req.query);
    
    console.log('Fetching scores with filters:', query);
    
    // Build SQL query with optional filters
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (query.competitionId) {
      whereClause += ` AND w.int_wettkaempfeid = $${paramIndex}`;
      queryParams.push(query.competitionId);
      paramIndex++;
    }
    
    if (query.participantId) {
      whereClause += ` AND w.int_teilnehmerid = $${paramIndex}`;
      queryParams.push(query.participantId);
      paramIndex++;
    }
    
    if (query.disciplineId) {
      whereClause += ` AND w.int_disziplinid = $${paramIndex}`;
      queryParams.push(query.disciplineId);
      paramIndex++;
    }

    const scoresQuery = `
      SELECT 
        w.int_wertungsid as id,
        w.int_teilnehmerid as participantId,
        w.int_disziplinid as disciplineId,
        w.int_wettkaempfeid as competitionId,
        w.flo_wertung as score,
        w.int_versuch as attempt,
        w.var_notizen as notes,
        CASE 
          WHEN w.flo_wertung IS NOT NULL THEN 'completed'
          ELSE 'pending'
        END as status,
        t.var_vorname,
        t.var_nachname,
        d.var_name as discipline_name,
        wk.var_name as competition_name
      FROM tfx_wertungen w
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_disziplinen d ON w.int_disziplinid = d.int_disziplinenid  
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      ${whereClause}
      ORDER BY w.int_wettkaempfeid, w.int_disziplinid, w.int_teilnehmerid
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(query.limit, query.offset);
    
    const results = await prisma.$queryRawUnsafe(scoresQuery, ...queryParams) as any[];

    const totalCountQuery = `
      SELECT COUNT(*) as count
      FROM tfx_wertungen w  
      ${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(totalCountQuery, ...queryParams.slice(0, -2)) as any[];
    const totalCount = parseInt(totalResult[0]?.count || '0');

    console.log(`Found ${results.length} scores out of ${totalCount} total`);

    res.json({
      results: results.map((result: any) => ({
        id: result.id,
        participantId: result.participantid,
        disciplineId: result.disciplineid, 
        competitionId: result.competitionid,
        score: result.score ? parseFloat(result.score) : null,
        attempt: result.attempt || 1,
        notes: result.notes,
        status: result.status,
        participant: {
          firstName: result.var_vorname,
          lastName: result.var_nachname
        },
        discipline: {
          name: result.discipline_name
        },
        competition: {
          name: result.competition_name
        }
      })),
      pagination: {
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching scores:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new score
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = scoreCreateSchema.parse(req.body);
    
    console.log('Creating score:', validatedData);
    
    // Check if score already exists
    const existingScoreQuery = `
      SELECT int_wertungsid 
      FROM tfx_wertungen 
      WHERE int_teilnehmerid = $1 
        AND int_disziplinid = $2 
        AND int_wettkaempfeid = $3
        AND int_versuch = $4
    `;
    
    const existingScore = await prisma.$queryRawUnsafe(
      existingScoreQuery,
      validatedData.participantId,
      validatedData.disciplineId,
      validatedData.competitionId,
      validatedData.attempt
    ) as any[];

    if (existingScore.length > 0) {
      // Update existing score
      const updateQuery = `
        UPDATE tfx_wertungen 
        SET flo_wertung = $1, var_notizen = $2
        WHERE int_wertungsid = $3
        RETURNING *
      `;
      
      const updated = await prisma.$queryRawUnsafe(
        updateQuery,
        validatedData.score,
        validatedData.notes || null,
        existingScore[0].int_wertungsid
      ) as any[];

      console.log('Updated existing score');
      return res.json({
        id: updated[0].int_wertungsid,
        participantId: validatedData.participantId,
        disciplineId: validatedData.disciplineId,
        competitionId: validatedData.competitionId,
        score: validatedData.score,
        attempt: validatedData.attempt,
        notes: validatedData.notes,
        status: 'completed'
      });
    } else {
      // Create new score entry
      const insertQuery = `
        INSERT INTO tfx_wertungen 
          (int_teilnehmerid, int_disziplinid, int_wettkaempfeid, flo_wertung, int_versuch, var_notizen)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const created = await prisma.$queryRawUnsafe(
        insertQuery,
        validatedData.participantId,
        validatedData.disciplineId,
        validatedData.competitionId,
        validatedData.score,
        validatedData.attempt,
        validatedData.notes || null
      ) as any[];

      console.log('Created new score');
      res.status(201).json({
        id: created[0].int_wertungsid,
        participantId: validatedData.participantId,
        disciplineId: validatedData.disciplineId,
        competitionId: validatedData.competitionId,
        score: validatedData.score,
        attempt: validatedData.attempt,
        notes: validatedData.notes,
        status: 'completed'
      });
    }

  } catch (error) {
    console.error('Error creating score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update score by ID
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const scoreId = parseInt(req.params.id);
    const validatedData = scoreUpdateSchema.parse(req.body);
    
    console.log(`Updating score ${scoreId}:`, validatedData);
    
    if (isNaN(scoreId)) {
      return res.status(400).json({ error: 'Invalid score ID' });
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (validatedData.score !== undefined) {
      updateFields.push(`flo_wertung = $${paramIndex}`);
      queryParams.push(validatedData.score);
      paramIndex++;
    }

    if (validatedData.notes !== undefined) {
      updateFields.push(`var_notizen = $${paramIndex}`);
      queryParams.push(validatedData.notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    queryParams.push(scoreId);

    const updateQuery = `
      UPDATE tfx_wertungen 
      SET ${updateFields.join(', ')}
      WHERE int_wertungsid = $${paramIndex}
      RETURNING *
    `;

    const updated = await prisma.$queryRawUnsafe(updateQuery, ...queryParams) as any[];

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Score not found' });
    }

    console.log('Updated score successfully');
    res.json({
      id: updated[0].int_wertungsid,
      participantId: updated[0].int_teilnehmerid,
      disciplineId: updated[0].int_disziplinid,
      competitionId: updated[0].int_wettkaempfeid,
      score: updated[0].flo_wertung ? parseFloat(updated[0].flo_wertung) : null,
      attempt: updated[0].int_versuch || 1,
      notes: updated[0].var_notizen,
      status: updated[0].flo_wertung ? 'completed' : 'pending'
    });

  } catch (error) {
    console.error('Error updating score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete score
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const scoreId = parseInt(req.params.id);
    
    console.log(`Deleting score ${scoreId}`);
    
    if (isNaN(scoreId)) {
      return res.status(400).json({ error: 'Invalid score ID' });
    }

    const deleteQuery = `
      DELETE FROM tfx_wertungen 
      WHERE int_wertungsid = $1
      RETURNING *
    `;

    const deleted = await prisma.$queryRawUnsafe(deleteQuery, scoreId) as any[];

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Score not found' });
    }

    console.log('Deleted score successfully');
    res.json({ message: 'Score deleted successfully' });

  } catch (error) {
    console.error('Error deleting score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
