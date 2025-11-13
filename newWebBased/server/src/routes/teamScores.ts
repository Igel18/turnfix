import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';

const router = Router();

const teamScoreCreateSchema = z.object({
  teamId: z.number().int(),
  competitionId: z.number().int(),
  disciplineId: z.number().int(),
  statusId: z.number().int(),
  attempt: z.number().int().default(1),
  startNumber: z.number().int().optional(),
  components: z.array(z.object({
    fieldId: z.number().int(),
    value: z.number()
  })),
  finalScore: z.number(),
  riege: z.string().optional(),
  comment: z.string().optional()
});

const teamScoreQuerySchema = z.object({
  teamId: z.string().transform(Number).optional(),
  competitionId: z.string().transform(Number).optional(),
  disciplineId: z.string().transform(Number).optional(),
  eventId: z.string().transform(Number).optional(),
  attempt: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(100),
  offset: z.string().transform(Number).default(0)
});

router.get('/team', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const query = teamScoreQuerySchema.parse(req.query);
    
    let whereClause = 'WHERE w.int_mannschaftenid IS NOT NULL';
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (query.teamId) {
      whereClause += ` AND w.int_mannschaftenid = $${paramIndex}`;
      queryParams.push(query.teamId);
      paramIndex++;
    }
    
    if (query.competitionId) {
      whereClause += ` AND w.int_wettkaempfeid = $${paramIndex}`;
      queryParams.push(query.competitionId);
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

    const scoresQuery = `
      SELECT 
        w.int_wertungenid as id,
        w.int_mannschaftenid as teamId,
        w.int_wettkaempfeid as competitionId,
        wd.int_disziplinenid as disciplineId,
        wd.int_versuch as attempt,
        m.int_startnummer as startNumber,
        w.var_riege as riege,
        w.var_comment as comment,
        v.var_name as clubName,
        d.var_name as disciplineName,
        wk.var_name as competitionName
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_mannschaften m ON w.int_mannschaftenid = m.int_mannschaftenid
      LEFT JOIN tfx_vereine v ON m.int_vereineid = v.int_vereineid
      LEFT JOIN tfx_disziplinen d ON wd.int_disziplinenid = d.int_disziplinenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      ${whereClause}
      GROUP BY w.int_wertungenid, w.int_mannschaftenid, w.int_wettkaempfeid, 
               wd.int_disziplinenid, wd.int_versuch, m.int_startnummer, 
               w.var_riege, w.var_comment, v.var_name, 
               d.var_name, wk.var_name
      ORDER BY w.int_wettkaempfeid, wd.int_disziplinenid, w.int_mannschaftenid
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(query.limit, query.offset);
    
    const results = await prisma.$queryRawUnsafe(scoresQuery, ...queryParams) as any[];
    
    const totalCountQuery = `
      SELECT COUNT(DISTINCT w.int_wertungenid) as count
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      ${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(totalCountQuery, ...queryParams.slice(0, -2)) as any[];
    const totalCount = parseInt(totalResult[0]?.count || '0');

    const mappedResults = results.map((result: any) => ({
      id: result.id,
      teamId: parseInt(result.teamid),
      competitionId: parseInt(result.competitionid),
      disciplineId: parseInt(result.disciplineid),
      attempt: result.attempt || 1,
      startNumber: result.startnumber,
      riege: result.riege,
      comment: result.comment,
      club: {
        name: result.clubname
      },
      discipline: {
        name: result.disciplinename
      },
      competition: {
        name: result.competitionname
      }
    }));

    res.json({
      results: mappedResults,
      pagination: {
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching team scores:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/team', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = teamScoreCreateSchema.parse(req.body);
    
    const team = await prisma.tfx_mannschaften.findUnique({
      where: { int_mannschaftenid: validatedData.teamId }
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const competition = await prisma.tfx_wettkaempfe.findUnique({
      where: { int_wettkaempfeid: validatedData.competitionId }
    });
    
    if (!competition) {
      return res.status(404).json({ error: 'Competition not found' });
    }
    
    const discipline = await prisma.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: validatedData.disciplineId }
    });
    
    if (!discipline) {
      return res.status(404).json({ error: 'Discipline not found' });
    }

    let scoreRecord = await prisma.$queryRawUnsafe(`
      SELECT int_wertungenid 
      FROM tfx_wertungen 
      WHERE int_mannschaftenid = $1 
        AND int_wettkaempfeid = $2
      LIMIT 1
    `, validatedData.teamId, validatedData.competitionId) as any[];
    
    let scoreId: number;
    
    if (scoreRecord.length > 0) {
      scoreId = scoreRecord[0].int_wertungenid;
      
      await prisma.$executeRawUnsafe(`
        UPDATE tfx_wertungen 
        SET int_statusid = $1,
            int_startnummer = $2,
            var_riege = $3,
            var_comment = $4
        WHERE int_wertungenid = $5
      `, validatedData.statusId, validatedData.startNumber || team.int_startnummer, 
         validatedData.riege || null, validatedData.comment || null, scoreId);
    } else {
      const insertResult = await prisma.$queryRawUnsafe(`
        INSERT INTO tfx_wertungen 
          (int_mannschaftenid, int_wettkaempfeid, int_statusid, int_startnummer, var_riege, var_comment, int_teilnehmerid)
        VALUES ($1, $2, $3, $4, $5, $6, 0)
        RETURNING int_wertungenid
      `, validatedData.teamId, validatedData.competitionId, validatedData.statusId,
         validatedData.startNumber || team.int_startnummer, validatedData.riege || null, 
         validatedData.comment || null) as any[];
      
      scoreId = insertResult[0].int_wertungenid;
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM tfx_wertungen_details 
      WHERE int_wertungenid = $1 
        AND int_disziplinenid = $2 
        AND int_versuch = $3
    `, scoreId, validatedData.disciplineId, validatedData.attempt);

    for (const component of validatedData.components) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO tfx_wertungen_details 
          (int_wertungenid, int_disziplinenid, int_versuch, int_kp, rel_leistung)
        VALUES ($1, $2, $3, $4, $5)
      `, scoreId, validatedData.disciplineId, validatedData.attempt, 
         component.fieldId, component.value);
    }

    const finalScoreField = await prisma.$queryRawUnsafe(`
      SELECT int_disziplinen_felderid 
      FROM tfx_disziplinen_felder 
      WHERE int_disziplinenid = $1 
        AND bol_endwert = true 
      LIMIT 1
    `, validatedData.disciplineId) as any[];
    
    if (finalScoreField.length > 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO tfx_wertungen_details 
          (int_wertungenid, int_disziplinenid, int_versuch, int_kp, rel_leistung)
        VALUES ($1, $2, $3, $4, $5)
      `, scoreId, validatedData.disciplineId, validatedData.attempt,
         finalScoreField[0].int_disziplinen_felderid, validatedData.finalScore);
    }

    res.status(201).json({
      id: scoreId,
      teamId: validatedData.teamId,
      competitionId: validatedData.competitionId,
      disciplineId: validatedData.disciplineId,
      attempt: validatedData.attempt,
      message: 'Team score created/updated successfully'
    });

  } catch (error) {
    console.error('Error creating team score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/team/:scoreId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const scoreId = parseInt(req.params.scoreId);
    
    if (isNaN(scoreId)) {
      return res.status(400).json({ error: 'Invalid score ID' });
    }

    const score = await prisma.$queryRawUnsafe(`
      SELECT int_wertungenid, int_mannschaftenid 
      FROM tfx_wertungen 
      WHERE int_wertungenid = $1 
        AND int_mannschaftenid IS NOT NULL
    `, scoreId) as any[];
    
    if (score.length === 0) {
      return res.status(404).json({ error: 'Team score not found' });
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM tfx_wertungen_details 
      WHERE int_wertungenid = $1
    `, scoreId);

    await prisma.$executeRawUnsafe(`
      DELETE FROM tfx_wertungen 
      WHERE int_wertungenid = $1
    `, scoreId);

    res.json({ 
      message: 'Team score deleted successfully',
      id: scoreId
    });

  } catch (error) {
    console.error('Error deleting team score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
