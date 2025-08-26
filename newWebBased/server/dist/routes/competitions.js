"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
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
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        // Since we don't have a dedicated competitions table yet, we'll use a JSON-based approach
        // In a real application, this would query a proper competitions table
        // For now, return mock data structure - this should be replaced with actual database queries
        const competitions = [
            {
                id: 1,
                name: "Gerätvierkampf m 14-15",
                description: "Gymnastics apparatus competition for males aged 14-15",
                date: "2024-10-15",
                location: "Turnhalle München",
                gender: "männlich",
                ageFrom: 14,
                ageTo: 15,
                disciplines: [1, 2, 3, 4], // These would be discipline IDs
                maxParticipants: 50,
                registrationDeadline: "2024-10-01",
                organizer: "TSV München",
                status: "upcoming",
                participantCount: 0,
                createdAt: "2024-08-19T10:00:00Z"
            }
        ];
        res.json(competitions);
    }
    catch (error) {
        console.error('Error fetching competitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get competition by ID with detailed discipline information
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
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
// Create new competition
router.post('/', auth_1.authenticateToken, async (req, res) => {
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
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
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
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
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
router.get('/filter/search', auth_1.authenticateToken, async (req, res) => {
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