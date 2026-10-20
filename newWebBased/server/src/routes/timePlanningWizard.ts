import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { generateRoundRobinMatrix, computeDefaultStartAssignments } from '../utils/roundRobinHelpers';
import { z } from 'zod';

const router = Router();

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

export default router;
