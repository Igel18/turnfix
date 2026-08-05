"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const gymnetXmlExport_1 = require("../utils/gymnetXmlExport");
const gymnetTemplateResultsExport_1 = require("../utils/gymnetTemplateResultsExport");
const multer_1 = __importDefault(require("multer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
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
const templateUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const lowerName = file.originalname.toLowerCase();
        if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || lowerName.endsWith('.xml')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only XML files are allowed'));
        }
    }
});
async function loadGymNetExportPayload(eventId, competitionId) {
    const competitionParams = [eventId];
    let competitionFilter = '';
    if (competitionId !== null) {
        competitionFilter = ' AND w.int_wettkaempfeid = $2';
        competitionParams.push(competitionId);
    }
    const competitions = await prisma_1.default.$queryRawUnsafe(`
      SELECT
        w.int_wettkaempfeid,
        COALESCE(w.var_nummer, '') AS var_nummer,
        COALESCE(w.var_name, '') AS var_name,
        w.yer_von,
        w.yer_bis,
        COALESCE(b.bol_maennlich, true) AS bol_maennlich,
        COALESCE(b.bol_weiblich, true) AS bol_weiblich
      FROM tfx_wettkaempfe w
      JOIN tfx_bereiche b ON b.int_bereicheid = w.int_bereicheid
      WHERE w.int_veranstaltungenid = $1${competitionFilter}
      ORDER BY w.int_wettkaempfeid ASC
    `, ...competitionParams);
    if (competitions.length === 0) {
        return [];
    }
    const competitionIds = competitions.map((row) => row.int_wettkaempfeid);
    const disciplineRows = await prisma_1.default.$queryRawUnsafe(`
      SELECT
        wxd.int_wettkaempfeid,
        d.int_disziplinenid,
        COALESCE(d.var_name, '') AS var_name,
        COALESCE(wxd.int_sortierung, 999) AS int_sortierung
      FROM tfx_wettkaempfe_x_disziplinen wxd
      JOIN tfx_disziplinen d ON d.int_disziplinenid = wxd.int_disziplinenid
      WHERE wxd.int_wettkaempfeid = ANY($1::int[])
      ORDER BY wxd.int_wettkaempfeid, COALESCE(wxd.int_sortierung, 999), d.int_disziplinenid
    `, competitionIds);
    const participantRows = await prisma_1.default.$queryRawUnsafe(`
      SELECT
        wr.int_wettkaempfeid,
        t.int_teilnehmerid,
        COALESCE(t.var_vorname, '') AS var_vorname,
        COALESCE(t.var_nachname, '') AS var_nachname,
        t.dat_geburtstag,
        t.int_geschlecht,
        v.int_vereineid,
        COALESCE(v.var_name, '') AS club_name,
        wr.int_startnummer
      FROM tfx_wertungen wr
      JOIN tfx_teilnehmer t ON t.int_teilnehmerid = wr.int_teilnehmerid
      LEFT JOIN tfx_vereine v ON v.int_vereineid = t.int_vereineid
      WHERE wr.int_wettkaempfeid = ANY($1::int[])
        AND COALESCE(wr.bol_startet_nicht, false) = false
      ORDER BY wr.int_wettkaempfeid, wr.int_startnummer NULLS LAST, t.var_nachname, t.var_vorname
    `, competitionIds);
    const scoreRows = await prisma_1.default.$queryRawUnsafe(`
      WITH latest_scores AS (
        SELECT
          wr.int_wettkaempfeid,
          wr.int_teilnehmerid,
          wd.int_disziplinenid,
          wd.rel_leistung,
          ROW_NUMBER() OVER (
            PARTITION BY wr.int_wettkaempfeid, wr.int_teilnehmerid, wd.int_disziplinenid
            ORDER BY COALESCE(wd.int_versuch, 0) DESC, wd.int_wertungen_detailsid DESC
          ) AS rn
        FROM tfx_wertungen_details wd
        JOIN tfx_wertungen wr ON wr.int_wertungenid = wd.int_wertungenid
        WHERE wr.int_wettkaempfeid = ANY($1::int[])
          AND COALESCE(wd.int_kp, 0) = 0
      )
      SELECT
        int_wettkaempfeid,
        int_teilnehmerid,
        int_disziplinenid,
        rel_leistung
      FROM latest_scores
      WHERE rn = 1
    `, competitionIds);
    const disciplinesByCompetition = new Map();
    disciplineRows.forEach((row) => {
        if (!disciplinesByCompetition.has(row.int_wettkaempfeid)) {
            disciplinesByCompetition.set(row.int_wettkaempfeid, []);
        }
        disciplinesByCompetition.get(row.int_wettkaempfeid).push(row);
    });
    const scoreByParticipantAndDiscipline = new Map();
    scoreRows.forEach((row) => {
        const mapKey = `${row.int_wettkaempfeid}:${row.int_teilnehmerid}:${row.int_disziplinenid}`;
        scoreByParticipantAndDiscipline.set(mapKey, row.rel_leistung ?? null);
    });
    const participantsByCompetition = new Map();
    participantRows.forEach((row) => {
        if (!participantsByCompetition.has(row.int_wettkaempfeid)) {
            participantsByCompetition.set(row.int_wettkaempfeid, []);
        }
        participantsByCompetition.get(row.int_wettkaempfeid).push(row);
    });
    return competitions.map((competition) => {
        const competitionDisciplines = disciplinesByCompetition.get(competition.int_wettkaempfeid) || [];
        const competitionParticipants = participantsByCompetition.get(competition.int_wettkaempfeid) || [];
        return {
            competitionId: competition.int_wettkaempfeid,
            competitionNumber: competition.var_nummer,
            competitionName: competition.var_name,
            genderMale: competition.bol_maennlich === true,
            genderFemale: competition.bol_weiblich === true,
            ageFrom: Number(competition.yer_von || 0),
            ageTo: competition.yer_bis !== null && competition.yer_bis !== undefined ? Number(competition.yer_bis) : null,
            participants: competitionParticipants.map((participant) => ({
                participantId: participant.int_teilnehmerid,
                firstName: participant.var_vorname,
                lastName: participant.var_nachname,
                birthDate: participant.dat_geburtstag,
                gender: participant.int_geschlecht,
                clubId: participant.int_vereineid,
                clubName: participant.club_name,
                startNumber: participant.int_startnummer,
                disciplines: competitionDisciplines.map((discipline, index) => {
                    const scoreKey = `${competition.int_wettkaempfeid}:${participant.int_teilnehmerid}:${discipline.int_disziplinenid}`;
                    return {
                        disciplineId: discipline.int_disziplinenid,
                        name: discipline.var_name,
                        position: index + 1,
                        score: scoreByParticipantAndDiscipline.get(scoreKey) ?? null
                    };
                })
            }))
        };
    });
}
// Export results as GymNet-compatible XML
router.get('/export-gymnet-xml', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.query.eventId, 10);
        const competitionIdParam = req.query.competitionId;
        const competitionId = competitionIdParam ? parseInt(competitionIdParam, 10) : null;
        if (Number.isNaN(eventId)) {
            return res.status(400).json({ error: 'Valid eventId is required' });
        }
        if (competitionIdParam && (competitionId === null || Number.isNaN(competitionId))) {
            return res.status(400).json({ error: 'Invalid competitionId' });
        }
        const exportPayload = await loadGymNetExportPayload(eventId, competitionId);
        if (exportPayload.length === 0) {
            return res.status(404).json({ error: 'No competitions found for export' });
        }
        const xml = (0, gymnetXmlExport_1.buildGymNetResultsXml)(exportPayload);
        const datePart = new Date().toISOString().split('T')[0];
        const fileName = `gymnet_results_event_${eventId}_${datePart}.xml`;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.status(200).send(xml);
    }
    catch (error) {
        console.error('Error exporting GymNet XML:', error);
        return res.status(500).json({ error: 'Failed to export GymNet XML' });
    }
});
router.post('/export-gymnet-xml-template', authBypass_1.authenticateToken, templateUpload.single('xmlFile'), async (req, res) => {
    try {
        const eventId = parseInt(req.body.eventId, 10);
        const competitionIdRaw = req.body.competitionId;
        const competitionId = competitionIdRaw ? parseInt(competitionIdRaw, 10) : null;
        if (Number.isNaN(eventId)) {
            return res.status(400).json({ error: 'Valid eventId is required' });
        }
        if (competitionIdRaw && (competitionId === null || Number.isNaN(competitionId))) {
            return res.status(400).json({ error: 'Invalid competitionId' });
        }
        if (!req.file?.buffer) {
            return res.status(400).json({ error: 'Template XML file is required' });
        }
        const exportPayload = await loadGymNetExportPayload(eventId, competitionId);
        if (exportPayload.length === 0) {
            return res.status(404).json({ error: 'No competitions found for export' });
        }
        const templateXml = req.file.buffer.toString('utf-8');
        const { xml, stats, report } = await (0, gymnetTemplateResultsExport_1.mergeGymNetTemplateWithResults)(templateXml, exportPayload);
        const originalName = req.file.originalname || `gymnet_event_${eventId}.xml`;
        const ext = path.extname(originalName) || '.xml';
        const baseName = path.basename(originalName, ext);
        const datePart = new Date().toISOString().split('T')[0];
        const fileName = `${baseName}_Results_${datePart}${ext}`;
        const exportDir = path.resolve(process.cwd(), 'exports', 'gymnet-results');
        fs.mkdirSync(exportDir, { recursive: true });
        const outputPath = path.join(exportDir, fileName);
        fs.writeFileSync(outputPath, xml, 'utf8');
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('X-GymNet-Match-Stats', JSON.stringify(stats));
        res.setHeader('X-GymNet-Match-Report-Encoded', encodeURIComponent(JSON.stringify(report)));
        return res.status(200).send(xml);
    }
    catch (error) {
        console.error('Error exporting GymNet XML from template:', error);
        return res.status(500).json({ error: 'Failed to export GymNet XML from template' });
    }
});
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
        // Count query for proper pagination
        const countQuery = `
      SELECT COUNT(*)::int as total
      FROM tfx_wertungen w
      ${whereClause}
    `;
        const countParams = params.slice(); // Copy params without limit/offset
        const countResult = await prisma_1.default.$queryRawUnsafe(countQuery, ...countParams);
        const total = countResult.length > 0 ? countResult[0].total : 0;
        const query = `
      SELECT 
        w.int_wertungenid,
        w.int_wettkaempfeid,
        w.int_teilnehmerid,
        w.int_mannschaftenid,
        w.int_statusid,
        w.int_runde,
        w.int_startnummer,
        w.var_riege,
        w.var_comment,
        wk.var_name as competition_name,
        t.var_vorname,
        t.var_nachname
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      ${whereClause}
      ORDER BY w.int_wertungenid DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const results = await prisma_1.default.$queryRawUnsafe(query, ...params);
        res.json({
            results: results,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });
    }
    catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ message: 'Failed to fetch results' });
    }
});
// Get result statistics
router.get('/statistics', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const stats = await prisma_1.default.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as total_results,
        COUNT(DISTINCT int_wettkaempfeid)::int as competitions_with_results,
        COUNT(DISTINCT int_teilnehmerid)::int as participants_with_results
      FROM tfx_wertungen
    `);
        res.json(Array.isArray(stats) && stats.length > 0 ? stats[0] : {
            total_results: 0,
            competitions_with_results: 0,
            participants_with_results: 0
        });
    }
    catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
// Get event rankings
router.get('/rankings', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const eventId = req.query.eventId;
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID is required' });
        }
        const rankings = await prisma_1.default.$queryRawUnsafe(`
      SELECT 
        w.int_wertungenid,
        w.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        w.int_startnummer,
        w.var_riege
      FROM tfx_wertungen w
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE w.int_wettkaempfeid = $1
      ORDER BY w.int_startnummer
    `, parseInt(eventId));
        res.json(rankings || []);
    }
    catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({ error: 'Failed to fetch rankings' });
    }
});
// Get a specific result by ID
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid result ID' });
        }
        const result = await prisma_1.default.$queryRawUnsafe(`
      SELECT 
        w.int_wertungenid,
        w.int_wettkaempfeid,
        w.int_teilnehmerid,
        w.int_mannschaftenid,
        w.int_statusid,
        w.int_runde,
        w.int_startnummer,
        w.var_riege,
        w.var_comment,
        wk.var_name as competition_name,
        t.var_vorname,
        t.var_nachname
      FROM tfx_wertungen w
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE w.int_wertungenid = $1
    `, id);
        if (!Array.isArray(result) || result.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }
        res.json(result[0]);
    }
    catch (error) {
        console.error('Error fetching result:', error);
        res.status(500).json({ error: 'Failed to fetch result' });
    }
});
// Create a new result
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = createResultSchema.parse(req.body);
        const result = await prisma_1.default.$queryRawUnsafe(`
      INSERT INTO tfx_wertungen (
        int_wettkaempfeid,
        int_teilnehmerid,
        int_statusid,
        var_comment
      ) VALUES ($1, $2, $3, $4)
      RETURNING int_wertungenid
    `, validatedData.competitionId, validatedData.participantId, 1, // Default status
        validatedData.notes || '');
        if (Array.isArray(result) && result.length > 0) {
            res.status(201).json({
                id: result[0].int_wertungenid,
                message: 'Result created successfully'
            });
        }
        else {
            res.status(500).json({ error: 'Failed to create result' });
        }
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues
            });
        }
        console.error('Error creating result:', error);
        res.status(500).json({ error: 'Failed to create result' });
    }
});
// Update a result
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid result ID' });
        }
        const validatedData = updateResultSchema.parse(req.body);
        // Check if result exists
        const existing = await prisma_1.default.$queryRawUnsafe(`
      SELECT int_wertungenid FROM tfx_wertungen WHERE int_wertungenid = $1
    `, id);
        if (!Array.isArray(existing) || existing.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }
        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (validatedData.competitionId !== undefined) {
            updates.push(`int_wettkaempfeid = $${paramIndex}`);
            params.push(validatedData.competitionId);
            paramIndex++;
        }
        if (validatedData.participantId !== undefined) {
            updates.push(`int_teilnehmerid = $${paramIndex}`);
            params.push(validatedData.participantId);
            paramIndex++;
        }
        if (validatedData.notes !== undefined) {
            updates.push(`var_comment = $${paramIndex}`);
            params.push(validatedData.notes);
            paramIndex++;
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        params.push(id);
        const updateQuery = `
      UPDATE tfx_wertungen 
      SET ${updates.join(', ')}
      WHERE int_wertungenid = $${paramIndex}
    `;
        await prisma_1.default.$queryRawUnsafe(updateQuery, ...params);
        res.json({ message: 'Result updated successfully' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues
            });
        }
        console.error('Error updating result:', error);
        res.status(500).json({ error: 'Failed to update result' });
    }
});
// Delete a result
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid result ID' });
        }
        // Check if result exists
        const existing = await prisma_1.default.$queryRawUnsafe(`
      SELECT int_wertungenid FROM tfx_wertungen WHERE int_wertungenid = $1
    `, id);
        if (!Array.isArray(existing) || existing.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }
        await prisma_1.default.$queryRawUnsafe(`
      DELETE FROM tfx_wertungen WHERE int_wertungenid = $1
    `, id);
        res.json({ message: 'Result deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ error: 'Failed to delete result' });
    }
});
exports.default = router;
//# sourceMappingURL=results.js.map