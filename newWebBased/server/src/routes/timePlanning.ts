import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Get time planning data for event - including squad-discipline assignments and starting order
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const eventIdNum = parseInt(eventId as string);

    // Get competitions for the event with time information
    const competitionsData = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: {
        int_wettkaempfeid: true,
        var_name: true,
        var_nummer: true,
        int_durchgang: true,
        tim_startzeit: true,
        tim_einturnen: true,
        _count: {
          select: {
            tfx_wertungen: true
          }
        }
      },
      orderBy: [
        { int_durchgang: 'asc' },
        { var_nummer: 'asc' },
        { var_name: 'asc' }
      ]
    });

    // Format competitions for frontend
    const competitions = competitionsData.map(comp => {
      let startTime = null;
      let warmupTime = null;

      // Parse the times properly
      if (comp.tim_startzeit) {
        const timeStr = comp.tim_startzeit.toString();
        console.log(`[TIME_PLANNING] Raw startzeit for ${comp.var_name}: "${timeStr}"`);
        
        // Handle PostgreSQL TIME field that comes as Date object
        if (timeStr.includes('1970')) {
          // Extract time from full date string like "Thu Jan 01 1970 01:00:00 GMT+0100"
          const timeMatch = timeStr.match(/(\d{2}):(\d{2}):\d{2}/);
          if (timeMatch) {
            startTime = `${timeMatch[1]}:${timeMatch[2]}`;
          } else {
            startTime = null;
          }
        } else if (timeStr.includes(':') && !timeStr.includes('Invalid')) {
          // Already in HH:MM format
          startTime = timeStr.slice(0, 5);
        } else {
          console.log(`[TIME_PLANNING] Unexpected startzeit format: ${timeStr}`);
          startTime = null;
        }
      }
      
      if (comp.tim_einturnen) {
        const timeStr = comp.tim_einturnen.toString();
        console.log(`[TIME_PLANNING] Raw einturnen for ${comp.var_name}: "${timeStr}"`);
        
        // Handle PostgreSQL TIME field that comes as Date object
        if (timeStr.includes('1970')) {
          // Extract time from full date string like "Thu Jan 01 1970 01:00:00 GMT+0100"
          const timeMatch = timeStr.match(/(\d{2}):(\d{2}):\d{2}/);
          if (timeMatch) {
            warmupTime = `${timeMatch[1]}:${timeMatch[2]}`;
          } else {
            warmupTime = null;
          }
        } else if (timeStr.includes(':') && !timeStr.includes('Invalid')) {
          // Already in HH:MM format
          warmupTime = timeStr.slice(0, 5);
        } else {
          console.log(`[TIME_PLANNING] Unexpected einturnen format: ${timeStr}`);
          warmupTime = null;
        }
      }

      // If both times exist, ensure warmup is before start time
      if (startTime && warmupTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [warmupHour, warmupMin] = warmupTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const warmupMinutes = warmupHour * 60 + warmupMin;
        
        console.log(`[TIME_PLANNING] Competition ${comp.var_name}: Start ${startTime}, Warmup ${warmupTime}`);
        
        // If warmup time is not before start time, calculate it to be 30 minutes before
        if (warmupMinutes >= startMinutes) {
          const adjustedWarmupMinutes = Math.max(0, startMinutes - 30);
          const adjustedHour = Math.floor(adjustedWarmupMinutes / 60);
          const adjustedMin = adjustedWarmupMinutes % 60;
          const originalWarmup = warmupTime;
          warmupTime = `${adjustedHour.toString().padStart(2, '0')}:${adjustedMin.toString().padStart(2, '0')}`;
          console.log(`[TIME_PLANNING] Adjusted warmup from ${originalWarmup} to ${warmupTime} for competition ${comp.var_name}`);
        }
      }

      return {
        id: comp.int_wettkaempfeid,
        name: comp.var_name,
        number: comp.var_nummer || '',
        round: comp.int_durchgang || 1,
        startTime,
        warmupTime,
        disciplineCount: 0, // TODO: Calculate if needed
        participantCount: comp._count.tfx_wertungen
      };
    });

    // Get squad-discipline assignments with rotation information (int_runde, bol_erstes_geraet)
    const squadDisciplines = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      include: {
        tfx_disziplinen: {
          select: {
            int_disziplinenid: true,
            var_name: true,
            var_kurz1: true,
            var_kurz2: true,
            var_icon: true
          }
        },
        tfx_status: {
          select: {
            var_name: true,
            ary_colorcode: true
          }
        }
      },
      orderBy: [
        { var_riege: 'asc' },
        { int_runde: 'asc' }
      ]
    });

    // Get starting order information
    const startingOrder = await prisma.tfx_startreihenfolge.findMany({
      where: {
        tfx_wertungen: {
          tfx_wettkaempfe: { int_veranstaltungenid: eventIdNum }
        }
      },
      include: {
        tfx_disziplinen: {
          select: {
            int_disziplinenid: true,
            var_name: true,
            var_kurz1: true,
            var_icon: true
          }
        },
        tfx_wertungen: {
          select: {
            var_riege: true,
            int_wettkaempfeid: true,
            int_runde: true,
            tfx_teilnehmer: {
              select: {
                var_vorname: true,
                var_nachname: true
              }
            },
            tfx_wettkaempfe: {
              select: {
                var_name: true,
                int_durchgang: true
              }
            }
          }
        }
      },
      orderBy: [
        { int_pos: 'asc' }
      ]
    });

    // Get unique squads for the event with their competitions
    const squadsData = await prisma.tfx_wertungen.findMany({
      where: { 
        tfx_wettkaempfe: { int_veranstaltungenid: eventIdNum },
        var_riege: { not: null }
      },
      include: {
        tfx_wettkaempfe: {
          select: {
            var_name: true,
            int_durchgang: true,
            tim_startzeit: true,
            tim_einturnen: true
          }
        }
      },
      distinct: ['var_riege', 'int_wettkaempfeid']
    });

    // Group squads and calculate participant counts
    const squadMap = new Map();
    for (const squadData of squadsData) {
      const squadName = squadData.var_riege;
      if (!squadMap.has(squadName)) {
        squadMap.set(squadName, {
          name: squadName,
          competitions: new Set(),
          participantCount: 0
        });
      }
      
      const squad = squadMap.get(squadName);
      squad.competitions.add(squadData.int_wettkaempfeid); // Store competition ID instead of name
      squad.participantCount += 1;
    }

    // Convert to array format expected by frontend
    const squads = Array.from(squadMap.values()).map(squad => {
      // Get competition objects for this squad
      const squadCompetitions = competitions.filter(comp => 
        squad.competitions.has(comp.id)
      );

      return {
        name: squad.name,
        participantCount: squad.participantCount,
        competitions: squadCompetitions
      };
    });

    // Generate time slots (for now, create basic time slots)
    const timeSlots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push({
          time: timeString,
          label: timeString
        });
      }
    }

    console.log('[TIME_PLANNING] Final response structure:', {
      squadsCount: squads.length,
      competitionsCount: competitions.length,
      timeSlotsCount: timeSlots.length,
      firstSquad: squads[0] ? {
        name: squads[0].name,
        participantCount: squads[0].participantCount,
        competitionsCount: squads[0].competitions.length,
        firstCompetition: squads[0].competitions[0]
      } : null
    });

    res.json({
      competitions,
      squadDisciplines,
      timeSlots,
      squads
    });

  } catch (error) {
    console.error('Error fetching time planning data:', error);
    res.status(500).json({ error: 'Failed to fetch time planning data' });
  }
});

export default router;
