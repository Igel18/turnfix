import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { mapCompetitionToScheduleEntry, type CompetitionScheduleEntry } from '../utils/timePlanningCompetition';

const router = Router();

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
        int_bahn: true, // ✅ Include Bahn assignment
        tim_startzeit: true,
        tim_einturnen: true,
        tfx_veranstaltungen: {
          select: {
            dat_von: true
          }
        },
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

    const competitions: CompetitionScheduleEntry[] = competitionsData.map(comp =>
      mapCompetitionToScheduleEntry(comp, disciplineCountMap.get(comp.int_wettkaempfeid) || 0)
    );

    // Get squad-discipline assignments with rotation information (int_runde, bol_erstes_geraet)
    const squadDisciplinesRaw = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: {
        int_disziplinenid: true,
        int_statusid: true,
        var_riege: true,
        int_runde: true,
        bol_erstes_geraet: true
      },
      orderBy: [
        { var_riege: 'asc' },
        { int_runde: 'asc' }
      ]
    });
    const disciplineIds = Array.from(new Set(squadDisciplinesRaw.map(sd => sd.int_disziplinenid)))
    const statusIds = Array.from(new Set(squadDisciplinesRaw.map(sd => sd.int_statusid)))

    const [disciplineRows, statusRows] = await Promise.all([
      prisma.tfx_disziplinen.findMany({
        where: { int_disziplinenid: { in: disciplineIds } },
        select: {
          int_disziplinenid: true,
          var_name: true,
          var_kurz1: true,
          var_kurz2: true,
          var_icon: true
        }
      }),
      prisma.tfx_status.findMany({
        where: { int_statusid: { in: statusIds } },
        select: {
          int_statusid: true,
          var_name: true,
          ary_colorcode: true
        }
      })
    ])

    const disciplineById = new Map(disciplineRows.map(d => [d.int_disziplinenid, d]))
    const statusById = new Map(statusRows.map(s => [s.int_statusid, s]))

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
      tfx_disziplinen: {
        int_disziplinenid: sd.int_disziplinenid,
        var_name: disciplineById.get(sd.int_disziplinenid)?.var_name || 'Unknown',
        var_kurz1: disciplineById.get(sd.int_disziplinenid)?.var_kurz1 || null,
        var_kurz2: disciplineById.get(sd.int_disziplinenid)?.var_kurz2 || null,
        var_icon: disciplineById.get(sd.int_disziplinenid)?.var_icon || null
      },
      tfx_status: {
        var_name: statusById.get(sd.int_statusid)?.var_name || 'Unknown',
        ary_colorcode: statusById.get(sd.int_statusid)?.ary_colorcode || '{128,128,128}'
      },
      var_riege: sd.var_riege,
      int_runde: sd.int_runde,
      bol_erstes_geraet: sd.bol_erstes_geraet,
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
        competitions: squadCompetitions.map(c => c.name),
        competitionIds: Array.from(squad.competitions) // ADD: Direct IDs for mapping
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
        firstCompetition: squads[0].competitions[0],
        competitionIds: squads[0].competitionIds
      } : null
    });
    
    // Debug: Log competitions by round (EXPANDED)
    const competitionsByRound = competitions.reduce((acc: any, comp) => {
      if (!acc[comp.round]) acc[comp.round] = [];
      acc[comp.round].push({ id: comp.id, name: comp.name, number: comp.number });
      return acc;
    }, {});
    console.log('[TIME_PLANNING] Competitions by round:', JSON.stringify(competitionsByRound, null, 2));
    
    // Debug: Show all squads with their competition IDs
    console.log('[TIME_PLANNING] Squad mappings:', squads.map(s => ({
      name: s.name,
      competitionIds: s.competitionIds,
      participantCount: s.participantCount
    })));

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
