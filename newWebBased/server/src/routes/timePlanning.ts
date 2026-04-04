import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { buildMatrixCellDeleteWhere, deduplicateAssignments } from '../utils/matrixHelpers';
import {
  generateRoundRobinMatrix,
  computeDefaultStartAssignments,
} from '../utils/roundRobinHelpers';

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

// ──────────────────────────────────────────────────────────────────────────────
// Wizard endpoints
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /time-planning/wizard/durchgang-data?eventId=X
 *
 * Returns, for each Durchgang, the squads and disciplines involved.
 * Used by the wizard Step 5 to render the start-assignment table.
 */
router.get('/wizard/durchgang-data', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: 'Event ID is required' });
    const eventIdNum = parseInt(eventId as string);

    // All Durchgänge (distinct int_durchgang values) for this event
    const compRows = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: { int_wettkaempfeid: true, int_durchgang: true },
      orderBy: { int_durchgang: 'asc' },
    });

    const durchgaenge = Array.from(
      new Set(compRows.map(c => c.int_durchgang ?? 1)),
    ).sort((a, b) => a - b);

    const compIdsByDurchgang = new Map<number, number[]>();
    for (const c of compRows) {
      const d = c.int_durchgang ?? 1;
      if (!compIdsByDurchgang.has(d)) compIdsByDurchgang.set(d, []);
      compIdsByDurchgang.get(d)!.push(c.int_wettkaempfeid);
    }

    const result = await Promise.all(
      durchgaenge.map(async d => {
        const compIds = compIdsByDurchgang.get(d) ?? [];

        // Disciplines for this Durchgang (deduplicated, sorted)
        const discRows = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
          where: { int_wettkaempfeid: { in: compIds } },
          select: {
            int_disziplinenid: true,
            int_sortierung: true,
            tfx_disziplinen: { select: { var_name: true, var_kurz1: true } },
          },
          orderBy: { int_sortierung: 'asc' },
        });
        const seenDisc = new Set<number>();
        const disciplines = discRows
          .filter(dr => {
            if (seenDisc.has(dr.int_disziplinenid)) return false;
            seenDisc.add(dr.int_disziplinenid);
            return true;
          })
          .map(dr => ({
            id: dr.int_disziplinenid,
            name: dr.tfx_disziplinen?.var_name ?? '',
            shortName: dr.tfx_disziplinen?.var_kurz1 ?? '',
          }));

        // Squads for this Durchgang (distinct var_riege in tfx_wertungen)
        const squadRows = await prisma.tfx_wertungen.findMany({
          where: {
            int_wettkaempfeid: { in: compIds },
            var_riege: { not: null },
          },
          select: { var_riege: true },
          distinct: ['var_riege'],
          orderBy: { var_riege: 'asc' },
        });
        const squads = squadRows.map(s => s.var_riege!).filter(Boolean);

        return { durchgang: d, squads, disciplines };
      }),
    );

    res.json({ durchgaenge: result });
  } catch (error) {
    console.error('Error fetching wizard durchgang data:', error);
    res.status(500).json({ error: 'Failed to fetch durchgang data' });
  }
});

/**
 * POST /time-planning/wizard/generate
 *
 * Generates a complete round-robin rotation matrix for all Durchgänge and
 * saves the result to tfx_riegen_x_disziplinen (replacing all existing rows).
 *
 * Body:
 * {
 *   eventId: number,
 *   rounds: Array<{
 *     durchgang: number,
 *     startAssignments: Record<string, number>  // squadName → starting disciplineId
 *   }>
 * }
 */
router.post('/wizard/generate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      eventId: z.number().int().positive(),
      rounds: z.array(
        z.object({
          durchgang: z.number().int().min(1),
          startAssignments: z.record(z.string(), z.number()).optional().default({}),
        }),
      ),
      // Per-Durchgang start times (HH:MM) to save to tfx_wettkaempfe.tim_startzeit
      durchgangStartTimes: z.record(z.string(), z.string()).optional(),
    });

    const { eventId, rounds, durchgangStartTimes } = schema.parse(req.body);

    // Fetch a valid default status (required FK in tfx_riegen_x_disziplinen)
    const defaultStatus = await prisma.tfx_status.findFirst({
      orderBy: { int_statusid: 'asc' },
    });
    if (!defaultStatus) {
      return res.status(500).json({ error: 'No status rows available in database' });
    }

    // ── Fetch disciplines & squads for each Durchgang ────────────────────────
    const compRows = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: eventId },
      select: { int_wettkaempfeid: true, int_durchgang: true },
    });
    const compIdsByDurchgang = new Map<number, number[]>();
    for (const c of compRows) {
      const d = c.int_durchgang ?? 1;
      if (!compIdsByDurchgang.has(d)) compIdsByDurchgang.set(d, []);
      compIdsByDurchgang.get(d)!.push(c.int_wettkaempfeid);
    }

    interface DurchgangInfo {
      durchgang: number;
      squads: string[];
      disciplineIds: number[];
      startAssignments: Record<string, number>;
    }

    const durchgangInfos: DurchgangInfo[] = [];

    for (const roundInput of rounds) {
      const compIds = compIdsByDurchgang.get(roundInput.durchgang) ?? [];
      if (compIds.length === 0) continue;

      // Disciplines (ordered, deduplicated)
      const discRows = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
        where: { int_wettkaempfeid: { in: compIds } },
        select: { int_disziplinenid: true, int_sortierung: true },
        orderBy: { int_sortierung: 'asc' },
      });
      const seenDisc = new Set<number>();
      const disciplineIds: number[] = [];
      for (const dr of discRows) {
        if (!seenDisc.has(dr.int_disziplinenid)) {
          seenDisc.add(dr.int_disziplinenid);
          disciplineIds.push(dr.int_disziplinenid);
        }
      }

      // Squads
      const squadRows = await prisma.tfx_wertungen.findMany({
        where: { int_wettkaempfeid: { in: compIds }, var_riege: { not: null } },
        select: { var_riege: true },
        distinct: ['var_riege'],
        orderBy: { var_riege: 'asc' },
      });
      const squads = squadRows.map(s => s.var_riege!).filter(Boolean);

      // Fill missing start assignments with defaults
      const provided = roundInput.startAssignments ?? {};
      const defaults = computeDefaultStartAssignments(squads, disciplineIds);
      const startAssignments = { ...defaults, ...provided };

      durchgangInfos.push({
        durchgang: roundInput.durchgang,
        squads,
        disciplineIds,
        startAssignments,
      });
    }

    // ── Generate cells (sequential row offsets per Durchgang) ────────────────
    let startRound = 1;
    const allCells: {
      int_veranstaltungenid: number;
      int_disziplinenid: number;
      int_statusid: number;
      var_riege: string;
      int_runde: number;
      bol_erstes_geraet: boolean;
    }[] = [];

    for (const info of durchgangInfos) {
      const cells = generateRoundRobinMatrix(
        info.squads,
        info.disciplineIds,
        info.startAssignments,
        startRound,
      );
      for (const cell of cells) {
        allCells.push({
          int_veranstaltungenid: eventId,
          int_disziplinenid: cell.disciplineId,
          int_statusid: defaultStatus.int_statusid,
          var_riege: cell.squadName,
          int_runde: cell.round,
          bol_erstes_geraet: cell.isFirstDevice,
        });
      }
      startRound += info.disciplineIds.length;
    }

    // ── Replace all existing matrix rows for this event ──────────────────────
    await prisma.$transaction([
      prisma.tfx_riegen_x_disziplinen.deleteMany({
        where: { int_veranstaltungenid: eventId },
      }),
      prisma.tfx_riegen_x_disziplinen.createMany({ data: allCells }),
    ]);

    // ── Save per-Durchgang start times to tfx_wettkaempfe.tim_startzeit ──────
    if (durchgangStartTimes && Object.keys(durchgangStartTimes).length > 0) {
      for (const [dStr, timeStr] of Object.entries(durchgangStartTimes)) {
        if (!timeStr) continue;
        const d = Number(dStr);
        const [h, m] = timeStr.split(':').map(Number);
        // Use local time (1970-01-01) to avoid UTC offset issues with TIME columns
        const timeDt = new Date(1970, 0, 1, h, m, 0, 0);
        await prisma.tfx_wettkaempfe.updateMany({
          where: { int_veranstaltungenid: eventId, int_durchgang: d },
          data: { tim_startzeit: timeDt },
        });
      }
    }

    res.json({
      success: true,
      totalCells: allCells.length,
      durchgaengeCount: durchgangInfos.length,
      message: `Round-robin matrix generated: ${allCells.length} cells across ${durchgangInfos.length} Durchgänge`,
    });
  } catch (error) {
    console.error('Error generating wizard round-robin matrix:', error);
    res.status(500).json({ error: 'Failed to generate round-robin matrix' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /time-planning/active-squads?eventId=X&minutesPerParticipant=10
//
// Returns per-squad status annotations based on the current wall-clock time.
// Used by the Jury Portal to highlight which squads are currently on the floor.
//
// Algorithm:
//  1. Read the rotation matrix (tfx_riegen_x_disziplinen) for the event.
//  2. Resolve each matrix row to its Durchgang start time via tfx_wertungen +
//     tfx_wettkaempfe.
//  3. Group rows by Durchgang; compute sequential slot windows:
//       slotStart = durchgangStart + roundOffset × roundDuration
//     where roundDuration = maxParticipantsInDurchgang × minutesPerParticipant.
//  4. Tag each squad as 'active' | 'upcoming' | 'past' | 'unknown'.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/active-squads', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, minutesPerParticipant: mppStr } = req.query;
    if (!eventId) return res.status(400).json({ error: 'Event ID is required' });

    const eventIdNum = parseInt(eventId as string);
    const mpp = parseInt((mppStr as string) || '10', 10) || 10; // minutes per participant (default 10)

    // 1. Rotation matrix: squad × round → device
    const matrixRows = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: {
        var_riege: true,
        int_runde: true,
        bol_erstes_geraet: true,
        tfx_disziplinen: {
          select: { int_disziplinenid: true, var_name: true, var_kurz1: true, var_icon: true }
        }
      },
    });

    if (matrixRows.length === 0) {
      return res.json({ currentTime: getNowHHMM(), squadInfos: [] });
    }

    // 2. Resolve (squadName, round) → (durchgang, startTime)
    //    via tfx_wertungen + tfx_wettkaempfe
    const wertungen = await prisma.tfx_wertungen.findMany({
      where: {
        tfx_wettkaempfe: { int_veranstaltungenid: eventIdNum },
        var_riege: { not: null },
      },
      select: {
        var_riege: true,
        int_runde: true,
        tfx_wettkaempfe: {
          select: {
            int_durchgang: true,
            tim_startzeit: true,
            _count: { select: { tfx_wertungen: true } }
          }
        }
      },
      distinct: ['var_riege', 'int_runde'],
    });

    // Map: roundNumber → { durchgang, startMinutes (minutes since midnight), participantCount }
    const roundInfoMap = new Map<number, { durchgang: number; startMinutes: number | null; compParticipantCount: number }>();

    for (const w of wertungen) {
      const round = w.int_runde;
      if (round == null) continue;
      if (roundInfoMap.has(round)) continue; // already resolved from same competition

      const comp = w.tfx_wettkaempfe;
      let startMinutes: number | null = null;
      if (comp.tim_startzeit) {
        const t = comp.tim_startzeit as any;
        if (t instanceof Date) {
          startMinutes = t.getHours() * 60 + t.getMinutes();
        } else {
          const m = String(t).match(/(\d{1,2}):(\d{2})/);
          if (m) startMinutes = parseInt(m[1]) * 60 + parseInt(m[2]);
        }
      }

      roundInfoMap.set(round, {
        durchgang: comp.int_durchgang ?? 1,
        startMinutes,
        compParticipantCount: comp._count.tfx_wertungen,
      });
    }

    // 3. Group rounds by Durchgang, sorted ascending
    //    Each Durchgang's rounds are a contiguous ascending block [minRound..maxRound].
    const durchgangRounds = new Map<number, { rounds: number[]; startMinutes: number | null; participantCount: number }>();
    for (const [round, info] of roundInfoMap) {
      if (!durchgangRounds.has(info.durchgang)) {
        durchgangRounds.set(info.durchgang, { rounds: [], startMinutes: info.startMinutes, participantCount: 0 });
      }
      const entry = durchgangRounds.get(info.durchgang)!;
      entry.rounds.push(round);
      if (info.compParticipantCount > entry.participantCount) {
        entry.participantCount = info.compParticipantCount;
      }
      if (entry.startMinutes == null && info.startMinutes != null) {
        entry.startMinutes = info.startMinutes;
      }
    }

    // Sort rounds within each Durchgang
    for (const entry of durchgangRounds.values()) {
      entry.rounds.sort((a, b) => a - b);
    }

    // 4. Build round → { slotStartMinutes, slotEndMinutes } map
    const roundSlotMap = new Map<number, { slotStartMinutes: number; slotEndMinutes: number }>();

    for (const [, entry] of durchgangRounds) {
      if (entry.startMinutes == null) continue; // No start time configured
      const roundDuration = Math.max(entry.participantCount, 1) * mpp;
      entry.rounds.forEach((round, idx) => {
        const slotStart = entry.startMinutes! + idx * roundDuration;
        roundSlotMap.set(round, {
          slotStartMinutes: slotStart,
          slotEndMinutes: slotStart + roundDuration,
        });
      });
    }

    // 5. Current time in minutes since midnight (local time)
    const nowMinutes = getNowMinutes();
    const nowHHMM = getNowHHMM();

    // 6. Build per-squad info
    //    Each squad has multiple matrix rows (one per round × device).
    //    We look for the row whose rotation round slot overlaps now (active)
    //    or is next upcoming.

    // Group matrix rows by squad
    const squadRowsMap = new Map<string, typeof matrixRows>();
    for (const row of matrixRows) {
      if (!row.var_riege) continue;
      if (!squadRowsMap.has(row.var_riege)) squadRowsMap.set(row.var_riege, []);
      squadRowsMap.get(row.var_riege)!.push(row);
    }

    const UPCOMING_WINDOW_MINUTES = 30;

    const squadInfos = Array.from(squadRowsMap.entries()).map(([squadName, rows]) => {
      // Find the current active row (round whose time slot covers now)
      let activeRow: (typeof matrixRows)[0] | null = null;
      let upcomingRow: (typeof matrixRows)[0] | null = null;
      let upcomingStartMinutes: number | null = null;
      let activeSlot: { slotStartMinutes: number; slotEndMinutes: number } | null = null;

      for (const row of rows) {
        if (row.int_runde == null) continue;
        const slot = roundSlotMap.get(row.int_runde);
        if (!slot) continue;

        if (slot.slotStartMinutes <= nowMinutes && nowMinutes < slot.slotEndMinutes) {
          // Currently in this slot
          if (!activeRow) {
            activeRow = row;
            activeSlot = slot;
          }
        } else if (
          slot.slotStartMinutes > nowMinutes &&
          slot.slotStartMinutes - nowMinutes <= UPCOMING_WINDOW_MINUTES
        ) {
          // Upcoming within window
          if (upcomingRow == null || slot.slotStartMinutes < upcomingStartMinutes!) {
            upcomingRow = row;
            upcomingStartMinutes = slot.slotStartMinutes;
          }
        }
      }

      // Build status
      let status: 'active' | 'upcoming' | 'past' | 'unknown';
      let currentDeviceName: string | null = null;
      let currentDisciplineId: number | null = null;
      let timeInfo = '';

      if (activeRow) {
        status = 'active';
        currentDeviceName = activeRow.tfx_disziplinen?.var_name ?? null;
        currentDisciplineId = activeRow.tfx_disziplinen?.int_disziplinenid ?? null;
        if (activeSlot) {
          timeInfo = `${minutesToHHMM(activeSlot.slotStartMinutes)} – ${minutesToHHMM(activeSlot.slotEndMinutes)} Uhr`;
        }
      } else if (upcomingRow && upcomingStartMinutes != null) {
        status = 'upcoming';
        currentDeviceName = upcomingRow.tfx_disziplinen?.var_name ?? null;
        currentDisciplineId = upcomingRow.tfx_disziplinen?.int_disziplinenid ?? null;
        timeInfo = `ab ${minutesToHHMM(upcomingStartMinutes)} Uhr`;
      } else {
        // Check if all rounds are in the past
        const allPast = rows.every(row => {
          const slot = row.int_runde != null ? roundSlotMap.get(row.int_runde) : null;
          return slot && slot.slotEndMinutes <= nowMinutes;
        });
        status = allPast ? 'past' : 'unknown';
      }

      return { squadName, status, currentDeviceName, currentDisciplineId, timeInfo };
    });

    res.json({ currentTime: nowHHMM, squadInfos });
  } catch (error) {
    console.error('[ACTIVE_SQUADS] Error:', error);
    res.status(500).json({ error: 'Failed to compute active squads' });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getNowHHMM(): string {
  return minutesToHHMM(getNowMinutes());
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default router;
