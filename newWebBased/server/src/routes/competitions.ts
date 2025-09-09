import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createCompetitionSchema = z.object({
  number: z.string().max(5, 'Competition number cannot exceed 5 characters').optional(), // Competition number (waNr)
  name: z.string().min(1, 'Competition name is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Competition date is required'),
  location: z.string().optional(), // Location is optional since it comes from event
  gender: z.enum(['männlich', 'weiblich', 'gemischt']),
  ageFrom: z.number().min(5).max(99),
  ageTo: z.number().min(5).max(99),
  disciplines: z.array(z.object({
    disciplineId: z.number(),
    maxScore: z.number().min(0)
  })).min(1, 'At least one discipline is required'),
  registrationDeadline: z.string().nullable().optional(),
  organizer: z.string().optional(),
  eventId: z.number().optional()
});

const updateCompetitionSchema = createCompetitionSchema.partial();

// Get all competitions
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, event_id } = req.query;
    const selectedEventId = eventId || event_id;
    
    console.log('Competition API called with eventId:', selectedEventId);
    
    // Build where clause for event filtering
    const whereClause: any = {};
    if (selectedEventId && selectedEventId !== 'undefined') {
      whereClause.tfx_veranstaltungen = {
        int_veranstaltungenid: parseInt(selectedEventId as string)
      };
      console.log('Filtering by event:', whereClause);
    } else {
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
        },
        tfx_wertungen: {
          where: {
            int_teilnehmerid: {
              not: null
            }
          }
        }
      },
      orderBy: [
        {
          tfx_wertungen: {
            _count: 'desc' // Competitions with more participants first
          }
        },
        {
          int_wettkaempfeid: 'desc' // Then by ID descending
        }
      ]
    });

    // Transform the data to match the expected format
    const transformedCompetitions = competitions.map(comp => {
      // yer_von and yer_bis contain direct age values, not birth years
      const ageFrom = comp.yer_von || 6;
      const ageTo = comp.yer_bis || (comp.yer_von || 18);
      
      return {
        id: comp.int_wettkaempfeid,
        number: comp.var_nummer || null, // Competition number (waNr)
        name: comp.var_name || 'Unnamed Competition', // Competition name (waBezeichnung)
        description: `${comp.tfx_bereiche.var_name || ''} - Age ${Math.min(ageFrom, ageTo)}-${Math.max(ageFrom, ageTo)}`,
        date: comp.tfx_veranstaltungen.dat_von?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        location: comp.tfx_veranstaltungen.tfx_wettkampforte?.var_name || 'TBD',
        gender: comp.tfx_bereiche.bol_maennlich && comp.tfx_bereiche.bol_weiblich ? 'gemischt' : 
                comp.tfx_bereiche.bol_maennlich ? 'männlich' : 'weiblich',
        ageFrom: Math.min(ageFrom, ageTo), // Ensure ageFrom is the smaller value
        ageTo: Math.max(ageFrom, ageTo),   // Ensure ageTo is the larger value
        disciplines: comp.tfx_wettkaempfe_x_disziplinen.map(wd => ({
          disciplineId: wd.tfx_disziplinen.int_disziplinenid,
          maxScore: wd.rel_max || 0
        })),
        registrationDeadline: comp.tfx_veranstaltungen.dat_meldeschluss?.toISOString().split('T')[0] || null,
        organizer: comp.tfx_veranstaltungen.var_veranstalter || 'TBD',
        status: (() => {
          if (!comp.tfx_veranstaltungen.dat_von) return 'completed';
          const compDate = new Date(comp.tfx_veranstaltungen.dat_von);
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          
          // Set time to start of day for proper comparison
          today.setHours(0, 0, 0, 0);
          tomorrow.setHours(0, 0, 0, 0);
          compDate.setHours(0, 0, 0, 0);
          
          if (compDate.getTime() === today.getTime()) return 'active';
          if (compDate > today) return 'upcoming';
          return 'completed';
        })(),
        participantCount: comp.tfx_wertungen.length, // Count actual participant registrations
        createdAt: new Date().toISOString() // Not tracked in legacy schema
      };
    });
    
    // Debug: Log some sample competitions with their participant counts
    console.log('DEBUG: Sample competitions with participant counts:');
    transformedCompetitions.slice(0, 5).forEach(comp => {
      const originalComp = competitions.find(c => c.int_wettkaempfeid === comp.id);
      console.log(`  - "${comp.name}" (ID: ${comp.id}, Event: ${originalComp?.int_veranstaltungenid}): ${comp.participantCount} participants`);
    });
    
    if (selectedEventId && selectedEventId !== 'undefined') {
      console.log(`Returning ${transformedCompetitions.length} competitions for event ${selectedEventId}`);
    } else {
      console.log(`Returning ${transformedCompetitions.length} competitions (all events)`);
    }
    
    res.json(transformedCompetitions);
  } catch (error) {
    console.error('Error fetching competitions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get competition by ID with detailed discipline information
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Validate ID parameter
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid competition ID' });
    }
    
    // Fetch actual competition data from database
    const competition = await prisma.tfx_wettkaempfe.findUnique({
      where: {
        int_wettkaempfeid: id
      },
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
        },
        tfx_wertungen: {
          where: {
            int_teilnehmerid: {
              not: null
            }
          }
        }
      }
    });

    if (!competition) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    // Calculate age range
    const ageFrom = competition.yer_von;
    const ageTo = competition.yer_bis || competition.yer_von;

    // Transform to expected format
    const transformedCompetition = {
      id: competition.int_wettkaempfeid,
      number: competition.var_nummer || null, // Competition number (waNr)
      name: competition.var_name || 'Unnamed Competition', // Competition name (waBezeichnung)
      description: `${competition.var_name} - ${competition.tfx_bereiche.var_name}`,
      date: competition.tfx_veranstaltungen.dat_von.toISOString().split('T')[0],
      location: competition.tfx_veranstaltungen.tfx_wettkampforte?.var_name || 'TBD',
      gender: competition.tfx_bereiche.bol_maennlich && competition.tfx_bereiche.bol_weiblich ? 'gemischt' : 
              competition.tfx_bereiche.bol_maennlich ? 'männlich' : 'weiblich',
      ageFrom: Math.min(ageFrom, ageTo),
      ageTo: Math.max(ageFrom, ageTo),
      disciplines: competition.tfx_wettkaempfe_x_disziplinen.map(wd => ({
        id: wd.tfx_disziplinen.int_disziplinenid,
        name: wd.tfx_disziplinen.var_name,
        short_name: wd.tfx_disziplinen.var_kurz1,
        apparatus: wd.tfx_disziplinen.var_einheit,
        male_allowed: wd.tfx_disziplinen.bol_m,
        female_allowed: wd.tfx_disziplinen.bol_w,
        icon: wd.tfx_disziplinen.var_icon,
        maxScore: wd.rel_max || 0
      })),
      maxParticipants: null, // Not tracked in legacy schema
      registrationDeadline: competition.tfx_veranstaltungen.dat_meldeschluss?.toISOString().split('T')[0] || null,
      organizer: competition.tfx_veranstaltungen.var_veranstalter || 'TBD',
      status: (() => {
        if (!competition.tfx_veranstaltungen.dat_von) return 'completed';
        const compDate = new Date(competition.tfx_veranstaltungen.dat_von);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        // Set time to start of day for proper comparison
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        compDate.setHours(0, 0, 0, 0);
        
        if (compDate.getTime() === today.getTime()) return 'active';
        if (compDate > today) return 'upcoming';
        return 'completed';
      })(),
      participantCount: competition.tfx_wertungen.length, // Count actual participant registrations
      createdAt: new Date().toISOString() // Not tracked in legacy schema
    };

    res.json(transformedCompetition);
  } catch (error) {
    console.error('Error fetching competition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get disciplines for a specific competition
router.get('/:id/disciplines', authenticateToken, async (req: AuthRequest, res) => {
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
    `, competitionId) as any[];

    const transformedDisciplines = disciplines.map((discipline: any) => ({
      int_disziplinenid: discipline.int_disziplinenid,
      int_disziplinid: discipline.int_disziplinenid, // Compatibility alias
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
    
  } catch (error) {
    console.error('Error fetching competition disciplines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new competition
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('🏃 Competition POST request received:');
    console.log('   Headers:', req.headers['content-type']);
    console.log('   Body:', JSON.stringify(req.body, null, 2));
    
    const validatedData = createCompetitionSchema.parse(req.body);
    console.log('✅ Validation passed, data:', JSON.stringify(validatedData, null, 2));
    
    // Validate age range
    if (validatedData.ageFrom >= validatedData.ageTo) {
      return res.status(400).json({ 
        error: 'Age "to" must be greater than age "from"' 
      });
    }
    
    // Validate event exists
    const event = await prisma.$queryRawUnsafe(`
      SELECT int_veranstaltungenid 
      FROM tfx_veranstaltungen 
      WHERE int_veranstaltungenid = $1
    `, validatedData.eventId) as any[];
    
    if (event.length === 0) {
      return res.status(400).json({ 
        error: 'Event does not exist' 
      });
    }
    
    // Validate disciplines exist and match gender requirements
    const disciplineIds = validatedData.disciplines.map(d => d.disciplineId);
    const disciplines = await prisma.$queryRawUnsafe(`
      SELECT 
        int_disziplinenid as id,
        var_name as name,
        bol_m as male_allowed,
        bol_w as female_allowed
      FROM tfx_disziplinen
      WHERE int_disziplinenid = ANY($1)
    `, disciplineIds) as any[];
    
    if (disciplines.length !== disciplineIds.length) {
      return res.status(400).json({ 
        error: 'One or more selected disciplines do not exist' 
      });
    }
    
    // Validate gender compatibility
    const genderMismatch = disciplines.some((discipline: any) => {
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
    
    // Find or create appropriate bereich (gender category)
    const bereichId = validatedData.gender === 'männlich' ? 1 : 2;
    
    // Insert new competition into database
    const insertedCompetition = await prisma.$queryRawUnsafe(`
      INSERT INTO tfx_wettkaempfe (
        int_veranstaltungenid,
        int_bereicheid,
        var_nummer,
        var_name,
        yer_von,
        yer_bis,
        int_typ,
        int_qualifikation,
        int_wertungen,
        bol_streichwertung,
        bol_ak_anzeigen,
        bol_wahlwettkampf,
        int_durchgang,
        int_bahn,
        bol_info_anzeigen,
        bol_kp,
        bol_sortasc,
        bol_mansort,
        bol_gerpkt,
        int_anz_streich
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 0, 0, 1, false, false, false, 1, 1, false, false, false, false, false, 0
      ) RETURNING int_wettkaempfeid
    `, 
      validatedData.eventId,
      bereichId,
      validatedData.number || null,
      validatedData.name,
      validatedData.ageFrom,
      validatedData.ageTo
    ) as any[];
    
    const competitionId = insertedCompetition[0].int_wettkaempfeid;
    
    // Link disciplines to the competition
    for (let i = 0; i < validatedData.disciplines.length; i++) {
      const discipline = validatedData.disciplines[i];
      await prisma.$queryRawUnsafe(`
        INSERT INTO tfx_wettkaempfe_x_disziplinen (
          int_wettkaempfeid,
          int_disziplinenid,
          int_sortierung,
          bol_kp,
          rel_max
        ) VALUES ($1, $2, $3, false, $4)
      `, competitionId, discipline.disciplineId, i + 1, discipline.maxScore || 0);
    }
    
    // Return the created competition with full details
    const createdCompetition = {
      id: competitionId,
      number: validatedData.number || null,
      name: validatedData.name,
      description: validatedData.description || `${validatedData.gender} - Age ${validatedData.ageFrom}-${validatedData.ageTo}`,
      date: validatedData.date,
      location: validatedData.location,
      eventId: validatedData.eventId,
      gender: validatedData.gender,
      ageFrom: validatedData.ageFrom,
      ageTo: validatedData.ageTo,
      disciplines: validatedData.disciplines.map((d, index) => ({
        disciplineId: d.disciplineId,
        maxScore: d.maxScore || 0,
        sortOrder: index + 1
      })),
      registrationDeadline: validatedData.registrationDeadline,
      organizer: validatedData.organizer || 'TBD',
      status: 'active',
      participantCount: 0,
      createdAt: new Date().toISOString()
    };
    
    console.log(`✅ Created competition: ${validatedData.name} (ID: ${competitionId})`);
    res.status(201).json(createdCompetition);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('❌ Validation error:', JSON.stringify(error.issues, null, 2));
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
    }
    
    console.error('❌ Error creating competition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update competition
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`🔧 PUT competition ${id} - Request body:`, JSON.stringify(req.body, null, 2));
    
    // Validate ID parameter
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid competition ID' });
    }
    
    const validatedData = updateCompetitionSchema.parse(req.body);
    console.log(`✅ PUT competition ${id} - Validated data:`, JSON.stringify(validatedData, null, 2));
    
    // Validate age range if both provided
    if (validatedData.ageFrom && validatedData.ageTo && 
        validatedData.ageFrom > validatedData.ageTo) {
      return res.status(400).json({ 
        error: 'Age "from" must be less than or equal to age "to"' 
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
      `, validatedData.disciplines.map(d => d.disciplineId)) as any[];
      
      if (disciplines.length !== validatedData.disciplines.length) {
        return res.status(400).json({ 
          error: 'One or more selected disciplines do not exist' 
        });
      }
      
      // Validate gender compatibility if gender is being updated
      if (validatedData.gender) {
        const genderMismatch = disciplines.some((discipline: any) => {
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
    
    // Actually update the competition in the database
    console.log('Updating competition:', id, 'with data:', validatedData);
    
    // Update the main competition record
    const updatedCompetition = await prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: id },
      data: {
        ...(validatedData.number !== undefined && { var_nummer: validatedData.number || null }),
        ...(validatedData.name && { var_name: validatedData.name }),
        // Store ages directly as they are (not birth years)
        ...(validatedData.ageFrom !== undefined && { yer_von: validatedData.ageFrom }),
        ...(validatedData.ageTo !== undefined && { yer_bis: validatedData.ageTo }),
      }
    });
    
    // Update event-related fields (organizer and registration deadline)
    if (validatedData.organizer !== undefined || validatedData.registrationDeadline !== undefined) {
      const eventUpdateData: any = {};
      
      if (validatedData.organizer !== undefined) {
        eventUpdateData.var_veranstalter = validatedData.organizer;
      }
      
      if (validatedData.registrationDeadline !== undefined) {
        eventUpdateData.dat_meldeschluss = validatedData.registrationDeadline ? new Date(validatedData.registrationDeadline) : null;
      }
      
      await prisma.tfx_veranstaltungen.update({
        where: { int_veranstaltungenid: updatedCompetition.int_veranstaltungenid },
        data: eventUpdateData
      });
      
      console.log('Updated event fields:', eventUpdateData);
    }
    
    // Update disciplines if provided
    if (validatedData.disciplines) {
      // First, delete existing discipline associations
      await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
        where: { int_wettkaempfeid: id }
      });
      
      // Then create new associations
      if (validatedData.disciplines.length > 0) {
        await prisma.tfx_wettkaempfe_x_disziplinen.createMany({
          data: validatedData.disciplines.map(discipline => ({
            int_wettkaempfeid: id,
            int_disziplinenid: discipline.disciplineId,
            rel_max: discipline.maxScore
          }))
        });
      }
    }
    
    // Get actual participant count
    const participantCount = await prisma.tfx_wertungen.count({
      where: {
        int_wettkaempfeid: id,
        int_teilnehmerid: {
          not: null
        }
      }
    });

    // Return the updated competition in the expected format
    const result = {
      id: id,
      number: validatedData.number !== undefined ? validatedData.number : updatedCompetition.var_nummer || null, // Include the updated number
      name: validatedData.name || updatedCompetition.var_name,
      description: validatedData.description || "Updated competition",
      date: validatedData.date || new Date().toISOString().split('T')[0],
      location: validatedData.location || "Updated location",
      gender: validatedData.gender || "gemischt",
      ageFrom: validatedData.ageFrom || 6,
      ageTo: validatedData.ageTo || 18,
      disciplines: validatedData.disciplines || [],
      registrationDeadline: validatedData.registrationDeadline || null,
      organizer: validatedData.organizer || "Updated organizer",
      status: "upcoming",
      participantCount: participantCount, // Use actual participant count
      updatedAt: new Date().toISOString()
    };
    
    console.log('Competition updated successfully:', result);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2025') {
        // Record to update not found
        return res.status(404).json({ error: 'Competition not found' });
      }
    }
    
    console.error('Error updating competition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete competition
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid competition ID' });
    }

    // First check if competition exists
    const existingCompetition = await prisma.$queryRaw<any[]>`
      SELECT int_wettkaempfeid FROM tfx_wettkaempfe 
      WHERE int_wettkaempfeid = ${id}
    `;

    if (existingCompetition.length === 0) {
      return res.status(404).json({ error: 'Competition not found' });
    }

    // Delete discipline associations first (foreign key constraint)
    await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
      where: { int_wettkaempfeid: id }
    });

    // Delete the competition
    await prisma.$executeRaw`
      DELETE FROM tfx_wettkaempfe 
      WHERE int_wettkaempfeid = ${id}
    `;
    
    res.json({ message: 'Competition deleted successfully' });
  } catch (error) {
    console.error('Error deleting competition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get competitions filtered by criteria
router.get('/filter/search', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { gender, ageFrom, ageTo, discipline, status, location } = req.query;
    
    // Build filter conditions
    const whereConditions: any = {};
    
    if (gender) {
      if (gender === 'männlich') {
        whereConditions.tfx_bereiche = {
          bol_maennlich: true,
          bol_weiblich: false
        };
      } else if (gender === 'weiblich') {
        whereConditions.tfx_bereiche = {
          bol_maennlich: false,
          bol_weiblich: true
        };
      }
      // 'gemischt' would be both true, so no filter needed
    }
    
    if (ageFrom) {
      whereConditions.yer_von = {
        gte: parseInt(ageFrom as string)
      };
    }
    
    if (ageTo) {
      whereConditions.yer_bis = {
        lte: parseInt(ageTo as string)
      };
    }

    // Fetch competitions from database with filters
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: whereConditions,
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
        },
        tfx_wertungen: {
          where: {
            int_teilnehmerid: {
              not: null
            }
          }
        }
      },
      orderBy: {
        int_wettkaempfeid: 'desc'
      }
    });

    // Transform to expected format
    const transformedCompetitions = competitions.map(comp => {
      const ageFrom = comp.yer_von;
      const ageTo = comp.yer_bis || comp.yer_von;
      
      return {
        id: comp.int_wettkaempfeid,
        name: comp.var_name || 'Unnamed Competition',
        description: `${comp.var_name} - ${comp.tfx_bereiche.var_name}`,
        date: comp.tfx_veranstaltungen.dat_von.toISOString().split('T')[0],
        location: comp.tfx_veranstaltungen.tfx_wettkampforte?.var_name || 'TBD',
        gender: comp.tfx_bereiche.bol_maennlich && comp.tfx_bereiche.bol_weiblich ? 'gemischt' : 
                comp.tfx_bereiche.bol_maennlich ? 'männlich' : 'weiblich',
        ageFrom: Math.min(ageFrom, ageTo),
        ageTo: Math.max(ageFrom, ageTo),
        disciplines: comp.tfx_wettkaempfe_x_disziplinen.map(wd => wd.tfx_disziplinen.int_disziplinenid),
        status: (() => {
          if (!comp.tfx_veranstaltungen.dat_von) return 'completed';
          const compDate = new Date(comp.tfx_veranstaltungen.dat_von);
          const today = new Date();
          
          today.setHours(0, 0, 0, 0);
          compDate.setHours(0, 0, 0, 0);
          
          if (compDate.getTime() === today.getTime()) return 'active';
          if (compDate > today) return 'upcoming';
          return 'completed';
        })(),
        participantCount: comp.tfx_wertungen.length
      };
    });

    res.json(transformedCompetitions);
  } catch (error) {
    console.error('Error filtering competitions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
