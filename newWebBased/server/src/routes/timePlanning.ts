import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { buildMatrixCellDeleteWhere, deduplicateAssignments } from '../utils/matrixHelpers';

import { z } from 'zod';

// Competition interface for time planning
interface Competition {
  id: number;
  name: string;
  number: string;
  round: number;
  int_bahn: number | null;
  startTime: string | null;
  startDate: string | null;
  warmupTime: string | null;
  warmupDate: string | null;
  disciplineCount: number;
  participantCount: number;
}

const router = Router();


// --- Bahn (Lane) Management via Competitions ---

// Get all Bahnen (lanes) for an event (distinct int_bahn values in tfx_wettkaempfe)
router.get('/bahnen', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    // Get all competitions for the event and group by int_bahn
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: Number(eventId) },
      select: { int_bahn: true },
      orderBy: { int_bahn: 'asc' }
    });
    // Get unique, sorted Bahn numbers
    const bahnen = Array.from(new Set(competitions.map(c => c.int_bahn).filter(b => b != null))).sort((a, b) => (a ?? 0) - (b ?? 0));
    res.json({ bahnen });
  } catch (error) {
    console.error('Error fetching Bahnen:', error);
    res.status(500).json({ error: 'Failed to fetch Bahnen' });
  }
});

// Update a competition's Bahn (lane)
router.put('/competition/:competitionId/bahn', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const competitionId = Number(req.params.competitionId);
    console.log('[BAHN-UPDATE] Request received:', { competitionId, body: req.body });
    
    const schema = z.object({
      bahn: z.number().min(1)
    });
    const { bahn } = schema.parse(req.body);
    
    console.log('[BAHN-UPDATE] Parsed data:', { competitionId, bahn });
    
    // Check if competition exists first
    const existing = await prisma.tfx_wettkaempfe.findUnique({
      where: { int_wettkaempfeid: competitionId }
    });
    
    if (!existing) {
      console.error('[BAHN-UPDATE] Competition not found:', competitionId);
      return res.status(404).json({ error: 'Competition not found' });
    }
    
    console.log('[BAHN-UPDATE] Current int_bahn:', existing.int_bahn, '-> New:', bahn);
    
    const updated = await prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: competitionId },
      data: { int_bahn: bahn }
    });
    
    console.log('[BAHN-UPDATE] ✅ Successfully updated to Bahn:', updated.int_bahn);
    
    res.json({ competition: updated });
  } catch (error) {
    console.error('[BAHN-UPDATE] ❌ Error updating competition Bahn:', error);
    res.status(500).json({ error: 'Failed to update competition Bahn' });
  }
});


// --- Squad-to-Bahn Assignment (by updating competition's int_bahn) ---
// To assign a squad to a Bahn, update the int_bahn field of the relevant competition (tfx_wettkaempfe)
// Use the /competition/:competitionId/bahn endpoint above for this purpose.

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

    const competitions: Array<{
      id: number;
      name: string;
      number: string;
      round: number;
      int_bahn: number | null;
      startTime: string | null;
      startDate: string | null;
      warmupTime: string | null;
      warmupDate: string | null;
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
            // Use local time to match how we save times (local timezone)
            const hours = String(timeValue.getHours()).padStart(2, '0');
            const minutes = String(timeValue.getMinutes()).padStart(2, '0');
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
            // Use local time to match how we save times (local timezone)
            const hours = String(timeValue.getHours()).padStart(2, '0');
            const minutes = String(timeValue.getMinutes()).padStart(2, '0');
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

      // Extract dates - always use event date (TIME fields don't store dates)
      // Date comes from tfx_veranstaltungen.dat_von
      const eventDate = comp.tfx_veranstaltungen?.dat_von 
        ? comp.tfx_veranstaltungen.dat_von.toISOString().split('T')[0] 
        : null;
      const startDate = eventDate;
      const warmupDate = eventDate;

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
        int_bahn: comp.int_bahn, // ✅ Include Bahn assignment
        startTime,
        startDate,
        warmupTime,
        warmupDate,
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

// Update squad start device (bol_erstes_geraet)
router.put('/squad-start-device', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, squadName, round, disciplineId } = req.body;
    
    if (!eventId || !squadName || round === undefined || !disciplineId) {
      return res.status(400).json({ 
        error: 'Event ID, squad name, round, and discipline ID are required' 
      });
    }

    const eventIdNum = Number(eventId);
    const roundNum = Number(round);
    const disciplineIdNum = Number(disciplineId);

    // First, set all bol_erstes_geraet to false for this squad in this round
    await prisma.tfx_riegen_x_disziplinen.updateMany({
      where: {
        int_veranstaltungenid: eventIdNum,
        var_riege: squadName,
        int_runde: roundNum
      },
      data: {
        bol_erstes_geraet: false
      }
    });

    // Then, set the selected discipline to true
    const updated = await prisma.tfx_riegen_x_disziplinen.updateMany({
      where: {
        int_veranstaltungenid: eventIdNum,
        var_riege: squadName,
        int_runde: roundNum,
        int_disziplinenid: disciplineIdNum
      },
      data: {
        bol_erstes_geraet: true
      }
    });

    if (updated.count === 0) {
      return res.status(404).json({ 
        error: 'Squad-discipline combination not found' 
      });
    }

    res.json({ 
      success: true, 
      message: `Start device updated for squad ${squadName}`,
      updated: updated.count
    });

  } catch (error) {
    console.error('Error updating squad start device:', error);
    res.status(500).json({ error: 'Failed to update squad start device' });
  }
});

// GET /time-planning/matrix?eventId=X
// Returns disciplines (columns), existing cell assignments, and available squads for the matrix view.
// Cell assignments are stored in tfx_riegen_x_disziplinen (no schema change needed):
//   int_runde = row (rotation slot), int_disziplinenid = column, var_riege = squad name
router.get('/matrix', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: 'Event ID is required' });
    const eventIdNum = parseInt(eventId as string);

    // Disciplines used in competitions for this event (deduplicated, sorted)
    const disciplineRows = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
      where: { tfx_wettkaempfe: { int_veranstaltungenid: eventIdNum } },
      select: {
        int_disziplinenid: true,
        int_sortierung: true,
        tfx_disziplinen: { select: { var_name: true, var_kurz1: true } },
      },
      orderBy: { int_sortierung: 'asc' },
    });
    const seenDiscIds = new Set<number>();
    const disciplines = disciplineRows
      .filter(d => { if (seenDiscIds.has(d.int_disziplinenid)) return false; seenDiscIds.add(d.int_disziplinenid); return true; })
      .map(d => ({
        id: d.int_disziplinenid,
        name: d.tfx_disziplinen?.var_name || '',
        shortName: d.tfx_disziplinen?.var_kurz1 || '',
      }));

    // Existing matrix cell assignments — deduplicated to remove legacy
    // int_runde=NULL rows that may coexist with explicit int_runde=1 rows.
    const rawAssignments = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: { int_disziplinenid: true, int_runde: true, var_riege: true, bol_erstes_geraet: true },
    });
    const assignments = deduplicateAssignments(rawAssignments);

    // Merge disciplines that have assignments but are not linked to competitions
    const assignmentDiscIds = new Set(rawAssignments.map(a => a.int_disziplinenid));
    const missingDiscIds = [...assignmentDiscIds].filter(id => !seenDiscIds.has(id));
    if (missingDiscIds.length > 0) {
      const extraRows = await prisma.tfx_disziplinen.findMany({
        where: { int_disziplinenid: { in: missingDiscIds } },
        select: { int_disziplinenid: true, var_name: true, var_kurz1: true },
      });
      for (const row of extraRows) {
        disciplines.push({ id: row.int_disziplinenid, name: row.var_name || '', shortName: row.var_kurz1 || '' });
        seenDiscIds.add(row.int_disziplinenid);
      }
    }

    // All disciplines in the system — used for column-picker in the client
    const allDisciplines = await prisma.tfx_disziplinen.findMany({
      select: { int_disziplinenid: true, var_name: true, var_kurz1: true },
      orderBy: { var_name: 'asc' },
    });
    const availableDisciplines = allDisciplines
      .filter(d => !seenDiscIds.has(d.int_disziplinenid))
      .map(d => ({ id: d.int_disziplinenid, name: d.var_name || '', shortName: d.var_kurz1 || '' }));

    // Available squads for dropdowns
    const squadRows = await prisma.tfx_wertungen.findMany({
      where: { tfx_wettkaempfe: { int_veranstaltungenid: eventIdNum }, var_riege: { not: null } },
      select: { var_riege: true },
      distinct: ['var_riege'],
      orderBy: { var_riege: 'asc' },
    });
    const squads = squadRows.map(s => s.var_riege!).filter(Boolean);

    // Always show at least as many rows as there are squads, so the table
    // does not visually "collapse" after the user fills only some rows.
    const maxAssignedRound = assignments.length > 0
      ? Math.max(...assignments.map(a => a.round))
      : 0;
    const maxRound = Math.max(maxAssignedRound, squads.length, 1);

    res.json({ disciplines, availableDisciplines, assignments, squads, maxRound });
  } catch (error) {
    console.error('Error fetching matrix data:', error);
    res.status(500).json({ error: 'Failed to fetch matrix data' });
  }
});

// PUT /time-planning/matrix/cell
// Upsert (or delete) a squad assignment for one discipline+round cell.
// Uses tfx_riegen_x_disziplinen — no schema changes needed.
router.put('/matrix/cell', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      eventId: z.number().int().positive(),
      disciplineId: z.number().int().positive(),
      round: z.number().int().min(1),
      squadName: z.string(), // empty string = remove assignment
    });
    const { eventId, disciplineId, round, squadName } = schema.parse(req.body);

    // Always delete all matching rows first (handles both legacy int_runde=NULL
    // and explicit int_runde=N rows) to prevent ghost duplicates, then recreate.
    await prisma.tfx_riegen_x_disziplinen.deleteMany({
      where: buildMatrixCellDeleteWhere(eventId, disciplineId, round) as any,
    });

    if (!squadName) {
      return res.json({ success: true, action: 'deleted' });
    }

    const status = await prisma.tfx_status.findFirst({ orderBy: { int_statusid: 'asc' } });
    if (!status) return res.status(500).json({ error: 'No status available in database' });
    await prisma.tfx_riegen_x_disziplinen.create({
      data: {
        int_veranstaltungenid: eventId,
        int_disziplinenid: disciplineId,
        int_statusid: status.int_statusid,
        var_riege: squadName,
        int_runde: round,
        bol_erstes_geraet: false,
      },
    });

    res.json({ success: true, action: 'saved', squadName });
  } catch (error) {
    console.error('Error updating matrix cell:', error);
    res.status(500).json({ error: 'Failed to update matrix cell' });
  }
});

export default router;
