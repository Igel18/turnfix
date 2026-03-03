/**
 * Helper functions for score saving logic in the Jury Portal.
 * 
 * Extracted for testability (TDD) — determines which endpoint to use
 * when creating a wertungenId for formula-based scoring.
 */

/**
 * Determines the correct API endpoint and body for creating a wertungenId.
 * 
 * For formula disciplines that don't yet have a wertungenId, we need to
 * create one BEFORE saving individual formula field values.
 * 
 * IMPORTANT: We use `/scores/create-wertung` (NOT `/scores/save-value`)
 * because `save-value` emits a Socket.IO `score-updated` event with score=0,
 * which causes a ghost "0.00" entry in live-scores before the real score appears.
 * `create-wertung` only creates the DB record without emitting socket events.
 * 
 * @param apiBaseUrl - The base API URL
 * @param competitionId - The competition ID
 * @param participantId - The participant ID
 * @param disciplineId - The discipline ID
 * @returns Object with url and body for the fetch call
 */
export function getCreateWertungRequest(
  apiBaseUrl: string,
  competitionId: number,
  participantId: number,
  disciplineId: number
): { url: string; body: Record<string, number> } {
  return {
    url: `${apiBaseUrl}/scores/create-wertung`,
    body: {
      competitionId,
      participantId,
      disciplineId
    }
  };
}

/**
 * Extracts wertungenId from create-wertung API response.
 * 
 * @param responseData - The parsed JSON response from create-wertung endpoint
 * @returns The wertungenId or undefined if not found
 */
export function extractWertungenId(responseData: any): number | undefined {
  if (!responseData) return undefined;
  return responseData.wertungenId || undefined;
}
