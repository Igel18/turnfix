import { Router } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { ScoreSynchronizer } from '../utils/scoreSynchronizer';
import { calculateFormula, buildFieldSymbolsMap } from '../utils/formulaUtils';

const router = Router();

// Validation schema
const juryResultCreateSchema = z.object({
  participantId: z.number().int().positive().describe('Participant ID (int_teilnehmerid) - will be converted to wertungenid'),
  disciplineFieldId: z.number().int().positive(),
  attempt: z.number().int().min(1).default(1),
  performance: z.number(),
  type: z.number().int().min(0).max(1).default(0).describe('0=Pflicht, 1=Kür'),
  eventId: z.number().int().positive().optional(),
  competitionId: z.number().int().positive().optional()
});

// Create new jury result
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = juryResultCreateSchema.parse(req.body);
    console.log('Creating jury result:', validatedData);

    // The participantId from the client is actually the wertungenId
    // (from Score Capture, it's passed as wertungenId prop)
    const wertungenId = validatedData.participantId;
    console.log(`Using wertungenid: ${wertungenId}`);

    // Check if entry already exists
    const existingQuery = `
      SELECT int_juryresultsid
      FROM tfx_jury_results
      WHERE int_wertungenid = $1 
        AND int_disziplinen_felderid = $2
        AND int_versuch = $3
      LIMIT 1
    `;

    const existing = await prisma.$queryRawUnsafe(
      existingQuery,
      wertungenId,
      validatedData.disciplineFieldId,
      validatedData.attempt
    ) as any[];

    let result;
    
    if (existing && existing.length > 0) {
      // Update existing entry
      const updateQuery = `
        UPDATE tfx_jury_results
        SET rel_leistung = $1,
            int_kp = $2
        WHERE int_juryresultsid = $3
        RETURNING *
      `;
      
      result = await prisma.$queryRawUnsafe(
        updateQuery,
        validatedData.performance,
        validatedData.type,
        existing[0].int_juryresultsid
      ) as any[];
    } else {
      // Insert new entry
      const insertQuery = `
        INSERT INTO tfx_jury_results 
          (int_wertungenid, int_disziplinen_felderid, int_versuch, rel_leistung, int_kp)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      result = await prisma.$queryRawUnsafe(
        insertQuery,
        wertungenId,
        validatedData.disciplineFieldId,
        validatedData.attempt,
        validatedData.performance,
        validatedData.type
      ) as any[];
    }

    if (!result || result.length === 0) {
      return res.status(500).json({ error: 'Failed to save jury result' });
    }

    console.log('Saved jury result:', result[0]);

    // ✨ UPDATE tfx_wertungen_details with final score
    // Get the discipline from the field
    const disciplineQuery = `
      SELECT int_disziplinenid 
      FROM tfx_disziplinen_felder 
      WHERE int_disziplinen_felderid = $1
    `;
    const disciplineResult = await prisma.$queryRawUnsafe(
      disciplineQuery,
      validatedData.disciplineFieldId
    ) as any[];

    if (disciplineResult && disciplineResult.length > 0) {
      const disciplineId = disciplineResult[0].int_disziplinenid;

      // Check if this field is the final score field
      const fieldQuery = `
        SELECT bol_endwert 
        FROM tfx_disziplinen_felder 
        WHERE int_disziplinen_felderid = $1
      `;
      const fieldResult = await prisma.$queryRawUnsafe(
        fieldQuery,
        validatedData.disciplineFieldId
      ) as any[];

      const isFinalScoreField = fieldResult && fieldResult.length > 0 && fieldResult[0].bol_endwert;

      if (isFinalScoreField) {
        // This is the final score field - update tfx_wertungen_details
        console.log(`💾 Updating tfx_wertungen_details: wertungenId=${wertungenId}, disciplineId=${disciplineId}, score=${validatedData.performance}`);
        
        const updateDetailsQuery = `
          UPDATE tfx_wertungen_details
          SET rel_leistung = $1
          WHERE int_wertungenid = $2 AND int_disziplinenid = $3
        `;
        
        await prisma.$executeRawUnsafe(
          updateDetailsQuery,
          validatedData.performance,
          wertungenId,
          disciplineId
        );

        console.log('✅ Updated tfx_wertungen_details with final score');
      }
      
      // ✨ Emit Socket.IO event ONLY for final score field to avoid duplicate events
      // When saving A, B, C fields: Don't emit (jury portal will emit once at the end)
      // When saving final score field (bol_endwert=true): Emit with calculated score
      if (isFinalScoreField) {
        try {
          const io = req.app.get('io');
          
          console.log(`[JuryResults] 🔍 Starting Socket.IO emit for wertungenId=${wertungenId}, disciplineId=${disciplineId}`);
          
          // Get event ID for Socket.IO room
          const eventQuery = `
            SELECT wk.int_veranstaltungenid as event_id
            FROM tfx_wertungen w
            LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
            WHERE w.int_wertungenid = $1
          `;
          const eventResult = await prisma.$queryRawUnsafe(eventQuery, wertungenId) as any[];
          const eventId = eventResult[0]?.event_id;
        
        console.log(`[JuryResults] 🔍 Found eventId: ${eventId}`);
        
        if (eventId) {
            // Fetch formula and competition details
            const detailsQuery = `
              SELECT 
                t.var_vorname as firstname,
                t.var_nachname as lastname,
                CASE 
                  WHEN t.int_geschlecht = 1 THEN 'männlich'
                  WHEN t.int_geschlecht = 2 THEN 'weiblich'
                  ELSE 'männlich'
                END as gender,
                wk.var_name as competition_name,
                wk.var_nummer as competition_number,
                wk.int_wettkaempfeid as competition_id,
                d.var_name as discipline_name,
                d.var_kurz1 as discipline_short,
                w.var_riege as squad_name,
                d.var_formel as discipline_formula,
                f.var_formel as table_formula
              FROM tfx_wertungen w
              LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
              LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
              LEFT JOIN tfx_disziplinen d ON $2 = d.int_disziplinenid
              LEFT JOIN tfx_formeln f ON d.int_formelid = f.int_formelid
              WHERE w.int_wertungenid = $1
            `;
            
            const details = await prisma.$queryRawUnsafe(detailsQuery, wertungenId, disciplineId) as any[];
            const info = details[0] || {};
            
            // Get formula and calculate score
            const formula = info.table_formula || info.discipline_formula;
            const startValue = info.start_value || 10;
            let calculatedScore = validatedData.performance;
            
            if (formula) {
              console.log(`[JuryResults] Formula found: "${formula}", recalculating...`);
              
              // Fetch all jury results for formula calculation
              const juryResultsQuery = `
                SELECT 
                  jr.rel_leistung as performance,
                  jr.int_versuch as attempt,
                  df.var_name as field_name,
                  df.var_name as field_short_name,
                  df.int_sortierung as sort_order
                FROM tfx_jury_results jr
                LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
                WHERE jr.int_wertungenid = $1
                  AND df.int_disziplinenid = $2
                  AND jr.int_versuch = $3
                ORDER BY df.int_sortierung ASC
              `;
              
              const juryResults = await prisma.$queryRawUnsafe(
                juryResultsQuery, 
                wertungenId, 
                disciplineId,
                validatedData.attempt
              ) as any[];
              
              if (juryResults && juryResults.length > 0) {
                const fieldsMap = buildFieldSymbolsMap(juryResults, formula);
                const fields = Object.values(fieldsMap);
                const valuesMap: Record<string, number> = {};
                
                fields.forEach(field => {
                  if (field.value !== null) {
                    valuesMap[field.symbol] = field.value;
                  }
                });
                
                console.log(`[JuryResults] Calculating formula with values:`, valuesMap);
                const result = calculateFormula(formula, valuesMap, startValue);
                
                if (result !== null) {
                  calculatedScore = result;
                  console.log(`[JuryResults] ✅ Calculated score: ${result}`);
                }
              }
            }
            
            // Emit Socket.IO event
            console.log(`[JuryResults] 🔔 Emitting score-updated to room 'competition-${eventId}'`);
            console.log(`[JuryResults] 🔔 Event data:`, {
              scoreId: wertungenId,
              eventId,
              disciplineName: info.discipline_name,
              participantName: `${info.firstname} ${info.lastname}`,
              calculatedScore
            });
            
            io.to(`competition-${eventId}`).emit('score-updated', {
              scoreId: wertungenId,
              eventId,
              competitionId: info.competition_id,
              competitionName: info.competition_name,
              competitionNumber: info.competition_number,
              disciplineId: disciplineId,
              disciplineName: info.discipline_name,
              disciplineShort: info.discipline_short,
              firstname: info.firstname,
              lastname: info.lastname,
              participantFirstName: info.firstname,
              participantLastName: info.lastname,
              participantGender: info.gender,
              gender: info.gender,
              squadName: info.squad_name,
              finalScore: calculatedScore,
              score: calculatedScore,
              formula: formula,
              startValue: startValue,
              attempt: validatedData.attempt,
              timestamp: new Date().toISOString()
            });
            
            console.log(`[JuryResults] ✅ Socket.IO event emitted successfully`);
          } else {
            console.log(`[JuryResults] ⚠️ No eventId found, skipping Socket.IO emit`);
          }
        } catch (socketError) {
          console.error('[JuryResults] ⚠️ Socket.IO emit failed:', socketError);
          // Don't fail the request if Socket.IO fails
        }
      } else {
        console.log(`[JuryResults] ⏭️ Skipping Socket.IO emit for non-final field (only emit on final score field)`);
      }
    } // Close the disciplineResult check
    
    res.status(existing && existing.length > 0 ? 200 : 201).json(result[0]);

  } catch (error) {
    console.error('Error creating jury result:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save or update jury result (upsert operation)
router.post('/save-field-score', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = juryResultCreateSchema.parse(req.body);
    console.log('Saving field score:', validatedData);
    console.log('DEBUG: eventId in request:', validatedData.eventId);
    console.log('DEBUG: competitionId in request:', validatedData.competitionId);

    // Get the discipline ID from the discipline field first
    const fieldDisciplineQuery = `
      SELECT int_disziplinenid 
      FROM tfx_disziplinen_felder 
      WHERE int_disziplinen_felderid = $1
    `;
    
    const fieldDisciplineResult = await prisma.$queryRawUnsafe(
      fieldDisciplineQuery,
      validatedData.disciplineFieldId
    ) as any[];

    if (fieldDisciplineResult.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid discipline field ID. Field not found.' 
      });
    }

    const disciplineId = fieldDisciplineResult[0].int_disziplinenid;
    console.log(`✅ Found discipline ID ${disciplineId} for field ID ${validatedData.disciplineFieldId}`);

    // Use ScoreSynchronizer to find the correct competition ID with the actual discipline ID
    const actualCompetitionId = await ScoreSynchronizer.findCorrectCompetitionId(
      validatedData.participantId,
      disciplineId, // Use the actual discipline ID, not the field ID
      validatedData.eventId,
      validatedData.competitionId
    );

    if (!actualCompetitionId) {
      return res.status(400).json({ 
        error: 'Could not determine correct competition for this participant and discipline field. Please ensure the participant is registered for a competition that includes this discipline.' 
      });
    }

    console.log(`✅ Using competition ID: ${actualCompetitionId} (from ScoreSynchronizer)`);

    // Find the wertungenid for this participant and competition
    const wertungenQuery = `
      SELECT w.int_wertungenid
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = $1
        AND wk.int_veranstaltungenid = $2
        AND w.int_wettkaempfeid = $3
      ORDER BY w.int_wertungenid DESC
      LIMIT 1
    `;

    const queryParams = [validatedData.participantId, validatedData.eventId, actualCompetitionId];
    console.log('DEBUG: Final query:', wertungenQuery);
    console.log('DEBUG: Query params:', queryParams);

    const wertungenResult = await prisma.$queryRawUnsafe(
      wertungenQuery,
      ...queryParams
    ) as any[];

    console.log('DEBUG: Query result:', wertungenResult);

    if (!wertungenResult || wertungenResult.length === 0) {
      return res.status(400).json({ 
        error: 'No evaluation record found for this participant in this competition and event. Participant must be registered for the correct competition.' 
      });
    }

    const wertungenId = wertungenResult[0].int_wertungenid;
    console.log(`Found wertungenid ${wertungenId} for participant ${validatedData.participantId}, event ${validatedData.eventId}, competition ${actualCompetitionId}`);

    // Ensure there's a corresponding entry in tfx_wertungen_details for Qt compatibility
    await ScoreSynchronizer.ensureWertungsDetailsEntry(
      wertungenId,
      disciplineId, // Use the disciplineId we found earlier
      validatedData.attempt,
      validatedData.type
    );

    // Check if jury result already exists
    const existingQuery = `
      SELECT int_juryresultsid as id
      FROM tfx_jury_results 
      WHERE int_wertungenid = $1 
        AND int_disziplinen_felderid = $2 
        AND int_versuch = $3 
        AND int_kp = $4
    `;

    const existing = await prisma.$queryRawUnsafe(
      existingQuery,
      wertungenId,  // Use the correct wertungenid
      validatedData.disciplineFieldId,
      validatedData.attempt,
      validatedData.type
    ) as any[];

    let result;
    
    if (existing && existing.length > 0) {
      // Update existing
      const updateQuery = `
        UPDATE tfx_jury_results 
        SET rel_leistung = $1
        WHERE int_juryresultsid = $2
        RETURNING *
      `;
      
      result = await prisma.$queryRawUnsafe(
        updateQuery,
        validatedData.performance,
        existing[0].id
      ) as any[];
      
      console.log('Updated existing jury result:', result[0]);
    } else {
      // Create new
      const insertQuery = `
        INSERT INTO tfx_jury_results 
          (int_wertungenid, int_disziplinen_felderid, int_versuch, rel_leistung, int_kp)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      result = await prisma.$queryRawUnsafe(
        insertQuery,
        wertungenId,  // Use the correct wertungenid instead of participantId
        validatedData.disciplineFieldId,
        validatedData.attempt,
        validatedData.performance,
        validatedData.type
      ) as any[];
      
      console.log('Created new jury result:', result[0]);
    }

    if (!result || result.length === 0) {
      return res.status(500).json({ error: 'Failed to save field score' });
    }

    res.json({ 
      success: true, 
      message: 'Field score saved successfully',
      data: result[0] 
    });

  } catch (error) {
    console.error('Error saving field score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
