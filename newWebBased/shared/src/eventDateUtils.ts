/**
 * Event date utilities (Shared)
 *
 * SINGLE SOURCE OF TRUTH — used by client and jury-portal.
 * Do NOT duplicate this file. Import from @turnfix/shared.
 *
 * Provides date-range checks for events with start / end dates.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventDateInfo {
  dat_eventstartdate?: string | null;
  dat_eventbeginn?: string | null;
  dat_eventenddate?: string | null;
  dat_eventende?: string | null;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Checks whether an event is happening on a given date.
 *
 * Rules:
 * - If event has both start and end date, `referenceDate` must fall within the range (inclusive).
 * - If event only has a start date, it must match exactly.
 * - Returns false for null/undefined events or events without dates.
 *
 * @param event         Event object with optional date fields.
 * @param referenceDate The date to check against (defaults to today).
 */
export function isEventOnDate(
  event: EventDateInfo | null | undefined,
  referenceDate?: Date,
): boolean {
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
