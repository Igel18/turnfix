"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createResultSchema = zod_1.z.object({
    competitionId: zod_1.z.number().int().positive(), // NOT NULL
    participantId: zod_1.z.number().int().positive(), // NOT NULL
    disciplineId: zod_1.z.number().int().positive(), // NOT NULL
    score: zod_1.z.number(), // NOT NULL
    rank: zod_1.z.number().int().optional(),
    notes: zod_1.z.string().optional()
});
const updateResultSchema = createResultSchema.partial();
// Get all results with pagination
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const competitionId = req.query.competitionId;
        const participantId = req.query.participantId;
        // disciplineId is not a direct field in tfx_wertungen, handled via details
        const whereConditions = {};
        if (competitionId) {
            whereConditions.int_wettkaempfeid = parseInt(competitionId);
        }
        if (participantId) {
            whereConditions.int_teilnehmerid = parseInt(participantId);
        }
        const results = await prisma.tfx_wertungen.findMany({
            where: whereConditions,
            include: {
                tfx_wettkaempfe: {
                    select: {
                        int_wettkaempfeid: true,
                        var_name: true,
                    }
                },
                tfx_teilnehmer: {
                    select: {
                        int_teilnehmerid: true,
                        var_vorname: true,
                        var_nachname: true,
                        tfx_vereine: {
                            select: {
                                int_vereineid: true,
                                var_name: true,
                            }
                        }
                    }
                },
                tfx_wertungen_details: {
                    select: {
                        int_wertungen_detailsid: true,
                        int_disziplinenid: true,
                        rel_leistung: true,
                        int_versuch: true
                    }
                }
            },
            orderBy: [
                { int_wettkaempfeid: 'asc' },
                { int_teilnehmerid: 'asc' }
            ],
            take: limit,
            skip: offset
        });
        const totalCount = await prisma.tfx_wertungen.count({
            where: whereConditions
        });
        res.json({
            results,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get result by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id);
        const result = await prisma.tfx_wertungen.findUnique({
            where: { int_wertungenid: resultId },
            include: {
                tfx_wettkaempfe: {
                    select: {
                        int_wettkaempfeid: true,
                        var_name: true
                    }
                },
                tfx_teilnehmer: {
                    select: {
                        int_teilnehmerid: true,
                        var_vorname: true,
                        var_nachname: true
                    }
                },
                tfx_wertungen_details: {
                    select: {
                        int_wertungen_detailsid: true,
                        int_disziplinenid: true,
                        rel_leistung: true,
                        int_versuch: true
                    }
                }
            }
        });
        if (!result) {
            return res.status(404).json({ error: 'Result not found' });
        }
        res.json({ result });
    }
    catch (error) {
        console.error('Error fetching result:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new result
router.post('/', async (req, res) => {
    try {
        const validatedData = createResultSchema.parse(req.body);
        // Validate required NOT NULL fields
        if (validatedData.competitionId === undefined ||
            validatedData.participantId === undefined ||
            validatedData.disciplineId === undefined ||
            validatedData.score === undefined) {
            return res.status(400).json({ error: 'Validation error', details: 'competitionId, participantId, disciplineId, and score are required.' });
        }
        // Check if competition exists
        const competition = await prisma.tfx_wettkaempfe.findUnique({ where: { int_wettkaempfeid: validatedData.competitionId } });
        if (!competition) {
            return res.status(400).json({ error: 'Competition not found' });
        }
        const participant = await prisma.tfx_teilnehmer.findUnique({ where: { int_teilnehmerid: validatedData.participantId } });
        if (!participant) {
            return res.status(400).json({ error: 'Participant not found' });
        }
        const discipline = await prisma.tfx_disziplinen.findUnique({ where: { int_disziplinenid: validatedData.disciplineId } });
        if (!discipline) {
            return res.status(400).json({ error: 'Discipline not found' });
        }
        const existingResult = await prisma.tfx_wertungen.findFirst({
            where: {
                int_wettkaempfeid: validatedData.competitionId,
                int_teilnehmerid: validatedData.participantId
            }
        });
        if (existingResult) {
            return res.status(400).json({ error: 'Result for this participant already exists' });
        }
        const result = await prisma.tfx_wertungen.create({
            data: {
                int_wettkaempfeid: validatedData.competitionId,
                int_teilnehmerid: validatedData.participantId,
                var_comment: validatedData.notes || null,
                int_statusid: 1,
                int_runde: 1,
                int_startnummer: validatedData.rank || null
            }
        });
        await prisma.tfx_wertungen_details.create({
            data: {
                int_wertungenid: result.int_wertungenid,
                int_disziplinenid: validatedData.disciplineId,
                rel_leistung: validatedData.score
            }
        });
        res.status(201).json({ result });
    }
    catch (error) {
        console.error('Error creating result:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update result
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id);
        const validatedData = updateResultSchema.parse(req.body);
        // Only update allowed columns in tfx_wertungen
        const updateData = {};
        if (validatedData.rank !== undefined)
            updateData.int_startnummer = validatedData.rank;
        if (validatedData.notes !== undefined)
            updateData.var_comment = validatedData.notes;
        if (validatedData.competitionId !== undefined)
            updateData.int_wettkaempfeid = validatedData.competitionId;
        if (validatedData.participantId !== undefined)
            updateData.int_teilnehmerid = validatedData.participantId;
        // Only update disciplineId and score in tfx_wertungen_details if provided
        if (validatedData.disciplineId !== undefined || validatedData.score !== undefined) {
            // Find the details row
            const details = await prisma.tfx_wertungen_details.findFirst({
                where: { int_wertungenid: resultId }
            });
            if (details) {
                await prisma.tfx_wertungen_details.update({
                    where: { int_wertungen_detailsid: details.int_wertungen_detailsid },
                    data: {
                        ...(validatedData.disciplineId !== undefined ? { int_disziplinenid: validatedData.disciplineId } : {}),
                        ...(validatedData.score !== undefined ? { rel_leistung: validatedData.score } : {})
                    }
                });
            }
        }
        const result = await prisma.tfx_wertungen.update({
            where: { int_wertungenid: resultId },
            data: updateData
        });
        res.json({ result });
    }
    catch (error) {
        console.error('Error updating result:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete result
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id);
        await prisma.tfx_wertungen.delete({
            where: { int_wertungenid: resultId }
        });
        res.json({ message: 'Result deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get results by competition with rankings
router.get('/competition/:competitionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const competitionId = parseInt(req.params.competitionId);
        const disciplineId = req.query.disciplineId;
        const whereConditions = { int_wettkaempfeid: competitionId };
        const results = await prisma.tfx_wertungen.findMany({
            where: whereConditions,
            include: {
                tfx_teilnehmer: {
                    select: {
                        int_teilnehmerid: true,
                        var_vorname: true,
                        var_nachname: true
                    }
                },
                tfx_wertungen_details: {
                    select: {
                        int_wertungen_detailsid: true,
                        int_disziplinenid: true,
                        rel_leistung: true,
                        int_versuch: true
                    }
                }
            },
            orderBy: [
                { int_startnummer: 'asc' }
            ]
        });
        res.json({ results });
    }
    catch (error) {
        console.error('Error fetching competition results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get results by participant
router.get('/participant/:participantId', auth_1.authenticateToken, async (req, res) => {
    try {
        const participantId = parseInt(req.params.participantId);
        const results = await prisma.tfx_wertungen.findMany({
            where: { int_teilnehmerid: participantId },
            include: {
                tfx_wettkaempfe: {
                    select: {
                        int_wettkaempfeid: true,
                        var_name: true
                    }
                },
                tfx_wertungen_details: {
                    select: {
                        int_wertungen_detailsid: true,
                        int_disziplinenid: true,
                        rel_leistung: true,
                        int_versuch: true
                    }
                }
            },
            orderBy: [
                { int_wertungenid: 'desc' }
            ]
        });
        res.json({ results });
    }
    catch (error) {
        console.error('Error fetching participant results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Calculate and update rankings for a competition/discipline
router.post('/calculate-rankings', auth_1.authenticateToken, async (req, res) => {
    try {
        const { competitionId, disciplineId } = req.body;
        if (!competitionId || !disciplineId) {
            return res.status(400).json({ error: 'Competition ID and Discipline ID are required' });
        }
        // Get all results for the competition/discipline ordered by score
        const details = await prisma.tfx_wertungen_details.findMany({
            where: {
                int_disziplinenid: parseInt(disciplineId),
                tfx_wertungen: {
                    int_wettkaempfeid: parseInt(competitionId)
                }
            },
            orderBy: { rel_leistung: 'desc' }
        });
        // Update rankings in tfx_wertungen
        const updatePromises = details.map((detail, index) => {
            return prisma.tfx_wertungen.update({
                where: { int_wertungenid: detail.int_wertungenid },
                data: { int_startnummer: index + 1 }
            });
        });
        await Promise.all(updatePromises);
        res.json({
            message: 'Rankings calculated and updated successfully',
            updatedCount: details.length
        });
    }
    catch (error) {
        console.error('Error calculating rankings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=results.js.map