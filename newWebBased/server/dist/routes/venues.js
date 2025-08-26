"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createVenueSchema = zod_1.z.object({
    var_name: zod_1.z.string().min(1).max(255),
    var_strasse: zod_1.z.string().optional(),
    var_plz: zod_1.z.string().optional(),
    var_ort: zod_1.z.string().optional(),
    var_land: zod_1.z.string().optional(),
    var_telefon: zod_1.z.string().optional(),
    var_fax: zod_1.z.string().optional(),
    var_email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    var_internet: zod_1.z.string().optional(),
    var_notiz: zod_1.z.string().optional(),
});
const updateVenueSchema = createVenueSchema.partial();
// Get all venues
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const whereConditions = {};
        if (search) {
            whereConditions.OR = [
                { var_name: { contains: search, mode: 'insensitive' } },
                { var_ort: { contains: search, mode: 'insensitive' } },
                { var_strasse: { contains: search, mode: 'insensitive' } },
                { var_plz: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [venues, totalCount] = await Promise.all([
            prisma.tfx_wettkampforte.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                orderBy: { var_name: 'asc' }
            }),
            prisma.tfx_wettkampforte.count({ where: whereConditions })
        ]);
        res.json({
            venues,
            pagination: {
                total: totalCount,
                limit,
                offset,
                pages: Math.ceil(totalCount / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching venues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get venue by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid venue ID' });
        }
        const venue = await prisma.tfx_wettkampforte.findUnique({
            where: { int_wettkampfortid: id }
        });
        if (!venue) {
            return res.status(404).json({ error: 'Venue not found' });
        }
        res.json(venue);
    }
    catch (error) {
        console.error('Error fetching venue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new venue
router.post('/', async (req, res) => {
    try {
        const validatedData = createVenueSchema.parse(req.body);
        const venue = await prisma.tfx_wettkampforte.create({
            data: validatedData
        });
        res.status(201).json(venue);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Error creating venue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update venue
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid venue ID' });
        }
        const validatedData = updateVenueSchema.parse(req.body);
        const venue = await prisma.tfx_wettkampforte.update({
            where: { int_wettkampfortid: id },
            data: validatedData
        });
        res.json(venue);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Venue not found' });
        }
        console.error('Error updating venue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete venue
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid venue ID' });
        }
        await prisma.tfx_wettkampforte.delete({
            where: { int_wettkampfortid: id }
        });
        res.status(204).send();
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Venue not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete venue with associated records' });
        }
        console.error('Error deleting venue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=venues.js.map