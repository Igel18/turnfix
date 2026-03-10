import { Router } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import scoringRouter from './juryResultsScoring';

const router = Router();

// Mount scoring sub-router (POST /, POST /save-field-score)
router.use('/', scoringRouter);

// Validation schemas
const juryResultUpdateSchema = z.object({
  participantId: z.number().int().positive().optional(),
  disciplineFieldId: z.number().int().positive().optional(),
  attempt: z.number().int().min(1).optional(),
  performance: z.number().optional(),
  type: z.number().int().min(0).max(1).optional(),
  eventId: z.number().int().positive().optional(),
  competitionId: z.number().int().positive().optional()
});

const juryResultQuerySchema = z.object({
  participantId: z.string().transform(Number).optional(),
  disciplineFieldId: z.string().transform(Number).optional(),
  eventId: z.string().transform(Number).optional(),
  disciplineId: z.string().transform(Number).optional(),
  attempt: z.string().transform(Number).optional(),
  type: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(100),
  offset: z.string().transform(Number).default(0)
});

// Get jury results with filters
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const query = juryResultQuerySchema.parse(req.query);
    
    console.log('Fetching jury results with filters:', query);
    
    // Build SQL query with optional filters
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (query.participantId) {
      whereClause += ` AND jr.int_wertungenid = $${paramIndex}`;
      queryParams.push(query.participantId);
      paramIndex++;
    }
    
    if (query.disciplineFieldId) {
      whereClause += ` AND jr.int_disziplinen_felderid = $${paramIndex}`;
      queryParams.push(query.disciplineFieldId);
      paramIndex++;
    }
    
    if (query.attempt) {
      whereClause += ` AND jr.int_versuch = $${paramIndex}`;
      queryParams.push(query.attempt);
      paramIndex++;
    }
    
    if (query.type !== undefined) {
      whereClause += ` AND jr.int_kp = $${paramIndex}`;
      queryParams.push(query.type);
      paramIndex++;
    }
    
    if (query.disciplineId) {
      whereClause += ` AND df.int_disziplinenid = $${paramIndex}`;
      queryParams.push(query.disciplineId);
      paramIndex++;
    }
    
    if (query.eventId) {
      whereClause += ` AND wk.int_veranstaltungenid = $${paramIndex}`;
      queryParams.push(query.eventId);
      paramIndex++;
    }

    // Main query
    const sqlQuery = `
      SELECT 
        jr.int_juryresultsid as id,
        jr.int_wertungenid as "participantId",
        jr.int_disziplinen_felderid as "disciplineFieldId", 
        jr.int_versuch as attempt,
        jr.rel_leistung as performance,
        jr.int_kp as type,
        df.var_name as "fieldName",
        df.int_disziplinenid as "disciplineId",
        df.bol_endwert as "isFinalScore",
        df.int_sortierung as "sortOrder",
        d.var_name as "disciplineName",
        t.var_vorname as "participantFirstName",
        t.var_nachname as "participantLastName"
      FROM tfx_jury_results jr
      LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
      LEFT JOIN tfx_disziplinen d ON df.int_disziplinenid = d.int_disziplinenid
      LEFT JOIN tfx_wertungen w ON jr.int_wertungenid = w.int_wertungenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      ${whereClause}
      ORDER BY df.int_sortierung ASC, df.int_disziplinen_felderid ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(query.limit, query.offset);
    const results = await prisma.$queryRawUnsafe(sqlQuery, ...queryParams);

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM tfx_jury_results jr
      LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
      LEFT JOIN tfx_wertungen w ON jr.int_wertungenid = w.int_wertungenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe(countQuery, ...queryParams.slice(0, -2)) as any[];
    const totalCount = countResult[0]?.total || 0;

    res.json({
      results: results,
      pagination: {
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching jury results:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update jury result
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = juryResultUpdateSchema.parse(req.body);
    
    console.log('Updating jury result:', id, validatedData);

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (validatedData.participantId !== undefined) {
      updates.push(`int_wertungenid = $${paramIndex}`);
      values.push(validatedData.participantId);
      paramIndex++;
    }

    if (validatedData.disciplineFieldId !== undefined) {
      updates.push(`int_disziplinen_felderid = $${paramIndex}`);
      values.push(validatedData.disciplineFieldId);
      paramIndex++;
    }

    if (validatedData.attempt !== undefined) {
      updates.push(`int_versuch = $${paramIndex}`);
      values.push(validatedData.attempt);
      paramIndex++;
    }

    if (validatedData.performance !== undefined) {
      updates.push(`rel_leistung = $${paramIndex}`);
      values.push(validatedData.performance);
      paramIndex++;
    }

    if (validatedData.type !== undefined) {
      updates.push(`int_kp = $${paramIndex}`);
      values.push(validatedData.type);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const updateQuery = `
      UPDATE tfx_jury_results 
      SET ${updates.join(', ')}
      WHERE int_juryresultsid = $${paramIndex}
      RETURNING *
    `;

    const updated = await prisma.$queryRawUnsafe(updateQuery, ...values) as any[];

    if (!updated || updated.length === 0) {
      return res.status(404).json({ error: 'Jury result not found' });
    }

    console.log('Updated jury result:', updated[0]);

    // ✨ UPDATE tfx_wertungen_details if this is the final score field
    if (validatedData.performance !== undefined) {
      const disciplineQuery = `
        SELECT df.int_disziplinenid, df.bol_endwert, jr.int_wertungenid
        FROM tfx_disziplinen_felder df
        JOIN tfx_jury_results jr ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
        WHERE jr.int_juryresultsid = $1
      `;
      const disciplineResult = await prisma.$queryRawUnsafe(disciplineQuery, id) as any[];

      if (disciplineResult && disciplineResult.length > 0) {
        const { int_disziplinenid, bol_endwert, int_wertungenid } = disciplineResult[0];

        if (bol_endwert) {
          // This is the final score field - update tfx_wertungen_details
          console.log(`💾 Updating tfx_wertungen_details: wertungenId=${int_wertungenid}, disciplineId=${int_disziplinenid}, score=${validatedData.performance}`);
          
          const updateDetailsQuery = `
            UPDATE tfx_wertungen_details
            SET rel_leistung = $1
            WHERE int_wertungenid = $2 AND int_disziplinenid = $3
          `;
          
          await prisma.$executeRawUnsafe(
            updateDetailsQuery,
            validatedData.performance,
            int_wertungenid,
            int_disziplinenid
          );

          console.log('✅ Updated tfx_wertungen_details with final score');
        }
      }
    }

    res.json(updated[0]);

  } catch (error) {
    console.error('Error updating jury result:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete jury result
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('Deleting jury result:', id);

    const deleteQuery = `
      DELETE FROM tfx_jury_results 
      WHERE int_juryresultsid = $1
      RETURNING *
    `;

    const deleted = await prisma.$queryRawUnsafe(deleteQuery, id) as any[];

    if (!deleted || deleted.length === 0) {
      return res.status(404).json({ error: 'Jury result not found' });
    }

    console.log('Deleted jury result:', deleted[0]);
    res.json({ message: 'Jury result deleted successfully', data: deleted[0] });

  } catch (error) {
    console.error('Error deleting jury result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
