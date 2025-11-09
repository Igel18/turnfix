"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// Validation schemas
const createTeamSchema = zod_1.z.object({
    int_vereineid: zod_1.z.number().int().positive(),
    int_wettkaempfeid: zod_1.z.number().int().positive(),
    int_nummer: zod_1.z.number().int().positive().optional().default(1),
    var_riege: zod_1.z.string().optional(),
    int_startnummer: zod_1.z.number().int().positive().optional(),
});
const updateTeamSchema = createTeamSchema.partial();
// Get all teams
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const clubId = req.query.clubId;
        const eventId = req.query.eventId;
        console.log('📋 GET /api/teams - Query params:', { limit, offset, search, clubId, eventId });
        const whereConditions = {};
        if (search) {
            whereConditions.OR = [
                { tfx_vereine: { var_name: { contains: search, mode: 'insensitive' } } },
                { var_riege: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (clubId) {
            whereConditions.int_vereineid = parseInt(clubId);
        }
        // IMPORTANT: eventId filters by COMPETITION's event, not competition ID directly
        if (eventId) {
            whereConditions.tfx_wettkaempfe = {
                int_veranstaltungenid: parseInt(eventId)
            };
        }
        console.log('📋 WHERE conditions:', whereConditions);
        const [teams, totalCount] = await Promise.all([
            prisma_1.default.tfx_mannschaften.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                include: {
                    tfx_vereine: {
                        select: {
                            var_name: true,
                            var_website: true
                        }
                    },
                    tfx_wettkaempfe: {
                        select: {
                            var_name: true,
                            var_nummer: true,
                            yer_von: true,
                            yer_bis: true
                        }
                    }
                },
                orderBy: { int_mannschaftenid: 'asc' }
            }),
            prisma_1.default.tfx_mannschaften.count({ where: whereConditions })
        ]);
        console.log('📋 Found teams:', teams.length, 'Total count:', totalCount);
        res.json({
            teams,
            pagination: {
                total: totalCount,
                limit,
                offset,
                pages: Math.ceil(totalCount / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get team by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        const team = await prisma_1.default.tfx_mannschaften.findUnique({
            where: { int_mannschaftenid: id },
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_website: true,
                        int_start_ort: true
                    }
                },
                tfx_wettkaempfe: {
                    select: {
                        var_name: true,
                        var_nummer: true,
                        yer_von: true,
                        yer_bis: true
                    }
                }
            }
        });
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.json(team);
    }
    catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new team
router.post('/', async (req, res) => {
    try {
        console.log('🏆 POST /api/teams - Creating team:', req.body);
        const validatedData = createTeamSchema.parse(req.body);
        console.log('✅ Validation passed:', validatedData);
        const team = await prisma_1.default.tfx_mannschaften.create({
            data: validatedData,
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_website: true
                    }
                },
                tfx_wettkaempfe: {
                    select: {
                        var_name: true,
                        var_nummer: true
                    }
                }
            }
        });
        console.log('✅ Team created successfully:', team.int_mannschaftenid);
        res.status(201).json(team);
    }
    catch (error) {
        console.error('❌ Error creating team:', error);
        if (error instanceof zod_1.z.ZodError) {
            console.error('❌ Validation error details:', error.issues);
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2003') {
            console.error('❌ Foreign key constraint failed');
            return res.status(400).json({ error: 'Invalid club or competition reference' });
        }
        console.error('❌ Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update team
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        const validatedData = updateTeamSchema.parse(req.body);
        const team = await prisma_1.default.tfx_mannschaften.update({
            where: { int_mannschaftenid: id },
            data: validatedData,
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_website: true
                    }
                },
                tfx_wettkaempfe: {
                    select: {
                        var_name: true,
                        var_nummer: true
                    }
                }
            }
        });
        res.json(team);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Team not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Invalid club or competition reference' });
        }
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete team
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        await prisma_1.default.tfx_mannschaften.delete({
            where: { int_mannschaftenid: id }
        });
        res.status(204).send();
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Team not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete team with associated records' });
        }
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get team penalties
router.get('/:id/penalties', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        console.log('📋 GET /api/teams/:id/penalties - Team ID:', id);
        // For now, return empty array (penalties feature to be implemented)
        res.json([]);
    }
    catch (error) {
        console.error('Error fetching team penalties:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=teams.js.map