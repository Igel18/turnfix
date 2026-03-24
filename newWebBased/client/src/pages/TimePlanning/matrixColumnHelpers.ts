/**
 * matrixColumnHelpers — Pure helpers for managing matrix column state.
 *
 * Columns are persisted in localStorage per event.  The stored format supports
 * two column kinds:
 *   - discipline  (t: 'd') — backed by a real discipline from the DB
 *   - pause       (t: 'p') — user-created break / spacer column
 *
 * Backward compatibility: the old format stored a plain number[] (discipline
 * ids).  parseStoredColumns normalises both representations.
 *
 * Point 122 / pause-columns feature.
 */

import type { MatrixDiscipline } from './TimePlanning.types';

// ── Stored types (serialised to / from localStorage) ──────────────────────────

export type StoredDisciplineCol = { t: 'd'; id: number };
export type StoredPauseCol      = { t: 'p'; id: string; label: string };
export type StoredColumn        = StoredDisciplineCol | StoredPauseCol;

// ── Resolved types (for rendering) ───────────────────────────────────────────

export type DisciplineColumn = { kind: 'discipline' } & MatrixDiscipline;
export type PauseColumn      = { kind: 'pause'; id: string; label: string };
export type AnyColumn        = DisciplineColumn | PauseColumn;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Stable string key for a resolved column (used for drag-and-drop tracking). */
export function colKey(col: AnyColumn): string {
  return col.kind === 'discipline' ? `d|${col.id}` : `p|${col.id}`;
}

// ── Parse / serialise ─────────────────────────────────────────────────────────

/**
 * Parse a localStorage value into StoredColumn[].
 * Handles:
 *   - null / missing  → []
 *   - old format (number[]) – discipline ids only
 *   - new format (StoredColumn[])
 */
export function parseStoredColumns(raw: string | null): StoredColumn[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    // Old format: plain number array
    if (typeof parsed[0] === 'number') {
      return (parsed as number[]).map(id => ({ t: 'd' as const, id }));
    }

    // New format: StoredColumn[]
    return (parsed as unknown[]).filter(
      (item): item is StoredColumn =>
        typeof item === 'object' &&
        item !== null &&
        't' in item &&
        ((item as { t: unknown }).t === 'd' || (item as { t: unknown }).t === 'p'),
    );
  } catch {
    return [];
  }
}

export function serializeColumns(columns: StoredColumn[]): string {
  return JSON.stringify(columns);
}

// ── Reconciliation ────────────────────────────────────────────────────────────

/**
 * Ensure every discipline that is currently active in `disciplines` has an
 * explicit entry in `stored`.  Newly linked disciplines are appended at the
 * end.  This guarantees that all discipline columns can be reordered / hidden
 * via storedColumns operations alone – no implicit auto-append needed at render.
 */
export function consolidateColumns(
  stored: StoredColumn[],
  disciplines: MatrixDiscipline[],
): StoredColumn[] {
  const storedDiscIds = new Set(
    stored.filter((s): s is StoredDisciplineCol => s.t === 'd').map(s => s.id),
  );
  const missing = disciplines.filter(d => !storedDiscIds.has(d.id));
  if (missing.length === 0) return stored;
  return [...stored, ...missing.map(d => ({ t: 'd' as const, id: d.id }))];
}

/**
 * Build the fully resolved column list for rendering.
 * Disciplines not yet in `stored` are auto-appended (handles additions between
 * page loads before the next interaction consolidates them).
 */
export function buildColumnList(
  stored: StoredColumn[],
  disciplines: MatrixDiscipline[],
): AnyColumn[] {
  const discById = new Map(disciplines.map(d => [d.id, d]));
  const result: AnyColumn[] = [];
  const seenDiscIds = new Set<number>();

  for (const s of stored) {
    if (s.t === 'd') {
      const disc = discById.get(s.id);
      if (disc) {
        result.push({ kind: 'discipline', ...disc });
        seenDiscIds.add(disc.id);
      }
    } else {
      result.push({ kind: 'pause', id: s.id, label: s.label });
    }
  }

  // Auto-append disciplines not yet in stored
  for (const d of disciplines) {
    if (!seenDiscIds.has(d.id)) {
      result.push({ kind: 'discipline', ...d });
    }
  }
  return result;
}

// ── Mutation helpers (all immutable / pure) ───────────────────────────────────

/** Add a pause column at the end with a unique id. */
export function addPauseColumn(stored: StoredColumn[], label: string): StoredColumn[] {
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return [...stored, { t: 'p', id, label }];
}

/** Remove a pause column by id.  No-op if id is not found. */
export function removePauseColumn(stored: StoredColumn[], pauseId: string): StoredColumn[] {
  return stored.filter(s => !(s.t === 'p' && s.id === pauseId));
}

/** Add a discipline column (no-op if already present). */
export function addDisciplineColumn(stored: StoredColumn[], disciplineId: number): StoredColumn[] {
  if (stored.some(s => s.t === 'd' && s.id === disciplineId)) return stored;
  return [...stored, { t: 'd', id: disciplineId }];
}

/**
 * Remove the last occurrence of a discipline column from the stored list.
 * Pause columns are skipped when searching for the last discipline.
 */
export function removeLastDisciplineColumn(stored: StoredColumn[]): StoredColumn[] {
  for (let i = stored.length - 1; i >= 0; i--) {
    if (stored[i].t === 'd') {
      return [...stored.slice(0, i), ...stored.slice(i + 1)];
    }
  }
  return stored;
}

/** Move a column by index (immutable).  Out-of-range or same-index is a no-op. */
export function reorderColumns(
  stored: StoredColumn[],
  fromIndex: number,
  toIndex: number,
): StoredColumn[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= stored.length ||
    toIndex >= stored.length
  ) {
    return stored;
  }
  const next = [...stored];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/**
 * Remove a specific discipline column by id (e.g. a "Pause"-discipline that is
 * not linked to any competition and should be hidden from the matrix).
 * No-op if the id is not found.
 */
export function removeDisciplineColumn(stored: StoredColumn[], disciplineId: number): StoredColumn[] {
  return stored.filter(s => !(s.t === 'd' && s.id === disciplineId));
}
