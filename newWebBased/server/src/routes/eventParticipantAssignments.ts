import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';
import { mapStringGenderToDatabase } from '../utils/genderHelpers';
import { getNextStartNumber, getNextStartNumberForCompetition } from '../utils/startNumberUtils';

const router = Router();

// Validation schemas
const addParticipantToEventSchema = z.object({
  eventId: z.number().int().positive(),
  participantId: z.number().int().positive(),
  competitionId: z.number().int().positive().optional(), // Point 77: optional competition selection
});

const assignParticipantToCompetitionSchema = z.object({
  participantId: z.number().int().positive(),
  competitionId: z.number().int().positive(),
});

const parsePositiveInteger = (value: unknown): number | null => {
  const parsed = parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

// Add participant to event (create basic score entry)
router.post('/add', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = addParticipantToEventSchema.parse(req.body);
    
    // Determine which competition to assign the participant to (Point 77)
    let targetCompetition;

    if (validatedData.competitionId) {
      // Verify the specified competition belongs to this event
      targetCompetition = await prisma.tfx_wettkaempfe.findFirst({
        where: {
          int_wettkaempfeid: validatedData.competitionId,
          int_veranstaltungenid: validatedData.eventId
        }
      });

      if (!targetCompetition) {
        return res.status(400).json({
          message: 'Competition does not belong to this event',
          competitionId: validatedData.competitionId,
          eventId: validatedData.eventId
        });
      }
    } else {
      // Fallback: use the first competition for this event
      targetCompetition = await prisma.tfx_wettkaempfe.findFirst({
        where: { int_veranstaltungenid: validatedData.eventId },
        orderBy: { int_wettkaempfeid: 'asc' }
      });
    }

    if (!targetCompetition) {
      return res.status(400).json({ message: 'No competitions found for this event' });
    }

    // Check if participant is already in the event (across ALL competitions)
    const existingEntry = await prisma.tfx_wertungen.findFirst({
      where: {
        int_teilnehmerid: validatedData.participantId,
        tfx_wettkaempfe: {
          int_veranstaltungenid: validatedData.eventId
        }
      }
    });

    if (existingEntry) {
      return res.status(400).json({ message: 'Participant is already registered for this event' });
    }

    // Generate unique start number for this event (using shared utility)
    const nextStartNumber = await getNextStartNumber(validatedData.eventId);

    // Create initial score entry to register participant for the event
    const scoreEntry = await prisma.tfx_wertungen.create({
      data: {
        int_teilnehmerid: validatedData.participantId,
        int_wettkaempfeid: targetCompetition.int_wettkaempfeid,
        int_startnummer: nextStartNumber, // Assign unique start number
        var_riege: '', // Will be assigned later
        int_statusid: 1 // Default status
      }
    });

    console.log(`Added participant ${validatedData.participantId} to event ${validatedData.eventId} competition ${targetCompetition.int_wettkaempfeid} with start number ${nextStartNumber}`);

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

    const parsedEventId = parsePositiveInteger(eventId);
    const parsedParticipantId = parsePositiveInteger(participantId);

    if (!parsedEventId || !parsedParticipantId) {
      return res.status(400).json({ message: 'Event ID and Participant ID must be valid positive numbers' });
    }

    // Delete all score entries for this participant in this event
    const deleteResult = await prisma.tfx_wertungen.deleteMany({
      where: {
        int_teilnehmerid: parsedParticipantId,
        tfx_wettkaempfe: {
          int_veranstaltungenid: parsedEventId
        }
      }
    });

    console.log(`Removed participant ${participantId} from event ${eventId}, deleted ${deleteResult.count} score entries`);

    res.json({
      message: 'Participant removed from event successfully',
      deletedEntries: deleteResult.count,
      participantId: parsedParticipantId,
      eventId: parsedEventId
    });

  } catch (error) {
    console.error('Error removing participant from event:', error);
    res.status(500).json({ message: 'Failed to remove participant from event' });
  }
});

// Remove participant from event (compatibility endpoint used by client)
router.delete('/:participantId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const participantId = parsePositiveInteger(req.params.participantId);
    const eventId = parsePositiveInteger(req.query.eventId);

    if (!participantId || !eventId) {
      return res.status(400).json({ message: 'Valid participantId (path) and eventId (query) are required' });
    }

    const deleteResult = await prisma.tfx_wertungen.deleteMany({
      where: {
        int_teilnehmerid: participantId,
        tfx_wettkaempfe: {
          int_veranstaltungenid: eventId
        }
      }
    });

    if (deleteResult.count === 0) {
      return res.status(404).json({
        message: 'No event assignments found for this participant',
        participantId,
        eventId
      });
    }

    return res.json({
      message: 'Participant removed from event successfully',
      deletedEntries: deleteResult.count,
      participantId,
      eventId
    });
  } catch (error) {
    console.error('Error removing participant from event (compatibility endpoint):', error);
    return res.status(500).json({ message: 'Failed to remove participant from event' });
  }
});

// Assign participant to specific competition
router.post('/assign', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = assignParticipantToCompetitionSchema.parse(req.body);
    
    // Check if assignment already exists for this exact competition
    const existingAssignment = await prisma.tfx_wertungen.findFirst({
      where: {
        int_teilnehmerid: validatedData.participantId,
        int_wettkaempfeid: validatedData.competitionId
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'Participant is already assigned to this competition' });
    }

    // Enforce 1:1 rule: participant can only be in ONE competition per event
    const competitionEvent = await prisma.tfx_wettkaempfe.findUnique({
      where: { int_wettkaempfeid: validatedData.competitionId },
      select: { int_veranstaltungenid: true }
    });

    if (competitionEvent) {
      const existingEventAssignment = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: validatedData.participantId,
          tfx_wettkaempfe: {
            int_veranstaltungenid: competitionEvent.int_veranstaltungenid
          }
        }
      });

      if (existingEventAssignment) {
        return res.status(409).json({
          message: 'Participant is already assigned to another competition in this event. A participant can only be in one competition per event.',
          currentCompetitionId: existingEventAssignment.int_wettkaempfeid
        });
      }
    }

    // Generate unique start number for this event
    const nextStartNumber = await getNextStartNumberForCompetition(validatedData.competitionId);

    // Create score entry for the specific competition
    const scoreEntry = await prisma.tfx_wertungen.create({
      data: {
        int_teilnehmerid: validatedData.participantId,
        int_wettkaempfeid: validatedData.competitionId,
        int_startnummer: nextStartNumber, // Auto-assigned unique start number
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
      // Only update gender if explicitly provided with a valid value (not null, not empty string)
      if (gender !== undefined && gender !== null && gender !== '') {
        const mappedGender = mapStringGenderToDatabase(gender);
        // Only update if the mapped value is valid (not default 0 from invalid input)
        // This prevents accidental resets when invalid values are passed
        if (mappedGender !== 0 || gender === 'unknown' || gender === 'unbekannt' || gender === '0') {
          updateData.int_geschlecht = mappedGender;
        }
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

      // Determine start number for new entries:
      // Reuse the participant's existing start number in this event, or generate a new one
      const existingStartNumber = existingEntries
        .map(e => e.int_startnummer)
        .find(n => n !== null && n > 0) || null;

      // Add new competition assignments (create score entries)
      for (const competitionId of assignedCompetitions) {
        if (!existingCompetitionIds.includes(competitionId)) {
          // Use existing start number or generate a new one (Point 68)
          const startNumber = existingStartNumber ?? await getNextStartNumber(eventId);

          await prisma.tfx_wertungen.create({
            data: {
              int_teilnehmerid: participantId,
              int_wettkaempfeid: competitionId,
              int_statusid: 1, // Assuming status 1 is active/participating
              int_startnummer: startNumber, // Auto-assigned start number (Point 68)
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
