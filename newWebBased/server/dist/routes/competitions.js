"use strict";
/**
 * Competition Routes — CRUD for gymnastics competitions (Wettkaempfe).
 *
 * Routes:
 *   GET    /               - List competitions (optional eventId filter)
 *   GET    /:id            - Get single competition with details
 *   GET    /:id/disciplines - Disciplines for a competition
 *   POST   /               - Create competition with disciplines
 *   PUT    /:id            - Update competition
 *   DELETE /:id            - Delete competition
 *   GET    /filter/search  - Filter competitions by criteria
 *
 * Shared helpers extracted to utils/competitionHelpers.ts (SoC refactoring).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const configurationHelpers_1 = require("../utils/configurationHelpers");
const prisma_1 = __importDefault(require("../lib/prisma"));
const competitionHelpers_1 = require("../utils/competitionHelpers");
const router = (0, express_1.Router)();
// ============================================================================
// Validation Schemas
// ============================================================================
const createCompetitionSchema = zod_1.z.object({
    number: zod_1.z.string().max(5, 'Competition number cannot exceed 5 characters').optional(),
    name: zod_1.z.string().min(1, 'Competition name is required'),
    description: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    gender: zod_1.z.enum((0, configurationHelpers_1.getCompetitionGenderValues)()),
    areaId: zod_1.z.number().nullable().optional(),
    ageFrom: zod_1.z.number().min(1).max(99),
    ageTo: zod_1.z.number().min(1).max(99),
    disciplines: zod_1.z.array(zod_1.z.object({
        disciplineId: zod_1.z.number(),
        maxScore: zod_1.z.number().min(0)
    })).min(1, 'At least one discipline is required'),
    registrationDeadline: zod_1.z.string().nullable().optional(),
    organizer: zod_1.z.string().optional(),
    eventId: zod_1.z.number().optional(),
    // Additional competition settings
    round: zod_1.z.number().min(1).max(10).optional(),
    track: zod_1.z.number().min(1).max(20).optional(),
    competitionType: zod_1.z.number().min(0).max(2).optional(),
    startTime: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    warmupTime: zod_1.z.string().optional(),
    warmupDate: zod_1.z.string().optional(),
    qualifiers: zod_1.z.number().min(0).max(999).optional(),
    evaluations: zod_1.z.number().min(1).max(10).optional(),
    dropWorstScore: zod_1.z.boolean().optional(),
    showAgeGroup: zod_1.z.boolean().optional(),
    isOptionalCompetition: zod_1.z.boolean().optional(),
    showInfo: zod_1.z.boolean().optional(),
    useCompulsoryProgram: zod_1.z.boolean().optional(),
    sortAscending: zod_1.z.boolean().optional(),
    manualSort: zod_1.z.boolean().optional(),
    useApparatusPoints: zod_1.z.boolean().optional(),
    dropCount: zod_1.z.number().min(0).max(5).optional()
});
const updateCompetitionSchema = createCompetitionSchema.partial();
// ============================================================================
// Shared: Prisma include shape for competition queries
// ============================================================================
const competitionIncludes = {
    tfx_veranstaltungen: {
        include: { tfx_wettkampforte: true }
    },
    tfx_wettkaempfe_x_disziplinen: {
        include: { tfx_disziplinen: true }
    },
    tfx_wertungen: {
        where: { int_teilnehmerid: { not: null } }
    }
};
// ============================================================================
// GET / — List Competitions
// ============================================================================
router.get('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const { eventId, event_id } = req.query;
        const selectedEventId = eventId || event_id;
        console.log('Competition API called with eventId:', selectedEventId);
        // Pre-load all bereiche for safe lookup (avoids crash on orphaned FKs)
        const allBereiche = await prisma_1.default.tfx_bereiche.findMany();
        const bereicheMap = new Map(allBereiche.map(b => [b.int_bereicheid, b]));
        const competitions = await prisma_1.default.tfx_wettkaempfe.findMany({
            where: selectedEventId && selectedEventId !== 'undefined'
                ? { int_veranstaltungenid: parseInt(selectedEventId) }
                : undefined,
            include: competitionIncludes,
            orderBy: [{ int_wettkaempfeid: 'desc' }]
        });
        const transformedCompetitions = competitions.map((comp) => {
            const bereich = bereicheMap.get(comp.int_bereicheid) || null;
            return (0, competitionHelpers_1.transformCompetitionListItem)(comp, bereich);
        });
        // Debug: Log sample
        console.log('DEBUG: Sample competitions with participant counts:');
        transformedCompetitions.slice(0, 5).forEach((comp) => {
            const original = competitions.find((c) => c.int_wettkaempfeid === comp.id);
            console.log(`  - "${comp.name}" (ID: ${comp.id}, Event: ${original?.int_veranstaltungenid}): ${comp.participantCount} participants`);
        });
        console.log(`Returning ${transformedCompetitions.length} competitions${selectedEventId ? ` for event ${selectedEventId}` : ' (all events)'}`);
        res.json(transformedCompetitions);
    }
    catch (error) {
        console.error('Error fetching competitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ============================================================================
// GET /:id — Get Single Competition
// ============================================================================
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid competition ID' });
        }
        const competition = await prisma_1.default.tfx_wettkaempfe.findUnique({
            where: { int_wettkaempfeid: id },
            include: competitionIncludes
        });
        if (!competition) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        // Safe bereich lookup
        const bereich = await prisma_1.default.tfx_bereiche.findUnique({
            where: { int_bereicheid: competition.int_bereicheid }
        });
        res.json((0, competitionHelpers_1.transformCompetitionDetail)(competition, bereich));
    }
    catch (error) {
        console.error('Error fetching competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ============================================================================
// GET /:id/disciplines — Disciplines for a Competition
// ============================================================================
router.get('/:id/disciplines', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const competitionId = parseInt(req.params.id);
        if (isNaN(competitionId)) {
            return res.status(400).json({ error: 'Invalid competition ID' });
        }
        console.log(`Fetching disciplines for competition ${competitionId}`);
        const disciplines = await prisma_1.default.$queryRawUnsafe(`
      SELECT DISTINCT
        d.int_disziplinenid,
        d.var_name,
        d.var_kurz1,
        d.var_kurz2,
        d.bol_m,
        d.bol_w,
        d.var_icon,
        COALESCE(d.var_formel, f.var_formel) as var_formel,
        d.int_formelid,
        d.var_maske,
        d.var_einheit,
        d.int_berechnung,
        d.int_versuche,
        wd.rel_max
      FROM tfx_disziplinen d
      INNER JOIN tfx_wettkaempfe_x_disziplinen wd ON d.int_disziplinenid = wd.int_disziplinenid
      LEFT JOIN tfx_formeln f ON d.int_formelid = f.int_formelid
      WHERE wd.int_wettkaempfeid = $1
      ORDER BY d.var_name
    `, competitionId);
        const transformedDisciplines = disciplines.map((d) => ({
            int_disziplinenid: d.int_disziplinenid,
            int_disziplinid: d.int_disziplinenid, // Compatibility alias
            var_name: d.var_name,
            var_kurz1: d.var_kurz1,
            var_kurz2: d.var_kurz2,
            var_shortname: d.var_kurz2,
            bol_m: d.bol_m,
            bol_w: d.bol_w,
            var_icon: d.var_icon,
            var_formel: d.var_formel,
            int_formelid: d.int_formelid,
            var_maske: d.var_maske,
            var_eingabemaske: d.var_maske,
            var_einheit: d.var_einheit,
            int_berechnung: d.int_berechnung,
            int_versuche: d.int_versuche || 1,
            attempts: d.int_versuche || 1,
            maxScore: d.rel_max || 0
        }));
        console.log(`Found ${transformedDisciplines.length} disciplines for competition ${competitionId}`);
        res.json({ competitionId, disciplines: transformedDisciplines });
    }
    catch (error) {
        console.error('Error fetching competition disciplines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ============================================================================
// POST / — Create Competition
// ============================================================================
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        console.log('🏃 Competition POST request received:');
        console.log('   Headers:', req.headers['content-type']);
        console.log('   Body:', JSON.stringify(req.body, null, 2));
        const validatedData = createCompetitionSchema.parse(req.body);
        console.log('✅ Validation passed, data:', JSON.stringify(validatedData, null, 2));
        // Validate age range
        if (validatedData.ageFrom >= validatedData.ageTo) {
            return res.status(400).json({ error: 'Age "to" must be greater than age "from"' });
        }
        // Validate event exists
        const event = await prisma_1.default.$queryRawUnsafe(`SELECT int_veranstaltungenid FROM tfx_veranstaltungen WHERE int_veranstaltungenid = $1`, validatedData.eventId);
        if (event.length === 0) {
            return res.status(400).json({ error: 'Event does not exist' });
        }
        // Validate disciplines exist
        const disciplineIds = validatedData.disciplines.map(d => d.disciplineId);
        const disciplines = await prisma_1.default.$queryRawUnsafe(`
      SELECT int_disziplinenid as id, var_name as name, bol_m as male_allowed, bol_w as female_allowed
      FROM tfx_disziplinen WHERE int_disziplinenid = ANY($1)
    `, disciplineIds);
        if (disciplines.length !== disciplineIds.length) {
            return res.status(400).json({ error: 'One or more selected disciplines do not exist' });
        }
        // Validate gender compatibility
        if (validatedData.gender !== 'gemischt') {
            const mismatch = disciplines.some((d) => (validatedData.gender === 'männlich' && !d.male_allowed) ||
                (validatedData.gender === 'weiblich' && !d.female_allowed));
            if (mismatch) {
                return res.status(400).json({ error: 'Some selected disciplines are not available for the chosen gender category' });
            }
        }
        // Resolve bereich (shared helper)
        const bereich = await (0, competitionHelpers_1.resolveBereich)(prisma_1.default, {
            areaId: validatedData.areaId,
            gender: validatedData.gender
        });
        console.log(`📍 Using bereich: ${bereich.var_name} (ID: ${bereich.int_bereicheid})`);
        // Get event info for age→birth-year conversion
        const eventInfo = await prisma_1.default.tfx_veranstaltungen.findUnique({
            where: { int_veranstaltungenid: validatedData.eventId }
        });
        if (!eventInfo) {
            return res.status(400).json({ error: 'Event not found' });
        }
        const eventYear = (eventInfo.dat_von || new Date()).getFullYear();
        const birthYearFrom = (0, competitionHelpers_1.ageToBirthYear)(eventYear, validatedData.ageFrom);
        const birthYearTo = (0, competitionHelpers_1.ageToBirthYear)(eventYear, validatedData.ageTo);
        console.log(`🎂 DEBUG: Creating competition - Event year: ${eventYear}, Ages: ${validatedData.ageFrom}-${validatedData.ageTo} -> Birth years: ${birthYearFrom}-${birthYearTo}`);
        // Insert competition
        const insertedCompetition = await prisma_1.default.$queryRawUnsafe(`
      INSERT INTO tfx_wettkaempfe (
        int_veranstaltungenid, int_bereicheid, var_nummer, var_name,
        yer_von, yer_bis, int_typ, int_qualifikation, int_wertungen,
        bol_streichwertung, bol_ak_anzeigen, bol_wahlwettkampf,
        int_durchgang, int_bahn, bol_info_anzeigen, bol_kp,
        bol_sortasc, bol_mansort, bol_gerpkt, int_anz_streich,
        tim_startzeit, tim_einturnen
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING int_wettkaempfeid
    `, validatedData.eventId, bereich.int_bereicheid, validatedData.number || null, validatedData.name, birthYearFrom, birthYearTo, validatedData.competitionType ?? 0, validatedData.qualifiers || 0, validatedData.evaluations || 1, validatedData.dropWorstScore || false, validatedData.showAgeGroup || false, validatedData.isOptionalCompetition || false, validatedData.round || 1, validatedData.track || 1, validatedData.showInfo || false, validatedData.useCompulsoryProgram || false, validatedData.sortAscending || false, validatedData.manualSort || false, validatedData.useApparatusPoints || false, validatedData.dropCount || 0, (0, competitionHelpers_1.parseTimeInput)(validatedData.startTime, validatedData.startDate), (0, competitionHelpers_1.parseTimeInput)(validatedData.warmupTime, validatedData.warmupDate));
        const competitionId = insertedCompetition[0].int_wettkaempfeid;
        // Link disciplines
        for (let i = 0; i < validatedData.disciplines.length; i++) {
            const disc = validatedData.disciplines[i];
            await prisma_1.default.$queryRawUnsafe(`
        INSERT INTO tfx_wettkaempfe_x_disziplinen (
          int_wettkaempfeid, int_disziplinenid, int_sortierung, bol_kp, rel_max
        ) VALUES ($1, $2, $3, false, $4)
      `, competitionId, disc.disciplineId, i + 1, disc.maxScore || 0);
        }
        // Build response
        const createdCompetition = {
            id: competitionId,
            number: validatedData.number || null,
            name: validatedData.name,
            description: validatedData.description || `${validatedData.gender} - Age ${validatedData.ageFrom}-${validatedData.ageTo}`,
            location: validatedData.location,
            eventId: validatedData.eventId,
            gender: validatedData.gender,
            ageFrom: validatedData.ageFrom,
            ageTo: validatedData.ageTo,
            disciplines: validatedData.disciplines.map((d, i) => ({
                disciplineId: d.disciplineId,
                maxScore: d.maxScore || 0,
                sortOrder: i + 1
            })),
            registrationDeadline: validatedData.registrationDeadline,
            organizer: validatedData.organizer || 'TBD',
            round: validatedData.round || 1,
            track: validatedData.track || 1,
            startTime: validatedData.startTime || null,
            warmupTime: validatedData.warmupTime || null,
            qualifiers: validatedData.qualifiers || 0,
            evaluations: validatedData.evaluations || 1,
            dropWorstScore: validatedData.dropWorstScore || false,
            showAgeGroup: validatedData.showAgeGroup || false,
            isOptionalCompetition: validatedData.isOptionalCompetition || false,
            showInfo: validatedData.showInfo || false,
            useCompulsoryProgram: validatedData.useCompulsoryProgram || false,
            sortAscending: validatedData.sortAscending || false,
            manualSort: validatedData.manualSort || false,
            useApparatusPoints: validatedData.useApparatusPoints || false,
            dropCount: validatedData.dropCount || 0,
            status: 'active',
            participantCount: 0,
            createdAt: new Date().toISOString()
        };
        console.log(`✅ Created competition: ${validatedData.name} (ID: ${competitionId})`);
        res.status(201).json(createdCompetition);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.log('❌ Validation error:', JSON.stringify(error.issues, null, 2));
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        console.error('❌ Error creating competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ============================================================================
// PUT /:id — Update Competition
// ============================================================================
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        console.log(`🔧 PUT competition ${id} - Request body:`, JSON.stringify(req.body, null, 2));
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid competition ID' });
        }
        let validatedData;
        try {
            validatedData = updateCompetitionSchema.parse(req.body);
            console.log(`✅ PUT competition ${id} - Validated data:`, JSON.stringify(validatedData, null, 2));
        }
        catch (validationError) {
            console.error(`❌ Validation error for competition ${id}:`, validationError.issues || validationError.message);
            return res.status(400).json({ error: 'Validation error', details: validationError.issues || validationError.message });
        }
        // Validate age range
        if (validatedData.ageFrom && validatedData.ageTo && validatedData.ageFrom > validatedData.ageTo) {
            return res.status(400).json({ error: 'Age "from" must be less than or equal to age "to"' });
        }
        // Validate disciplines if provided
        if (validatedData.disciplines && validatedData.disciplines.length > 0) {
            const disciplines = await prisma_1.default.$queryRawUnsafe(`
        SELECT int_disziplinenid as id, var_name as name, bol_m as male_allowed, bol_w as female_allowed
        FROM tfx_disziplinen WHERE int_disziplinenid = ANY($1)
      `, validatedData.disciplines.map(d => d.disciplineId));
            if (disciplines.length !== validatedData.disciplines.length) {
                return res.status(400).json({ error: 'One or more selected disciplines do not exist' });
            }
            // Gender compatibility check
            if (validatedData.gender && validatedData.gender !== 'gemischt') {
                const mismatch = disciplines.some((d) => (validatedData.gender === 'männlich' && !d.male_allowed) ||
                    (validatedData.gender === 'weiblich' && !d.female_allowed));
                if (mismatch) {
                    return res.status(400).json({ error: 'Some selected disciplines are not available for the chosen gender category' });
                }
            }
        }
        // Get competition + event info
        const competitionInfo = await prisma_1.default.tfx_wettkaempfe.findUnique({
            where: { int_wettkaempfeid: id },
            include: { tfx_veranstaltungen: true }
        });
        if (!competitionInfo) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        const eventYear = (competitionInfo.tfx_veranstaltungen.dat_von || new Date()).getFullYear();
        // Build update data using shared helper
        const updateData = (0, competitionHelpers_1.buildUpdateData)(validatedData, eventYear);
        // Resolve bereich if areaId or gender changed
        if (validatedData.areaId !== undefined && validatedData.areaId !== null) {
            const bereich = await (0, competitionHelpers_1.resolveBereich)(prisma_1.default, { areaId: validatedData.areaId });
            updateData.int_bereicheid = bereich.int_bereicheid;
            console.log(`📍 Using selected bereich for update: ${bereich.var_name} (ID: ${bereich.int_bereicheid})`);
        }
        else if (validatedData.gender) {
            const bereich = await (0, competitionHelpers_1.resolveBereich)(prisma_1.default, { gender: validatedData.gender });
            updateData.int_bereicheid = bereich.int_bereicheid;
        }
        console.log('📝 DEBUG: updateData BEFORE Prisma update:', JSON.stringify(updateData, null, 2));
        const updatedCompetition = await prisma_1.default.tfx_wettkaempfe.update({
            where: { int_wettkaempfeid: id },
            data: updateData
        });
        console.log('🔍 AFTER UPDATE - tim_startzeit:', updatedCompetition.tim_startzeit);
        console.log('🔍 AFTER UPDATE - tim_einturnen:', updatedCompetition.tim_einturnen);
        // Update event-related fields
        if (validatedData.organizer !== undefined || validatedData.registrationDeadline !== undefined) {
            const eventUpdateData = {};
            if (validatedData.organizer !== undefined)
                eventUpdateData.var_veranstalter = validatedData.organizer;
            if (validatedData.registrationDeadline !== undefined) {
                eventUpdateData.dat_meldeschluss = validatedData.registrationDeadline ? new Date(validatedData.registrationDeadline) : null;
            }
            await prisma_1.default.tfx_veranstaltungen.update({
                where: { int_veranstaltungenid: updatedCompetition.int_veranstaltungenid },
                data: eventUpdateData
            });
            console.log('Updated event fields:', eventUpdateData);
        }
        // Update disciplines if provided
        if (validatedData.disciplines) {
            await prisma_1.default.tfx_wettkaempfe_x_disziplinen.deleteMany({
                where: { int_wettkaempfeid: id }
            });
            if (validatedData.disciplines.length > 0) {
                await prisma_1.default.tfx_wettkaempfe_x_disziplinen.createMany({
                    data: validatedData.disciplines.map(d => ({
                        int_wettkaempfeid: id,
                        int_disziplinenid: d.disciplineId,
                        rel_max: d.maxScore
                    }))
                });
            }
        }
        // Get actual participant count
        const participantCount = await prisma_1.default.tfx_wertungen.count({
            where: { int_wettkaempfeid: id, int_teilnehmerid: { not: null } }
        });
        // Build response using shared helper
        const result = (0, competitionHelpers_1.buildUpdateResponse)(id, validatedData, updatedCompetition, participantCount);
        console.log('Competition updated successfully:', result);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        if (error && typeof error === 'object' && 'code' in error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Competition not found' });
            }
        }
        console.error('Error updating competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ============================================================================
// DELETE /:id — Delete Competition
// ============================================================================
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid competition ID' });
        }
        const existing = await prisma_1.default.$queryRaw `
      SELECT int_wettkaempfeid FROM tfx_wettkaempfe WHERE int_wettkaempfeid = ${id}
    `;
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        // Delete discipline associations first (FK constraint)
        await prisma_1.default.tfx_wettkaempfe_x_disziplinen.deleteMany({
            where: { int_wettkaempfeid: id }
        });
        await prisma_1.default.$executeRaw `
      DELETE FROM tfx_wettkaempfe WHERE int_wettkaempfeid = ${id}
    `;
        res.json({ message: 'Competition deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ============================================================================
// GET /filter/search — Filter Competitions
// ============================================================================
router.get('/filter/search', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const { gender, ageFrom, ageTo } = req.query;
        const whereConditions = {};
        if (gender) {
            if (gender === 'männlich') {
                whereConditions.tfx_bereiche = { bol_maennlich: true, bol_weiblich: false };
            }
            else if (gender === 'weiblich') {
                whereConditions.tfx_bereiche = { bol_maennlich: false, bol_weiblich: true };
            }
        }
        if (ageFrom) {
            whereConditions.yer_von = { gte: parseInt(ageFrom) };
        }
        if (ageTo) {
            whereConditions.yer_bis = { lte: parseInt(ageTo) };
        }
        // Pre-load bereiche
        const allBereiche = await prisma_1.default.tfx_bereiche.findMany();
        const bereicheMap = new Map(allBereiche.map(b => [b.int_bereicheid, b]));
        const competitions = await prisma_1.default.tfx_wettkaempfe.findMany({
            where: whereConditions,
            include: competitionIncludes,
            orderBy: { int_wettkaempfeid: 'desc' }
        });
        const transformed = competitions.map((comp) => {
            const bereich = bereicheMap.get(comp.int_bereicheid) || null;
            return (0, competitionHelpers_1.transformCompetitionFilter)(comp, bereich);
        });
        res.json(transformed);
    }
    catch (error) {
        console.error('Error filtering competitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=competitions.js.map