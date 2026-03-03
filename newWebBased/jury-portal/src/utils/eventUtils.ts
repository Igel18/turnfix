/**
 * Event utility functions for the Jury Portal.
 * Extracted from JuryPortal.tsx for testability.
 */

export interface EventDateInfo {
  dat_eventstartdate?: string | null;
  dat_eventbeginn?: string | null;
  dat_eventenddate?: string | null;
  dat_eventende?: string | null;
}

/**
 * Checks whether an event is happening on a given date.
 *
 * Rules:
 * - If event has both start and end date, `referenceDate` must fall within the range (inclusive)
 * - If event only has a start date, it must match exactly
 * - Returns false for null/undefined events or events without dates
 *
 * @param event       Event object with date fields
 * @param referenceDate  The date to check against (defaults to today)
 */
export function isEventOnDate(event: EventDateInfo | null | undefined, referenceDate?: Date): boolean {
  if (!event) return false;

  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = event.dat_eventstartdate || event.dat_eventbeginn;
  if (!startDate) return false;

  const eventStart = new Date(startDate);
  eventStart.setHours(0, 0, 0, 0);

  const endDate = event.dat_eventenddate || event.dat_eventende;
  if (endDate) {
    const eventEnd = new Date(endDate);
    eventEnd.setHours(0, 0, 0, 0);
    return today >= eventStart && today <= eventEnd;
  }

  return today.getTime() === eventStart.getTime();
}

/**
 * Score validation result
 */
export interface ScoreValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates a score value against the maximum allowed score for a discipline.
 *
 * Rules:
 * - Empty or missing values are considered valid (nothing to validate)
 * - If maxScore is 0 or not set, no upper bound is enforced
 * - Score exceeding maxScore is invalid
 *
 * @param scoreValue  The score string entered by the user
 * @param maxScore    Maximum allowed score (0 = no limit)
 */
export function validateScore(scoreValue: string, maxScore: number): ScoreValidationResult {
  if (!scoreValue || scoreValue.trim() === '') {
    return { isValid: true, message: '' };
  }

  const numericScore = parseFloat(scoreValue);

  if (isNaN(numericScore)) {
    return { isValid: false, message: 'Ungültiger Wert' };
  }

  if (maxScore > 0 && numericScore > maxScore) {
    return {
      isValid: false,
      message: `Der Wert überschreitet die maximale Punktzahl von ${maxScore.toFixed(2)}`
    };
  }

  return { isValid: true, message: '' };
}
