/**
 * matrixColumnHelpers — unit tests
 * Point 122 / pause-columns feature.
 */

import { describe, it, expect } from 'vitest';
import {
  parseStoredColumns,
  serializeColumns,
  buildColumnList,
  consolidateColumns,
  addPauseColumn,
  removePauseColumn,
  addDisciplineColumn,
  removeLastDisciplineColumn,
  removeDisciplineColumn,
  reorderColumns,
  colKey,
  type StoredColumn,
  type AnyColumn,
} from '../../pages/TimePlanning/matrixColumnHelpers';
import type { MatrixDiscipline } from '../../pages/TimePlanning/TimePlanning.types';

const disc = (id: number): MatrixDiscipline => ({
  id,
  name: `Gerät ${id}`,
  shortName: `G${id}`,
});

// ── parseStoredColumns ────────────────────────────────────────────────────────

describe('parseStoredColumns', () => {
  it('returns [] for null', () => {
    expect(parseStoredColumns(null)).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(parseStoredColumns('')).toEqual([]);
  });

  it('returns [] for empty JSON array', () => {
    expect(parseStoredColumns('[]')).toEqual([]);
  });

  it('returns [] for invalid JSON', () => {
    expect(parseStoredColumns('not-json')).toEqual([]);
  });

  it('converts old number[] format', () => {
    expect(parseStoredColumns('[1,2,3]')).toEqual([
      { t: 'd', id: 1 },
      { t: 'd', id: 2 },
      { t: 'd', id: 3 },
    ]);
  });

  it('parses new discipline-only format', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 5 }, { t: 'd', id: 7 }];
    expect(parseStoredColumns(JSON.stringify(stored))).toEqual(stored);
  });

  it('parses mixed discipline + pause', () => {
    const stored: StoredColumn[] = [
      { t: 'd', id: 1 },
      { t: 'p', id: 'p_abc', label: 'Pause' },
      { t: 'd', id: 2 },
    ];
    expect(parseStoredColumns(JSON.stringify(stored))).toEqual(stored);
  });

  it('filters items with unknown type', () => {
    const raw = JSON.stringify([{ t: 'x', id: 1 }, { t: 'd', id: 2 }]);
    expect(parseStoredColumns(raw)).toEqual([{ t: 'd', id: 2 }]);
  });

  it('handles non-object items in array gracefully', () => {
    const raw = JSON.stringify([null, { t: 'd', id: 3 }, 'string']);
    expect(parseStoredColumns(raw)).toEqual([{ t: 'd', id: 3 }]);
  });
});

// ── serializeColumns ──────────────────────────────────────────────────────────

describe('serializeColumns', () => {
  it('serialises to valid JSON', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'p', id: 'p1', label: 'P' }];
    const json = serializeColumns(stored);
    expect(JSON.parse(json)).toEqual(stored);
  });

  it('round-trips through parseStoredColumns', () => {
    const stored: StoredColumn[] = [
      { t: 'd', id: 10 },
      { t: 'p', id: 'p_123', label: 'Mittagspause' },
      { t: 'd', id: 20 },
    ];
    expect(parseStoredColumns(serializeColumns(stored))).toEqual(stored);
  });
});

// ── consolidateColumns ────────────────────────────────────────────────────────

describe('consolidateColumns', () => {
  it('returns unchanged when all disciplines are present', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }];
    expect(consolidateColumns(stored, [disc(1), disc(2)])).toEqual(stored);
  });

  it('appends missing disciplines at the end', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    const result = consolidateColumns(stored, [disc(1), disc(2), disc(3)]);
    expect(result).toEqual([
      { t: 'd', id: 1 },
      { t: 'd', id: 2 },
      { t: 'd', id: 3 },
    ]);
  });

  it('preserves pause columns and their positions', () => {
    const stored: StoredColumn[] = [
      { t: 'd', id: 1 },
      { t: 'p', id: 'p1', label: 'Pause' },
    ];
    const result = consolidateColumns(stored, [disc(1), disc(2)]);
    expect(result).toEqual([
      { t: 'd', id: 1 },
      { t: 'p', id: 'p1', label: 'Pause' },
      { t: 'd', id: 2 },
    ]);
  });

  it('returns unchanged when disciplines list is empty', () => {
    const stored: StoredColumn[] = [{ t: 'p', id: 'p1', label: 'P' }];
    expect(consolidateColumns(stored, [])).toEqual(stored);
  });
});

// ── buildColumnList ───────────────────────────────────────────────────────────

describe('buildColumnList', () => {
  it('returns [] when both args empty', () => {
    expect(buildColumnList([], [])).toEqual([]);
  });

  it('resolves discipline columns in stored order', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 2 }, { t: 'd', id: 1 }];
    const result = buildColumnList(stored, [disc(1), disc(2)]);
    expect(result.map(c => (c.kind === 'discipline' ? c.id : 'p'))).toEqual([2, 1]);
  });

  it('includes pause columns at the correct position', () => {
    const stored: StoredColumn[] = [
      { t: 'd', id: 1 },
      { t: 'p', id: 'p1', label: 'Mittagspause' },
      { t: 'd', id: 2 },
    ];
    const result = buildColumnList(stored, [disc(1), disc(2)]);
    expect(result).toHaveLength(3);
    expect(result[1]).toMatchObject({ kind: 'pause', id: 'p1', label: 'Mittagspause' });
  });

  it('appends disciplines not in stored at the end', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    const result = buildColumnList(stored, [disc(1), disc(2)]);
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ kind: 'discipline', id: 2 });
  });

  it('skips stored discipline ids that no longer exist in disciplines', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 99 }, { t: 'd', id: 1 }];
    const result = buildColumnList(stored, [disc(1)]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'discipline', id: 1 });
  });

  it('enriches discipline columns with name and shortName from disciplines', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 5 }];
    const result = buildColumnList(stored, [disc(5)]);
    expect(result[0]).toMatchObject({ kind: 'discipline', id: 5, name: 'Gerät 5', shortName: 'G5' });
  });
});

// ── colKey ────────────────────────────────────────────────────────────────────

describe('colKey', () => {
  it('prefixes discipline columns with d|', () => {
    const col: AnyColumn = { kind: 'discipline', id: 42, name: 'B', shortName: 'B' };
    expect(colKey(col)).toBe('d|42');
  });

  it('prefixes pause columns with p|', () => {
    const col: AnyColumn = { kind: 'pause', id: 'p_123', label: 'Pause' };
    expect(colKey(col)).toBe('p|p_123');
  });
});

// ── addPauseColumn ────────────────────────────────────────────────────────────

describe('addPauseColumn', () => {
  it('adds a pause column at the end', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    const result = addPauseColumn(stored, 'Pause');
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ t: 'p', label: 'Pause' });
    expect(typeof (result[1] as Extract<StoredColumn, { t: 'p' }>).id).toBe('string');
  });

  it('does not mutate the original array', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    addPauseColumn(stored, 'X');
    expect(stored).toHaveLength(1);
  });

  it('generates unique ids for consecutive calls', () => {
    let stored: StoredColumn[] = [];
    stored = addPauseColumn(stored, 'P1');
    stored = addPauseColumn(stored, 'P2');
    const ids = stored.filter(s => s.t === 'p').map(s => (s as Extract<StoredColumn, { t: 'p' }>).id);
    expect(new Set(ids).size).toBe(2);
  });
});

// ── removePauseColumn ─────────────────────────────────────────────────────────

describe('removePauseColumn', () => {
  it('removes pause column by id', () => {
    const stored: StoredColumn[] = [
      { t: 'd', id: 1 },
      { t: 'p', id: 'p1', label: 'Pause' },
      { t: 'd', id: 2 },
    ];
    const result = removePauseColumn(stored, 'p1');
    expect(result).toHaveLength(2);
    expect(result.every(s => s.t !== 'p')).toBe(true);
  });

  it('is a no-op for unknown id', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    expect(removePauseColumn(stored, 'does-not-exist')).toEqual(stored);
  });

  it('does not remove discipline columns', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    expect(removePauseColumn(stored, '1')).toEqual(stored);
  });
});

// ── addDisciplineColumn ───────────────────────────────────────────────────────

describe('addDisciplineColumn', () => {
  it('adds a discipline column at the end', () => {
    const result = addDisciplineColumn([], 5);
    expect(result).toEqual([{ t: 'd', id: 5 }]);
  });

  it('does not add a duplicate discipline', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 5 }];
    expect(addDisciplineColumn(stored, 5)).toEqual(stored);
  });

  it('does not mutate the original array', () => {
    const stored: StoredColumn[] = [];
    addDisciplineColumn(stored, 3);
    expect(stored).toHaveLength(0);
  });
});

// ── removeLastDisciplineColumn ────────────────────────────────────────────────

describe('removeLastDisciplineColumn', () => {
  it('removes the last discipline column', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }];
    expect(removeLastDisciplineColumn(stored)).toEqual([{ t: 'd', id: 1 }]);
  });

  it('skips trailing pause columns to find last discipline', () => {
    const stored: StoredColumn[] = [
      { t: 'd', id: 1 },
      { t: 'd', id: 2 },
      { t: 'p', id: 'p1', label: 'Pause' },
    ];
    const result = removeLastDisciplineColumn(stored);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ t: 'd', id: 1 });
    expect(result).toContainEqual({ t: 'p', id: 'p1', label: 'Pause' });
  });

  it('removes middle discipline when last is pause', () => {
    const stored: StoredColumn[] = [
      { t: 'd', id: 1 },
      { t: 'p', id: 'p1', label: 'Pause' },
      { t: 'd', id: 2 },
      { t: 'p', id: 'p2', label: 'Pause2' },
    ];
    const result = removeLastDisciplineColumn(stored);
    // id:2 was the last discipline, so it should be gone
    expect(result.some(s => s.t === 'd' && s.id === 2)).toBe(false);
    expect(result).toHaveLength(3);
  });

  it('returns unchanged when there are no discipline columns', () => {
    const stored: StoredColumn[] = [{ t: 'p', id: 'p1', label: 'Pause' }];
    expect(removeLastDisciplineColumn(stored)).toEqual(stored);
  });

  it('returns [] when only one discipline and no pauses', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    expect(removeLastDisciplineColumn(stored)).toEqual([]);
  });
});

// ── reorderColumns ────────────────────────────────────────────────────────────

describe('reorderColumns', () => {
  it('moves a column forward', () => {
    const s: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }, { t: 'd', id: 3 }];
    // Move index 0 → index 2
    const result = reorderColumns(s, 0, 2);
    expect(result.map(c => (c as Extract<StoredColumn, { t: 'd' }>).id)).toEqual([2, 3, 1]);
  });

  it('moves a column backward', () => {
    const s: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }, { t: 'd', id: 3 }];
    const result = reorderColumns(s, 2, 0);
    expect(result.map(c => (c as Extract<StoredColumn, { t: 'd' }>).id)).toEqual([3, 1, 2]);
  });

  it('is a no-op when fromIndex === toIndex', () => {
    const s: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }];
    expect(reorderColumns(s, 1, 1)).toEqual(s);
  });

  it('is a no-op for negative indices', () => {
    const s: StoredColumn[] = [{ t: 'd', id: 1 }];
    expect(reorderColumns(s, -1, 0)).toEqual(s);
  });

  it('is a no-op for out-of-range indices', () => {
    const s: StoredColumn[] = [{ t: 'd', id: 1 }];
    expect(reorderColumns(s, 0, 5)).toEqual(s);
  });

  it('moves a pause column to a new position', () => {
    const s: StoredColumn[] = [
      { t: 'd', id: 1 },
      { t: 'p', id: 'p1', label: 'Pause' },
      { t: 'd', id: 2 },
    ];
    // Move pause (idx 1) to end (idx 2)
    const result = reorderColumns(s, 1, 2);
    expect(result[0]).toMatchObject({ t: 'd', id: 1 });
    expect(result[1]).toMatchObject({ t: 'd', id: 2 });
    expect(result[2]).toMatchObject({ t: 'p', id: 'p1' });
  });

  it('does not mutate the original array', () => {
    const s: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }];
    reorderColumns(s, 0, 1);
    expect(s[0]).toMatchObject({ id: 1 });
  });
});

// ── removeDisciplineColumn ────────────────────────────────────────────────────

describe('removeDisciplineColumn', () => {
  it('removes the discipline column with the given id', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }, { t: 'd', id: 3 }];
    expect(removeDisciplineColumn(stored, 2)).toEqual([{ t: 'd', id: 1 }, { t: 'd', id: 3 }]);
  });

  it('removes a discipline column that is surrounded by pause columns', () => {
    const stored: StoredColumn[] = [
      { t: 'p', id: 'p1', label: 'Pause' },
      { t: 'd', id: 5 },
      { t: 'p', id: 'p2', label: 'Pause 2' },
    ];
    const result = removeDisciplineColumn(stored, 5);
    expect(result).toHaveLength(2);
    expect(result.every(s => s.t === 'p')).toBe(true);
  });

  it('is a no-op for an id that does not exist', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }];
    expect(removeDisciplineColumn(stored, 999)).toEqual(stored);
  });

  it('does not remove pause columns when their id happens to match a number', () => {
    // pauseId is a string like 'p_123', disciplineId is a number — no collision possible
    const stored: StoredColumn[] = [{ t: 'p', id: 'p_1', label: 'P' }, { t: 'd', id: 1 }];
    const result = removeDisciplineColumn(stored, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ t: 'p' });
  });

  it('does not mutate the original array', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 1 }, { t: 'd', id: 2 }];
    removeDisciplineColumn(stored, 1);
    expect(stored).toHaveLength(2);
  });

  it('returns [] when the only column is removed', () => {
    const stored: StoredColumn[] = [{ t: 'd', id: 7 }];
    expect(removeDisciplineColumn(stored, 7)).toEqual([]);
  });
});
