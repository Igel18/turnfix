"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const scoreCreateSchema = zod_1.z.object({
    competitionId: zod_1.z.number().int(),
    participantId: zod_1.z.number().int(),
    disciplineId: zod_1.z.number().int(),
    score: zod_1.z.number(),
    notes: zod_1.z.string().optional()
});
const scoreUpdateSchema = scoreCreateSchema.partial();
const scoreQuerySchema = zod_1.z.object({
    competitionId: zod_1.z.string().transform(Number).optional(),
    participantId: zod_1.z.string().transform(Number).optional(),
    disciplineId: zod_1.z.string().transform(Number).optional(),
    limit: zod_1.z.string().transform(Number).default(100),
    offset: zod_1.z.string().transform(Number).default(0)
});
// Get scores with filters
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const query = scoreQuerySchema.parse(req.query);
        // Build where conditions
        const whereConditions = {};
        if (query.competitionId)
            whereConditions.competitionId = query.competitionId;
        if (query.participantId)
            whereConditions.participantId = query.participantId;
        if (query.disciplineId)
            whereConditions.disciplineId = query.disciplineId;
        const results = await prisma.result.findMany({
            where: whereConditions,
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        club: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                discipline: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { competitionId: 'asc' },
                { disciplineId: 'asc' },
                { rank: 'asc' }
            ],
            skip: query.offset,
            take: query.limit
        });
        const totalCount = await prisma.result.count({
            where: whereConditions
        });
        res.json({
            results,
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
// Get single score by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id);
        const result = await prisma.result.findUnique({
            where: { id: resultId },
            include: {
                competition: true,
                participant: {
                    include: {
                        club: true
                    }
                },
                discipline: true
            }
        });
        if (!result) {
            return res.status(404).json({ error: 'Score not found' });
        }
        res.json({ result });
    }
    catch (error) {
        console.error('Error fetching score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new score
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = scoreCreateSchema.parse(req.body);
        // Verify that the competition, participant, and discipline exist
        const [competition, participant, discipline] = await Promise.all([
            prisma.competition.findUnique({ where: { id: validatedData.competitionId } }),
            prisma.participant.findUnique({ where: { id: validatedData.participantId } }),
            prisma.discipline.findUnique({ where: { id: validatedData.disciplineId } })
        ]);
        if (!competition) {
            return res.status(400).json({ error: 'Competition not found' });
        }
        if (!participant) {
            return res.status(400).json({ error: 'Participant not found' });
        }
        if (!discipline) {
            return res.status(400).json({ error: 'Discipline not found' });
        }
        // Check if discipline belongs to the competition
        if (discipline.competitionId !== validatedData.competitionId) {
            return res.status(400).json({ error: 'Discipline does not belong to this competition' });
        }
        const result = await prisma.result.create({
            data: {
                competitionId: validatedData.competitionId,
                participantId: validatedData.participantId,
                disciplineId: validatedData.disciplineId,
                score: validatedData.score,
                notes: validatedData.notes
            },
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        club: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                discipline: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Update rankings for this discipline
        await updateRankings(validatedData.competitionId, validatedData.disciplineId);
        res.status(201).json({ result });
    }
    catch (error) {
        console.error('Error creating score:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        if (error && typeof error === 'object' && 'code' in error) {
            if (error.code === 'P2002') {
                return res.status(400).json({ error: 'Score already exists for this participant and discipline' });
            }
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update score
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id);
        const validatedData = scoreUpdateSchema.parse(req.body);
        // Get the existing result first
        const existingResult = await prisma.result.findUnique({
            where: { id: resultId }
        });
        if (!existingResult) {
            return res.status(404).json({ error: 'Score not found' });
        }
        const result = await prisma.result.update({
            where: { id: resultId },
            data: validatedData,
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        club: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                discipline: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Update rankings for this discipline
        await updateRankings(result.competitionId, result.disciplineId);
        res.json({ result });
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
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id);
        // Get the result first to know which discipline to update rankings for
        const result = await prisma.result.findUnique({
            where: { id: resultId }
        });
        if (!result) {
            return res.status(404).json({ error: 'Score not found' });
        }
        await prisma.result.delete({
            where: { id: resultId }
        });
        // Update rankings for this discipline
        await updateRankings(result.competitionId, result.disciplineId);
        res.json({ message: 'Score deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting score:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
            return res.status(404).json({ error: 'Score not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get competition leaderboard
router.get('/competition/:competitionId/leaderboard', auth_1.authenticateToken, async (req, res) => {
    try {
        const competitionId = parseInt(req.params.competitionId);
        const results = await prisma.result.findMany({
            where: { competitionId },
            include: {
                participant: {
                    include: {
                        club: true
                    }
                },
                discipline: true
            },
            orderBy: [
                { disciplineId: 'asc' },
                { rank: 'asc' }
            ]
        });
        // Group results by participant
        const leaderboard = new Map();
        results.forEach(result => {
            const key = result.participantId;
            if (!leaderboard.has(key)) {
                leaderboard.set(key, {
                    participant: result.participant,
                    totalScore: 0,
                    results: []
                });
            }
            const entry = leaderboard.get(key);
            entry.totalScore += result.score;
            entry.results.push({
                discipline: result.discipline,
                score: result.score,
                rank: result.rank,
                judgedAt: result.judgedAt
            });
        });
        // Convert to array and sort by total score
        const sortedLeaderboard = Array.from(leaderboard.values())
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((entry, index) => ({
            ...entry,
            overallRank: index + 1
        }));
        res.json({ leaderboard: sortedLeaderboard });
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Helper function to update rankings for a discipline
async function updateRankings(competitionId, disciplineId) {
    try {
        // Get all results for this discipline, ordered by score (descending)
        const results = await prisma.result.findMany({
            where: {
                competitionId,
                disciplineId
            },
            orderBy: {
                score: 'desc'
            }
        });
        // Update ranks
        const updates = results.map((result, index) => prisma.result.update({
            where: { id: result.id },
            data: { rank: index + 1 }
        }));
        await Promise.all(updates);
    }
    catch (error) {
        console.error('Error updating rankings:', error);
    }
}
exports.default = router;
//# sourceMappingURL=scores.js.map