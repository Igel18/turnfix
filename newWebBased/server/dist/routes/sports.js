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
const createSportSchema = zod_1.z.object({
    var_name: zod_1.z.string().min(1).max(150),
});
const updateSportSchema = createSportSchema.partial();
// Get sports count
router.get('/count', async (req, res) => {
    try {
        const count = await prisma_1.default.tfx_sport.count();
        res.json({ count });
    }
    catch (error) {
        console.error('Error counting sports:', error);
        res.status(500).json({
            error: 'Failed to count sports',
            details: process.env.DEBUG === 'true' ? error : undefined
        });
    }
});
// Get all sports
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const whereConditions = {};
        if (search) {
            whereConditions.var_name = {
                contains: search,
                mode: 'insensitive'
            };
        }
        const [sports, totalCount] = await Promise.all([
            prisma_1.default.tfx_sport.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                orderBy: { var_name: 'asc' }
            }),
            prisma_1.default.tfx_sport.count({ where: whereConditions })
        ]);
        res.json({
            sports,
            pagination: {
                total: totalCount,
                limit,
                offset,
                pages: Math.ceil(totalCount / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching sports:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get sport by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid sport ID' });
        }
        const sport = await prisma_1.default.tfx_sport.findUnique({
            where: { int_sportid: id },
            include: {
                tfx_disziplinen: {
                    select: { int_disziplinenid: true, var_name: true }
                }
            }
        });
        if (!sport) {
            return res.status(404).json({ error: 'Sport not found' });
        }
        res.json(sport);
    }
    catch (error) {
        console.error('Error fetching sport:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new sport
router.post('/', async (req, res) => {
    try {
        const validatedData = createSportSchema.parse(req.body);
        const sport = await prisma_1.default.tfx_sport.create({
            data: validatedData
        });
        res.status(201).json(sport);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Error creating sport:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update sport
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid sport ID' });
        }
        const validatedData = updateSportSchema.parse(req.body);
        const sport = await prisma_1.default.tfx_sport.update({
            where: { int_sportid: id },
            data: validatedData
        });
        res.json(sport);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Sport not found' });
        }
        console.error('Error updating sport:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete sport
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid sport ID' });
        }
        await prisma_1.default.tfx_sport.delete({
            where: { int_sportid: id }
        });
        res.status(204).send();
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Sport not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete sport with associated disciplines' });
        }
        console.error('Error deleting sport:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=sports.js.map