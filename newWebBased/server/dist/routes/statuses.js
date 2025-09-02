"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createStatusSchema = zod_1.z.object({
    var_name: zod_1.z.string().min(1).max(150),
    ary_colorcode: zod_1.z.string().max(25).optional().default('{0,0,0}'),
    bol_bogen: zod_1.z.boolean().optional().default(true),
    bol_karte: zod_1.z.boolean().optional().default(true),
});
const updateStatusSchema = createStatusSchema.partial();
// Get all statuses
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
        const [statuses, totalCount] = await Promise.all([
            prisma.tfx_status.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                orderBy: { var_name: 'asc' }
            }),
            prisma.tfx_status.count({ where: whereConditions })
        ]);
        res.json({
            statuses,
            pagination: {
                total: totalCount,
                limit,
                offset,
                pages: Math.ceil(totalCount / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching statuses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get status by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid status ID' });
        }
        const status = await prisma.tfx_status.findUnique({
            where: { int_statusid: id }
        });
        if (!status) {
            return res.status(404).json({ error: 'Status not found' });
        }
        res.json(status);
    }
    catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new status
router.post('/', async (req, res) => {
    try {
        const validatedData = createStatusSchema.parse(req.body);
        const status = await prisma.tfx_status.create({
            data: validatedData
        });
        res.status(201).json(status);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Error creating status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update status
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid status ID' });
        }
        const validatedData = updateStatusSchema.parse(req.body);
        const status = await prisma.tfx_status.update({
            where: { int_statusid: id },
            data: validatedData
        });
        res.json(status);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Status not found' });
        }
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete status
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid status ID' });
        }
        await prisma.tfx_status.delete({
            where: { int_statusid: id }
        });
        res.status(204).send();
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Status not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete status with associated records' });
        }
        console.error('Error deleting status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=statuses.js.map