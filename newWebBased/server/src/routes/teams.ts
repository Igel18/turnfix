import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import memberRouter from './teamMembers';

const router = Router();

// Mount team members sub-router
router.use('/', memberRouter);

// Validation schemas
const createTeamSchema = z.object({
  clubId: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  number: z.number().int().positive().optional().default(1),
  riege: z.string().nullable().optional(),
  startNumber: z.number().int().positive().nullable().optional(),
});

const updateTeamSchema = createTeamSchema.partial();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const clubId = req.query.clubId as string;
    const eventId = req.query.eventId as string;

    console.log('📋 GET /api/teams - Query params:', { limit, offset, search, clubId, eventId });

    const whereConditions: any = {};
    
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
      (prisma as any).tfx_mannschaften.findMany({
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
      (prisma as any).tfx_mannschaften.count({ where: whereConditions })
    ]);

    console.log('📋 Found teams:', teams.length, 'Total count:', totalCount);

    // Load member counts for all teams
    const teamIds = teams.map((t: any) => t.int_mannschaftenid);
    const memberCounts = await (prisma as any).tfx_man_x_teilnehmer.groupBy({
      by: ['int_mannschaftenid'],
      where: {
        int_mannschaftenid: { in: teamIds }
      },
      _count: {
        int_teilnehmerid: true
      }
    });

    // Create a map for quick lookup
    const memberCountMap = new Map(
      memberCounts.map((mc: any) => [mc.int_mannschaftenid, mc._count.int_teilnehmerid])
    );

    // Map database fields to frontend-friendly names
    const mappedTeams = teams.map((team: any) => {
      // Debug: Log if club or competition data is missing
      if (!team.tfx_vereine) {
        console.warn('⚠️ Team', team.int_mannschaftenid, 'has no club data (int_vereineid:', team.int_vereineid, ')');
      }
      if (!team.tfx_wettkaempfe) {
        console.warn('⚠️ Team', team.int_mannschaftenid, 'has no competition data (int_wettkaempfeid:', team.int_wettkaempfeid, ')');
      }

      return {
        id: team.int_mannschaftenid,
        clubId: team.int_vereineid,
        competitionId: team.int_wettkaempfeid,
        number: team.int_nummer,
        riege: team.var_riege,
        startNumber: team.int_startnummer,
        clubName: team.tfx_vereine?.var_name || 'Unbekannter Verein',
        competitionName: team.tfx_wettkaempfe?.var_name || 'Unbekannter Wettkampf',
        competitionNumber: team.tfx_wettkaempfe?.var_nummer,
        memberCount: memberCountMap.get(team.int_mannschaftenid) || 0
      };
    });

    res.json({
      teams: mappedTeams,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available participants for a team (with filters)
// IMPORTANT: This route MUST come BEFORE /:id to avoid route matching issues
router.get('/available-participants', async (req, res) => {
  try {
    const eventId = parseInt(req.query.eventId as string);
    const clubId = parseInt(req.query.clubId as string);
    const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : undefined;
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
    const whereClause: any = hideOtherClubs ? {
      int_vereineid: clubId  // Only same club
    } : {};  // All clubs

    // Fetch participants with optional club filter
    // NOTE: tfx_teilnehmer has NO int_eventid field - get all participants, filter by event via scores
    const participants = await (prisma as any).tfx_teilnehmer.findMany({
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
    let assignedParticipantIds = new Set<number>();
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

      const assignedScores = await prisma.$queryRawUnsafe<any[]>(
        assignedScoresQuery,
        eventId,
        ...(teamId ? [teamId] : [])
      );
      
      assignedParticipantIds = new Set(assignedScores.map((s: any) => s.int_teilnehmerid));
      console.log(`📊 Found ${assignedParticipantIds.size} already assigned participants`);
    }

    // Filter participants based on hidePlanned
    const filteredParticipants = participants.filter((p: any) => {
      if (hidePlanned && assignedParticipantIds.has(p.int_teilnehmerid)) {
        return false; // Hide if already planned
      }
      return true;
    });

    console.log(`📊 Returning ${filteredParticipants.length} participants after all filters`);

    // Transform to client format
    const transformed = filteredParticipants.map((p: any) => {
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
  } catch (error) {
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

    const team = await (prisma as any).tfx_mannschaften.findUnique({
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
  } catch (error) {
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
    
    const team = await (prisma as any).tfx_mannschaften.create({
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
  } catch (error) {
    console.error('❌ Error creating team:', error);
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error details:', error.issues);
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2003') {
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
    const dbData: any = {};
    if (validatedData.clubId !== undefined) dbData.int_vereineid = validatedData.clubId;
    if (validatedData.competitionId !== undefined) dbData.int_wettkaempfeid = validatedData.competitionId;
    if (validatedData.number !== undefined) dbData.int_nummer = validatedData.number;
    if (validatedData.riege !== undefined) dbData.var_riege = validatedData.riege;
    if (validatedData.startNumber !== undefined) dbData.int_startnummer = validatedData.startNumber;
    
    console.log('🗄️ Database data:', dbData);
    
    const team = await (prisma as any).tfx_mannschaften.update({
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Team not found' });
    }
    if ((error as any)?.code === 'P2003') {
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

    await (prisma as any).tfx_mannschaften.delete({
      where: { int_mannschaftenid: id }
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Team not found' });
    }
    if ((error as any)?.code === 'P2003') {
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
  } catch (error) {
    console.error('Error fetching team penalties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
