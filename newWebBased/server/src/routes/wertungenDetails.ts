import { Router } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();

// Validation schemas for wertungen details (main discipline scores)
const wertungenDetailsQuerySchema = z.object({
  participantId: z.string().transform(Number).optional(),
  wertungenId: z.string().transform(Number).optional(),
  disciplineId: z.string().transform(Number).optional(),
  eventId: z.string().transform(Number).optional(),
  attempt: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(100),
  offset: z.string().transform(Number).default(0)
});

// Get main discipline scores from tfx_wertungen_details
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const query = wertungenDetailsQuerySchema.parse(req.query);
    
    console.log('Fetching wertungen details with filters:', query);
    
    // Build base query for tfx_wertungen_details
    let baseQuery = `
      SELECT 
        wd.int_wertungen_detailsid as id,
        wd.int_wertungenid as wertungenId,
        wd.int_disziplinenid as disciplineId,
        wd.int_versuch as attempt,
        wd.rel_leistung as score,
        wd.int_kp as type,
        t.var_vorname as participant_first_name,
        t.var_nachname as participant_last_name,
        t.int_teilnehmerid as participantId,
        d.var_name as discipline_name,
        wk.int_veranstaltungenid as eventId
      FROM tfx_wertungen_details wd
      INNER JOIN tfx_wertungen w ON wd.int_wertungenid = w.int_wertungenid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      INNER JOIN tfx_disziplinen d ON wd.int_disziplinenid = d.int_disziplinenid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    `;
    
    // Build WHERE clause with filters
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (query.participantId) {
      whereClause += ` AND t.int_teilnehmerid = $${paramIndex}`;
      queryParams.push(query.participantId);
      paramIndex++;
    }
    
    if (query.wertungenId) {
      whereClause += ` AND wd.int_wertungenid = $${paramIndex}`;
      queryParams.push(query.wertungenId);
      paramIndex++;
    }
    
    if (query.disciplineId) {
      whereClause += ` AND wd.int_disziplinenid = $${paramIndex}`;
      queryParams.push(query.disciplineId);
      paramIndex++;
    }
    
    if (query.eventId) {
      whereClause += ` AND wk.int_veranstaltungenid = $${paramIndex}`;
      queryParams.push(query.eventId);
      paramIndex++;
    }
    
    if (query.attempt) {
      whereClause += ` AND wd.int_versuch = $${paramIndex}`;
      queryParams.push(query.attempt);
      paramIndex++;
    }
    
    const orderClause = 'ORDER BY wd.int_wertungen_detailsid DESC';
    const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(query.limit, query.offset);
    
    const fullQuery = `${baseQuery} ${whereClause} ${orderClause} ${limitClause}`;
    
    const results = await prisma.$queryRawUnsafe(fullQuery, ...queryParams);
    
    // Transform results to match expected format
    const transformedResults = Array.isArray(results) ? results.map((result: any) => ({
      id: result.id,
      wertungenId: result.wertungenid,
      disciplineId: result.disciplineid,
      attempt: result.attempt,
      score: result.score,
      type: result.type,
      participant: {
        id: result.participantid,
        firstName: result.participant_first_name,
        lastName: result.participant_last_name
      },
      discipline: {
        name: result.discipline_name
      },
      eventId: result.eventid
    })) : [];
    
    console.log(`Found ${transformedResults.length} wertungen details records`);
    
    res.json(transformedResults);
  } catch (error) {
    console.error('Error fetching wertungen details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get wertungen details by participant and discipline for jury portal
router.get('/by-participant/:participantId/discipline/:disciplineId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const participantId = parseInt(req.params.participantId);
    const disciplineId = parseInt(req.params.disciplineId);
    const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;
    
    console.log(`Fetching wertungen details for participant ${participantId}, discipline ${disciplineId}, event ${eventId}`);
    
    // First get the wertungenId for this participant in the specified event
    let wertungenQuery = `
      SELECT w.int_wertungenid
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = $1
    `;
    
    const wertungenParams: any[] = [participantId];
    let paramIndex = 2;
    
    if (eventId) {
      wertungenQuery += ` AND wk.int_veranstaltungenid = $${paramIndex}`;
      wertungenParams.push(eventId);
      paramIndex++;
    }
    
    wertungenQuery += ' ORDER BY w.int_wertungenid DESC LIMIT 1';
    
    const wertungenResult = await prisma.$queryRawUnsafe(wertungenQuery, ...wertungenParams);
    
    if (!Array.isArray(wertungenResult) || wertungenResult.length === 0) {
      return res.json([]);
    }
    
    const wertungenId = (wertungenResult[0] as any).int_wertungenid;
    
    // Now get the scores from tfx_wertungen_details
    const scoresQuery = `
      SELECT 
        wd.int_wertungen_detailsid as id,
        wd.int_wertungenid as wertungenId,
        wd.int_disziplinenid as disciplineId,
        wd.int_versuch as attempt,
        wd.rel_leistung as score,
        wd.int_kp as type
      FROM tfx_wertungen_details wd
      WHERE wd.int_wertungenid = $1
      AND wd.int_disziplinenid = $2
      ORDER BY wd.int_versuch, wd.int_kp
    `;
    
    const scores = await prisma.$queryRawUnsafe(scoresQuery, wertungenId, disciplineId);
    
    console.log(`Found ${Array.isArray(scores) ? scores.length : 0} scores in wertungen_details`);
    
    // Return the first score if found, or null
    if (Array.isArray(scores) && scores.length > 0) {
      res.json(scores[0]); // Return single score object
    } else {
      res.json(null); // No score found
    }
  } catch (error) {
    console.error('Error fetching wertungen details by participant:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save main discipline score (following C++ logic - save to tfx_wertungen_details)
const saveScoreSchema = z.object({
  participantId: z.number().int().positive(),
  disciplineId: z.number().int().positive(),
  score: z.number(),
  attempt: z.number().int().min(1).default(1),
  type: z.number().int().min(0).max(1).default(0),
  eventId: z.number().int().positive().optional()
});

router.post('/save-main-score', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = saveScoreSchema.parse(req.body);
    console.log('Saving main discipline score to tfx_wertungen_details:', validatedData);

    // First, find the wertungenId for this participant in the specified event
    let wertungenQuery = `
      SELECT w.int_wertungenid
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = $1
    `;
    
    const wertungenParams: any[] = [validatedData.participantId];
    let paramIndex = 2;
    
    if (validatedData.eventId) {
      wertungenQuery += ` AND wk.int_veranstaltungenid = $${paramIndex}`;
      wertungenParams.push(validatedData.eventId);
      paramIndex++;
    }
    
    wertungenQuery += ' ORDER BY w.int_wertungenid DESC LIMIT 1';
    
    const wertungenResult = await prisma.$queryRawUnsafe(wertungenQuery, ...wertungenParams);
    
    if (!Array.isArray(wertungenResult) || wertungenResult.length === 0) {
      return res.status(404).json({ error: 'No wertungen record found for this participant and event' });
    }
    
    const wertungenId = (wertungenResult[0] as any).int_wertungenid;
    console.log(`Using wertungenId: ${wertungenId} for participant ${validatedData.participantId}`);

    // Check if a score already exists for this combination
    const existingScoreQuery = `
      SELECT int_wertungen_detailsid 
      FROM tfx_wertungen_details 
      WHERE int_wertungenid = $1 
      AND int_disziplinenid = $2 
      AND int_versuch = $3 
      AND int_kp = $4
    `;
    
    const existingScores = await prisma.$queryRawUnsafe(
      existingScoreQuery, 
      wertungenId, 
      validatedData.disciplineId, 
      validatedData.attempt, 
      validatedData.type
    );

    let result;
    
    if (Array.isArray(existingScores) && existingScores.length > 0) {
      // Update existing score
      const updateQuery = `
        UPDATE tfx_wertungen_details 
        SET rel_leistung = $1
        WHERE int_wertungenid = $2 
        AND int_disziplinenid = $3 
        AND int_versuch = $4 
        AND int_kp = $5
        RETURNING *
      `;
      
      result = await prisma.$queryRawUnsafe(
        updateQuery, 
        validatedData.score, 
        wertungenId, 
        validatedData.disciplineId, 
        validatedData.attempt, 
        validatedData.type
      );
      
      console.log('Updated existing score in tfx_wertungen_details');
    } else {
      // Insert new score
      const insertQuery = `
        INSERT INTO tfx_wertungen_details (
          int_wertungenid, 
          int_disziplinenid, 
          int_versuch, 
          rel_leistung, 
          int_kp
        ) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      result = await prisma.$queryRawUnsafe(
        insertQuery, 
        wertungenId, 
        validatedData.disciplineId, 
        validatedData.attempt, 
        validatedData.score, 
        validatedData.type
      );
      
      console.log('Inserted new score into tfx_wertungen_details');
    }

    res.json({ 
      success: true, 
      message: 'Main discipline score saved successfully',
      data: result 
    });

  } catch (error) {
    console.error('Error saving main discipline score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
