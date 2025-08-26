"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createTeamSchema = zod_1.z.object({
    int_vereinid: zod_1.z.number().int().positive(),
    int_wettkampfid: zod_1.z.number().int().positive(),
    var_name: zod_1.z.string().min(1).max(255),
    var_lang: zod_1.z.string().optional(),
    bol_wirwertung: zod_1.z.boolean().optional().default(true),
});
const updateTeamSchema = createTeamSchema.partial();
// Get all teams
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const vereinId = req.query.vereinId;
        const wettkampfId = req.query.wettkampfId;
        const whereConditions = {};
        if (search) {
            whereConditions.OR = [
                { var_name: { contains: search, mode: 'insensitive' } },
                { var_lang: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (vereinId) {
            whereConditions.int_vereinid = parseInt(vereinId);
        }
        if (wettkampfId) {
            whereConditions.int_wettkampfid = parseInt(wettkampfId);
        }
        const [teams, totalCount] = await Promise.all([
            prisma.tfx_mannschaften.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                include: {
                    tfx_vereine: {
                        select: {
                            var_name: true,
                            var_lang: true
                        }
                    },
                    tfx_wettkampf: {
                        select: {
                            var_name: true,
                            var_ort: true,
                            dat_von: true,
                            dat_bis: true
                        }
                    }
                },
                orderBy: { var_name: 'asc' }
            }),
            prisma.tfx_mannschaften.count({ where: whereConditions })
        ]);
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
        const team = await prisma.tfx_mannschaften.findUnique({
            where: { int_mannschaftsid: id },
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_lang: true,
                        var_strasse: true,
                        var_plz: true,
                        var_ort: true
                    }
                },
                tfx_wettkampf: {
                    select: {
                        var_name: true,
                        var_ort: true,
                        dat_von: true,
                        dat_bis: true
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
        const validatedData = createTeamSchema.parse(req.body);
        const team = await prisma.tfx_mannschaften.create({
            data: validatedData,
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_lang: true
                    }
                },
                tfx_wettkampf: {
                    select: {
                        var_name: true,
                        var_ort: true
                    }
                }
            }
        });
        res.status(201).json(team);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Invalid club or competition reference' });
        }
        console.error('Error creating team:', error);
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
        const team = await prisma.tfx_mannschaften.update({
            where: { int_mannschaftsid: id },
            data: validatedData,
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_lang: true
                    }
                },
                tfx_wettkampf: {
                    select: {
                        var_name: true,
                        var_ort: true
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
        await prisma.tfx_mannschaften.delete({
            where: { int_mannschaftsid: id }
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
exports.default = router;
//# sourceMappingURL=teams.js.map