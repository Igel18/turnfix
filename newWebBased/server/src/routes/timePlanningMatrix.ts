import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { buildMatrixCellDeleteWhere, deduplicateAssignments } from '../utils/matrixHelpers';
import { z } from 'zod';

const router = Router();

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
        tfx_wettkaempfe: { select: { int_durchgang: true, int_bahn: true } },
        tfx_disziplinen: { select: { var_name: true, var_kurz1: true } },
      },
      orderBy: { int_sortierung: 'asc' },
    });
    const sessionDisciplineMap = new Map<number, { id: number; sort: number }[]>();
    const sessionLaneDisciplineMap = new Map<number, Map<number, { id: number; sort: number }[]>>();
    for (const row of disciplineRows) {
      const session = row.tfx_wettkaempfe?.int_durchgang ?? 1;
      const lane = row.tfx_wettkaempfe?.int_bahn ?? 1;
      if (!sessionDisciplineMap.has(session)) {
        sessionDisciplineMap.set(session, []);
      }
      sessionDisciplineMap.get(session)!.push({
        id: row.int_disziplinenid,
        sort: row.int_sortierung ?? 0,
      });

      if (!sessionLaneDisciplineMap.has(session)) {
        sessionLaneDisciplineMap.set(session, new Map<number, { id: number; sort: number }[]>());
      }
      const laneMap = sessionLaneDisciplineMap.get(session)!;
      if (!laneMap.has(lane)) {
        laneMap.set(lane, []);
      }
      laneMap.get(lane)!.push({
        id: row.int_disziplinenid,
        sort: row.int_sortierung ?? 0,
      });
    }
    const seenDiscIds = new Set<number>();
    const disciplines = disciplineRows
      .filter(d => { if (seenDiscIds.has(d.int_disziplinenid)) return false; seenDiscIds.add(d.int_disziplinenid); return true; })
      .map(d => ({
        id: d.int_disziplinenid,
        name: d.tfx_disziplinen?.var_name || '',
        shortName: d.tfx_disziplinen?.var_kurz1 || '',
      }));
    const sessionDisciplineIds = Object.fromEntries(
      Array.from(sessionDisciplineMap.entries()).map(([session, rows]) => {
        const seenIds = new Set<number>();
        const ids = rows
          .sort((left, right) => left.sort - right.sort)
          .map(row => row.id)
          .filter(id => {
            if (seenIds.has(id)) {
              return false;
            }
            seenIds.add(id);
            return true;
          });
        return [String(session), ids];
      })
    );
    const sessionLaneDisciplineIds = Object.fromEntries(
      Array.from(sessionLaneDisciplineMap.entries()).map(([session, laneMap]) => {
        const lanes = Object.fromEntries(
          Array.from(laneMap.entries())
            .sort(([leftLane], [rightLane]) => leftLane - rightLane)
            .map(([lane, rows]) => {
              const seenIds = new Set<number>();
              const ids = rows
                .sort((left, right) => left.sort - right.sort)
                .map(row => row.id)
                .filter(id => {
                  if (seenIds.has(id)) {
                    return false;
                  }
                  seenIds.add(id);
                  return true;
                });
              return [String(lane), ids];
            })
        );

        return [String(session), lanes];
      })
    );

    // Existing matrix cell assignments — deduplicated to remove legacy
    // int_runde=NULL rows that may coexist with explicit int_runde=1 rows.
    const rawAssignments = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: { int_disziplinenid: true, int_runde: true, var_riege: true, bol_erstes_geraet: true },
    });
    const assignments = deduplicateAssignments(rawAssignments);
    const squadRoundAssignmentsMap = new Map<string, { squadName: string; round: number; disciplineId: number; hasExplicitRound: boolean }>();
    for (const row of rawAssignments) {
      const squadName = row.var_riege ?? '';
      if (!squadName) {
        continue;
      }
      const round = row.int_runde ?? 1;
      const key = `${squadName}_${round}`;
      const existing = squadRoundAssignmentsMap.get(key);
      const hasExplicitRound = row.int_runde !== null;
      if (!existing || hasExplicitRound) {
        squadRoundAssignmentsMap.set(key, {
          squadName,
          round,
          disciplineId: row.int_disziplinenid,
          hasExplicitRound,
        });
      }
    }
    const squadRoundAssignments = Array.from(squadRoundAssignmentsMap.values())
      .sort((left, right) => {
        if (left.round !== right.round) {
          return left.round - right.round;
        }
        return left.squadName.localeCompare(right.squadName);
      })
      .map(({ squadName, round, disciplineId }) => ({ squadName, round, disciplineId }));

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

    res.json({
      disciplines,
      availableDisciplines,
      assignments,
      squadRoundAssignments,
      squads,
      sessionDisciplineIds,
      sessionLaneDisciplineIds,
      maxRound,
    });
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

// PUT /time-planning/matrix/squad-cell
// Upsert (or delete) a discipline assignment for one squad+round cell.
router.put('/matrix/squad-cell', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      eventId: z.number().int().positive(),
      squadName: z.string().min(1),
      round: z.number().int().min(1),
      disciplineId: z.number().int().positive().nullable(),
    });
    const { eventId, squadName, round, disciplineId } = schema.parse(req.body);

    if (round === 1) {
      await prisma.tfx_riegen_x_disziplinen.deleteMany({
        where: {
          int_veranstaltungenid: eventId,
          var_riege: squadName,
          OR: [{ int_runde: 1 }, { int_runde: null }],
        },
      });
    } else {
      await prisma.tfx_riegen_x_disziplinen.deleteMany({
        where: {
          int_veranstaltungenid: eventId,
          var_riege: squadName,
          int_runde: round,
        },
      });
    }

    if (disciplineId === null) {
      return res.json({ success: true, action: 'deleted' });
    }

    const status = await prisma.tfx_status.findFirst({ orderBy: { int_statusid: 'asc' } });
    if (!status) {
      return res.status(500).json({ error: 'No status available in database' });
    }

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

    res.json({ success: true, action: 'saved', squadName, disciplineId, round });
  } catch (error) {
    console.error('Error updating matrix squad cell:', error);
    res.status(500).json({ error: 'Failed to update matrix squad cell' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────

export default router;
