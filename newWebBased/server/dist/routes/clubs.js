"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas based on tfx_vereine table structure
const clubCreateSchema = zod_1.z.object({
    var_name: zod_1.z.string().min(1).max(150),
    var_website: zod_1.z.string().url().optional().nullable(),
    int_gaueid: zod_1.z.number().int(),
    int_personenid: zod_1.z.number().int().optional().nullable(),
    int_start_ort: zod_1.z.number().int().default(1)
});
const clubUpdateSchema = clubCreateSchema.partial();
const clubQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    gaue_id: zod_1.z.string().transform(Number).optional(),
    limit: zod_1.z.string().transform(Number).default(50),
    offset: zod_1.z.string().transform(Number).default(0)
});
// Get all clubs with search and pagination
router.get('/', async (req, res) => {
    try {
        const query = clubQuerySchema.parse(req.query);
        let whereClause = '';
        const params = [];
        let paramIndex = 1;
        const conditions = [];
        if (query.search) {
            conditions.push(`LOWER(v.var_name) LIKE LOWER($${paramIndex})`);
            params.push(`%${query.search}%`);
            paramIndex++;
        }
        if (query.gaue_id) {
            conditions.push(`v.int_gaueid = $${paramIndex}`);
            params.push(query.gaue_id);
            paramIndex++;
        }
        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }
        const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_vereine v
      LEFT JOIN tfx_gaue g ON v.int_gaueid = g.int_gaueid
      ${whereClause}
    `;
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
        const total = parseInt(countResult[0]?.total || '0');
        const dataQuery = `
      SELECT 
        v.int_vereineid,
        v.var_name,
        v.var_website,
        v.int_gaueid,
        v.int_personenid,
        v.int_start_ort,
        g.var_name as gaue_name,
        p.var_vorname,
        p.var_nachname,
        p.var_email,
        p.var_telefon,
        (SELECT COUNT(*) FROM tfx_teilnehmer t WHERE t.int_vereineid = v.int_vereineid) as athlete_count
      FROM tfx_vereine v
      LEFT JOIN tfx_gaue g ON v.int_gaueid = g.int_gaueid
      LEFT JOIN tfx_personen p ON v.int_personenid = p.int_personenid
      ${whereClause}
      ORDER BY v.var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(query.limit, query.offset);
        const clubs = await prisma.$queryRawUnsafe(dataQuery, ...params);
        // Convert BigInt values to numbers for JSON serialization
        const clubsData = clubs.map((club) => ({
            ...club,
            int_vereineid: Number(club.int_vereineid),
            int_gaueid: Number(club.int_gaueid),
            int_personenid: club.int_personenid ? Number(club.int_personenid) : null,
            int_start_ort: Number(club.int_start_ort),
            athlete_count: Number(club.athlete_count)
        }));
        res.json({
            clubs: clubsData,
            pagination: {
                total,
                limit: query.limit,
                offset: query.offset,
                hasMore: query.offset + query.limit < total
            }
        });
    }
    catch (error) {
        console.error('Error fetching clubs:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid query parameters', errors: error.issues });
        }
        return res.status(500).json({ message: 'Failed to fetch clubs' });
    }
});
// Get club by ID
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid club ID' });
        }
        const query = `
      SELECT 
        v.int_vereineid,
        v.var_name,
        v.var_website,
        v.int_gaueid,
        v.int_personenid,
        v.int_start_ort,
        g.var_name as gaue_name,
        p.var_vorname,
        p.var_nachname,
        p.var_email,
        p.var_telefon,
        (SELECT COUNT(*) FROM tfx_teilnehmer t WHERE t.int_vereineid = v.int_vereineid) as athlete_count
      FROM tfx_vereine v
      LEFT JOIN tfx_gaue g ON v.int_gaueid = g.int_gaueid
      LEFT JOIN tfx_personen p ON v.int_personenid = p.int_personenid
      WHERE v.int_vereineid = $1
    `;
        const result = await prisma.$queryRawUnsafe(query, id);
        const club = result[0];
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }
        // Convert BigInt values to numbers for JSON serialization
        const clubData = {
            ...club,
            int_vereineid: Number(club.int_vereineid),
            int_gaueid: Number(club.int_gaueid),
            int_personenid: club.int_personenid ? Number(club.int_personenid) : null,
            int_start_ort: Number(club.int_start_ort),
            athlete_count: Number(club.athlete_count)
        };
        res.json(clubData);
    }
    catch (error) {
        console.error('Error fetching club:', error);
        return res.status(500).json({ message: 'Failed to fetch club' });
    }
});
// Create new club
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        console.log('Received club create request:', req.body);
        const data = clubCreateSchema.parse(req.body);
        console.log('Parsed club data:', data);
        const query = `
      INSERT INTO tfx_vereine (int_personenid, var_name, int_start_ort, var_website, int_gaueid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING int_vereineid
    `;
        console.log('Executing insert query with params:', [
            data.int_personenid || null,
            data.var_name,
            data.int_start_ort,
            data.var_website || null,
            data.int_gaueid
        ]);
        const result = await prisma.$queryRawUnsafe(query, data.int_personenid || null, data.var_name, data.int_start_ort, data.var_website || null, data.int_gaueid);
        const clubId = result[0]?.int_vereineid;
        if (!clubId) {
            return res.status(500).json({ message: 'Failed to create club' });
        }
        // Fetch the created club with all details
        const fetchQuery = `
      SELECT 
        v.int_vereineid,
        v.var_name,
        v.var_website,
        v.int_gaueid,
        v.int_personenid,
        v.int_start_ort,
        g.var_name as gaue_name,
        p.var_vorname,
        p.var_nachname
      FROM tfx_vereine v
      LEFT JOIN tfx_gaue g ON v.int_gaueid = g.int_gaueid
      LEFT JOIN tfx_personen p ON v.int_personenid = p.int_personenid
      WHERE v.int_vereineid = $1
    `;
        const createdClub = await prisma.$queryRawUnsafe(fetchQuery, clubId);
        const club = createdClub[0];
        // Convert BigInt values to numbers for JSON serialization
        const clubData = {
            ...club,
            int_vereineid: Number(club.int_vereineid),
            int_gaueid: Number(club.int_gaueid),
            int_personenid: club.int_personenid ? Number(club.int_personenid) : null,
            int_start_ort: Number(club.int_start_ort)
        };
        res.status(201).json(clubData);
    }
    catch (error) {
        console.error('Error creating club:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid club data', details: error.issues });
        }
        return res.status(500).json({ error: 'Failed to create club' });
    }
});
// Update club
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid club ID' });
        }
        const data = clubUpdateSchema.parse(req.body);
        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;
        Object.entries(data).forEach(([key, value]) => {
            updates.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
        });
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No data to update' });
        }
        params.push(id);
        const query = `
      UPDATE tfx_vereine 
      SET ${updates.join(', ')}
      WHERE int_vereineid = $${paramIndex}
    `;
        await prisma.$queryRawUnsafe(query, ...params);
        // Fetch updated club
        const fetchQuery = `
      SELECT 
        v.int_vereineid,
        v.var_name,
        v.var_website,
        v.int_gaueid,
        v.int_personenid,
        v.int_start_ort,
        g.var_name as gaue_name,
        p.var_vorname,
        p.var_nachname
      FROM tfx_vereine v
      LEFT JOIN tfx_gaue g ON v.int_gaueid = g.int_gaueid
      LEFT JOIN tfx_personen p ON v.int_personenid = p.int_personenid
      WHERE v.int_vereineid = $1
    `;
        const updatedClub = await prisma.$queryRawUnsafe(fetchQuery, id);
        const club = updatedClub[0];
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }
        // Convert BigInt values to numbers for JSON serialization
        const clubData = {
            ...club,
            int_vereineid: Number(club.int_vereineid),
            int_gaueid: Number(club.int_gaueid),
            int_personenid: club.int_personenid ? Number(club.int_personenid) : null,
            int_start_ort: Number(club.int_start_ort)
        };
        res.json(clubData);
    }
    catch (error) {
        console.error('Error updating club:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid club data', details: error.issues });
        }
        return res.status(500).json({ error: 'Failed to update club' });
    }
});
// Delete club
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid club ID' });
        }
        // Check if club exists first
        const existsQuery = 'SELECT COUNT(*) as count FROM tfx_vereine WHERE int_vereineid = $1';
        const existsResult = await prisma.$queryRawUnsafe(existsQuery, id);
        const exists = Number(existsResult[0]?.count) > 0;
        if (!exists) {
            return res.status(404).json({ error: 'Club not found' });
        }
        // Check if club has athletes
        const athleteCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM tfx_teilnehmer WHERE int_vereineid = $1', id);
        if (Number(athleteCount[0]?.count) > 0) {
            return res.status(409).json({
                error: 'Cannot delete club with existing athletes. Please reassign or remove athletes first.'
            });
        }
        await prisma.$queryRawUnsafe('DELETE FROM tfx_vereine WHERE int_vereineid = $1', id);
        res.json({ message: 'Club deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting club:', error);
        return res.status(500).json({ error: 'Failed to delete club' });
    }
});
// Get gaue (regions) for dropdown
router.get('/data/gaue', async (req, res) => {
    try {
        const query = `
      SELECT int_gaueid as id, var_name as name
      FROM tfx_gaue
      ORDER BY var_name
    `;
        const gaue = await prisma.$queryRawUnsafe(query);
        // Convert BigInt values to numbers for JSON serialization
        const gaueData = gaue.map((item) => ({
            id: Number(item.id),
            name: item.name
        }));
        res.json(gaueData);
    }
    catch (error) {
        console.error('Error fetching gaue:', error);
        res.status(500).json({ message: 'Failed to fetch gaue' });
    }
});
// Get persons (contacts) for dropdown
router.get('/data/personen', async (req, res) => {
    try {
        const query = `
      SELECT 
        int_personenid, 
        var_vorname, 
        var_nachname,
        var_email,
        var_telefon
      FROM tfx_personen
      ORDER BY var_nachname, var_vorname
    `;
        const persons = await prisma.$queryRawUnsafe(query);
        // Convert BigInt values to numbers for JSON serialization
        const personsData = persons.map((person) => ({
            ...person,
            int_personenid: Number(person.int_personenid)
        }));
        res.json(personsData);
    }
    catch (error) {
        console.error('Error fetching persons:', error);
        res.status(500).json({ message: 'Failed to fetch persons' });
    }
});
exports.default = router;
//# sourceMappingURL=clubs.js.map