/**
 * Pure helper functions for Squad Discipline Status operations.
 * 
 * Extracted for unit-testability (Issue #104).
 */

export interface StatusRow {
  int_statusid: number;
  var_name: string;
}

/**
 * Normalizes a status name for comparison by trimming whitespace and lowercasing.
 */
export function normalizeStatusName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Finds a status by name from a list of status rows.
 * 
 * Match priority:
 *  1. Exact match (case-insensitive)
 *  2. Partial match: DB name contains the search name, or vice-versa
 *     (handles singular/plural typos, e.g. 'Leistung erfasst' → 'Leistungen erfasst')
 * 
 * Returns null if no match found or name is empty.
 */
export function findStatusByName(statuses: StatusRow[], name: string): StatusRow | null {
  if (!name || name.trim() === '') return null;

  const normalized = normalizeStatusName(name);

  // 1. Exact match (case-insensitive)
  const exact = statuses.find(s => normalizeStatusName(s.var_name) === normalized);
  if (exact) return exact;

  // 2. Partial match: DB name starts with or contains the search term, or vice-versa
  const partial = statuses.find(s => {
    const dbNorm = normalizeStatusName(s.var_name);
    return dbNorm.includes(normalized) || normalized.includes(dbNorm);
  });
  if (partial) return partial;

  // 3. Word-based partial match: all words in the query appear in the DB name
  // (handles singular/plural: 'Leistung erfasst' → 'Leistungen erfasst')
  const queryWords = normalized.split(/\s+/).filter(Boolean);
  const wordMatch = statuses.find(s => {
    const dbNorm = normalizeStatusName(s.var_name);
    return queryWords.every(word => dbNorm.includes(word) || dbNorm.split(/\s+/).some(dbWord => dbWord.startsWith(word)));
  });
  return wordMatch ?? null;
}
