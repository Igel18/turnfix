/**
 * Scores scoring routes for TurnFix.
 * 
 * Extracted from routes/scores.ts for Separation of Concerns.
 * Handles scoring operations: save-value (score capture + Socket.IO),
 * create-wertung (jury portal), calculate-final (formula-based).
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';
import { ScoreSynchronizer } from '../utils/scoreSynchronizer';
import { calculateFormula, buildFieldSymbolsMap } from '../utils/formulaUtils';


const router = Router();

// Save/update score value (simple endpoint for score capture)
router.post('/save-value', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🎯 ======= SAVE-VALUE ENDPOINT CALLED =======');
    console.log('🎯 Request body:', req.body);
    
    const { competitionId, participantId, disciplineId, score } = req.body;
    
    // Validate required fields
    if (!participantId || !disciplineId || score === undefined || score === null) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: participantId, disciplineId, and score are required' 
      });
    }

    console.log('Saving score value:', { competitionId, participantId, disciplineId, score });

    // Parse disciplineId - it might be a string like "Pauschenpferd-0" or a number
    let actualDisciplineId: number;
    if (typeof disciplineId === 'string' && disciplineId.includes('-')) {
      // Extract numeric part from generated discipline ID or skip this record
      console.log('Discipline ID is a generated string, trying to find actual discipline ID');
      // For now, we'll skip saving scores with generated IDs
      return res.status(400).json({ 
        error: 'Cannot save score with generated discipline ID. Please select a valid discipline.' 
      });
    } else {
      actualDisciplineId = parseInt(disciplineId.toString());
      if (isNaN(actualDisciplineId)) {
        return res.status(400).json({ 
          error: 'Invalid discipline ID format' 
        });
      }
    }

    // Use ScoreSynchronizer to find the correct competition ID
    const actualCompetitionId = await ScoreSynchronizer.findCorrectCompetitionId(
      participantId,
      actualDisciplineId,
      undefined, // eventId - we'll derive it from competition
      competitionId ? parseInt(competitionId) : undefined
    );

    if (!actualCompetitionId) {
      return res.status(400).json({ 
        error: 'Could not determine correct competition for this participant and discipline. Please ensure the participant is registered for a competition that includes this discipline.' 
      });
    }

    console.log(`✅ Using competition ID: ${actualCompetitionId}`);

    // Find or create the wertungen record (using advisory lock to prevent duplicates under concurrent access)
    let wertungenId: number;
    
    const wertungenResult = await prisma.$transaction(async (tx) => {
      // Advisory lock based on competition+participant to prevent duplicate wertungen creation
      const lockKey = actualCompetitionId * 1000000 + participantId;
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', lockKey);
      
      const existing = await tx.$queryRawUnsafe(
        `SELECT int_wertungenid FROM tfx_wertungen WHERE int_wettkaempfeid = $1 AND int_teilnehmerid = $2`,
        actualCompetitionId, participantId
      ) as any[];
      
      if (existing.length === 0) {
        const created = await tx.$queryRawUnsafe(
          `INSERT INTO tfx_wertungen (int_wettkaempfeid, int_teilnehmerid, int_statusid) VALUES ($1, $2, $3) RETURNING int_wertungenid`,
          actualCompetitionId, participantId, 1
        ) as any[];
        console.log('Created new wertungen record with ID:', created[0].int_wertungenid);
        return created[0].int_wertungenid;
      } else {
        console.log('Using existing wertungen record with ID:', existing[0].int_wertungenid);
        return existing[0].int_wertungenid;
      }
    });
    
    wertungenId = wertungenResult;

    // Use ScoreSynchronizer to update the score and ensure consistency
    await ScoreSynchronizer.updateWertungsDetailsScore(
      wertungenId,
      actualDisciplineId,
      parseFloat(score),
      1, // attempt
      0  // kp (default)
    );

    // Get event ID for Socket.IO emission
    const eventIdQuery = `
      SELECT wk.int_veranstaltungenid as event_id
      FROM tfx_wettkaempfe wk
      WHERE wk.int_wettkaempfeid = $1
    `;
    console.log(`🔍 Looking up eventId for competitionId: ${actualCompetitionId}`);
    const eventIdResult = await prisma.$queryRawUnsafe(eventIdQuery, actualCompetitionId) as any[];
    console.log(`🔍 Event ID query result:`, eventIdResult);
    const eventId = eventIdResult[0]?.event_id;
    console.log(`🔍 Extracted eventId: ${eventId}`);

    // Emit Socket.IO events for real-time updates
    if (eventId) {
      try {
        const io = req.app.get('io');
        
        console.log(`🔍 About to query score details with wertungenId=${wertungenId}, disciplineId=${actualDisciplineId}`);
        
        // Fetch additional data for the live score update including formula and jury results
        const scoreDetailsQuery = `
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
            d.var_name as discipline_name,
            d.var_kurz1 as discipline_short,
            w.var_riege as squad_name,
            d.var_formel as discipline_formula,
            d.int_formelid as formula_id,
            f.var_formel as table_formula
          FROM tfx_wertungen w
          LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
          LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          LEFT JOIN tfx_disziplinen d ON $2 = d.int_disziplinenid
          LEFT JOIN tfx_formeln f ON d.int_formelid = f.int_formelid
          WHERE w.int_wertungenid = $1
        `;
        
        console.log(`🔍 Executing SQL query for score details...`);
        const scoreDetails = await prisma.$queryRawUnsafe(scoreDetailsQuery, wertungenId, actualDisciplineId) as any[];
        console.log(`🔍 Query returned ${scoreDetails?.length || 0} rows`);
        const details = scoreDetails[0] || {};
        
        console.log(`🔔 Score details from DB:`, details);
        
        // Get formula (prefer table formula over discipline formula)
        const formula = details.table_formula || details.discipline_formula;
        
        let calculatedScore = parseFloat(score); // Default to stored score
        
        // If we have a formula, fetch jury results and recalculate
        if (formula) {
          console.log(`🧮 Formula found: "${formula}", fetching jury results for recalculation...`);
          
          // Fetch jury results for this participant/discipline
          // NOTE: aliases MUST use camelCase (double-quoted) to match what
          // buildFieldSymbolsMap() expects. snake_case aliases cause field-name
          // matching to fail → valuesMap stays empty → calculateFormula returns 0
          // for custom formulas (e.g. "1*x") → live score shows "0.0". Bug #88.
          const juryResultsQuery = `
            SELECT 
              jr.rel_leistung as performance,
              df.int_sortierung as "sortOrder",
              df.var_name as "fieldName",
              df.var_name as "fieldShortName",
              df.bol_endwert as "isFinalScore",
              df.bol_ausgangswert as "isStartingScore"
            FROM tfx_jury_results jr
            LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
            WHERE jr.int_wertungenid = $1
              AND df.int_disziplinenid = $2
              AND jr.int_versuch = 1
            ORDER BY df.int_sortierung ASC
          `;
          
          const juryResults = await prisma.$queryRawUnsafe(juryResultsQuery, wertungenId, actualDisciplineId) as any[];
          console.log(`🧮 Jury results:`, juryResults);
          
          if (juryResults && juryResults.length > 0) {
            // Build field symbols map
            const fieldsMap = buildFieldSymbolsMap(juryResults, formula);
            const fields = Object.values(fieldsMap);
            
            // Build values map for calculation
            const valuesMap: Record<string, number> = {};
            fields.forEach(field => {
              if (field.value !== null) {
                valuesMap[field.symbol] = field.value;
              }
            });
            
            console.log(`🧮 Calculating formula "${formula}" with values:`, valuesMap);
            
            // Calculate using centralized formula utility
            const result = calculateFormula(formula, valuesMap);
            
            if (result !== null) {
              // Safety net: if formula gives 0 but stored score is clearly non-zero,
              // trust the stored body score instead. This prevents the bug where
              // missing/unmatched variables are replaced with 0 and produce a wrong 0.
              const bodyScoreFloat = parseFloat(score);
              const resultLooksWrong = result === 0 && Math.abs(bodyScoreFloat) > 0.01;
              if (resultLooksWrong) {
                console.warn(`⚠️ Formula returned 0 but body score is ${bodyScoreFloat}. Trusting body score. (check SQL column aliases and jury results)`);
                // calculatedScore keeps its previous value (parseFloat(score))
              } else {
                calculatedScore = result;
                console.log(`✅ Formula calculated successfully: ${result}`);
              }
              
              if (!resultLooksWrong && Math.abs(result - parseFloat(score)) > 0.01) {
                console.warn(`⚠️ Score mismatch! Stored: ${score}, Calculated: ${result}`);
              }
            } else {
              console.warn(`⚠️ Formula calculation failed, using stored score: ${score}`);
            }
          } else {
            console.log(`ℹ️ No jury results found, using stored score: ${score}`);
          }
        } else {
          console.log(`ℹ️ No formula found for discipline, using stored score: ${score}`);
        }
        
        console.log(`🔔 Emitting score-updated event for eventId ${eventId}`);
        io.to(`competition-${eventId}`).emit('score-updated', { 
          scoreId: wertungenId,
          eventId, 
          competitionId: actualCompetitionId,
          competitionName: details.competition_name,
          competitionNumber: details.competition_number,
          participantId,
          firstname: details.firstname,
          lastname: details.lastname,
          gender: details.gender,
          disciplineId: actualDisciplineId,
          disciplineName: details.discipline_name,
          disciplineShort: details.discipline_short,
          squadName: details.squad_name,
          score: calculatedScore,        // Use calculated score
          finalScore: calculatedScore,  // Use calculated score for live view
          storedScore: parseFloat(score), // Include original stored score for debugging
          hasFormula: !!formula,
          timestamp: new Date().toISOString(),
          updated: true 
        });
        console.log(`✅ Socket.IO event emitted to competition-${eventId} with calculated score: ${calculatedScore} (stored: ${score}) for ${details.firstname} ${details.lastname}`);
      } catch (socketError) {
        console.error('❌ Error fetching score details or emitting Socket.IO event:', socketError);
      }
    } else {
      console.warn(`⚠️ No eventId found for competitionId ${actualCompetitionId}, skipping Socket.IO emission`);
      console.warn(`⚠️ Query result was:`, eventIdResult);
    }

    res.json({
      success: true,
      message: 'Score saved successfully with synchronization',
      wertungenId: wertungenId,
      competitionId: actualCompetitionId,
      score: parseFloat(score)
    });

  } catch (error) {
    console.error('Error saving score value:', error);
    res.status(500).json({ 
      error: 'Failed to save score',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new wertungen entry (for formula-based scoring in Jury Portal)
 * POST /api/scores/create-wertung
 * Body: { competitionId, participantId, disciplineId }
 */
router.post('/create-wertung', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { competitionId, participantId, disciplineId } = req.body;
    
    if (!competitionId || !participantId || !disciplineId) {
      return res.status(400).json({ 
        error: 'Missing required fields: competitionId, participantId, disciplineId' 
      });
    }
    
    console.log('📝 Creating wertungen entry:', { competitionId, participantId, disciplineId });
    
    // Use advisory lock to prevent duplicate wertungen creation under concurrent access
    const result = await prisma.$transaction(async (tx) => {
      const lockKey = competitionId * 1000000 + participantId;
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', lockKey);
      
      const existing = await tx.$queryRawUnsafe(
        `SELECT int_wertungenid FROM tfx_wertungen WHERE int_wettkaempfeid = $1 AND int_teilnehmerid = $2 LIMIT 1`,
        competitionId, participantId
      ) as any[];
      
      if (existing && existing.length > 0) {
        console.log('✅ Wertungen entry already exists:', existing[0].int_wertungenid);
        return { wertungenId: existing[0].int_wertungenid, created: false };
      }
      
      const inserted = await tx.$queryRawUnsafe(
        `INSERT INTO tfx_wertungen (int_wettkaempfeid, int_teilnehmerid, int_statusid, var_riege) VALUES ($1, $2, 1, '') RETURNING int_wertungenid`,
        competitionId, participantId
      ) as any[];
      
      if (inserted && inserted.length > 0) {
        console.log('✅ Created new wertungen entry:', inserted[0].int_wertungenid);
        return { wertungenId: inserted[0].int_wertungenid, created: true };
      }
      throw new Error('Failed to create wertungen entry');
    });
    
    res.json({
      success: true,
      wertungenId: result.wertungenId,
      message: result.created ? 'Wertungen entry created successfully' : 'Existing wertungen entry found'
    });
    
  } catch (error) {
    console.error('❌ Error creating wertungen entry:', error);
    res.status(500).json({ 
      error: 'Failed to create wertungen entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Calculate and save final score for formula-based disciplines
 * POST /api/scores/calculate-final
 * Body: { competitionId, participantId, disciplineId }
 */
router.post('/calculate-final', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { competitionId, participantId, disciplineId } = req.body;
    
    if (!competitionId || !participantId || !disciplineId) {
      return res.status(400).json({ 
        error: 'Missing required fields: competitionId, participantId, disciplineId' 
      });
    }
    
    console.log('🧮 Calculating final score:', { competitionId, participantId, disciplineId });
    
    // Get wertungenId
    const wertungenQuery = `
      SELECT int_wertungenid 
      FROM tfx_wertungen 
      WHERE int_wettkaempfeid = $1 AND int_teilnehmerid = $2
      LIMIT 1
    `;
    
    const wertungenResult = await prisma.$queryRawUnsafe(wertungenQuery, competitionId, participantId) as any[];
    
    if (!wertungenResult || wertungenResult.length === 0) {
      return res.status(404).json({ error: 'No wertungen entry found' });
    }
    
    const wertungenId = wertungenResult[0].int_wertungenid;
    console.log('✅ Found wertungenId:', wertungenId);
    
    // Get formula for discipline
    const formulaQuery = `
      SELECT 
        d.var_formel as "disciplineFormula",
        f.var_formel as "lookupFormula",
        d.int_formelid
      FROM tfx_disziplinen d
      LEFT JOIN tfx_formeln f ON d.int_formelid = f.int_formelid
      WHERE d.int_disziplinenid = $1
    `;
    
    const formulaResult = await prisma.$queryRawUnsafe(formulaQuery, disciplineId) as any[];
    
    if (!formulaResult || formulaResult.length === 0) {
      return res.status(404).json({ error: 'Discipline not found' });
    }
    
    const formula = formulaResult[0].lookupFormula;
    
    if (!formula) {
      // Only linked formulas (from tfx_formeln) are used for multi-field calculation.
      // The discipline's own var_formel is a built-in formula applied at ranking time,
      // NOT for calculating Endwert from fields. (C++ backward compatibility)
      return res.status(400).json({ error: 'No linked formula template defined for this discipline (only built-in var_formel found, which is applied at ranking time)' });
    }
    
    console.log('📝 Formula:', formula);
    
    // Get all non-final jury results
    const juryResultsQuery = `
      SELECT 
        jr.rel_leistung as performance,
        df.var_name as "fieldName",
        df.bol_endwert as "isFinalScore",
        df.int_sortierung as "sortOrder"
      FROM tfx_jury_results jr
      INNER JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
      WHERE jr.int_wertungenid = $1
        AND df.int_disziplinenid = $2
        AND jr.int_versuch = 1
        AND df.bol_endwert = false
      ORDER BY df.int_sortierung ASC
    `;
    
    const juryResults = await prisma.$queryRawUnsafe(juryResultsQuery, wertungenId, disciplineId) as any[];
    console.log('📊 Jury results:', juryResults);
    
    if (!juryResults || juryResults.length === 0) {
      return res.status(400).json({ error: 'No jury results found to calculate from' });
    }
    
    // Build field symbols map
    const fieldsMap = buildFieldSymbolsMap(juryResults, formula);
    const fields = Object.values(fieldsMap);
    
    // Build values map for calculation
    const valuesMap: Record<string, number> = {};
    fields.forEach(field => {
      if (field.value !== null && !juryResults.find(jr => jr.fieldName === field.fieldName && jr.isFinalScore)) {
        valuesMap[field.symbol] = field.value;
      }
    });
    
    console.log('🧮 Calculating with values:', valuesMap);
    
    // Calculate using centralized formula utility
    const result = calculateFormula(formula, valuesMap);
    
    if (result === null) {
      return res.status(500).json({ error: 'Formula calculation failed' });
    }
    
    console.log('✅ Calculated final score:', result);
    
    // Get the final score field ID
    const finalFieldQuery = `
      SELECT int_disziplinen_felderid
      FROM tfx_disziplinen_felder
      WHERE int_disziplinenid = $1 AND bol_endwert = true
      LIMIT 1
    `;
    
    const finalFieldResult = await prisma.$queryRawUnsafe(finalFieldQuery, disciplineId) as any[];
    
    if (!finalFieldResult || finalFieldResult.length === 0) {
      return res.status(404).json({ error: 'No final score field defined' });
    }
    
    const finalFieldId = finalFieldResult[0].int_disziplinen_felderid;
    
    // Check if final score already exists
    const existingFinalQuery = `
      SELECT int_juryresultsid
      FROM tfx_jury_results
      WHERE int_wertungenid = $1 
        AND int_disziplinen_felderid = $2 
        AND int_versuch = 1
      LIMIT 1
    `;
    
    const existingFinal = await prisma.$queryRawUnsafe(
      existingFinalQuery,
      wertungenId,
      finalFieldId
    ) as any[];
    
    if (existingFinal && existingFinal.length > 0) {
      // Update existing final score
      const updateQuery = `
        UPDATE tfx_jury_results
        SET rel_leistung = $1
        WHERE int_juryresultsid = $2
      `;
      await prisma.$executeRawUnsafe(updateQuery, result, existingFinal[0].int_juryresultsid);
      console.log('✅ Updated existing final score in tfx_jury_results');
    } else {
      // Insert new final score
      const insertQuery = `
        INSERT INTO tfx_jury_results 
          (int_wertungenid, int_disziplinen_felderid, int_versuch, rel_leistung, int_kp)
        VALUES ($1, $2, 1, $3, 0)
      `;
      await prisma.$executeRawUnsafe(insertQuery, wertungenId, finalFieldId, result);
      console.log('✅ Inserted new final score to tfx_jury_results');
    }
    
    // Update tfx_wertungen_details for legacy compatibility
    const updateDetailsQuery = `
      UPDATE tfx_wertungen_details
      SET rel_leistung = $1
      WHERE int_wertungenid = $2 AND int_disziplinenid = $3
    `;
    
    await prisma.$executeRawUnsafe(updateDetailsQuery, result, wertungenId, disciplineId);
    console.log('✅ Updated tfx_wertungen_details');
    
    // Emit Socket.IO event
    try {
      const io = req.app.get('io');
      const eventQuery = `
        SELECT wk.int_veranstaltungenid as event_id
        FROM tfx_wertungen w
        LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
        WHERE w.int_wertungenid = $1
      `;
      const eventResult = await prisma.$queryRawUnsafe(eventQuery, wertungenId) as any[];
      const eventId = eventResult[0]?.event_id;
      
      if (eventId) {
        io.to(`competition-${eventId}`).emit('score-updated', { 
          eventId,
          competitionId,
          disciplineId,
          participantId, // This is the teilnehmer_id from the request
          wertungenId, // This is the actual wertungen_id
          score: result,
          calculated: true
        });
        console.log('✅ Emitted Socket.IO event with participantId:', participantId, 'wertungenId:', wertungenId);
      }
    } catch (socketError) {
      console.error('❌ Socket.IO error:', socketError);
    }
    
    res.json({
      success: true,
      finalScore: result,
      message: 'Final score calculated and saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error calculating final score:', error);
    res.status(500).json({ 
      error: 'Failed to calculate final score',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
