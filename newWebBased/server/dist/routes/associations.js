"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const associationBaseSchema = zod_1.z.object({
    var_name: zod_1.z.string().min(1).max(150),
    var_kuerzel: zod_1.z.string().max(8).nullable().optional(),
    int_laenderid: zod_1.z.number().int().nullable().optional()
});
const associationCreateSchema = associationBaseSchema.transform(data => ({
    ...data,
    var_kuerzel: data.var_kuerzel || null,
    int_laenderid: data.int_laenderid || null
}));
const associationUpdateSchema = associationBaseSchema.partial().transform(data => ({
    ...data,
    var_kuerzel: data.var_kuerzel !== undefined ? (data.var_kuerzel || null) : undefined,
    int_laenderid: data.int_laenderid !== undefined ? (data.int_laenderid || null) : undefined
}));
const associationQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    country_id: zod_1.z.string().transform(Number).optional(),
    limit: zod_1.z.string().transform(Number).default(50),
    offset: zod_1.z.string().transform(Number).default(0)
});
// Get all associations with search and pagination
router.get('/', async (req, res) => {
    try {
        const query = associationQuerySchema.parse(req.query);
        let whereClause = '';
        const params = [];
        let paramIndex = 1;
        if (query.search) {
            whereClause += ` WHERE LOWER(v.var_name) LIKE LOWER($${paramIndex}) OR LOWER(v.var_kuerzel) LIKE LOWER($${paramIndex})`;
            params.push(`%${query.search}%`);
            paramIndex++;
        }
        if (query.country_id) {
            whereClause += query.search ? ' AND' : ' WHERE';
            whereClause += ` v.int_laenderid = $${paramIndex}`;
            params.push(query.country_id);
            paramIndex++;
        }
        const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      ${whereClause}
    `;
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
        const total = parseInt(countResult[0]?.total || '0');
        const dataQuery = `
      SELECT 
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      ${whereClause}
      ORDER BY v.var_name ASC
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
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      WHERE v.int_verbaendeid = $1
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
        // Use default country (Deutschland = 1) if no country is selected
        // This handles the NOT NULL constraint on int_laenderid
        const countryId = data.int_laenderid || 1;
        const insertQuery = `
      INSERT INTO tfx_verbaende (var_name, var_kuerzel, int_laenderid)
      VALUES ($1, $2, $3)
      RETURNING int_verbaendeid
    `;
        console.log('Executing insert query with params:', [data.var_name, data.var_kuerzel, countryId]);
        const result = await prisma.$queryRawUnsafe(insertQuery, data.var_name, data.var_kuerzel, countryId);
        console.log('Insert result:', result);
        const associationId = result[0]?.int_verbaendeid;
        if (!associationId) {
            throw new Error('Failed to get association ID from insert result');
        }
        // Fetch the created association with country data
        const fetchQuery = `
      SELECT 
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      WHERE v.int_verbaendeid = $1
    `;
        const associations = await prisma.$queryRawUnsafe(fetchQuery, associationId);
        console.log('Fetched association:', associations);
        res.status(201).json(associations[0]);
    }
    catch (error) {
        console.error('Error creating association:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
        if (error instanceof zod_1.z.ZodError) {
            console.log('Validation error details:', JSON.stringify(error.issues, null, 2));
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: 'Failed to create association' });
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
        if (data.int_laenderid !== undefined) {
            updates.push(`int_laenderid = $${paramIndex++}`);
            params.push(data.int_laenderid || null);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        const updateQuery = `
      UPDATE tfx_verbaende 
      SET ${updates.join(', ')}
      WHERE int_verbaendeid = $${paramIndex}
      RETURNING int_verbaendeid
    `;
        params.push(id);
        const result = await prisma.$queryRawUnsafe(updateQuery, ...params);
        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Association not found' });
        }
        // Fetch updated association with country data
        const fetchQuery = `
      SELECT 
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      WHERE v.int_verbaendeid = $1
    `;
        const associations = await prisma.$queryRawUnsafe(fetchQuery, id);
        res.json(associations[0]);
    }
    catch (error) {
        console.error('Error updating association:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: 'Failed to update association' });
    }
});
// Delete association
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid association ID' });
        }
        // Check if association is being used by regions
        const regionCheckQuery = 'SELECT COUNT(*) as count FROM tfx_gaue WHERE int_verbaendeid = $1';
        const regionCheck = await prisma.$queryRawUnsafe(regionCheckQuery, id);
        const regionCount = parseInt(regionCheck[0]?.count || '0');
        if (regionCount > 0) {
            return res.status(400).json({
                error: `Cannot delete association. It is currently assigned to ${regionCount} region(s).`
            });
        }
        const deleteQuery = 'DELETE FROM tfx_verbaende WHERE int_verbaendeid = $1 RETURNING int_verbaendeid';
        const result = await prisma.$queryRawUnsafe(deleteQuery, id);
        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Association not found' });
        }
        res.json({ message: 'Association deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting association:', error);
        res.status(500).json({ error: 'Failed to delete association' });
    }
});
// Get data endpoints for dropdowns
router.get('/data/laender', async (req, res) => {
    try {
        const query = `
      SELECT int_laenderid, var_name, var_kuerzel
      FROM tfx_laender
      ORDER BY var_name ASC
    `;
        const countries = await prisma.$queryRawUnsafe(query);
        res.json(countries);
    }
    catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'Failed to fetch countries' });
    }
});
exports.default = router;
//# sourceMappingURL=associations.js.map