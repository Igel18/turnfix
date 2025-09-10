"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createResultSchema = zod_1.z.object({
    competitionId: zod_1.z.number().int().positive(),
    participantId: zod_1.z.number().int().positive(),
    disciplineId: zod_1.z.number().int().positive(),
    score: zod_1.z.number(),
    rank: zod_1.z.number().int().optional(),
    notes: zod_1.z.string().optional()
});
const updateResultSchema = createResultSchema.partial();
// Get all results with pagination
router.get('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const competitionId = req.query.competitionId;
        const participantId = req.query.participantId;
        // Build WHERE conditions for raw SQL query
        const whereConditions = [];
        const params = [];
        let paramIndex = 1;
        if (competitionId) {
            whereConditions.push(`w.int_wettkaempfeid = $${paramIndex}`);
            params.push(parseInt(competitionId));
            paramIndex++;
        }
        if (participantId) {
            whereConditions.push(`w.int_teilnehmerid = $${paramIndex}`);
            params.push(parseInt(participantId));
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const query = `
      SELECT 
        w.int_wertungid,
        w.int_wettkaempfeid,
        w.int_teilnehmerid,
        w.dec_note,
        w.int_rang,
        w.var_bemerkung,
        wk.var_name as competition_name,
        t.var_vorname,
        t.var_nachname
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      ${whereClause}
      ORDER BY w.int_wertungid DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const results = await prisma.$queryRawUnsafe(query, ...params);
        res.json({
            results: results,
            pagination: {
                limit,
                offset,
                total: 0 // TODO: Add count query
            }
        });
    }
    catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ message: 'Failed to fetch results' });
    }
});
exports.default = router;
//# sourceMappingURL=results.js.map