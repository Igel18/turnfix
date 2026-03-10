"use strict";
/**
 * Scores CRUD routes for TurnFix.
 *
 * Refactored for Separation of Concerns:
 * - scores.ts         → This file: CRUD routes (GET /, POST /, PUT /:id, DELETE /:id)
 * - scoresScoring.ts  → Scoring operations (save-value, create-wertung, calculate-final)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const prisma_1 = __importDefault(require("../lib/prisma"));
// Import scoring sub-router
const scoresScoring_1 = __importDefault(require("./scoresScoring"));
const router = (0, express_1.Router)();
// Validation schemas
const scoreCreateSchema = zod_1.z.object({
    competitionId: zod_1.z.number().int(), // int_wettkaempfeid NOT NULL
    participantId: zod_1.z.number().int(), // int_teilnehmerid NOT NULL
    statusId: zod_1.z.number().int(), // int_statusid NOT NULL
    groupId: zod_1.z.number().int().optional(),
    teamId: zod_1.z.number().int().optional(),
    round: zod_1.z.number().int().optional(),
    startNumber: zod_1.z.number().int().optional(),
    ak: zod_1.z.boolean().optional(), // "außer Konkurrenz" (out of competition)
    startetNicht: zod_1.z.boolean().optional(),
    riege: zod_1.z.string().optional(),
    comment: zod_1.z.string().optional()
});
const scoreUpdateSchema = scoreCreateSchema.partial();
const scoreQuerySchema = zod_1.z.object({
    competitionId: zod_1.z.string().transform(Number).optional(),
    participantId: zod_1.z.string().transform(Number).optional(),
    disciplineId: zod_1.z.string().transform(Number).optional(),
    eventId: zod_1.z.string().transform(Number).optional(),
    squadName: zod_1.z.string().optional(),
    limit: zod_1.z.string().transform(Number).default(100),
    offset: zod_1.z.string().transform(Number).default(0)
});
// Get scores with filters
router.get('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        console.log('🌐 [Scores API] GET /scores called');
        console.log('Raw query params received:', req.query);
        console.log('Raw query params eventId:', req.query.eventId);
        const query = scoreQuerySchema.parse(req.query);
        console.log('Fetching scores with filters:', query);
        console.log('Parsed eventId:', query.eventId);
        // Build SQL query with optional filters
        let whereClause = 'WHERE 1=1';
        const queryParams = [];
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
        const results = await prisma_1.default.$queryRawUnsafe(scoresQuery, ...queryParams);
        console.log(`📊 [Scores API] Query returned ${results.length} results`);
        if (results.length > 0) {
            console.log('📋 [Scores API] Sample result:', { id: results[0].id, participantid: results[0].participantid, disciplineid: results[0].disciplineid });
        }
        // Load jury results for each score
        const resultsWithJuryData = await Promise.all(results.map(async (result) => {
            if (!result.id)
                return result;
            // Initialize formula for this result
            let formula = null; // Linked formula from tfx_formeln (multi-field)
            let disciplineFormula = null; // Discipline's own var_formel (built-in, applied at ranking time)
            try {
                console.log('🔍 [Server] Loading jury results for wertungenId:', result.id);
                // Get discipline ID early so we can filter jury results by discipline
                const disciplineIdForFilter = result.disciplineid ? parseInt(result.disciplineid) : null;
                const juryResultsQuery = disciplineIdForFilter
                    ? `
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
            AND df.int_disziplinenid = $2
          ORDER BY df.int_sortierung ASC, df.bol_ausgangswert DESC, df.bol_endwert DESC, df.int_disziplinen_felderid
          `
                    : `
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
                const juryResults = disciplineIdForFilter
                    ? await prisma_1.default.$queryRawUnsafe(juryResultsQuery, result.id, disciplineIdForFilter)
                    : await prisma_1.default.$queryRawUnsafe(juryResultsQuery, result.id);
                console.log('✅ [Server] Found', juryResults.length, 'jury results for wertungenId', result.id);
                if (juryResults.length > 0) {
                    console.log('📋 [Server] Sample jury result:', juryResults[0]);
                }
                // Check if final score field exists but is missing from jury results
                let needsEndwertCalculation = false;
                let endwertFieldId = null;
                // Reuse disciplineIdForFilter parsed above
                const disciplineId = disciplineIdForFilter;
                if (disciplineId && juryResults.length > 0) {
                    // Check if there's a field with isFinalScore for this discipline
                    const finalScoreField = await prisma_1.default.$queryRawUnsafe(`
            SELECT 
              df.int_disziplinen_felderid as id, 
              df.var_name as name
            FROM tfx_disziplinen_felder df
            WHERE df.int_disziplinenid = $1 AND df.bol_endwert = true
          `, disciplineId);
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
                        const formulaResult = await prisma_1.default.$queryRawUnsafe(formulaQuery, disciplineId);
                        console.log(`📊 [Server] Formula query for discipline ${disciplineId}:`, JSON.stringify(formulaResult, null, 2));
                        if (formulaResult.length > 0) {
                            // Keep both formulas separate (C++ backward compatibility):
                            //   - formula:           linked/template formula from tfx_formeln (for multi-field calculation)
                            //   - disciplineFormula:  discipline's own var_formel (applied at ranking/display time)
                            formula = formulaResult[0].tableFormula || null;
                            disciplineFormula = formulaResult[0].disciplineFormula || null;
                            // For needsEndwertCalculation, only the linked formula is applicable
                            // (the built-in formula is applied at ranking time, not at save time)
                            if (formula) {
                                console.log('📐 [Server] Found linked formula on discipline:', formula);
                            }
                            if (disciplineFormula) {
                                console.log('📐 [Server] Found built-in formula (var_formel) on discipline:', disciplineFormula);
                            }
                            if (!formula && !disciplineFormula) {
                                console.log(`⚠️ [Server] No formula found for discipline ${disciplineId}`);
                            }
                        }
                        else {
                            console.log(`❌ [Server] No discipline found with ID ${disciplineId}`);
                        }
                    }
                    catch (error) {
                        console.error('❌ [Server] Error loading discipline formula:', error);
                    }
                }
                // Calculate and save final score if needed
                if (needsEndwertCalculation && formula && endwertFieldId) {
                    try {
                        console.log('🧮 [Server] Calculating final score with formula:', formula);
                        // Build value map: A, B, C, etc. → performance values
                        const valueMap = {};
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
                        await prisma_1.default.$executeRawUnsafe(`
              INSERT INTO tfx_jury_results (int_wertungenid, int_disziplinen_felderid, rel_leistung, int_versuch, int_kp)
              VALUES ($1, $2, $3, $4, $5)
            `, result.id, endwertFieldId, calculatedScore, 1, 0);
                        // Update tfx_wertungen_details
                        await prisma_1.default.$executeRawUnsafe(`
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
                    }
                    catch (error) {
                        console.error('❌ [Server] Error calculating/saving final score:', error);
                    }
                }
                // ✨ Sync check: Ensure tfx_jury_results final score matches tfx_wertungen_details
                // CRITICAL: tfx_wertungen_details is the SOURCE OF TRUTH for final scores!
                // If there's a mismatch, UPDATE jury_results to match wertungen_details, NOT the other way around!
                if (!needsEndwertCalculation && juryResults.length > 0 && result.score !== null) {
                    const finalScoreResult = juryResults.find(jr => jr.isFinalScore);
                    if (finalScoreResult && finalScoreResult.performance !== null) {
                        const juryFinalScore = parseFloat(finalScoreResult.performance);
                        const wertungsDetailsScore = parseFloat(result.score);
                        if (wertungsDetailsScore !== juryFinalScore) {
                            console.log(`⚠️ [Server] Score mismatch detected! wertungenId=${result.id}, wertungen_details=${wertungsDetailsScore}, jury_results=${juryFinalScore}`);
                            console.log(`💾 [Server] Syncing tfx_jury_results final score WITH tfx_wertungen_details (wertungen_details is SOURCE OF TRUTH)`);
                            try {
                                // Update the Endwert field in tfx_jury_results to match tfx_wertungen_details
                                await prisma_1.default.$executeRawUnsafe(`
                  UPDATE tfx_jury_results
                  SET rel_leistung = $1
                  WHERE int_wertungenid = $2 AND int_disziplinen_felderid = $3
                `, wertungsDetailsScore, result.id, finalScoreResult.disciplineFieldId);
                                // Update in-memory juryResults array
                                finalScoreResult.performance = wertungsDetailsScore;
                                console.log(`✅ [Server] Synced jury_results final score to: ${wertungsDetailsScore}`);
                            }
                            catch (error) {
                                console.error('❌ [Server] Error syncing jury results final score:', error);
                            }
                        }
                    }
                }
                // Note: Stale jury results filtering is handled CLIENT-SIDE in:
                //   - JuryResultsDisplay.tsx (detectFormulaType → skip field breakdown for variable formulas)
                //   - useExport.ts PDF export (same logic)
                // Server returns ALL jury results; the client decides what to display.
                // This avoids false positives where jury results are falsely considered stale
                // (e.g., discipline created with "1*x" from the start + manually added fields).
                const filteredJuryResults = juryResults;
                return {
                    ...result,
                    formula,
                    disciplineFormula,
                    juryResults: filteredJuryResults.map((jr) => ({
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
            }
            catch (error) {
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
        const totalResult = await prisma_1.default.$queryRawUnsafe(totalCountQuery, ...queryParams.slice(0, -2));
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
        const mappedResults = resultsWithJuryData.map((result) => ({
            id: result.id,
            participantId: parseInt(result.participantid),
            disciplineId: result.disciplineid ? parseInt(result.disciplineid) : null,
            competitionId: parseInt(result.competitionid),
            score: result.score ? parseFloat(result.score) : null,
            attempt: result.attempt || 1,
            notes: result.notes,
            status: result.status,
            formula: result.formula || null,
            disciplineFormula: result.disciplineFormula || null,
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
    }
    catch (error) {
        console.error('Error fetching scores:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new score
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = scoreCreateSchema.parse(req.body);
        console.log('Creating score:', validatedData);
        // Insert new score
        // Validate required NOT NULL fields
        if (validatedData.competitionId === undefined ||
            validatedData.participantId === undefined ||
            validatedData.statusId === undefined) {
            return res.status(400).json({ error: 'Validation error', details: 'competitionId, participantId, and statusId are required.' });
        }
        const insertQuery = `
      INSERT INTO tfx_wertungen 
        (int_wettkaempfeid, int_teilnehmerid, int_gruppenid, int_mannschaftenid, int_statusid, int_runde, int_startnummer, bol_ak, bol_startet_nicht, var_riege, var_comment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const created = await prisma_1.default.$queryRawUnsafe(insertQuery, validatedData.competitionId, validatedData.participantId, validatedData.groupId || null, validatedData.teamId || null, validatedData.statusId, validatedData.round || null, validatedData.startNumber || null, validatedData.ak || null, validatedData.startetNicht || null, validatedData.riege || null, validatedData.comment || null);
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
    }
    catch (error) {
        console.error('Error creating score:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        if (error instanceof Error) {
            res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
        }
        else {
            res.status(500).json({ error: 'Internal server error', details: error });
        }
    }
});
// Update score by ID
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const scoreId = parseInt(req.params.id);
        const validatedData = scoreUpdateSchema.parse(req.body);
        console.log(`Updating score ${scoreId}:`, validatedData);
        if (isNaN(scoreId)) {
            return res.status(400).json({ error: 'Invalid score ID' });
        }
        // Build update query dynamically for allowed columns
        const updateFields = [];
        const queryParams = [];
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
        const updated = await prisma_1.default.$queryRawUnsafe(updateQuery, ...queryParams);
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
    }
    catch (error) {
        console.error('Error updating score:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete score
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
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
        const deleted = await prisma_1.default.$queryRawUnsafe(deleteQuery, scoreId);
        if (deleted.length === 0) {
            return res.status(404).json({ error: 'Score not found' });
        }
        console.log('Deleted score successfully');
        res.json({ message: 'Score deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Mount scoring sub-router (save-value, create-wertung, calculate-final)
router.use('/', scoresScoring_1.default);
exports.default = router;
//# sourceMappingURL=scores.js.map