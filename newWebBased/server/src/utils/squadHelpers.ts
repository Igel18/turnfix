/**
 * Squad Management Helpers
 *
 * Pure functions extracted from squadManagement.ts for unit-testability.
 *
 * KEY RULE: A participant should appear in the "available" list (middle column)
 * ONLY if they have NO squad assignment for ANY of their competitions in the event.
 * If a participant has at least one competition row with a squad assigned,
 * they are considered "already assigned" and should NOT appear.
 */

/**
 * Determine if a participant should be considered "available" (not assigned to any squad).
 *
 * A participant has multiple rows in tfx_wertungen — one per competition they're registered in.
 * Each row can have a different var_riege value.
 *
 * Rule: A participant is "available" (unassigned) ONLY if ALL their competition rows
 * have var_riege = NULL, empty, or 'Unassigned'. If ANY row has a real squad name,
 * the participant is considered assigned and should NOT appear.
 *
 * @param squadValues Array of var_riege values from all the participant's competition rows
 * @returns true if participant should appear in the "available" list
 */
export function isParticipantAvailable(squadValues: (string | null | undefined)[]): boolean {
  if (squadValues.length === 0) return true; // No competition rows → available by default

  // Participant is available ONLY if NONE of their rows have a real squad assignment
  return squadValues.every(value => isUnassignedSquadValue(value));
}

/**
 * Check if a single var_riege value represents "no squad assignment".
 *
 * @param value A var_riege value from tfx_wertungen
 * @returns true if this value means "not assigned to a squad"
 */
export function isUnassignedSquadValue(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === 'Unassigned';
}

/**
 * Build the SQL WHERE clause fragment that correctly filters for available participants.
 *
 * Instead of row-level filtering (which misses participants with partial assignments),
 * we use a NOT EXISTS subquery to exclude any participant who has at least one
 * squad assignment in the event.
 *
 * @returns SQL fragment for the available-participants query
 */
export function buildAvailableParticipantsWhereClause(): string {
  return `
    wk.int_veranstaltungenid = $1
    AND NOT EXISTS (
      SELECT 1
      FROM tfx_wertungen w2
      INNER JOIN tfx_wettkaempfe wk2 ON w2.int_wettkaempfeid = wk2.int_wettkaempfeid
      WHERE wk2.int_veranstaltungenid = $1
        AND w2.int_teilnehmerid = t.int_teilnehmerid
        AND w2.var_riege IS NOT NULL
        AND w2.var_riege != ''
        AND w2.var_riege != 'Unassigned'
    )
  `.trim();
}
