"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const prisma_1 = __importDefault(require("../lib/prisma"));
const scoreSynchronizer_1 = require("../utils/scoreSynchronizer");
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
    limit: zod_1.z.string().transform(Number).default(100),
    offset: zod_1.z.string().transform(Number).default(0)
});
// Get scores with filters
router.get('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
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
        const totalCountQuery = `
      SELECT COUNT(*) as count
      FROM tfx_wertungen w  
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      ${whereClause}
    `;
        const totalResult = await prisma_1.default.$queryRawUnsafe(totalCountQuery, ...queryParams.slice(0, -2));
        const totalCount = parseInt(totalResult[0]?.count || '0');
        console.log(`Found ${results.length} scores out of ${totalCount} total`);
        if (results.length > 0) {
            console.log('Sample raw result:', results[0]);
            console.log('Raw result field names:', Object.keys(results[0]));
            console.log('participantId value:', results[0].participantid || results[0].participantId);
            console.log('disciplineId value:', results[0].disciplineid || results[0].disciplineId);
            console.log('score value:', results[0].score);
        }
        const mappedResults = results.map((result) => ({
            id: result.id,
            participantId: parseInt(result.participantid),
            disciplineId: parseInt(result.disciplineid),
            competitionId: parseInt(result.competitionid),
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
// Save/update score value (simple endpoint for score capture)
router.post('/save-value', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const { competitionId, participantId, disciplineId, score } = req.body;
        // Validate required fields
        if (!participantId || !disciplineId || score === undefined || score === null) {
            return res.status(400).json({
                error: 'Missing required fields: participantId, disciplineId, and score are required'
            });
        }
        console.log('Saving score value:', { competitionId, participantId, disciplineId, score });
        // Parse disciplineId - it might be a string like "Pauschenpferd-0" or a number
        let actualDisciplineId;
        if (typeof disciplineId === 'string' && disciplineId.includes('-')) {
            // Extract numeric part from generated discipline ID or skip this record
            console.log('Discipline ID is a generated string, trying to find actual discipline ID');
            // For now, we'll skip saving scores with generated IDs
            return res.status(400).json({
                error: 'Cannot save score with generated discipline ID. Please select a valid discipline.'
            });
        }
        else {
            actualDisciplineId = parseInt(disciplineId.toString());
            if (isNaN(actualDisciplineId)) {
                return res.status(400).json({
                    error: 'Invalid discipline ID format'
                });
            }
        }
        // Use ScoreSynchronizer to find the correct competition ID
        const actualCompetitionId = await scoreSynchronizer_1.ScoreSynchronizer.findCorrectCompetitionId(participantId, actualDisciplineId, undefined, // eventId - we'll derive it from competition
        competitionId ? parseInt(competitionId) : undefined);
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
        const wertungenResults = await prisma_1.default.$queryRawUnsafe(wertungenQuery, actualCompetitionId, participantId);
        let wertungenId;
        if (wertungenResults.length === 0) {
            // Create new wertungen record first
            const createWertungenQuery = `
        INSERT INTO tfx_wertungen 
          (int_wettkaempfeid, int_teilnehmerid, int_statusid)
        VALUES ($1, $2, $3)
        RETURNING int_wertungenid
      `;
            const newWertungen = await prisma_1.default.$queryRawUnsafe(createWertungenQuery, actualCompetitionId, participantId, 1 // Default status ID
            );
            wertungenId = newWertungen[0].int_wertungenid;
            console.log('Created new wertungen record with ID:', wertungenId);
        }
        else {
            wertungenId = wertungenResults[0].int_wertungenid;
            console.log('Using existing wertungen record with ID:', wertungenId);
        }
        // Use ScoreSynchronizer to update the score and ensure consistency
        await scoreSynchronizer_1.ScoreSynchronizer.updateWertungsDetailsScore(wertungenId, actualDisciplineId, parseFloat(score), 1, // attempt
        0 // kp (default)
        );
        // Get event ID for Socket.IO emission
        const eventIdQuery = `
      SELECT wk.int_veranstaltungenid as event_id
      FROM tfx_wettkaempfe wk
      WHERE wk.int_wettkaempfeid = $1
    `;
        const eventIdResult = await prisma_1.default.$queryRawUnsafe(eventIdQuery, actualCompetitionId);
        const eventId = eventIdResult[0]?.event_id;
        // Emit Socket.IO events for real-time updates
        if (eventId) {
            const { io } = await Promise.resolve().then(() => __importStar(require('../index')));
            console.log(`🔔 Emitting score-updated event for eventId ${eventId}`);
            io.to(`competition-${eventId}`).emit('score-updated', {
                eventId,
                competitionId: actualCompetitionId,
                participantId,
                disciplineId: actualDisciplineId,
                updated: true
            });
            console.log(`✅ Socket.IO event emitted to competition-${eventId}`);
        }
        else {
            console.warn('⚠️ No eventId found, skipping Socket.IO emission');
        }
        res.json({
            success: true,
            message: 'Score saved successfully with synchronization',
            wertungenId: wertungenId,
            competitionId: actualCompetitionId,
            score: parseFloat(score)
        });
    }
    catch (error) {
        console.error('Error saving score value:', error);
        res.status(500).json({
            error: 'Failed to save score',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=scores.js.map