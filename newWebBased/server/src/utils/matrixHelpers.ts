/**
 * Matrix Helpers — Pure utility functions for the schedule matrix routes.
 *
 * Extracted from timePlanning.ts for testability (no Prisma / Express deps).
 */

// ============================================================================
// Legacy NULL round handling
// ============================================================================

/**
 * Build the Prisma `where` clause to find an existing matrix cell assignment.
 *
 * Background: The legacy Qt/C++ application stored rows in
 * `tfx_riegen_x_disziplinen` without setting `int_runde` (= NULL).
 * In the web app those rows are displayed as round 1.  When updating or
 * deleting round-1 cells we must therefore also match rows where
 * `int_runde IS NULL`, otherwise we create duplicates.
 *
 * For rounds > 1 no legacy-NULL issue exists — match by exact value only.
 */
export function buildMatrixCellFindWhere(
  eventId: number,
  disciplineId: number,
  round: number
): object {
  if (round === 1) {
    return {
      int_veranstaltungenid: eventId,
      int_disziplinenid: disciplineId,
      OR: [{ int_runde: 1 }, { int_runde: null }],
    };
  }
  return {
    int_veranstaltungenid: eventId,
    int_disziplinenid: disciplineId,
    int_runde: round,
  };
}

/**
 * Build the Prisma `where` clause to delete matrix cell assignment(s).
 *
 * Same NULL-awareness as findWhere: when deleting round 1 we also need
 * to remove legacy rows that have `int_runde = NULL`.
 */
export function buildMatrixCellDeleteWhere(
  eventId: number,
  disciplineId: number,
  round: number
): object {
  if (round === 1) {
    return {
      int_veranstaltungenid: eventId,
      int_disziplinenid: disciplineId,
      OR: [{ int_runde: 1 }, { int_runde: null }],
    };
  }
  return {
    int_veranstaltungenid: eventId,
    int_disziplinenid: disciplineId,
    int_runde: round,
  };
}

// ============================================================================
// Assignment deduplication
// ============================================================================

export interface RawAssignmentRow {
  int_disziplinenid: number;
  int_runde: number | null;
  var_riege: string | null;
  bol_erstes_geraet: boolean | null;
}

export interface MatrixAssignment {
  disciplineId: number;
  round: number;
  squadName: string;
  isFirstDevice: boolean;
}

/**
 * Deduplicate raw assignment rows loaded from `tfx_riegen_x_disziplinen`.
 *
 * Problem: The legacy Qt/C++ app wrote rows with `int_runde = NULL`.  The web
 * app later writes rows with `int_runde = 1`.  Both map to round 1, so the
 * same (disciplineId, round=1) cell appears twice — the client sees two entries
 * and `buildConflictCells` flags them as a conflict (same squad, same round,
 * different "disc" pair doesn't apply — but two rows for the SAME disc+round
 * cause a false squad-appears-twice trigger after the squad name check).
 *
 * Strategy: for each (disciplineId, round) keep the row that has an explicit
 * `int_runde` value (written by the web app).  Fall back to a NULL row only if
 * no explicit row exists.
 */
export function deduplicateAssignments(rows: RawAssignmentRow[]): MatrixAssignment[] {
  const map = new Map<string, MatrixAssignment>();
  for (const a of rows) {
    const round = a.int_runde ?? 1;
    const key = `${a.int_disziplinenid}_${round}`;
    const current = map.get(key);
    // Prefer explicit int_runde over legacy NULL
    if (!current || a.int_runde !== null) {
      map.set(key, {
        disciplineId: a.int_disziplinenid,
        round,
        squadName: a.var_riege ?? '',
        isFirstDevice: a.bol_erstes_geraet ?? false,
      });
    }
  }
  return Array.from(map.values());
}
