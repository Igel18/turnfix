import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const addParticipantToEventSchema = z.object({
  eventId: z.number().int().positive(),
  participantId: z.number().int().positive(),
});

const assignParticipantToCompetitionSchema = z.object({
  participantId: z.number().int().positive(),
  competitionId: z.number().int().positive(),
});

// Get all participants for an event
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    const competitionId = req.query.competitionId as string;
    const includeAvailable = req.query.includeAvailable === 'true';
    
    console.log(`Event Participants API: eventId=${eventId}, competitionId=${competitionId}, includeAvailable=${includeAvailable}`);
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Build query based on whether we're filtering by competition
    let eventParticipantsQuery = `
      SELECT DISTINCT
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.int_startpassnummer,
        v.var_name as verein_name,
        w.var_riege as squad_name,
        w.bol_startet_nicht,
        w.int_startnummer,
        w.int_wertungenid,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'male'
          WHEN t.int_geschlecht = 2 THEN 'female'
          ELSE 'other'
        END as gender,
        CASE 
          WHEN t.dat_geburtstag IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(t.dat_geburtstag))
          ELSE NULL
        END as age,
        CURRENT_DATE::TEXT as registration_date
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1`;
    
    let queryParams = [parseInt(eventId)];
    
    // Add competition filter if specified
    if (competitionId && competitionId !== 'undefined') {
      eventParticipantsQuery += ` AND wk.int_wettkaempfeid = $2`;
      queryParams.push(parseInt(competitionId));
    }
    
    eventParticipantsQuery += `
      GROUP BY t.int_teilnehmerid, t.var_vorname, t.var_nachname, t.int_vereineid, 
               t.int_geschlecht, t.dat_geburtstag, t.int_startpassnummer, v.var_name, w.var_riege, w.bol_startet_nicht, w.int_startnummer, w.int_wertungenid
      ORDER BY t.var_nachname ASC, t.var_vorname ASC
    `;

    const eventParticipants = await prisma.$queryRawUnsafe(eventParticipantsQuery, ...queryParams);

    // Get competition assignments for each participant
    const participantsWithAssignments = await Promise.all(
      (eventParticipants as any[]).map(async (participant) => {
        const assignedCompetitionsQuery = `
          SELECT DISTINCT wk.int_wettkaempfeid, wk.var_name
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE w.int_teilnehmerid = $1 AND wk.int_veranstaltungenid = $2
        `;
        
        const assignments = await prisma.$queryRawUnsafe(
          assignedCompetitionsQuery, 
          participant.int_teilnehmerid,
          parseInt(eventId)
        );
        
        return {
          id: Number(participant.int_teilnehmerid),
          firstname: participant.var_vorname,
          lastname: participant.var_nachname,
          club: participant.verein_name || 'Unknown Club',
          clubId: participant.int_vereineid ? Number(participant.int_vereineid) : 0,
          gender: participant.gender as 'male' | 'female',
          birthYear: participant.dat_geburtstag ? new Date(participant.dat_geburtstag).getFullYear() : null,
          age: participant.age ? Number(participant.age) : null,
          squad_name: participant.squad_name || null,
          startet_nicht: participant.bol_startet_nicht || false,
          startNumber: participant.int_startnummer ? Number(participant.int_startnummer) : null,
          wertungenId: participant.int_wertungenid ? Number(participant.int_wertungenid) : null,
          isInEvent: true,
          assignedCompetitions: (assignments as any[]).map(a => Number(a.int_wettkaempfeid)),
          registrationDate: participant.registration_date
        };
      })
    );

    let allParticipants = participantsWithAssignments;

    // If requested, also include available participants not in the event
    if (includeAvailable) {
      const availableParticipantsQuery = `
        SELECT DISTINCT
          t.int_teilnehmerid,
          t.var_vorname,
          t.var_nachname,
          t.int_vereineid,
          t.int_geschlecht,
          t.dat_geburtstag,
          t.int_startpassnummer,
          v.var_name as verein_name,
          CASE 
            WHEN t.int_geschlecht = 1 THEN 'male'
            WHEN t.int_geschlecht = 2 THEN 'female'
            ELSE 'other'
          END as gender,
          CASE 
            WHEN t.dat_geburtstag IS NOT NULL THEN 
              EXTRACT(YEAR FROM AGE(t.dat_geburtstag))
            ELSE NULL
          END as age
        FROM tfx_teilnehmer t
        LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
        WHERE t.int_teilnehmerid NOT IN (
          SELECT DISTINCT w.int_teilnehmerid
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
        )
        ORDER BY t.var_nachname ASC, t.var_vorname ASC
        LIMIT 100
      `;

      const availableParticipants = await prisma.$queryRawUnsafe(availableParticipantsQuery, parseInt(eventId));
      
      const availableFormatted = (availableParticipants as any[]).map(participant => ({
        id: Number(participant.int_teilnehmerid),
        firstname: participant.var_vorname,
        lastname: participant.var_nachname,
        club: participant.verein_name || 'Unknown Club',
        clubId: participant.int_vereineid ? Number(participant.int_vereineid) : 0,
        gender: participant.gender as 'male' | 'female',
        birthYear: participant.dat_geburtstag ? new Date(participant.dat_geburtstag).getFullYear() : null,
        age: participant.age ? Number(participant.age) : null,
        squad_name: null, // Available participants don't have squads assigned
        startet_nicht: false, // Available participants are not marked as not starting
        startNumber: null, // Available participants don't have start numbers yet
        wertungenId: null, // Available participants don't have wertungenId yet
        isInEvent: false,
        assignedCompetitions: [],
        registrationDate: undefined
      }));

      allParticipants = [...participantsWithAssignments, ...availableFormatted];
    }

    console.log(`Returning ${allParticipants.length} participants (${participantsWithAssignments.length} in event)`);

    res.json({
      participants: allParticipants,
      eventId: parseInt(eventId),
      totalInEvent: participantsWithAssignments.length
    });

  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ message: 'Failed to fetch event participants' });
  }
});

// Add participant to event (create basic score entry)
router.post('/add', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = addParticipantToEventSchema.parse(req.body);
    
    // Get the first competition for this event to create initial score entry
    const firstCompetition = await prisma.tfx_wettkaempfe.findFirst({
      where: { int_veranstaltungenid: validatedData.eventId },
      orderBy: { int_wettkaempfeid: 'asc' }
    });

    if (!firstCompetition) {
      return res.status(400).json({ message: 'No competitions found for this event' });
    }

    // Check if participant is already in the event
    const existingEntry = await prisma.tfx_wertungen.findFirst({
      where: {
        int_teilnehmerid: validatedData.participantId,
        int_wettkaempfeid: firstCompetition.int_wettkaempfeid
      }
    });

    if (existingEntry) {
      return res.status(400).json({ message: 'Participant is already registered for this event' });
    }

    // Generate unique start number for this event
    const maxStartNumber = await prisma.tfx_wertungen.findFirst({
      where: {
        tfx_wettkaempfe: {
          int_veranstaltungenid: validatedData.eventId
        },
        int_startnummer: {
          not: null
        }
      },
      orderBy: {
        int_startnummer: 'desc'
      },
      select: {
        int_startnummer: true
      }
    });

    const nextStartNumber = (maxStartNumber?.int_startnummer || 0) + 1;

    // Create initial score entry to register participant for the event
    const scoreEntry = await prisma.tfx_wertungen.create({
      data: {
        int_teilnehmerid: validatedData.participantId,
        int_wettkaempfeid: firstCompetition.int_wettkaempfeid,
        int_startnummer: nextStartNumber, // Assign unique start number
        var_riege: '', // Will be assigned later
        int_statusid: 1 // Default status
      }
    });

    console.log(`Added participant ${validatedData.participantId} to event ${validatedData.eventId} with start number ${nextStartNumber}`);

    res.status(201).json({
      message: 'Participant added to event successfully',
      scoreId: Number(scoreEntry.int_wertungenid),
      participantId: validatedData.participantId,
      eventId: validatedData.eventId,
      startNumber: nextStartNumber
    });

  } catch (error) {
    console.error('Error adding participant to event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to add participant to event' });
  }
});

// Remove participant from event (delete all score entries)
router.delete('/remove', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, participantId } = req.query;
    
    if (!eventId || !participantId) {
      return res.status(400).json({ message: 'Event ID and Participant ID are required' });
    }

    // Delete all score entries for this participant in this event
    const deleteResult = await prisma.tfx_wertungen.deleteMany({
      where: {
        int_teilnehmerid: parseInt(participantId as string),
        tfx_wettkaempfe: {
          int_veranstaltungenid: parseInt(eventId as string)
        }
      }
    });

    console.log(`Removed participant ${participantId} from event ${eventId}, deleted ${deleteResult.count} score entries`);

    res.json({
      message: 'Participant removed from event successfully',
      deletedEntries: deleteResult.count,
      participantId: parseInt(participantId as string),
      eventId: parseInt(eventId as string)
    });

  } catch (error) {
    console.error('Error removing participant from event:', error);
    res.status(500).json({ message: 'Failed to remove participant from event' });
  }
});

// Assign participant to specific competition
router.post('/assign', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = assignParticipantToCompetitionSchema.parse(req.body);
    
    // Check if assignment already exists
    const existingAssignment = await prisma.tfx_wertungen.findFirst({
      where: {
        int_teilnehmerid: validatedData.participantId,
        int_wettkaempfeid: validatedData.competitionId
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'Participant is already assigned to this competition' });
    }

    // Create score entry for the specific competition
    const scoreEntry = await prisma.tfx_wertungen.create({
      data: {
        int_teilnehmerid: validatedData.participantId,
        int_wettkaempfeid: validatedData.competitionId,
        int_startnummer: 0, // Will be assigned later
        var_riege: '', // Will be assigned later
        int_statusid: 1 // Default status
      }
    });

    console.log(`Assigned participant ${validatedData.participantId} to competition ${validatedData.competitionId}`);

    res.status(201).json({
      message: 'Participant assigned to competition successfully',
      scoreId: Number(scoreEntry.int_wertungenid),
      participantId: validatedData.participantId,
      competitionId: validatedData.competitionId
    });

  } catch (error) {
    console.error('Error assigning participant to competition:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to assign participant to competition' });
  }
});

// Unassign participant from specific competition
router.delete('/unassign', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { participantId, competitionId } = req.query;
    
    if (!participantId || !competitionId) {
      return res.status(400).json({ message: 'Participant ID and Competition ID are required' });
    }

    // Delete score entry for this specific competition
    const deleteResult = await prisma.tfx_wertungen.deleteMany({
      where: {
        int_teilnehmerid: parseInt(participantId as string),
        int_wettkaempfeid: parseInt(competitionId as string)
      }
    });

    if (deleteResult.count === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    console.log(`Unassigned participant ${participantId} from competition ${competitionId}`);

    res.json({
      message: 'Participant unassigned from competition successfully',
      participantId: parseInt(participantId as string),
      competitionId: parseInt(competitionId as string)
    });

  } catch (error) {
    console.error('Error unassigning participant from competition:', error);
    res.status(500).json({ message: 'Failed to unassign participant from competition' });
  }
});

// Get event details
router.get('/event/:eventId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const eventQuery = `
      SELECT 
        v.int_veranstaltungenid,
        v.var_name,
        v.dat_von,
        v.dat_bis,
        wf.var_ort,
        COUNT(DISTINCT t.int_teilnehmerid) as participant_count
      FROM tfx_veranstaltungen v
      LEFT JOIN tfx_wettkampforte wf ON v.int_wettkampforteid = wf.int_wettkampforteid
      LEFT JOIN tfx_wettkaempfe wk ON v.int_veranstaltungenid = wk.int_veranstaltungenid
      LEFT JOIN tfx_wertungen w ON wk.int_wettkaempfeid = w.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE v.int_veranstaltungenid = $1
      GROUP BY v.int_veranstaltungenid, v.var_name, v.dat_von, v.dat_bis, wf.var_ort
    `;

    const eventResult = await prisma.$queryRawUnsafe(eventQuery, eventId);
    
    if (!Array.isArray(eventResult) || eventResult.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventResult[0] as any;
    
    res.json({
      id: Number(event.int_veranstaltungenid),
      name: event.var_name,
      startDate: event.dat_von ? event.dat_von.toISOString().split('T')[0] : null,
      endDate: event.dat_bis ? event.dat_bis.toISOString().split('T')[0] : null,
      location: event.var_ort,
      participantCount: Number(event.participant_count)
    });

  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ message: 'Failed to fetch event details' });
  }
});

// Update participant status (bol_startet_nicht)
router.put('/update-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { participantId, eventId, startetNicht } = req.body;
    
    if (!participantId || !eventId || typeof startetNicht !== 'boolean') {
      return res.status(400).json({ message: 'Participant ID, Event ID, and startetNicht (boolean) are required' });
    }

    // Update all wertungen for this participant in this event
    const updateResult = await prisma.tfx_wertungen.updateMany({
      where: {
        int_teilnehmerid: participantId,
        tfx_wettkaempfe: {
          int_veranstaltungenid: eventId
        }
      },
      data: {
        bol_startet_nicht: startetNicht
      }
    });

    console.log(`Updated startet_nicht status for participant ${participantId} in event ${eventId} to ${startetNicht}. Updated ${updateResult.count} records.`);

    res.json({
      message: 'Participant status updated successfully',
      participantId: participantId,
      eventId: eventId,
      startetNicht: startetNicht,
      updatedRecords: updateResult.count
    });

  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({ message: 'Failed to update participant status' });
  }
});

// Update participant details (name, club, birthday, gender, squad, competitions)
router.put('/update-details', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { participantId, eventId, firstname, lastname, clubId, birthday, gender, squad_name, startet_nicht, assignedCompetitions } = req.body;

    if (!participantId || !eventId) {
      return res.status(400).json({ message: 'Participant ID and Event ID are required' });
    }

    // Update participant basic information in tfx_teilnehmer table
    if (firstname !== undefined || lastname !== undefined || birthday !== undefined || gender !== undefined || clubId !== undefined) {
      const updateData: any = {};
      
      if (firstname !== undefined) updateData.var_vorname = firstname;
      if (lastname !== undefined) updateData.var_nachname = lastname;
      if (birthday !== undefined) {
        updateData.dat_geburtstag = new Date(birthday);
      }
      if (gender !== undefined) {
        updateData.int_geschlecht = gender === 'male' ? 1 : gender === 'female' ? 2 : 0;
      }
      if (clubId !== undefined) {
        updateData.int_vereineid = clubId;
      }

      await prisma.tfx_teilnehmer.update({
        where: { int_teilnehmerid: participantId },
        data: updateData
      });
    }

    // Update squad and participation status in tfx_wertungen table
    if (squad_name !== undefined || startet_nicht !== undefined) {
      const updateData: any = {};
      
      if (squad_name !== undefined) updateData.var_riege = squad_name;
      if (startet_nicht !== undefined) updateData.bol_startet_nicht = startet_nicht;

      await prisma.tfx_wertungen.updateMany({
        where: {
          int_teilnehmerid: participantId,
          tfx_wettkaempfe: {
            int_veranstaltungenid: eventId
          }
        },
        data: updateData
      });
    }

    // Handle competition assignments if provided
    if (assignedCompetitions !== undefined && Array.isArray(assignedCompetitions)) {
      // Get all competitions for this event
      const eventCompetitions = await prisma.tfx_wettkaempfe.findMany({
        where: { int_veranstaltungenid: eventId }
      });

      // Get existing score entries for this participant in this event
      const existingEntries = await prisma.tfx_wertungen.findMany({
        where: {
          int_teilnehmerid: participantId,
          tfx_wettkaempfe: {
            int_veranstaltungenid: eventId
          }
        },
        include: {
          tfx_wettkaempfe: true
        }
      });

      const existingCompetitionIds = existingEntries.map(entry => entry.int_wettkaempfeid);

      // Add new competition assignments (create score entries)
      for (const competitionId of assignedCompetitions) {
        if (!existingCompetitionIds.includes(competitionId)) {
          await prisma.tfx_wertungen.create({
            data: {
              int_teilnehmerid: participantId,
              int_wettkaempfeid: competitionId,
              int_statusid: 1, // Assuming status 1 is active/participating
              var_riege: squad_name || '',
              bol_startet_nicht: startet_nicht || false
            }
          });
        }
      }

      // Remove competition assignments (delete score entries for unassigned competitions)
      const competitionsToRemove = existingCompetitionIds.filter(id => !assignedCompetitions.includes(id));
      if (competitionsToRemove.length > 0) {
        await prisma.tfx_wertungen.deleteMany({
          where: {
            int_teilnehmerid: participantId,
            int_wettkaempfeid: { in: competitionsToRemove }
          }
        });
      }
    }

    res.json({ 
      message: 'Participant details updated successfully',
      participantId: participantId,
      eventId: eventId
    });

  } catch (error) {
    console.error('Error updating participant details:', error);
    res.status(500).json({ message: 'Failed to update participant details' });
  }
});

export default router;
