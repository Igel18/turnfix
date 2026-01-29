import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';
import { ScoreSynchronizer } from '../utils/scoreSynchronizer';
import { calculateFormula, buildFieldSymbolsMap, FORMULA_VARIABLES } from '../utils/formulaUtils';

const router = Router();

// Validation schemas
const scoreCreateSchema = z.object({
  competitionId: z.number().int(), // int_wettkaempfeid NOT NULL
  participantId: z.number().int(), // int_teilnehmerid NOT NULL
  statusId: z.number().int(),      // int_statusid NOT NULL
  groupId: z.number().int().optional(),
  teamId: z.number().int().optional(),
  round: z.number().int().optional(),
  startNumber: z.number().int().optional(),
  ak: z.boolean().optional(), // "außer Konkurrenz" (out of competition)
  startetNicht: z.boolean().optional(),
  riege: z.string().optional(),
  comment: z.string().optional()
});

const scoreUpdateSchema = scoreCreateSchema.partial();

const scoreQuerySchema = z.object({
  competitionId: z.string().transform(Number).optional(),
  participantId: z.string().transform(Number).optional(),
  disciplineId: z.string().transform(Number).optional(),
  eventId: z.string().transform(Number).optional(),
  squadName: z.string().optional(),
  limit: z.string().transform(Number).default(100),
  offset: z.string().transform(Number).default(0)
});

// Get scores with filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🌐 [Scores API] GET /scores called');
    console.log('Raw query params received:', req.query);
    console.log('Raw query params eventId:', req.query.eventId);
    
    const query = scoreQuerySchema.parse(req.query);
    
    console.log('Fetching scores with filters:', query);
    console.log('Parsed eventId:', query.eventId);
    
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
      whereClause += ` AND wd.int_disziplinenid = $${paramIndex}`;
      queryParams.push(query.disciplineId);
      paramIndex++;
    }

    if (query.eventId) {
      whereClause += ` AND wk.int_veranstaltungenid = $${paramIndex}`;
      queryParams.push(query.eventId);
      paramIndex++;
    }

    if (query.squadName) {
      whereClause += ` AND w.var_riege = $${paramIndex}`;
      queryParams.push(query.squadName);
      paramIndex++;
    }

    const scoresQuery = `
      SELECT 
        w.int_wertungenid as id,
        w.int_teilnehmerid as participantId,
        wd.int_disziplinenid as disciplineId,
        w.int_wettkaempfeid as competitionId,
        wd.rel_leistung as score,
        wd.int_versuch as attempt,
        w.var_comment as notes,
        CASE 
          WHEN wd.rel_leistung IS NOT NULL THEN 'completed'
          ELSE 'pending'
        END as status,
        t.var_vorname,
        t.var_nachname,
        d.var_name as discipline_name,
        wk.var_name as competition_name
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_disziplinen d ON wd.int_disziplinenid = d.int_disziplinenid  
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      ${whereClause}
      ORDER BY w.int_wettkaempfeid, wd.int_disziplinenid, w.int_teilnehmerid
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(query.limit, query.offset);
    
    const results = await prisma.$queryRawUnsafe(scoresQuery, ...queryParams) as any[];

    console.log(`📊 [Scores API] Query returned ${results.length} results`);
    if (results.length > 0) {
      console.log('📋 [Scores API] Sample result:', { id: results[0].id, participantid: results[0].participantid, disciplineid: results[0].disciplineid });
    }

    // Load jury results for each score
    const resultsWithJuryData = await Promise.all(results.map(async (result: any) => {
      if (!result.id) return result;
      
      // Initialize formula and startValue for this result
      let formula: string | null = null;
      let startValue = 10.0; // Default starting value
      
      try {
        console.log('🔍 [Server] Loading jury results for wertungenId:', result.id);
        
        const juryResultsQuery = `
          SELECT 
            jr.int_juryresultsid as id,
            jr.int_disziplinen_felderid as "disciplineFieldId",
            jr.rel_leistung as performance,
            jr.int_versuch as attempt,
            jr.int_kp as kp,
            df.var_name as "fieldName",
            df.var_name as "fieldShortName",
            df.bol_endwert as "isFinalScore",
            df.bol_ausgangswert as "isStartingScore",
            df.int_sortierung as "sortOrder"
          FROM tfx_jury_results jr
          LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
          WHERE jr.int_wertungenid = $1
          ORDER BY df.int_sortierung ASC, df.bol_ausgangswert DESC, df.bol_endwert DESC, df.int_disziplinen_felderid
        `;
        
        const juryResults = await prisma.$queryRawUnsafe(juryResultsQuery, result.id) as any[];
        
        console.log('✅ [Server] Found', juryResults.length, 'jury results for wertungenId', result.id);
        if (juryResults.length > 0) {
          console.log('📋 [Server] Sample jury result:', juryResults[0]);
        }
        
        // Check if final score field exists but is missing from jury results
        let needsEndwertCalculation = false;
        let endwertFieldId = null;
        
        const disciplineId = result.disciplineid ? parseInt(result.disciplineid) : null;
        
        if (disciplineId && juryResults.length > 0) {
          // Check if there's a field with isFinalScore for this discipline
          const finalScoreField = await prisma.$queryRawUnsafe(`
            SELECT 
              df.int_disziplinen_felderid as id, 
              df.var_name as name
            FROM tfx_disziplinen_felder df
            WHERE df.int_disziplinenid = $1 AND df.bol_endwert = true
          `, disciplineId) as any[];
          
          if (finalScoreField.length > 0) {
            endwertFieldId = finalScoreField[0].id;
            
            // Check if this field exists in jury results
            const hasFinalScore = juryResults.some(jr => jr.isFinalScore);
            if (!hasFinalScore) {
              console.log('⚠️ [Server] Final score field exists but not in jury results - will calculate');
              needsEndwertCalculation = true;
            }
          }
        }
        
        // Load formula information for this discipline (always load for display purposes)
        if (disciplineId) {
          try {
            const formulaQuery = `
              SELECT 
                d.var_formel as "disciplineFormula",
                d.int_formelid as "disciplineFormulaId",
                f.var_formel as "tableFormula",
                f.var_name as "formulaName"
              FROM tfx_disziplinen d
              LEFT JOIN tfx_formeln f ON d.int_formelid = f.int_formelid
              WHERE d.int_disziplinenid = $1
            `;
            const formulaResult = await prisma.$queryRawUnsafe(formulaQuery, disciplineId) as any[];
            console.log(`📊 [Server] Formula query for discipline ${disciplineId}:`, JSON.stringify(formulaResult, null, 2));
            
            if (formulaResult.length > 0) {
              formula = formulaResult[0].tableFormula || formulaResult[0].disciplineFormula;
              if (formula) {
                console.log('📐 [Server] Found formula on discipline:', formula);
              } else {
                console.log(`⚠️ [Server] No formula found for discipline ${disciplineId} - disciplineFormula: '${formulaResult[0].disciplineFormula}', tableFormula: '${formulaResult[0].tableFormula}'`);
              }
            } else {
              console.log(`❌ [Server] No discipline found with ID ${disciplineId}`);
            }
          } catch (error) {
            console.error('❌ [Server] Error loading discipline formula:', error);
          }
        }
        
        // Parse starting value from formula if it contains a constant
        if (formula) {
          const startValueMatch = formula.match(/^[(\s]*(\d+\.?\d*)/);
          if (startValueMatch) {
            startValue = parseFloat(startValueMatch[1]);
          }
        }
        
        // Calculate and save final score if needed
        if (needsEndwertCalculation && formula && endwertFieldId) {
          try {
            console.log('🧮 [Server] Calculating final score with formula:', formula);
            
            // Build value map: A, B, C, etc. → performance values
            const valueMap: { [key: string]: number } = {};
            const letters = formula.match(/[A-Z]/g) || [];
            const nonFinalScores = juryResults.filter(jr => !jr.isFinalScore);
            
            letters.forEach((letter, index) => {
              if (nonFinalScores[index] && nonFinalScores[index].performance !== null) {
                valueMap[letter] = parseFloat(nonFinalScores[index].performance);
              }
            });
            
            console.log('📊 [Server] Value map:', valueMap);
            
            // Replace variables in formula and evaluate
            let evalFormula = formula;
            Object.keys(valueMap).forEach(letter => {
              evalFormula = evalFormula.replace(new RegExp(letter, 'g'), valueMap[letter].toString());
            });
            
            console.log('📐 [Server] Evaluation formula:', evalFormula);
            
            // Safe eval using Function constructor
            const calculatedScore = new Function(`return ${evalFormula}`)();
            console.log('✅ [Server] Calculated score:', calculatedScore);
            
            // Insert into tfx_jury_results
            await prisma.$executeRawUnsafe(`
              INSERT INTO tfx_jury_results (int_wertungenid, int_disziplinen_felderid, rel_leistung, int_versuch, int_kp)
              VALUES ($1, $2, $3, $4, $5)
            `, result.id, endwertFieldId, calculatedScore, 1, 0);
            
            // Update tfx_wertungen_details
            await prisma.$executeRawUnsafe(`
              UPDATE tfx_wertungen_details
              SET rel_leistung = $1
              WHERE int_wertungenid = $2 AND int_disziplinenid = $3
            `, calculatedScore, result.id, disciplineId);
            
            console.log('💾 [Server] Saved calculated score to both tables');
            
            // Add to jury results array
            juryResults.push({
              id: null, // Will be assigned by DB
              disciplineFieldId: endwertFieldId,
              performance: calculatedScore,
              attempt: 1,
              kp: 0,
              fieldName: 'Endwert',
              fieldShortName: 'EW',
              isFinalScore: true,
              isStartingScore: false,
              sortOrder: 999
            });
            
            // Update the result score
            result.score = calculatedScore;
            
          } catch (error) {
            console.error('❌ [Server] Error calculating/saving final score:', error);
          }
        }
        
        // ✨ Sync check: Ensure tfx_wertungen_details matches final score from jury results
        if (!needsEndwertCalculation && juryResults.length > 0) {
          const finalScoreResult = juryResults.find(jr => jr.isFinalScore);
          if (finalScoreResult && finalScoreResult.performance !== null) {
            const finalScore = parseFloat(finalScoreResult.performance);
            const currentScore = result.score ? parseFloat(result.score) : null;
            
            if (currentScore !== finalScore) {
              console.log(`⚠️ [Server] Score mismatch detected! wertungenId=${result.id}, current=${currentScore}, expected=${finalScore}`);
              console.log(`💾 [Server] Syncing tfx_wertungen_details with jury results final score`);
              
              try {
                await prisma.$executeRawUnsafe(`
                  UPDATE tfx_wertungen_details
                  SET rel_leistung = $1
                  WHERE int_wertungenid = $2 AND int_disziplinenid = $3
                `, finalScore, result.id, disciplineId);
                
                // Update in-memory result
                result.score = finalScore;
                console.log(`✅ [Server] Synced score: ${finalScore}`);
              } catch (error) {
                console.error('❌ [Server] Error syncing score:', error);
              }
            }
          }
        }
        
        return {
          ...result,
          formula,
          startValue,
          juryResults: juryResults.map((jr: any) => ({
            id: jr.id,
            disciplineFieldId: jr.disciplineFieldId,
            performance: jr.performance ? parseFloat(jr.performance) : null,
            attempt: jr.attempt,
            kp: jr.kp,
            fieldName: jr.fieldName,
            fieldShortName: jr.fieldShortName,
            isFinalScore: jr.isFinalScore,
            isStartingScore: jr.isStartingScore
          }))
        };
      } catch (error) {
        console.error(`❌ [Server] Error loading jury results for score ${result.id}:`, error);
        return { ...result, juryResults: [] };
      }
    }));

    const totalCountQuery = `
      SELECT COUNT(*) as count
      FROM tfx_wertungen w  
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      ${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(totalCountQuery, ...queryParams.slice(0, -2)) as any[];
    const totalCount = parseInt(totalResult[0]?.count || '0');

    console.log(`Found ${resultsWithJuryData.length} scores out of ${totalCount} total`);
    
    if (resultsWithJuryData.length > 0) {
      console.log('Sample raw result:', resultsWithJuryData[0]);
      console.log('Raw result field names:', Object.keys(resultsWithJuryData[0]));
      console.log('participantId value:', resultsWithJuryData[0].participantid || resultsWithJuryData[0].participantId);
      console.log('disciplineId value:', resultsWithJuryData[0].disciplineid || resultsWithJuryData[0].disciplineId);
      console.log('score value:', resultsWithJuryData[0].score);
      console.log('juryResults count:', resultsWithJuryData[0].juryResults?.length || 0);
    }

    const mappedResults = resultsWithJuryData.map((result: any) => ({
      id: result.id,
      participantId: parseInt(result.participantid),
      disciplineId: result.disciplineid ? parseInt(result.disciplineid) : null, 
      competitionId: parseInt(result.competitionid),
      score: result.score ? parseFloat(result.score) : null,
      attempt: result.attempt || 1,
      notes: result.notes,
      status: result.status,
      formula: result.formula || null,
      startValue: result.startValue || null,
      participant: {
        firstName: result.var_vorname,
        lastName: result.var_nachname
      },
      discipline: {
        name: result.discipline_name
      },
      competition: {
        name: result.competition_name
      },
      juryResults: result.juryResults || []
    }));

    if (mappedResults.length > 0) {
      console.log('Sample mapped result:', mappedResults[0]);
      console.log('Mapped participantId:', mappedResults[0].participantId);
      console.log('Mapped disciplineId:', mappedResults[0].disciplineId);
      console.log('Mapped score:', mappedResults[0].score);
    }

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

    // Insert new score
    // Validate required NOT NULL fields
    if (
      validatedData.competitionId === undefined ||
      validatedData.participantId === undefined ||
      validatedData.statusId === undefined
    ) {
      return res.status(400).json({ error: 'Validation error', details: 'competitionId, participantId, and statusId are required.' });
    }

    const insertQuery = `
      INSERT INTO tfx_wertungen 
        (int_wettkaempfeid, int_teilnehmerid, int_gruppenid, int_mannschaftenid, int_statusid, int_runde, int_startnummer, bol_ak, bol_startet_nicht, var_riege, var_comment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const created = await prisma.$queryRawUnsafe(
      insertQuery,
      validatedData.competitionId,
      validatedData.participantId,
      validatedData.groupId || null,
      validatedData.teamId || null,
      validatedData.statusId,
      validatedData.round || null,
      validatedData.startNumber || null,
      validatedData.ak || null,
      validatedData.startetNicht || null,
      validatedData.riege || null,
      validatedData.comment || null
    ) as any[];

    console.log('Created new score');
    res.status(201).json({
      id: created[0].int_wertungenid,
      competitionId: created[0].int_wettkaempfeid,
      participantId: created[0].int_teilnehmerid,
      groupId: created[0].int_gruppenid,
      teamId: created[0].int_mannschaftenid,
      statusId: created[0].int_statusid,
      round: created[0].int_runde,
      startNumber: created[0].int_startnummer,
      ak: created[0].bol_ak,
      startetNicht: created[0].bol_startet_nicht,
      riege: created[0].var_riege,
      comment: created[0].var_comment
    });
  } catch (error) {
    console.error('Error creating score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    if (error instanceof Error) {
      res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
    } else {
      res.status(500).json({ error: 'Internal server error', details: error });
    }
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

    // Build update query dynamically for allowed columns
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (validatedData.competitionId !== undefined) {
      updateFields.push(`int_wettkaempfeid = $${paramIndex}`);
      queryParams.push(validatedData.competitionId);
      paramIndex++;
    }
    if (validatedData.participantId !== undefined) {
      updateFields.push(`int_teilnehmerid = $${paramIndex}`);
      queryParams.push(validatedData.participantId);
      paramIndex++;
    }
    if (validatedData.groupId !== undefined) {
      updateFields.push(`int_gruppenid = $${paramIndex}`);
      queryParams.push(validatedData.groupId);
      paramIndex++;
    }
    if (validatedData.teamId !== undefined) {
      updateFields.push(`int_mannschaftenid = $${paramIndex}`);
      queryParams.push(validatedData.teamId);
      paramIndex++;
    }
    if (validatedData.statusId !== undefined) {
      updateFields.push(`int_statusid = $${paramIndex}`);
      queryParams.push(validatedData.statusId);
      paramIndex++;
    }
    if (validatedData.round !== undefined) {
      updateFields.push(`int_runde = $${paramIndex}`);
      queryParams.push(validatedData.round);
      paramIndex++;
    }
    if (validatedData.startNumber !== undefined) {
      updateFields.push(`int_startnummer = $${paramIndex}`);
      queryParams.push(validatedData.startNumber);
      paramIndex++;
    }
    if (validatedData.ak !== undefined) {
      updateFields.push(`bol_ak = $${paramIndex}`);
      queryParams.push(validatedData.ak);
      paramIndex++;
    }
    if (validatedData.startetNicht !== undefined) {
      updateFields.push(`bol_startet_nicht = $${paramIndex}`);
      queryParams.push(validatedData.startetNicht);
      paramIndex++;
    }
    if (validatedData.riege !== undefined) {
      updateFields.push(`var_riege = $${paramIndex}`);
      queryParams.push(validatedData.riege);
      paramIndex++;
    }
    if (validatedData.comment !== undefined) {
      updateFields.push(`var_comment = $${paramIndex}`);
      queryParams.push(validatedData.comment);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    queryParams.push(scoreId);

    const updateQuery = `
      UPDATE tfx_wertungen 
      SET ${updateFields.join(', ')}
      WHERE int_wertungenid = $${paramIndex}
      RETURNING *
    `;

    const updated = await prisma.$queryRawUnsafe(updateQuery, ...queryParams) as any[];

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Score not found' });
    }

    console.log('Updated score successfully');
    res.json({
      id: updated[0].int_wertungenid,
      competitionId: updated[0].int_wettkaempfeid,
      participantId: updated[0].int_teilnehmerid,
      groupId: updated[0].int_gruppenid,
      teamId: updated[0].int_mannschaftenid,
      statusId: updated[0].int_statusid,
      round: updated[0].int_runde,
      startNumber: updated[0].int_startnummer,
      ak: updated[0].bol_ak,
      startetNicht: updated[0].bol_startet_nicht,
      riege: updated[0].var_riege,
      comment: updated[0].var_comment
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
      WHERE int_wertungenid = $1
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

    // Find the wertungen record for this competition/participant
    const wertungenQuery = `
      SELECT int_wertungenid 
      FROM tfx_wertungen 
      WHERE int_wettkaempfeid = $1 
        AND int_teilnehmerid = $2
    `;
    
    const wertungenResults = await prisma.$queryRawUnsafe(
      wertungenQuery, 
      actualCompetitionId, 
      participantId
    ) as any[];

    let wertungenId;

    if (wertungenResults.length === 0) {
      // Create new wertungen record first
      const createWertungenQuery = `
        INSERT INTO tfx_wertungen 
          (int_wettkaempfeid, int_teilnehmerid, int_statusid)
        VALUES ($1, $2, $3)
        RETURNING int_wertungenid
      `;
      
      const newWertungen = await prisma.$queryRawUnsafe(
        createWertungenQuery,
        actualCompetitionId,
        participantId,
        1 // Default status ID
      ) as any[];
      
      wertungenId = newWertungen[0].int_wertungenid;
      console.log('Created new wertungen record with ID:', wertungenId);
    } else {
      wertungenId = wertungenResults[0].int_wertungenid;
      console.log('Using existing wertungen record with ID:', wertungenId);
    }

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
        const { io } = await import('../index');
        
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
        const startValue = details.start_value || 10;
        
        let calculatedScore = parseFloat(score); // Default to stored score
        
        // If we have a formula, fetch jury results and recalculate
        if (formula) {
          console.log(`🧮 Formula found: "${formula}", fetching jury results for recalculation...`);
          
          // Fetch jury results for this participant/discipline
          const juryResultsQuery = `
            SELECT 
              jr.flo_leistung as performance,
              jr.int_reihenfolge as sort_order,
              df.var_name as field_name,
              df.var_kurz as field_short_name,
              df.bol_ergebnis as is_final_score,
              df.bol_startwert as is_starting_score
            FROM tfx_wertungen_details jr
            LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
            WHERE jr.int_wertungenid = $1
              AND jr.int_disziplinenid = $2
              AND jr.int_versuch = 1
            ORDER BY jr.int_reihenfolge ASC
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
            
            console.log(`🧮 Calculating formula "${formula}" with values:`, valuesMap, 'startValue:', startValue);
            
            // Calculate using centralized formula utility
            const result = calculateFormula(formula, valuesMap, startValue);
            
            if (result !== null) {
              calculatedScore = result;
              console.log(`✅ Formula calculated successfully: ${result}`);
              
              if (Math.abs(result - parseFloat(score)) > 0.01) {
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

export default router;
