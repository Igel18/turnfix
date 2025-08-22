"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const participantCreateSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(150),
    lastName: zod_1.z.string().min(1).max(150),
    birthDate: zod_1.z.string().transform(str => new Date(str)),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']),
    clubId: zod_1.z.number().int(),
    licenseNo: zod_1.z.string().optional(),
    nationality: zod_1.z.string().max(50).optional(),
});
const participantUpdateSchema = participantCreateSchema.partial();
const participantQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    clubId: zod_1.z.string().transform(Number).optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    limit: zod_1.z.string().transform(Number).default(50),
    offset: zod_1.z.string().transform(Number).default(0)
});
// Get all participants with search and pagination
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const query = participantQuerySchema.parse(req.query);
        const where = {};
        if (query.search) {
            where.OR = [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } }
            ];
        }
        if (query.clubId) {
            where.clubId = query.clubId;
        }
        if (query.gender) {
            where.gender = query.gender;
        }
        const [participants, totalCount] = await Promise.all([
            prisma.participant.findMany({
                where,
                include: {
                    club: {
                        select: { name: true }
                    },
                    results: {
                        select: { id: true }
                    }
                },
                skip: query.offset,
                take: query.limit,
                orderBy: [
                    { lastName: 'asc' },
                    { firstName: 'asc' }
                ]
            }),
            prisma.participant.count({ where })
        ]);
        const participantsWithCount = participants.map(participant => ({
            ...participant,
            club_name: participant.club.name,
            competition_count: participant.results.length,
            age: participant.birthDate ?
                new Date().getFullYear() - participant.birthDate.getFullYear() :
                null
        }));
        res.json({
            participants: participantsWithCount,
            pagination: {
                total: totalCount,
                limit: query.limit,
                offset: query.offset,
                pages: Math.ceil(totalCount / query.limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching participants:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid query parameters', errors: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
const total = Number(countResult[0]?.total || 0);
// Convert BigInt values to numbers for JSON serialization
const participantsData = dataResult.map(participant => ({
    ...participant,
    int_teilnehmerid: Number(participant.int_teilnehmerid),
    int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
    int_geschlecht: Number(participant.int_geschlecht),
    int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null,
    age: participant.age ? Number(participant.age) : null,
    competition_count: Number(participant.competition_count)
}));
res.json({
    participants: participantsData,
    pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total
    }
});
try { }
catch (error) {
    console.error('Error fetching participants:', error);
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: error.issues });
    }
    return res.status(500).json({ message: 'Failed to fetch participants' });
}
;
// Get participant by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid participant ID' });
        }
        const query = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.bool_nur_jahr,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Unknown'
        END as geschlecht_name,
        CASE 
          WHEN t.dat_geburtstag IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(t.dat_geburtstag))
          ELSE NULL
        END as age
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE t.int_teilnehmerid = $1
    `;
        const result = await prisma.$queryRawUnsafe(query, id);
        const participant = result[0];
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        // Convert BigInt values to numbers for JSON serialization
        const participantData = {
            ...participant,
            int_teilnehmerid: Number(participant.int_teilnehmerid),
            int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
            int_geschlecht: Number(participant.int_geschlecht),
            int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null,
            age: participant.age ? Number(participant.age) : null
        };
        res.json(participantData);
    }
    catch (error) {
        console.error('Error fetching participant:', error);
        return res.status(500).json({ message: 'Failed to fetch participant' });
    }
});
// Create new participant
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const data = participantCreateSchema.parse(req.body);
        // Convert date string to Date if provided
        let birthdateValue = null;
        if (data.dat_geburtstag) {
            birthdateValue = new Date(data.dat_geburtstag);
            if (isNaN(birthdateValue.getTime())) {
                return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
            }
        }
        const query = `
      INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, int_vereineid, int_geschlecht, dat_geburtstag, bool_nur_jahr, int_startpassnummer)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING int_teilnehmerid
    `;
        const result = await prisma.$queryRawUnsafe(query, data.var_vorname, data.var_nachname, data.int_vereineid, data.int_geschlecht, birthdateValue, data.bool_nur_jahr, data.int_startpassnummer);
        const participantId = result[0]?.int_teilnehmerid;
        if (!participantId) {
            return res.status(500).json({ message: 'Failed to create participant' });
        }
        // Fetch the created participant with all details
        const fetchQuery = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.bool_nur_jahr,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Unknown'
        END as geschlecht_name
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE t.int_teilnehmerid = $1
    `;
        const createdParticipant = await prisma.$queryRawUnsafe(fetchQuery, participantId);
        const participantData = createdParticipant[0];
        // Convert BigInt values to numbers for JSON serialization
        const responseData = {
            ...participantData,
            int_teilnehmerid: Number(participantData.int_teilnehmerid),
            int_vereineid: participantData.int_vereineid ? Number(participantData.int_vereineid) : null,
            int_geschlecht: Number(participantData.int_geschlecht),
            int_startpassnummer: participantData.int_startpassnummer ? Number(participantData.int_startpassnummer) : null
        };
        res.status(201).json(responseData);
    }
    catch (error) {
        console.error('Error creating participant:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid participant data', errors: error.issues });
        }
        return res.status(500).json({ message: 'Failed to create participant' });
    }
});
// Update participant
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid participant ID' });
        }
        const data = participantUpdateSchema.parse(req.body);
        // Handle date conversion if provided
        if (data.dat_geburtstag) {
            const birthdateValue = new Date(data.dat_geburtstag);
            if (isNaN(birthdateValue.getTime())) {
                return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
            }
            data.dat_geburtstag = birthdateValue;
        }
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
            return res.status(400).json({ message: 'No data to update' });
        }
        params.push(id);
        const query = `
      UPDATE tfx_teilnehmer 
      SET ${updates.join(', ')}
      WHERE int_teilnehmerid = $${paramIndex}
    `;
        await prisma.$queryRawUnsafe(query, ...params);
        // Fetch updated participant
        const fetchQuery = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.bool_nur_jahr,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Unknown'
        END as geschlecht_name
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE t.int_teilnehmerid = $1
    `;
        const updatedParticipant = await prisma.$queryRawUnsafe(fetchQuery, id);
        const participant = updatedParticipant[0];
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        // Convert BigInt values to numbers for JSON serialization
        const participantData = {
            ...participant,
            int_teilnehmerid: Number(participant.int_teilnehmerid),
            int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
            int_geschlecht: Number(participant.int_geschlecht),
            int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null
        };
        res.json(participantData);
    }
    catch (error) {
        console.error('Error updating participant:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Invalid participant data', errors: error.issues });
        }
        return res.status(500).json({ message: 'Failed to update participant' });
    }
});
// Delete participant
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid participant ID' });
        }
        // Check if participant has scores/competitions
        const competitionCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM tfx_wertungen WHERE int_teilnehmerid = $1', id);
        if (Number(competitionCount[0]?.count) > 0) {
            return res.status(409).json({
                message: 'Cannot delete participant with existing competition entries. Please remove competition entries first.'
            });
        }
        const result = await prisma.$queryRawUnsafe('DELETE FROM tfx_teilnehmer WHERE int_teilnehmerid = $1', id);
        res.json({ message: 'Participant deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting participant:', error);
        return res.status(500).json({ message: 'Failed to delete participant' });
    }
});
exports.default = router;
//# sourceMappingURL=participants.js.map