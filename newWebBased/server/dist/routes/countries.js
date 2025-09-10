"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createCountrySchema = zod_1.z.object({
    var_name: zod_1.z.string().min(1).max(255),
    var_kuerzel: zod_1.z.string().min(1).max(10),
});
const updateCountrySchema = createCountrySchema.partial();
// Get all countries
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const whereConditions = {};
        if (search) {
            whereConditions.OR = [
                { var_name: { contains: search, mode: 'insensitive' } },
                { var_kuerzel: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [countries, totalCount] = await Promise.all([
            prisma.tfx_laender.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                orderBy: { var_name: 'asc' }
            }),
            prisma.tfx_laender.count({ where: whereConditions })
        ]);
        res.json({
            countries,
            pagination: {
                total: totalCount,
                limit,
                offset,
                pages: Math.ceil(totalCount / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get country by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid country ID' });
        }
        const country = await prisma.tfx_laender.findUnique({
            where: { int_landid: id }
        });
        if (!country) {
            return res.status(404).json({ error: 'Country not found' });
        }
        res.json(country);
    }
    catch (error) {
        console.error('Error fetching country:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new country
router.post('/', async (req, res) => {
    try {
        const validatedData = createCountrySchema.parse(req.body);
        const country = await prisma.tfx_laender.create({
            data: validatedData
        });
        res.status(201).json(country);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Error creating country:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update country
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid country ID' });
        }
        const validatedData = updateCountrySchema.parse(req.body);
        const country = await prisma.tfx_laender.update({
            where: { int_landid: id },
            data: validatedData
        });
        res.json(country);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Country not found' });
        }
        console.error('Error updating country:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete country
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid country ID' });
        }
        await prisma.tfx_laender.delete({
            where: { int_landid: id }
        });
        res.status(204).send();
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Country not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete country with associated records' });
        }
        console.error('Error deleting country:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=countries.js.map