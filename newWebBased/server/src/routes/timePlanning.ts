import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';


const router = Router();
const prisma = new PrismaClient();

// Create a new round (Durchgang) for the event
router.post('/round', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    // Find the current max round for this event
    const maxRound = await prisma.tfx_wettkaempfe.aggregate({
      where: { int_veranstaltungenid: Number(eventId) },
      _max: { int_durchgang: true }
    });
    const newRound = (maxRound._max.int_durchgang || 0) + 1;
    // No DB insert needed, just return the new round number (rounds are implicit)
    res.json({ round: newRound });
  } catch (error) {
    console.error('Error creating new round:', error);
    res.status(500).json({ error: 'Failed to create new round' });
  }
});

// Update a competition's round (for drag & drop)
router.put('/competition/:id/round', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const compId = Number(req.params.id);
    const { round } = req.body;
    if (!compId || !round) {
      return res.status(400).json({ error: 'Competition ID and round are required' });
    }
    const updated = await prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: compId },
      data: { int_durchgang: round }
    });
    res.json({ success: true, competition: updated });
  } catch (error) {
    console.error('Error updating competition round:', error);
    res.status(500).json({ error: 'Failed to update competition round' });
  }
});

// Get time planning data for event - including squad-discipline assignments and starting order
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('[TIME_PLANNING] API endpoint called');
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const eventIdNum = parseInt(eventId as string);
    console.log('[TIME_PLANNING] Event ID:', eventIdNum);

    // Get competitions for the event with time information
    console.log('[TIME_PLANNING] Fetching competitions...');
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
    console.log('[TIME_PLANNING] Found competitions:', competitionsData.length);

    // Get discipline counts for all competitions in one query
    const disciplineCountsRaw = await prisma.tfx_wettkaempfe_x_disziplinen.groupBy({
      by: ['int_wettkaempfeid'],
      _count: { int_disziplinenid: true }
    });
    const disciplineCountMap = new Map<number, number>();
    for (const row of disciplineCountsRaw) {
      disciplineCountMap.set(row.int_wettkaempfeid, row._count.int_disziplinenid);
    }

    const competitions: Array<{
      id: number;
      name: string;
      number: string;
      round: number;
      startTime: string | null;
      warmupTime: string | null;
      disciplineCount: number;
      participantCount: number;
    }> = [];
    for (const comp of competitionsData) {
      let startTime = null;
      let warmupTime = null;

      // Parse start time
      if (comp.tim_startzeit) {
        try {
          const timeValue = comp.tim_startzeit as any;
          if (timeValue instanceof Date) {
            const hours = timeValue.getHours().toString().padStart(2, '0');
            const minutes = timeValue.getMinutes().toString().padStart(2, '0');
            startTime = `${hours}:${minutes}`;
          } else {
            const timeStr = String(timeValue);
            // Try to extract HH:MM from string
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2];
              startTime = `${hours}:${minutes}`;
            }
          }
        } catch (error) {
          console.log(`[TIME_PLANNING] Error parsing start time for ${comp.var_name}:`, error);
        }
      }
      
      // Parse warmup time  
      if (comp.tim_einturnen) {
        try {
          const timeValue = comp.tim_einturnen as any;
          if (timeValue instanceof Date) {
            const hours = timeValue.getHours().toString().padStart(2, '0');
            const minutes = timeValue.getMinutes().toString().padStart(2, '0');
            warmupTime = `${hours}:${minutes}`;
          } else {
            const timeStr = String(timeValue);
            // Try to extract HH:MM from string
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2];
              warmupTime = `${hours}:${minutes}`;
            }
          }
        } catch (error) {
          console.log(`[TIME_PLANNING] Error parsing warmup time for ${comp.var_name}:`, error);
        }
      }

      // If both times exist, ensure warmup is before start time
      if (startTime && warmupTime) {
        try {
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [warmupHour, warmupMin] = warmupTime.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const warmupMinutes = warmupHour * 60 + warmupMin;
          
          // If warmup time is not before start time, calculate it to be 30 minutes before
          if (warmupMinutes >= startMinutes) {
            const adjustedWarmupMinutes = Math.max(0, startMinutes - 30);
            const adjustedHour = Math.floor(adjustedWarmupMinutes / 60);
            const adjustedMin = adjustedWarmupMinutes % 60;
            warmupTime = `${adjustedHour.toString().padStart(2, '0')}:${adjustedMin.toString().padStart(2, '0')}`;
          }
        } catch (error) {
          console.log(`[TIME_PLANNING] Error validating times for ${comp.var_name}:`, error);
        }
      }

      // Get discipline count for this competition from the map
      let disciplineCount = disciplineCountMap.get(comp.int_wettkaempfeid) || 0;

      competitions.push({
        id: comp.int_wettkaempfeid,
        name: comp.var_name || '',
        number: comp.var_nummer || '',
        round: comp.int_durchgang || 1,
        startTime,
        warmupTime,
        disciplineCount,
        participantCount: comp._count.tfx_wertungen
      });
    }

    // Get squad-discipline assignments with rotation information (int_runde, bol_erstes_geraet)
    const squadDisciplinesRaw = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: {
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
        },
        var_riege: true,
        int_runde: true,
        bol_erstes_geraet: true
      },
      orderBy: [
        { var_riege: 'asc' },
        { int_runde: 'asc' }
      ]
    });
    // Lookup table: (var_riege, int_runde) -> competition ID (from tfx_wertungen)
    const squadToCompId = new Map();
    const wettungen = await prisma.tfx_wertungen.findMany({
      where: {
        tfx_wettkaempfe: { int_veranstaltungenid: eventIdNum },
        var_riege: { not: null }
      },
      select: {
        var_riege: true,
        int_wettkaempfeid: true,
        int_runde: true
      }
    });
    for (const w of wettungen) {
      if (w.var_riege) {
        squadToCompId.set(`${w.var_riege}__${w.int_runde ?? ''}`, w.int_wettkaempfeid);
      }
    }
    // Add tfx_wettkaempfeid property for frontend mapping (only once, using lookup)
    const squadDisciplines = squadDisciplinesRaw.map(sd => ({
      ...sd,
      tfx_wettkaempfeid: squadToCompId.get(`${sd.var_riege}__${sd.int_runde ?? ''}`) || null
    }));

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

    // Get correct participant count per squad for the event (like Squad Management)
    const squadCountsRaw = await prisma.$queryRawUnsafe(`
      SELECT w.var_riege as squad_name, COUNT(DISTINCT w.int_teilnehmerid) as participant_count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND w.var_riege IS NOT NULL AND w.var_riege != ''
      GROUP BY w.var_riege
    `, eventIdNum);
    const squadCountMap = new Map();
    for (const row of squadCountsRaw as any[]) {
      squadCountMap.set(row.squad_name, Number(row.participant_count));
    }

    // Build squads array for frontend (per squad, not per session)
    const squadMap = new Map();
    for (const squadData of squadsData) {
      const squadName = squadData.var_riege;
      if (!squadMap.has(squadName)) {
        squadMap.set(squadName, {
          name: squadName,
          competitions: new Set(),
          participantCount: squadCountMap.get(squadName) || 0
        });
      }
      const squad = squadMap.get(squadName);
      squad.competitions.add(squadData.int_wettkaempfeid);
    }
    const squads = Array.from(squadMap.values()).map(squad => {
      const squadCompetitions = competitions.filter(comp => squad.competitions.has(comp.id));
      return {
        name: squad.name,
        participantCount: squad.participantCount,
        competitions: squadCompetitions.map(c => c.name)
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
