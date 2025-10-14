"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas for gaue (regions/districts)
const associationBaseSchema = zod_1.z.object({
    var_name: zod_1.z.string().min(1).max(150),
    var_kuerzel: zod_1.z.string().max(8).nullable().optional(),
    int_verbaendeid: zod_1.z.number().int().default(1) // Default federation ID
});
const associationCreateSchema = associationBaseSchema.transform(data => ({
    ...data,
    var_kuerzel: data.var_kuerzel || null
}));
const associationUpdateSchema = associationBaseSchema.partial().transform(data => ({
    ...data,
    var_kuerzel: data.var_kuerzel !== undefined ? (data.var_kuerzel || null) : undefined
}));
const associationQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    federation_id: zod_1.z.string().transform(Number).optional(),
    limit: zod_1.z.string().transform(Number).default(50),
    offset: zod_1.z.string().transform(Number).default(0)
});
// Get associations count
router.get('/count', async (req, res) => {
    try {
        const count = await prisma.tfx_gaue.count();
        res.json({ count });
    }
    catch (error) {
        console.error('Error counting associations:', error);
        res.status(500).json({
            error: 'Failed to count associations',
            details: process.env.DEBUG === 'true' ? error : undefined
        });
    }
});
// Get all associations with search and pagination
router.get('/', async (req, res) => {
    try {
        const query = associationQuerySchema.parse(req.query);
        let whereClause = '';
        const params = [];
        let paramIndex = 1;
        if (query.search) {
            whereClause += ` WHERE LOWER(g.var_name) LIKE LOWER($${paramIndex}) OR LOWER(g.var_kuerzel) LIKE LOWER($${paramIndex})`;
            params.push(`%${query.search}%`);
            paramIndex++;
        }
        if (query.federation_id) {
            whereClause += query.search ? ' AND' : ' WHERE';
            whereClause += ` g.int_verbaendeid = $${paramIndex}`;
            params.push(query.federation_id);
            paramIndex++;
        }
        const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
    `;
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
        const total = parseInt(countResult[0]?.total || '0');
        const dataQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
      ORDER BY g.var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(query.limit, query.offset);
        const associations = await prisma.$queryRawUnsafe(dataQuery, ...params);
        res.json({
            associations,
            pagination: {
                total,
                limit: query.limit,
                offset: query.offset,
                hasMore: query.offset + query.limit < total
            }
        });
    }
    catch (error) {
        console.error('Error fetching associations:', error);
        res.status(500).json({ error: 'Failed to fetch associations' });
    }
});
// Get association by ID
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid association ID' });
        }
        const query = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;
        const associations = await prisma.$queryRawUnsafe(query, id);
        if (!associations || associations.length === 0) {
            return res.status(404).json({ error: 'Association not found' });
        }
        res.json(associations[0]);
    }
    catch (error) {
        console.error('Error fetching association:', error);
        res.status(500).json({ error: 'Failed to fetch association' });
    }
});
// Create new association
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        console.log('Received association create request:', req.body);
        const data = associationCreateSchema.parse(req.body);
        console.log('Parsed association data:', data);
        const insertQuery = `
      INSERT INTO tfx_gaue (var_name, var_kuerzel, int_verbaendeid)
      VALUES ($1, $2, $3)
      RETURNING int_gaueid
    `;
        console.log('Executing insert query with params:', [data.var_name, data.var_kuerzel, data.int_verbaendeid]);
        const result = await prisma.$queryRawUnsafe(insertQuery, data.var_name, data.var_kuerzel, data.int_verbaendeid);
        console.log('Insert result:', result);
        const associationId = result[0]?.int_gaueid;
        if (!associationId) {
            throw new Error('Failed to get association ID from insert result');
        }
        // Fetch the created association with federation data
        const fetchQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;
        const associations = await prisma.$queryRawUnsafe(fetchQuery, associationId);
        console.log('Fetched association:', associations);
        res.status(201).json(associations[0]);
    }
    catch (error) {
        console.error('Error creating association:', error);
        if (error instanceof Error) {
            console.log('Error details:', error.message);
        }
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid association data', details: error.issues });
        }
        return res.status(500).json({ error: 'Failed to create association' });
    }
});
// Update association
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid association ID' });
        }
        const data = associationUpdateSchema.parse(req.body);
        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.var_name !== undefined) {
            updates.push(`var_name = $${paramIndex++}`);
            params.push(data.var_name);
        }
        if (data.var_kuerzel !== undefined) {
            updates.push(`var_kuerzel = $${paramIndex++}`);
            params.push(data.var_kuerzel);
        }
        if (data.int_verbaendeid !== undefined) {
            updates.push(`int_verbaendeid = $${paramIndex++}`);
            params.push(data.int_verbaendeid);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        const updateQuery = `
      UPDATE tfx_gaue 
      SET ${updates.join(', ')}
      WHERE int_gaueid = $${paramIndex}
      RETURNING int_gaueid
    `;
        params.push(id);
        const result = await prisma.$queryRawUnsafe(updateQuery, ...params);
        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Association not found' });
        }
        // Fetch updated association with federation data
        const fetchQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;
        const associations = await prisma.$queryRawUnsafe(fetchQuery, id);
        res.json(associations[0]);
    }
    catch (error) {
        console.error('Error updating association:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid association data', details: error.issues });
        }
        res.status(500).json({ error: 'Failed to update association' });
    }
}); // Delete association
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid association ID' });
        }
        // Check if association exists first
        const existsQuery = 'SELECT COUNT(*) as count FROM tfx_gaue WHERE int_gaueid = $1';
        const existsResult = await prisma.$queryRawUnsafe(existsQuery, id);
        const exists = Number(existsResult[0]?.count) > 0;
        if (!exists) {
            return res.status(404).json({ error: 'Association not found' });
        }
        // Check if association is being used by clubs
        const clubCheckQuery = 'SELECT COUNT(*) as count FROM tfx_vereine WHERE int_gaueid = $1';
        const clubCheck = await prisma.$queryRawUnsafe(clubCheckQuery, id);
        const clubCount = parseInt(clubCheck[0]?.count || '0');
        if (clubCount > 0) {
            return res.status(409).json({
                error: `Cannot delete association. It is currently assigned to ${clubCount} club(s).`
            });
        }
        const deleteQuery = 'DELETE FROM tfx_gaue WHERE int_gaueid = $1';
        await prisma.$queryRawUnsafe(deleteQuery, id);
        res.json({ message: 'Association deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting association:', error);
        res.status(500).json({ error: 'Failed to delete association' });
    }
});
// Get data endpoints for dropdowns
router.get('/data/verbaende', async (req, res) => {
    try {
        const query = `
      SELECT int_verbaendeid, var_name, var_kuerzel
      FROM tfx_verbaende
      ORDER BY var_name ASC
    `;
        const federations = await prisma.$queryRawUnsafe(query);
        res.json(federations);
    }
    catch (error) {
        console.error('Error fetching federations:', error);
        res.status(500).json({ error: 'Failed to fetch federations' });
    }
});
exports.default = router;
//# sourceMappingURL=associations.js.map