import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();

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
