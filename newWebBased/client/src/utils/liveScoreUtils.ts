/**
 * Helper functions for live score display formatting.
 * 
 * Extracted from LiveScoreUpdates.tsx for testability.
 */

/**
 * Returns the display text for a discipline name.
 * 
 * IMPORTANT: Full name is preferred over abbreviation for clarity.
 * Shows: "Schwebebalken" instead of "Schw" or "SB"
 * 
 * @param disciplineName - Full discipline name (e.g., "Schwebebalken")
 * @param disciplineShort - Abbreviated discipline name (e.g., "SB")
 * @returns The name to display — full name preferred, abbreviation as fallback
 */
export function getDisplayDisciplineName(
  disciplineName: string | undefined | null,
  disciplineShort: string | undefined | null
): string {
  return disciplineName || disciplineShort || 'Unbekannt';
}
