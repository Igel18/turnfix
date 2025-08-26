"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createCompetitionEntrySchema = zod_1.z.object({
    competitionId: zod_1.z.number().int().positive(),
    participantId: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(['REGISTERED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW']).default('REGISTERED')
});
const updateCompetitionEntrySchema = createCompetitionEntrySchema.partial();
// Get all competition entries with pagination
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const competitionId = req.query.competitionId;
        const participantId = req.query.participantId;
        const status = req.query.status;
        const whereConditions = {};
        if (competitionId) {
            whereConditions.competitionId = parseInt(competitionId);
        }
        if (participantId) {
            whereConditions.participantId = parseInt(participantId);
        }
        if (status) {
            whereConditions.status = status;
        }
        const entries = await prisma.competitionEntry.findMany({
            where: whereConditions,
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                        type: true,
                        status: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        birthDate: true,
                        gender: true,
                        licenseNo: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true
                            }
                        }
                    }
                }
            },
            orderBy: { registeredAt: 'desc' },
            take: limit,
            skip: offset
        });
        const totalCount = await prisma.competitionEntry.count({
            where: whereConditions
        });
        res.json({
            entries,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching competition entries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get competition entry by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const entryId = parseInt(req.params.id);
        const entry = await prisma.competitionEntry.findUnique({
            where: { id: entryId },
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                        type: true,
                        status: true,
                        maxParticipants: true,
                        registrationDeadline: true,
                        isPublic: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        birthDate: true,
                        gender: true,
                        licenseNo: true,
                        nationality: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                                address: true,
                                city: true,
                                country: true
                            }
                        }
                    }
                }
            }
        });
        if (!entry) {
            return res.status(404).json({ error: 'Competition entry not found' });
        }
        res.json({ entry });
    }
    catch (error) {
        console.error('Error fetching competition entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new competition entry
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = createCompetitionEntrySchema.parse(req.body);
        // Check if competition exists
        const competition = await prisma.competition.findUnique({
            where: { id: validatedData.competitionId }
        });
        if (!competition) {
            return res.status(400).json({ error: 'Competition not found' });
        }
        // Check if participant exists
        const participant = await prisma.participant.findUnique({
            where: { id: validatedData.participantId }
        });
        if (!participant) {
            return res.status(400).json({ error: 'Participant not found' });
        }
        // Check if entry already exists
        const existingEntry = await prisma.competitionEntry.findUnique({
            where: {
                competitionId_participantId: {
                    competitionId: validatedData.competitionId,
                    participantId: validatedData.participantId
                }
            }
        });
        if (existingEntry) {
            return res.status(400).json({ error: 'Participant is already registered for this competition' });
        }
        // Check if competition has reached max participants
        if (competition.maxParticipants) {
            const currentEntryCount = await prisma.competitionEntry.count({
                where: {
                    competitionId: validatedData.competitionId,
                    status: { notIn: ['CANCELLED', 'NO_SHOW'] }
                }
            });
            if (currentEntryCount >= competition.maxParticipants) {
                return res.status(400).json({ error: 'Competition has reached maximum participants' });
            }
        }
        const entry = await prisma.competitionEntry.create({
            data: {
                competitionId: validatedData.competitionId,
                participantId: validatedData.participantId,
                status: validatedData.status
            },
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                        type: true,
                        status: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        birthDate: true,
                        gender: true,
                        licenseNo: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true
                            }
                        }
                    }
                }
            }
        });
        res.status(201).json({ entry });
    }
    catch (error) {
        console.error('Error creating competition entry:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update competition entry
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const entryId = parseInt(req.params.id);
        const validatedData = updateCompetitionEntrySchema.parse(req.body);
        // Build update data
        const updateData = {};
        if (validatedData.status)
            updateData.status = validatedData.status;
        if (validatedData.competitionId)
            updateData.competitionId = validatedData.competitionId;
        if (validatedData.participantId)
            updateData.participantId = validatedData.participantId;
        const entry = await prisma.competitionEntry.update({
            where: { id: entryId },
            data: updateData,
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                        type: true,
                        status: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        birthDate: true,
                        gender: true,
                        licenseNo: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true
                            }
                        }
                    }
                }
            }
        });
        res.json({ entry });
    }
    catch (error) {
        console.error('Error updating competition entry:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete competition entry
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const entryId = parseInt(req.params.id);
        await prisma.competitionEntry.delete({
            where: { id: entryId }
        });
        res.json({ message: 'Competition entry deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting competition entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get entries by competition
router.get('/competition/:competitionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const competitionId = parseInt(req.params.competitionId);
        const entries = await prisma.competitionEntry.findMany({
            where: { competitionId },
            include: {
                participant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        birthDate: true,
                        gender: true,
                        licenseNo: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true
                            }
                        }
                    }
                }
            },
            orderBy: { registeredAt: 'asc' }
        });
        res.json({ entries });
    }
    catch (error) {
        console.error('Error fetching competition entries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get entries by participant
router.get('/participant/:participantId', auth_1.authenticateToken, async (req, res) => {
    try {
        const participantId = parseInt(req.params.participantId);
        const entries = await prisma.competitionEntry.findMany({
            where: { participantId },
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                        type: true,
                        status: true
                    }
                }
            },
            orderBy: { registeredAt: 'desc' }
        });
        res.json({ entries });
    }
    catch (error) {
        console.error('Error fetching participant entries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=competitionEntries.js.map