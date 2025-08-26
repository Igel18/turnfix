"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createCompetitionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Competition name is required'),
    description: zod_1.z.string().optional(),
    date: zod_1.z.string().min(1, 'Competition date is required'),
    location: zod_1.z.string().min(1, 'Location is required'),
    gender: zod_1.z.enum(['männlich', 'weiblich', 'gemischt']),
    ageFrom: zod_1.z.number().min(5).max(99),
    ageTo: zod_1.z.number().min(5).max(99),
    disciplines: zod_1.z.array(zod_1.z.number()).min(1, 'At least one discipline is required'),
    maxParticipants: zod_1.z.number().optional(),
    registrationDeadline: zod_1.z.string().optional(),
    organizer: zod_1.z.string().optional()
});
const updateCompetitionSchema = createCompetitionSchema.partial();
// Get all competitions
router.get('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const { eventId, event_id } = req.query;
        const selectedEventId = eventId || event_id;
        console.log('Competition API called with eventId:', selectedEventId);
        // Build where clause for event filtering
        const whereClause = {};
        if (selectedEventId && selectedEventId !== 'undefined') {
            whereClause.tfx_veranstaltungen = {
                int_veranstaltungenid: parseInt(selectedEventId)
            };
            console.log('Filtering by event:', whereClause);
        }
        else {
            console.log('Returning all competitions (no event filter)');
        }
        // Fetch competitions from the real database
        const competitions = await prisma.tfx_wettkaempfe.findMany({
            where: whereClause,
            include: {
                tfx_veranstaltungen: {
                    include: {
                        tfx_wettkampforte: true
                    }
                },
                tfx_bereiche: true,
                tfx_wettkaempfe_x_disziplinen: {
                    include: {
                        tfx_disziplinen: true
                    }
                }
            },
            orderBy: {
                int_wettkaempfeid: 'desc'
            }
        });
        // Transform the data to match the expected format
        const transformedCompetitions = competitions.map(comp => ({
            id: comp.int_wettkaempfeid,
            name: comp.var_name || 'Unnamed Competition',
            description: `${comp.tfx_bereiche.var_name || ''} - Age ${comp.yer_von}${comp.yer_bis ? `-${comp.yer_bis}` : '+'}`,
            date: comp.tfx_veranstaltungen.dat_von?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            location: comp.tfx_veranstaltungen.tfx_wettkampforte?.var_name || 'TBD',
            gender: comp.tfx_bereiche.bol_maennlich && comp.tfx_bereiche.bol_weiblich ? 'gemischt' :
                comp.tfx_bereiche.bol_maennlich ? 'männlich' : 'weiblich',
            ageFrom: comp.yer_von,
            ageTo: comp.yer_bis || comp.yer_von,
            disciplines: comp.tfx_wettkaempfe_x_disziplinen.map(wd => wd.tfx_disziplinen.int_disziplinenid),
            maxParticipants: null, // Not available in legacy schema
            registrationDeadline: comp.tfx_veranstaltungen.dat_meldeschluss?.toISOString().split('T')[0] || null,
            organizer: comp.tfx_veranstaltungen.var_veranstalter || 'TBD',
            status: (() => {
                if (!comp.tfx_veranstaltungen.dat_von)
                    return 'completed';
                const compDate = new Date(comp.tfx_veranstaltungen.dat_von);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                // Set time to start of day for proper comparison
                today.setHours(0, 0, 0, 0);
                tomorrow.setHours(0, 0, 0, 0);
                compDate.setHours(0, 0, 0, 0);
                if (compDate.getTime() === today.getTime())
                    return 'active';
                if (compDate > today)
                    return 'upcoming';
                return 'completed';
            })(),
            participantCount: 0, // This would need a separate query to count participants
            createdAt: new Date().toISOString() // Not tracked in legacy schema
        }));
        if (selectedEventId && selectedEventId !== 'undefined') {
            console.log(`Returning ${transformedCompetitions.length} competitions for event ${selectedEventId}`);
        }
        else {
            console.log(`Returning ${transformedCompetitions.length} competitions (all events)`);
        }
        res.json(transformedCompetitions);
    }
    catch (error) {
        console.error('Error fetching competitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get competition by ID with detailed discipline information
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Mock detailed competition data - replace with actual database query
        const competition = {
            id: id,
            name: "Gerätvierkampf m 14-15",
            description: "Gymnastics apparatus competition for males aged 14-15",
            date: "2024-10-15",
            location: "Turnhalle München",
            gender: "männlich",
            ageFrom: 14,
            ageTo: 15,
            disciplines: [], // Will be populated below
            maxParticipants: 50,
            registrationDeadline: "2024-10-01",
            organizer: "TSV München",
            status: "upcoming",
            participantCount: 0,
            createdAt: "2024-08-19T10:00:00Z"
        };
        // Get discipline details for this competition
        const disciplineIds = [1, 2, 3, 4]; // This would come from the competition record
        if (disciplineIds.length > 0) {
            const disciplines = await prisma.$queryRawUnsafe(`
        SELECT 
          int_disziplinenid as id,
          var_name as name,
          var_kurz1 as short_name,
          var_einheit as apparatus,
          bol_m as male_allowed,
          bol_w as female_allowed,
          var_icon as icon
        FROM tfx_disziplinen
        WHERE int_disziplinenid = ANY($1)
        ORDER BY var_name
      `, disciplineIds);
            competition.disciplines = disciplines;
        }
        if (!competition) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        res.json(competition);
    }
    catch (error) {
        console.error('Error fetching competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get disciplines for a specific competition
router.get('/:id/disciplines', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const competitionId = parseInt(req.params.id);
        if (isNaN(competitionId)) {
            return res.status(400).json({ error: 'Invalid competition ID' });
        }
        console.log(`Fetching disciplines for competition ${competitionId}`);
        // Get disciplines associated with this competition
        const disciplines = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT
        d.int_disziplinenid,
        d.var_name,
        d.var_kurz1,
        d.var_kurz2,
        d.bol_m,
        d.bol_w,
        d.var_icon,
        d.var_formel,
        d.var_maske,
        d.int_versuche
      FROM tfx_disziplinen d
      INNER JOIN tfx_wettkaempfe_x_disziplinen wd ON d.int_disziplinenid = wd.int_disziplinenid
      WHERE wd.int_wettkaempfeid = $1
      ORDER BY d.var_name
    `, competitionId);
        const transformedDisciplines = disciplines.map((discipline) => ({
            int_disziplinenid: discipline.int_disziplinenid,
            var_name: discipline.var_name,
            var_kurz1: discipline.var_kurz1,
            var_kurz2: discipline.var_kurz2,
            var_shortname: discipline.var_kurz2, // For compatibility
            bol_m: discipline.bol_m,
            bol_w: discipline.bol_w,
            var_icon: discipline.var_icon,
            var_formel: discipline.var_formel,
            var_maske: discipline.var_maske,
            int_versuche: discipline.int_versuche || 1,
            attempts: discipline.int_versuche || 1 // For compatibility
        }));
        console.log(`Found ${transformedDisciplines.length} disciplines for competition ${competitionId}`);
        res.json({
            competitionId,
            disciplines: transformedDisciplines
        });
    }
    catch (error) {
        console.error('Error fetching competition disciplines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new competition
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = createCompetitionSchema.parse(req.body);
        // Validate age range
        if (validatedData.ageFrom >= validatedData.ageTo) {
            return res.status(400).json({
                error: 'Age "to" must be greater than age "from"'
            });
        }
        // Validate disciplines exist and match gender requirements
        const disciplines = await prisma.$queryRawUnsafe(`
      SELECT 
        int_disziplinenid as id,
        var_name as name,
        bol_m as male_allowed,
        bol_w as female_allowed
      FROM tfx_disziplinen
      WHERE int_disziplinenid = ANY($1)
    `, validatedData.disciplines);
        if (disciplines.length !== validatedData.disciplines.length) {
            return res.status(400).json({
                error: 'One or more selected disciplines do not exist'
            });
        }
        // Validate gender compatibility
        const genderMismatch = disciplines.some((discipline) => {
            if (validatedData.gender === 'männlich' && !discipline.male_allowed) {
                return true;
            }
            if (validatedData.gender === 'weiblich' && !discipline.female_allowed) {
                return true;
            }
            return false;
        });
        if (genderMismatch) {
            return res.status(400).json({
                error: 'Some selected disciplines are not available for the chosen gender category'
            });
        }
        // In a real application, this would insert into a competitions table
        // For now, we'll return a mock created competition
        const newCompetition = {
            id: Date.now(), // Mock ID generation
            ...validatedData,
            status: 'upcoming',
            participantCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        res.status(201).json(newCompetition);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.issues
            });
        }
        console.error('Error creating competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update competition
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const validatedData = updateCompetitionSchema.parse(req.body);
        // Validate age range if both provided
        if (validatedData.ageFrom && validatedData.ageTo &&
            validatedData.ageFrom >= validatedData.ageTo) {
            return res.status(400).json({
                error: 'Age "to" must be greater than age "from"'
            });
        }
        // Validate disciplines if provided
        if (validatedData.disciplines && validatedData.disciplines.length > 0) {
            const disciplines = await prisma.$queryRawUnsafe(`
        SELECT 
          int_disziplinenid as id,
          var_name as name,
          bol_m as male_allowed,
          bol_w as female_allowed
        FROM tfx_disziplinen
        WHERE int_disziplinenid = ANY($1)
      `, validatedData.disciplines);
            if (disciplines.length !== validatedData.disciplines.length) {
                return res.status(400).json({
                    error: 'One or more selected disciplines do not exist'
                });
            }
            // Validate gender compatibility if gender is being updated
            if (validatedData.gender) {
                const genderMismatch = disciplines.some((discipline) => {
                    if (validatedData.gender === 'männlich' && !discipline.male_allowed) {
                        return true;
                    }
                    if (validatedData.gender === 'weiblich' && !discipline.female_allowed) {
                        return true;
                    }
                    return false;
                });
                if (genderMismatch) {
                    return res.status(400).json({
                        error: 'Some selected disciplines are not available for the chosen gender category'
                    });
                }
            }
        }
        // In a real application, this would update the competitions table
        // For now, return a mock updated competition
        const updatedCompetition = {
            id: id,
            name: validatedData.name || "Updated Competition",
            description: validatedData.description || "Updated description",
            date: validatedData.date || "2024-10-15",
            location: validatedData.location || "Updated Location",
            gender: validatedData.gender || "männlich",
            ageFrom: validatedData.ageFrom || 14,
            ageTo: validatedData.ageTo || 15,
            disciplines: validatedData.disciplines || [1, 2, 3, 4],
            maxParticipants: validatedData.maxParticipants || 50,
            registrationDeadline: validatedData.registrationDeadline || "2024-10-01",
            organizer: validatedData.organizer || "Updated Organizer",
            status: "upcoming",
            participantCount: 0,
            updatedAt: new Date().toISOString()
        };
        res.json(updatedCompetition);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.issues
            });
        }
        console.error('Error updating competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete competition
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // In a real application, this would delete from the competitions table
        // For now, return success
        res.json({ message: 'Competition deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get competitions filtered by criteria
router.get('/filter/search', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const { gender, ageFrom, ageTo, discipline, status, location } = req.query;
        // This would filter from actual database in real application
        let competitions = [
            {
                id: 1,
                name: "Gerätvierkampf m 14-15",
                description: "Gymnastics apparatus competition for males aged 14-15",
                date: "2024-10-15",
                location: "Turnhalle München",
                gender: "männlich",
                ageFrom: 14,
                ageTo: 15,
                disciplines: [1, 2, 3, 4],
                status: "upcoming",
                participantCount: 0
            },
            {
                id: 2,
                name: "Leichtathletik w 16-18",
                description: "Track and field competition for females aged 16-18",
                date: "2024-11-20",
                location: "Stadion Berlin",
                gender: "weiblich",
                ageFrom: 16,
                ageTo: 18,
                disciplines: [5, 6, 7],
                status: "upcoming",
                participantCount: 0
            }
        ];
        // Apply filters
        if (gender) {
            competitions = competitions.filter(c => c.gender === gender);
        }
        if (ageFrom) {
            competitions = competitions.filter(c => c.ageFrom >= parseInt(ageFrom));
        }
        if (ageTo) {
            competitions = competitions.filter(c => c.ageTo <= parseInt(ageTo));
        }
        if (status) {
            competitions = competitions.filter(c => c.status === status);
        }
        if (location) {
            competitions = competitions.filter(c => c.location.toLowerCase().includes(location.toLowerCase()));
        }
        res.json(competitions);
    }
    catch (error) {
        console.error('Error filtering competitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=competitions.js.map