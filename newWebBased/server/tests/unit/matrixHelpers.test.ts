/**
 * Unit tests — matrixHelpers.ts
 *
 * Bug context (Point 122):
 *   The legacy Qt/C++ app stored `int_runde = NULL` in tfx_riegen_x_disziplinen.
 *   The web app treats NULL as round 1.  When saving/deleting a round-1 cell the
 *   route must therefore also find/delete rows with int_runde IS NULL, otherwise:
 *     - findFirst misses the legacy row → creates duplicate → DB constraint error
 *     - deleteMany misses the legacy row → stale data remains in the table
 */

import {
  buildMatrixCellFindWhere,
  buildMatrixCellDeleteWhere,
  deduplicateAssignments,
  type RawAssignmentRow,
} from '../../src/utils/matrixHelpers';

// ── buildMatrixCellFindWhere ──────────────────────────────────────────────────

describe('buildMatrixCellFindWhere', () => {
  const EVENT = 1;
  const DISC = 42;

  it('round 1 — includes OR clause matching both int_runde=1 and int_runde=null', () => {
    const where = buildMatrixCellFindWhere(EVENT, DISC, 1) as any;

    expect(where.int_veranstaltungenid).toBe(EVENT);
    expect(where.int_disziplinenid).toBe(DISC);
    expect(where.OR).toBeDefined();
    expect(where.OR).toContainEqual({ int_runde: 1 });
    expect(where.OR).toContainEqual({ int_runde: null });
    // Must NOT set int_runde directly at top level for round 1
    expect(where.int_runde).toBeUndefined();
  });

  it('round 2 — uses exact int_runde value, no OR clause', () => {
    const where = buildMatrixCellFindWhere(EVENT, DISC, 2) as any;

    expect(where.int_runde).toBe(2);
    expect(where.OR).toBeUndefined();
  });

  it('round 10 — uses exact int_runde value', () => {
    const where = buildMatrixCellFindWhere(EVENT, DISC, 10) as any;

    expect(where.int_runde).toBe(10);
    expect(where.OR).toBeUndefined();
  });

  it('always includes eventId and disciplineId', () => {
    const whereR1 = buildMatrixCellFindWhere(5, 99, 1) as any;
    const whereR3 = buildMatrixCellFindWhere(5, 99, 3) as any;

    expect(whereR1.int_veranstaltungenid).toBe(5);
    expect(whereR1.int_disziplinenid).toBe(99);
    expect(whereR3.int_veranstaltungenid).toBe(5);
    expect(whereR3.int_disziplinenid).toBe(99);
  });
});

// ── buildMatrixCellDeleteWhere ────────────────────────────────────────────────

describe('buildMatrixCellDeleteWhere', () => {
  const EVENT = 2;
  const DISC = 7;

  it('round 1 — delete clause matches both int_runde=1 and null (legacy rows)', () => {
    const where = buildMatrixCellDeleteWhere(EVENT, DISC, 1) as any;

    expect(where.OR).toBeDefined();
    expect(where.OR).toContainEqual({ int_runde: 1 });
    expect(where.OR).toContainEqual({ int_runde: null });
  });

  it('round 1 — does NOT add a top-level int_runde (would conflict with OR)', () => {
    const where = buildMatrixCellDeleteWhere(EVENT, DISC, 1) as any;

    expect(where.int_runde).toBeUndefined();
  });

  it('round 3 — simple exact match, no OR clause', () => {
    const where = buildMatrixCellDeleteWhere(EVENT, DISC, 3) as any;

    expect(where.int_runde).toBe(3);
    expect(where.OR).toBeUndefined();
  });

  it('return values for round 1 find and delete are structurally identical', () => {
    const find = buildMatrixCellFindWhere(1, 1, 1);
    const del = buildMatrixCellDeleteWhere(1, 1, 1);

    expect(find).toEqual(del);
  });
});

// ── deduplicateAssignments ────────────────────────────────────────────────────

const row = (discId: number, runde: number | null, riege: string | null, erstes = false): RawAssignmentRow => ({
  int_disziplinenid: discId,
  int_runde: runde,
  var_riege: riege,
  bol_erstes_geraet: erstes,
});

describe('deduplicateAssignments', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateAssignments([])).toEqual([]);
  });

  it('maps int_runde=null to round 1', () => {
    const result = deduplicateAssignments([row(10, null, 'vBlau')]);
    expect(result).toHaveLength(1);
    expect(result[0].round).toBe(1);
    expect(result[0].squadName).toBe('vBlau');
  });

  it('maps explicit int_runde=1 to round 1', () => {
    const result = deduplicateAssignments([row(10, 1, 'vRot')]);
    expect(result[0].round).toBe(1);
  });

  it('deduplicates: legacy NULL row + explicit round-1 row → keeps explicit row', () => {
    // Legacy Qt row (NULL) + web-app row (1) for same disc — must produce ONE entry
    const result = deduplicateAssignments([
      row(10, null, 'vAlt'),   // legacy
      row(10, 1,    'vNeu'),   // explicit (written by web app after first save)
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].squadName).toBe('vNeu'); // explicit wins
  });

  it('deduplicates: explicit row first, then legacy NULL — explicit still wins', () => {
    const result = deduplicateAssignments([
      row(10, 1,    'vNeu'),
      row(10, null, 'vAlt'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].squadName).toBe('vNeu');
  });

  it('does NOT deduplicate rows with different discipline IDs', () => {
    const result = deduplicateAssignments([
      row(10, 1, 'vBlau'),
      row(20, 1, 'vBlau'),
    ]);
    expect(result).toHaveLength(2);
  });

  it('does NOT deduplicate rows with different rounds', () => {
    const result = deduplicateAssignments([
      row(10, 1, 'vBlau'),
      row(10, 2, 'vBlau'),
    ]);
    expect(result).toHaveLength(2);
    expect(result.find(r => r.round === 1)?.squadName).toBe('vBlau');
    expect(result.find(r => r.round === 2)?.squadName).toBe('vBlau');
  });

  it('preserves all fields: disciplineId, round, squadName, isFirstDevice', () => {
    const result = deduplicateAssignments([row(42, 3, 'mGrün', true)]);
    expect(result[0]).toEqual({
      disciplineId: 42,
      round: 3,
      squadName: 'mGrün',
      isFirstDevice: true,
    });
  });

  it('normalizes null var_riege to empty string', () => {
    const result = deduplicateAssignments([row(10, 1, null)]);
    expect(result[0].squadName).toBe('');
  });

  it('normalizes null bol_erstes_geraet to false', () => {
    const result = deduplicateAssignments([row(10, 1, 'vBlau', null as any)]);
    expect(result[0].isFirstDevice).toBe(false);
  });

  it('real-world scenario: 6 disciplines with mixed NULL/explicit rows produces 6 entries', () => {
    const input: RawAssignmentRow[] = [
      row(1, null, 'vBlau'),   // legacy
      row(1, 1,    'vBlau'),   // explicit (same squad → idempotent)
      row(2, null, 'vRot'),
      row(3, 1,    'vGrün'),
      row(4, null, 'vGelb'),
      row(4, 1,    'vGelb'),
      row(5, 2,    'vBlau'),
      row(6, 3,    'vRot'),
    ];
    const result = deduplicateAssignments(input);
    // disc 1: 1 (dedup), disc 2: 1, disc 3: 1, disc 4: 1 (dedup), disc 5: round 2, disc 6: round 3
    expect(result).toHaveLength(6);
  });
});
