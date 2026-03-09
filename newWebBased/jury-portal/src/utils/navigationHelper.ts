/**
 * Navigation helper for score clearing logic in the Jury Portal.
 *
 * Extracted from JuryPortal.tsx so the logic can be unit-tested independently.
 * These pure functions determine what state should be set when the user navigates
 * between participants.
 */

export interface NavigationParticipant {
  currentScore?: number | null;
  wertungenId?: number | null;
}

/**
 * Returns the score string that should be displayed when navigating to a participant.
 * 
 * Rules:
 * - If participant has an existing score, show it (formatted)
 * - If participant has NO existing score, return empty string
 * - NEVER carry over previous participant's score
 */
export function getScoreForParticipant(
  participant: NavigationParticipant | undefined | null
): string {
  if (!participant) return '';
  
  // Only show existing score if participant has one
  if (participant.currentScore !== null && participant.currentScore !== undefined) {
    return participant.currentScore.toString();
  }
  
  return '';
}

/**
 * Returns whether loadedJuryResults should be cleared when navigating to a participant.
 * 
 * Rules:
 * - If participant has no wertungenId, clear results (return empty object)
 * - If participant HAS wertungenId, results will be loaded async (return null = don't clear yet)
 */
export function shouldClearJuryResults(
  participant: NavigationParticipant | undefined | null
): boolean {
  if (!participant) return true;
  if (!participant.wertungenId) return true;
  return false; // Has wertungenId — will be loaded from API
}
