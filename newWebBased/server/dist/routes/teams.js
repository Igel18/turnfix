"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// Validation schemas
const createTeamSchema = zod_1.z.object({
    clubId: zod_1.z.number().int().positive(),
    competitionId: zod_1.z.number().int().positive(),
    number: zod_1.z.number().int().positive().optional().default(1),
    riege: zod_1.z.string().nullable().optional(),
    startNumber: zod_1.z.number().int().positive().nullable().optional(),
});
const updateTeamSchema = createTeamSchema.partial();
// Get all teams
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const clubId = req.query.clubId;
        const eventId = req.query.eventId;
        console.log('📋 GET /api/teams - Query params:', { limit, offset, search, clubId, eventId });
        const whereConditions = {};
        if (search) {
            whereConditions.OR = [
                { tfx_vereine: { var_name: { contains: search, mode: 'insensitive' } } },
                { var_riege: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (clubId) {
            whereConditions.int_vereineid = parseInt(clubId);
        }
        // IMPORTANT: eventId filters by COMPETITION's event, not competition ID directly
        if (eventId) {
            whereConditions.tfx_wettkaempfe = {
                int_veranstaltungenid: parseInt(eventId)
            };
        }
        console.log('📋 WHERE conditions:', whereConditions);
        const [teams, totalCount] = await Promise.all([
            prisma_1.default.tfx_mannschaften.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                include: {
                    tfx_vereine: {
                        select: {
                            var_name: true,
                            var_website: true
                        }
                    },
                    tfx_wettkaempfe: {
                        select: {
                            var_name: true,
                            var_nummer: true,
                            yer_von: true,
                            yer_bis: true
                        }
                    }
                },
                orderBy: { int_mannschaftenid: 'asc' }
            }),
            prisma_1.default.tfx_mannschaften.count({ where: whereConditions })
        ]);
        console.log('📋 Found teams:', teams.length, 'Total count:', totalCount);
        // Map database fields to frontend-friendly names
        const mappedTeams = teams.map((team) => ({
            id: team.int_mannschaftenid,
            clubId: team.int_vereineid,
            competitionId: team.int_wettkaempfeid,
            number: team.int_nummer,
            riege: team.var_riege,
            startNumber: team.int_startnummer,
            clubName: team.tfx_vereine?.var_name,
            competitionName: team.tfx_wettkaempfe?.var_name,
            competitionNumber: team.tfx_wettkaempfe?.var_nummer
        }));
        res.json({
            teams: mappedTeams,
            pagination: {
                total: totalCount,
                limit,
                offset,
                pages: Math.ceil(totalCount / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get available participants for a team (with filters)
// IMPORTANT: This route MUST come BEFORE /:id to avoid route matching issues
router.get('/available-participants', async (req, res) => {
    try {
        const eventId = parseInt(req.query.eventId);
        const clubId = parseInt(req.query.clubId);
        const teamId = req.query.teamId ? parseInt(req.query.teamId) : undefined;
        const hidePlanned = req.query.hidePlanned === 'true';
        const hideOtherClubs = req.query.hideOtherClubs === 'true';
        console.log('🔍 GET /api/teams/available-participants - Params:', {
            eventId,
            clubId,
            teamId,
            hidePlanned,
            hideOtherClubs
        });
        if (isNaN(eventId) || isNaN(clubId)) {
            return res.status(400).json({
                error: 'Missing or invalid required parameters: eventId, clubId'
            });
        }
        // Build WHERE clause based on hideOtherClubs filter
        const whereClause = hideOtherClubs ? {
            int_vereineid: clubId // Only same club
        } : {}; // All clubs
        // Fetch participants with optional club filter
        // NOTE: tfx_teilnehmer has NO int_eventid field - get all participants, filter by event via scores
        const participants = await prisma_1.default.tfx_teilnehmer.findMany({
            where: whereClause,
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true
                    }
                }
            },
            orderBy: [
                { var_nachname: 'asc' },
                { var_vorname: 'asc' }
            ]
        });
        console.log(`📊 Found ${participants.length} participants (before hidePlanned filter)`);
        // If hidePlanned is active, find already assigned participants via tfx_wertungen → tfx_wettkaempfe join
        let assignedParticipantIds = new Set();
        if (hidePlanned) {
            // Match Groups pattern: join wertungen with wettkaempfe to filter by event
            const assignedScoresQuery = teamId
                ? `
          SELECT DISTINCT w.int_teilnehmerid
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
            AND w.int_teilnehmerid IS NOT NULL
            AND (w.int_mannschaftenid IS NULL OR w.int_mannschaftenid != $2)
        `
                : `
          SELECT DISTINCT w.int_teilnehmerid
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
            AND w.int_teilnehmerid IS NOT NULL
        `;
            const assignedScores = await prisma_1.default.$queryRawUnsafe(assignedScoresQuery, eventId, ...(teamId ? [teamId] : []));
            assignedParticipantIds = new Set(assignedScores.map((s) => s.int_teilnehmerid));
            console.log(`📊 Found ${assignedParticipantIds.size} already assigned participants`);
        }
        // Filter participants based on hidePlanned
        const filteredParticipants = participants.filter((p) => {
            if (hidePlanned && assignedParticipantIds.has(p.int_teilnehmerid)) {
                return false; // Hide if already planned
            }
            return true;
        });
        console.log(`📊 Returning ${filteredParticipants.length} participants after all filters`);
        // Transform to client format
        const transformed = filteredParticipants.map((p) => {
            const birthdate = p.dat_geburtstag;
            const age = birthdate ? new Date().getFullYear() - new Date(birthdate).getFullYear() : undefined;
            return {
                int_teilnehmerid: p.int_teilnehmerid,
                var_vorname: p.var_vorname,
                var_nachname: p.var_nachname,
                dat_geburtstag: birthdate,
                age,
                geschlecht_name: p.int_geschlecht === 1 ? 'male'
                    : p.int_geschlecht === 2 ? 'female'
                        : 'unknown',
                int_startnummer: p.int_startnummer,
                int_vereineid: p.int_vereineid,
                verein_name: p.tfx_vereine?.var_name
            };
        });
        res.json({ participants: transformed });
    }
    catch (error) {
        console.error('Error fetching available participants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get team by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        const team = await prisma_1.default.tfx_mannschaften.findUnique({
            where: { int_mannschaftenid: id },
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_website: true,
                        int_start_ort: true
                    }
                },
                tfx_wettkaempfe: {
                    select: {
                        var_name: true,
                        var_nummer: true,
                        yer_von: true,
                        yer_bis: true
                    }
                }
            }
        });
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.json(team);
    }
    catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new team
router.post('/', async (req, res) => {
    try {
        console.log('🏆 POST /api/teams - Creating team:', req.body);
        const validatedData = createTeamSchema.parse(req.body);
        console.log('✅ Validation passed:', validatedData);
        // Map frontend field names to database field names
        const dbData = {
            int_vereineid: validatedData.clubId,
            int_wettkaempfeid: validatedData.competitionId,
            int_nummer: validatedData.number,
            var_riege: validatedData.riege,
            int_startnummer: validatedData.startNumber,
        };
        const team = await prisma_1.default.tfx_mannschaften.create({
            data: dbData,
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_website: true
                    }
                },
                tfx_wettkaempfe: {
                    select: {
                        var_name: true,
                        var_nummer: true
                    }
                }
            }
        });
        console.log('✅ Team created successfully:', team.int_mannschaftenid);
        res.status(201).json(team);
    }
    catch (error) {
        console.error('❌ Error creating team:', error);
        if (error instanceof zod_1.z.ZodError) {
            console.error('❌ Validation error details:', error.issues);
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2003') {
            console.error('❌ Foreign key constraint failed');
            return res.status(400).json({ error: 'Invalid club or competition reference' });
        }
        console.error('❌ Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update team
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        console.log('🏆 PUT /api/teams/:id - Updating team:', id, req.body);
        const validatedData = updateTeamSchema.parse(req.body);
        console.log('✅ Validation passed:', validatedData);
        // Map frontend field names to database field names
        const dbData = {};
        if (validatedData.clubId !== undefined)
            dbData.int_vereineid = validatedData.clubId;
        if (validatedData.competitionId !== undefined)
            dbData.int_wettkaempfeid = validatedData.competitionId;
        if (validatedData.number !== undefined)
            dbData.int_nummer = validatedData.number;
        if (validatedData.riege !== undefined)
            dbData.var_riege = validatedData.riege;
        if (validatedData.startNumber !== undefined)
            dbData.int_startnummer = validatedData.startNumber;
        console.log('🗄️ Database data:', dbData);
        const team = await prisma_1.default.tfx_mannschaften.update({
            where: { int_mannschaftenid: id },
            data: dbData,
            include: {
                tfx_vereine: {
                    select: {
                        var_name: true,
                        var_website: true
                    }
                },
                tfx_wettkaempfe: {
                    select: {
                        var_name: true,
                        var_nummer: true
                    }
                }
            }
        });
        res.json(team);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Team not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Invalid club or competition reference' });
        }
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete team
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        await prisma_1.default.tfx_mannschaften.delete({
            where: { int_mannschaftenid: id }
        });
        res.status(204).send();
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'Team not found' });
        }
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete team with associated records' });
        }
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get team penalties
router.get('/:id/penalties', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        console.log('📋 GET /api/teams/:id/penalties - Team ID:', id);
        // For now, return empty array (penalties feature to be implemented)
        res.json([]);
    }
    catch (error) {
        console.error('Error fetching team penalties:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get team members
router.get('/:id/members', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        if (isNaN(teamId)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        console.log('👥 GET /api/teams/:id/members - Team ID:', teamId);
        const members = await prisma_1.default.tfx_man_x_teilnehmer.findMany({
            where: { int_mannschaftenid: teamId },
            include: {
                tfx_teilnehmer: {
                    include: {
                        tfx_vereine: {
                            select: {
                                var_name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                tfx_teilnehmer: {
                    var_nachname: 'asc'
                }
            }
        });
        console.log('👥 Found members:', members.length);
        // Transform members to include gender name
        const transformedMembers = members.map((member) => ({
            ...member,
            tfx_teilnehmer: {
                ...member.tfx_teilnehmer,
                geschlecht_name: member.tfx_teilnehmer.int_geschlecht === 1 ? 'male'
                    : member.tfx_teilnehmer.int_geschlecht === 2 ? 'female'
                        : 'unknown'
            }
        }));
        res.json({ members: transformedMembers });
    }
    catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add member to team
router.post('/:id/members', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        if (isNaN(teamId)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        const { participantId } = req.body;
        if (!participantId || isNaN(parseInt(participantId))) {
            return res.status(400).json({ error: 'Invalid participant ID' });
        }
        console.log('➕ POST /api/teams/:id/members - Team:', teamId, 'Participant:', participantId);
        // Check if already member
        const existing = await prisma_1.default.tfx_man_x_teilnehmer.findFirst({
            where: {
                int_mannschaftenid: teamId,
                int_teilnehmerid: parseInt(participantId)
            }
        });
        if (existing) {
            return res.status(400).json({ error: 'Participant already in team' });
        }
        // Add member
        const member = await prisma_1.default.tfx_man_x_teilnehmer.create({
            data: {
                int_mannschaftenid: teamId,
                int_teilnehmerid: parseInt(participantId)
            },
            include: {
                tfx_teilnehmer: {
                    include: {
                        tfx_vereine: {
                            select: {
                                var_name: true
                            }
                        }
                    }
                }
            }
        });
        console.log('✅ Member added successfully');
        res.status(201).json(member);
    }
    catch (error) {
        console.error('Error adding team member:', error);
        if (error?.code === 'P2003') {
            return res.status(400).json({ error: 'Invalid team or participant reference' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Remove member from team
router.delete('/:id/members/:participantId', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const participantId = parseInt(req.params.participantId);
        if (isNaN(teamId) || isNaN(participantId)) {
            return res.status(400).json({ error: 'Invalid team or participant ID' });
        }
        console.log('➖ DELETE /api/teams/:id/members/:participantId - Team:', teamId, 'Participant:', participantId);
        // Find the assignment
        const assignment = await prisma_1.default.tfx_man_x_teilnehmer.findFirst({
            where: {
                int_mannschaftenid: teamId,
                int_teilnehmerid: participantId
            }
        });
        if (!assignment) {
            return res.status(404).json({ error: 'Participant not in team' });
        }
        // Delete the assignment
        await prisma_1.default.tfx_man_x_teilnehmer.delete({
            where: {
                int_man_x_teilnehmerid: assignment.int_man_x_teilnehmerid
            }
        });
        console.log('✅ Member removed successfully');
        res.status(204).send();
    }
    catch (error) {
        console.error('Error removing team member:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=teams.js.map