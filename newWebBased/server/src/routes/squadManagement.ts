import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// In-memory store for virtual squads (squads created but with no participants yet)
const virtualSquads: Map<string, { eventId: number, name: string, createdAt: Date }> = new Map();

// Validation schemas
const createSquadSchema = z.object({
  eventId: z.number().int().positive(),
  name: z.string().min(1).max(5, 'Squad name must be 5 characters or less (database constraint)'),
});

const assignParticipantToSquadSchema = z.object({
  participantId: z.number().int().positive(),
  squadName: z.string().min(1).max(5, 'Squad name must be 5 characters or less (database constraint)'),
  eventId: z.number().int().positive(),
});

const updateSquadSchema = z.object({
  eventId: z.number().int().positive(),
  oldSquadName: z.string().min(1),
  newSquadName: z.string().min(1).max(5, 'Squad name must be 5 characters or less (database constraint)'),
});

// Get all squads for an event with participants
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    
    console.log(`Squad Management API: eventId=${eventId}`);
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // DEBUG: First check what squads exist in database
    const debugSquadQuery = `
      SELECT DISTINCT w.var_riege, COUNT(*) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND w.var_riege IS NOT NULL AND w.var_riege != ''
      GROUP BY w.var_riege
    `;
    
    const debugResults = await prisma.$queryRawUnsafe(debugSquadQuery, parseInt(eventId));
    console.log(`🔍 DEBUG: Found ${(debugResults as any[]).length} squads in database:`, debugResults);

    // DEBUG: Check participant 237 specifically
    const debugParticipantQuery = `
      SELECT w.int_teilnehmerid, w.var_riege, wk.var_name 
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = 237 AND wk.int_veranstaltungenid = $1
      LIMIT 5
    `;
    
    const debugParticipant = await prisma.$queryRawUnsafe(debugParticipantQuery, parseInt(eventId));
    console.log(`🔍 DEBUG: Participant 237 in event ${eventId}:`, debugParticipant);

    // DEBUG: Get first few actual participants in this event
    const debugActualParticipants = `
      SELECT DISTINCT w.int_teilnehmerid, t.var_vorname, t.var_nachname, w.var_riege
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1
      LIMIT 5
    `;
    
    const actualParticipants = await prisma.$queryRawUnsafe(debugActualParticipants, parseInt(eventId));
    console.log(`🔍 DEBUG: First 5 actual participants in event ${eventId}:`, actualParticipants);

    // Get all squads (riegen) for this event with participant information
    const squadQuery = `
      SELECT 
        COALESCE(w.var_riege, 'Unassigned') as squad_name,
        COUNT(DISTINCT t.int_teilnehmerid) as participant_count,
        STRING_AGG(DISTINCT CONCAT(wk.int_wettkaempfeid, ':', wk.var_name, '|', COALESCE(wk.var_nummer, 'No Number')), ', ') as competition_names
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1 AND w.var_riege IS NOT NULL AND w.var_riege != ''
      GROUP BY w.var_riege
      ORDER BY w.var_riege
    `;

    const squadResults = await prisma.$queryRawUnsafe(squadQuery, parseInt(eventId));

    // Get detailed participants for each squad
    const squads = await Promise.all(
      (squadResults as any[]).map(async (squad) => {
        const participantQuery = `
          SELECT 
            t.int_teilnehmerid,
            t.var_vorname,
            t.var_nachname,
            t.int_vereineid,
            t.int_geschlecht,
            t.dat_geburtstag,
            t.int_startpassnummer,
            w.int_startnummer,
            v.var_name as verein_name,
            w.var_riege,
            CASE 
              WHEN t.int_geschlecht = 1 THEN 'male'
              WHEN t.int_geschlecht = 2 THEN 'female'
              ELSE 'other'
            END as gender,
            CASE 
              WHEN t.dat_geburtstag IS NOT NULL THEN 
                EXTRACT(YEAR FROM t.dat_geburtstag)
              ELSE NULL
            END as birth_year,
            STRING_AGG(DISTINCT CONCAT(wk.int_wettkaempfeid, ':', wk.var_name, '|', COALESCE(wk.var_nummer, 'No Number')), ', ') as assigned_competitions
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
          LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
          WHERE wk.int_veranstaltungenid = $1 AND w.var_riege = $2
          GROUP BY t.int_teilnehmerid, t.var_vorname, t.var_nachname, t.int_vereineid, 
                   t.int_geschlecht, t.dat_geburtstag, t.int_startpassnummer, 
                   w.int_startnummer, v.var_name, w.var_riege
          ORDER BY w.int_startnummer ASC, t.var_nachname ASC, t.var_vorname ASC
        `;

        const participants = await prisma.$queryRawUnsafe(
          participantQuery, 
          parseInt(eventId),
          squad.squad_name
        );

        return {
          id: squad.squad_name, // Use squad name as ID since it's unique per event
          name: squad.squad_name,
          eventId: parseInt(eventId),
          participantCount: Number(squad.participant_count),
          competitions: squad.competition_names ? squad.competition_names.split(', ') : [],
          participants: (participants as any[]).map(p => ({
            id: Number(p.int_teilnehmerid),
            firstname: p.var_vorname,
            lastname: p.var_nachname,
            club: p.verein_name || 'Unknown Club',
            clubId: p.int_vereineid ? Number(p.int_vereineid) : 0,
            gender: p.gender,
            birthYear: p.birth_year ? Number(p.birth_year) : null,
            startNumber: p.int_startnummer ? Number(p.int_startnummer) : null,
            squadId: squad.squad_name,
            squadName: squad.squad_name,
            // Transform competition strings to objects with id, name, number
            competitions: p.assigned_competitions 
              ? p.assigned_competitions.split(', ').map((comp: string) => {
                  if (comp.includes(':') && comp.includes('|')) {
                    const [idPart, nameAndNumber] = comp.split(':');
                    const [name, number] = nameAndNumber.split('|');
                    return {
                      id: parseInt(idPart),
                      name: name,
                      number: number === 'No Number' ? '' : number
                    };
                  }
                  return { id: 0, name: comp, number: '' };
                })
              : []
          }))
        };
      })
    );

    // Add virtual squads for this event (created but with no participants)
    const virtualSquadsForEvent = Array.from(virtualSquads.values())
      .filter(vs => vs.eventId === parseInt(eventId))
      .filter(vs => !squads.some(s => s.name === vs.name)) // Don't add if already exists with participants
      .map(vs => ({
        id: vs.name,
        name: vs.name,
        eventId: vs.eventId,
        participantCount: 0,
        competitions: [],
        participants: [],
        isVirtual: true,
        createdAt: vs.createdAt,
        hints: {
          storage: 'Stored in memory only',
          status: 'Virtual squad - assign participants to save to database',
          warning: 'Will be lost on server restart if no participants assigned'
        }
      }));

    const allSquads = [...squads, ...virtualSquadsForEvent];

    console.log(`Returning ${allSquads.length} squads for event ${eventId} (${squads.length} with participants, ${virtualSquadsForEvent.length} virtual)`);

    res.json({
      squads: allSquads,
      eventId: parseInt(eventId),
      totalSquads: allSquads.length,
      databaseSquads: squads.length,
      virtualSquads: virtualSquadsForEvent.length,
      hints: {
        virtual: 'Virtual squads are temporarily stored in memory',
        database: 'Database squads are permanently stored and have participants',
        action: 'Assign participants to virtual squads to save them permanently'
      }
    });

  } catch (error) {
    console.error('Error fetching squads:', error);
    res.status(500).json({ message: 'Failed to fetch squads' });
  }
});

// Get available participants (not assigned to any squad for this event)
router.get('/available-participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    const includeAvailable = req.query.includeAvailable === 'true';
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    console.log(`Squad Management API: eventId=${eventId}, includeAvailable=${includeAvailable}`);

    // Get participants based on includeAvailable parameter
    let availableParticipantsQuery: string;
    let queryParams: any[];
    
    if (includeAvailable) {
      // Get all participants from the system for potential squad assignment
      availableParticipantsQuery = `
        SELECT 
          t.int_teilnehmerid,
          t.var_vorname,
          t.var_nachname,
          t.int_vereineid,
          t.int_geschlecht,
          t.dat_geburtstag,
          t.int_startpassnummer,
          v.var_name as verein_name,
          '' as competitions,
          0 as competition_count,
          CASE 
            WHEN t.int_geschlecht = 1 THEN 'male'
            WHEN t.int_geschlecht = 2 THEN 'female'
            ELSE 'other'
          END as gender,
          CASE 
            WHEN t.dat_geburtstag IS NOT NULL THEN 
              EXTRACT(YEAR FROM t.dat_geburtstag)
            ELSE NULL
          END as birth_year
        FROM tfx_teilnehmer t
        LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
        ORDER BY t.var_nachname ASC, t.var_vorname ASC
      `;
      queryParams = [];
    } else {
      // Get participants registered for the event but not assigned to any squad
      availableParticipantsQuery = `
        SELECT 
          t.int_teilnehmerid,
          t.var_vorname,
          t.var_nachname,
          t.int_vereineid,
          t.int_geschlecht,
          t.dat_geburtstag,
          t.int_startpassnummer,
          v.var_name as verein_name,
          STRING_AGG(DISTINCT CONCAT(wk.int_wettkaempfeid, ':', wk.var_name, '|', COALESCE(wk.var_nummer, 'No Number')), ', ') as competitions,
          COUNT(DISTINCT wk.int_wettkaempfeid) as competition_count,
          CASE 
            WHEN t.int_geschlecht = 1 THEN 'male'
            WHEN t.int_geschlecht = 2 THEN 'female'
            ELSE 'other'
          END as gender,
          CASE 
            WHEN t.dat_geburtstag IS NOT NULL THEN 
              EXTRACT(YEAR FROM t.dat_geburtstag)
            ELSE NULL
          END as birth_year
        FROM tfx_wertungen w
        INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
        INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
        LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
        WHERE wk.int_veranstaltungenid = $1 
          AND (w.var_riege IS NULL OR w.var_riege = '' OR w.var_riege = 'Unassigned')
        GROUP BY t.int_teilnehmerid, t.var_vorname, t.var_nachname, t.int_vereineid, 
                 t.int_geschlecht, t.dat_geburtstag, t.int_startpassnummer, v.var_name
        ORDER BY t.var_nachname ASC, t.var_vorname ASC
      `;
      queryParams = [parseInt(eventId)];
    }

    const availableParticipants = await prisma.$queryRawUnsafe(availableParticipantsQuery, ...queryParams);

    const formattedParticipants = (availableParticipants as any[]).map(participant => {
      // Parse competition data with numbers
      const competitions = participant.competitions ? 
        participant.competitions.split(', ').map((comp: string) => {
          const [idAndName, number] = comp.split('|');
          const [id, name] = idAndName.split(':');
          return { 
            id: Number(id), 
            name: name || '', 
            number: number || 'No Number'
          };
        }) : [];

      return {
        id: Number(participant.int_teilnehmerid),
        firstname: participant.var_vorname,
        lastname: participant.var_nachname,
        club: participant.verein_name || 'Unknown Club',
        clubId: participant.int_vereineid ? Number(participant.int_vereineid) : 0,
        gender: participant.gender,
        birthYear: participant.birth_year ? Number(participant.birth_year) : null,
        squadId: undefined,
        squadName: undefined,
        competitions: competitions,
        competitionCount: Number(participant.competition_count) || 0,
        competitionNames: competitions.map((c: { id: number, name: string }) => c.name).join(', ')
      };
    });

    console.log(`Returning ${formattedParticipants.length} available participants for event ${eventId}`);

    res.json({
      participants: formattedParticipants,
      eventId: parseInt(eventId),
      totalAvailable: formattedParticipants.length
    });

  } catch (error) {
    console.error('Error fetching available participants:', error);
    res.status(500).json({ message: 'Failed to fetch available participants' });
  }
});

// Create a new squad
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createSquadSchema.parse(req.body);
    
    // Check if squad name already exists for this event (in database or virtual store)
    const existingSquad = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND w.var_riege = $2
    `, validatedData.eventId, validatedData.name);

    if ((existingSquad as any[])[0].count > 0) {
      return res.status(400).json({ message: 'Squad name already exists for this event' });
    }

    // Check if squad already exists in virtual store
    const virtualKey = `${validatedData.eventId}-${validatedData.name}`;
    if (virtualSquads.has(virtualKey)) {
      return res.status(400).json({ message: 'Squad name already exists for this event' });
    }

    // Add to virtual squads store
    virtualSquads.set(virtualKey, {
      eventId: validatedData.eventId,
      name: validatedData.name,
      createdAt: new Date()
    });

    console.log(`Created virtual squad "${validatedData.name}" for event ${validatedData.eventId}"`);

    res.status(201).json({
      message: 'Squad created successfully. You can now assign participants to it.',
      squad: {
        id: validatedData.name,
        name: validatedData.name,
        eventId: validatedData.eventId,
        participantCount: 0,
        competitions: [],
        participants: [],
        isVirtual: true
      },
      notice: 'Squad created as virtual squad. It will be stored in database when first participant is assigned.',
      hints: {
        storage: 'Currently stored in memory only',
        nextStep: 'Assign participants to save squad permanently to database',
        deletion: 'Virtual squad will be automatically removed if no participants are assigned'
      }
    });

  } catch (error) {
    console.error('Error creating squad:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to create squad' });
  }
});

// Assign participant to squad
router.post('/assign', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = assignParticipantToSquadSchema.parse(req.body);
    
    console.log(`🚀 Attempting to assign participant ${validatedData.participantId} to squad "${validatedData.squadName}" for event ${validatedData.eventId}`);
    
    // Check if participant exists in this event first
    const participantCheck = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = $1 AND wk.int_veranstaltungenid = $2
    `, validatedData.participantId, validatedData.eventId);
    
    const participantExists = (participantCheck as any[])[0].count > 0;
    console.log(`🔍 Participant ${validatedData.participantId} exists in event ${validatedData.eventId}: ${participantExists}`);
    
    if (!participantExists) {
      return res.status(400).json({ 
        message: `Participant ${validatedData.participantId} is not registered for event ${validatedData.eventId}`,
        hint: 'Make sure the participant is properly registered for this event before assigning to a squad'
      });
    }
    
    // Update all wertungen entries for this participant in this event to the new squad
    const updateResult = await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET var_riege = $3
      WHERE int_teilnehmerid = $1 
        AND int_wettkaempfeid IN (
          SELECT int_wettkaempfeid 
          FROM tfx_wettkaempfe 
          WHERE int_veranstaltungenid = $2
        )
    `, validatedData.participantId, validatedData.eventId, validatedData.squadName);

    console.log(`📝 Update result:`, updateResult);

    // Verify the assignment worked
    const verifyQuery = await prisma.$queryRawUnsafe(`
      SELECT w.var_riege, COUNT(*) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = $1 AND wk.int_veranstaltungenid = $2
      GROUP BY w.var_riege
    `, validatedData.participantId, validatedData.eventId);
    
    console.log(`✅ Verification: Participant ${validatedData.participantId} squad assignments:`, verifyQuery);

    // Remove from virtual squads store since it now has participants
    const virtualKey = `${validatedData.eventId}-${validatedData.squadName}`;
    const wasVirtual = virtualSquads.has(virtualKey);
    if (wasVirtual) {
      virtualSquads.delete(virtualKey);
      console.log(`🗄️ Moved squad "${validatedData.squadName}" from virtual storage to database (first participant assigned)`);
    }

    console.log(`Assigned participant ${validatedData.participantId} to squad "${validatedData.squadName}" for event ${validatedData.eventId}`);

    res.json({
      message: 'Participant assigned to squad successfully',
      participantId: validatedData.participantId,
      squadName: validatedData.squadName,
      eventId: validatedData.eventId,
      notice: wasVirtual ? 'Squad has been moved from virtual storage to database' : 'Participant assigned to existing squad',
      hints: wasVirtual ? {
        storage: 'Squad is now permanently stored in database',
        status: 'Squad moved from memory to database storage',
        reason: 'First participant assignment triggered database storage'
      } : {
        storage: 'Squad already existed in database',
        status: 'Participant added to existing squad'
      }
    });

  } catch (error) {
    console.error('Error assigning participant to squad:', error);
    
    // Handle specific database constraint violations
    if (error instanceof Error) {
      // Check for PostgreSQL string length constraint violation
      if (error.message.includes('22001') || error.message.includes('Wert zu lang für Typ character varying(5)')) {
        try {
          const validatedData = assignParticipantToSquadSchema.parse(req.body);
          return res.status(400).json({ 
            message: 'Squad name is too long. Maximum 5 characters allowed.',
            hint: 'The database constraint limits squad names to 5 characters or less.',
            constraint: 'varchar(5)',
            providedName: validatedData.squadName,
            nameLength: validatedData.squadName.length
          });
        } catch (parseError) {
          return res.status(400).json({ 
            message: 'Squad name is too long. Maximum 5 characters allowed.',
            hint: 'The database constraint limits squad names to 5 characters or less.',
            constraint: 'varchar(5)'
          });
        }
      }
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to assign participant to squad' });
  }
});

// Remove participant from squad (set to unassigned)
router.delete('/unassign', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { participantId, eventId } = req.query;
    
    if (!participantId || !eventId) {
      return res.status(400).json({ message: 'Participant ID and Event ID are required' });
    }

    // Update all wertungen entries for this participant in this event to unassigned
    const updateResult = await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET var_riege = NULL
      WHERE int_teilnehmerid = $1 
        AND int_wettkaempfeid IN (
          SELECT int_wettkaempfeid 
          FROM tfx_wettkaempfe 
          WHERE int_veranstaltungenid = $2
        )
    `, parseInt(participantId as string), parseInt(eventId as string));

    console.log(`Unassigned participant ${participantId} from squad for event ${eventId}`);

    res.json({
      message: 'Participant unassigned from squad successfully',
      participantId: parseInt(participantId as string),
      eventId: parseInt(eventId as string)
    });

  } catch (error) {
    console.error('Error unassigning participant from squad:', error);
    res.status(500).json({ message: 'Failed to unassign participant from squad' });
  }
});

// Update squad name
router.put('/update', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = updateSquadSchema.parse(req.body);
    
    // Check if new squad name already exists for this event
    const existingSquad = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND w.var_riege = $2
    `, validatedData.eventId, validatedData.newSquadName);

    if ((existingSquad as any[])[0].count > 0 && validatedData.oldSquadName !== validatedData.newSquadName) {
      return res.status(400).json({ message: 'New squad name already exists for this event' });
    }

    // Update all wertungen entries with the old squad name to the new squad name
    const updateResult = await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET var_riege = $3
      WHERE var_riege = $1 
        AND int_wettkaempfeid IN (
          SELECT int_wettkaempfeid 
          FROM tfx_wettkaempfe 
          WHERE int_veranstaltungenid = $2
        )
    `, validatedData.oldSquadName, validatedData.eventId, validatedData.newSquadName);

    console.log(`Updated squad name from "${validatedData.oldSquadName}" to "${validatedData.newSquadName}" for event ${validatedData.eventId}`);

    res.json({
      message: 'Squad name updated successfully',
      oldSquadName: validatedData.oldSquadName,
      newSquadName: validatedData.newSquadName,
      eventId: validatedData.eventId
    });

  } catch (error) {
    console.error('Error updating squad name:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to update squad name' });
  }
});

// Delete squad (unassign all participants)
router.delete('/delete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { squadName, eventId } = req.query;
    
    if (!squadName || !eventId) {
      return res.status(400).json({ message: 'Squad name and Event ID are required' });
    }

    // Get participant count before deletion
    const participantCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT int_teilnehmerid) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND w.var_riege = $2
    `, parseInt(eventId as string), squadName);

    // Update all wertungen entries for this squad to unassigned (NULL)
    const updateResult = await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET var_riege = NULL
      WHERE var_riege = $1 
        AND int_wettkaempfeid IN (
          SELECT int_wettkaempfeid 
          FROM tfx_wettkaempfe 
          WHERE int_veranstaltungenid = $2
        )
    `, squadName, parseInt(eventId as string));

    console.log(`Deleted squad "${squadName}" for event ${eventId}, unassigned ${(participantCount as any[])[0].count} participants`);

    res.json({
      message: 'Squad deleted successfully',
      squadName: squadName,
      eventId: parseInt(eventId as string),
      unassignedParticipants: Number((participantCount as any[])[0].count)
    });

  } catch (error) {
    console.error('Error deleting squad:', error);
    res.status(500).json({ message: 'Failed to delete squad' });
  }
});

// Mark squad as completed for a specific device/discipline
router.post('/complete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, squadName, disciplineId, status } = req.body;
    
    console.log(`Squad Complete API: eventId=${eventId}, squadName=${squadName}, disciplineId=${disciplineId}, status=${status}`);
    
    if (!eventId || !squadName || !disciplineId || !status) {
      return res.status(400).json({ message: 'All fields are required: eventId, squadName, disciplineId, status' });
    }

    // Update the squad status for this discipline
    // Since we don't have a specific squad completion table, we'll log this for now
    // In a full implementation, you might want to create a squad_status table
    console.log(`Squad "${squadName}" marked as "${status}" for discipline ${disciplineId} in event ${eventId}`);
    
    // For now, we'll just return success
    // In a real implementation, you might update a database table tracking squad completion status
    res.json({
      message: 'Squad marked as completed',
      eventId: eventId,
      squadName: squadName,
      disciplineId: disciplineId,
      status: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marking squad as complete:', error);
    res.status(500).json({ message: 'Failed to mark squad as complete' });
  }
});

export default router;
