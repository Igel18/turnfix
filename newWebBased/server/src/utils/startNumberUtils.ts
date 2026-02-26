/**
 * Start Number Utilities — Manages automatic start number assignment for participants.
 *
 * Provides:
 *   - getNextStartNumber()            — Get the next available start number for an event
 *   - generateStartNumbersForEvent()  — Assign sequential start numbers to all participants
 *   - assignStartNumberForEntry()     — Assign start number to a single new wertung entry
 *
 * Start numbers (int_startnummer) live in tfx_wertungen and are event-scoped.
 * Each participant in an event should have a unique start number across all
 * competitions within that event.
 */

import prisma from '../lib/prisma';

/**
 * Get the next available start number for an event.
 * Returns MAX(int_startnummer) + 1 across all competitions in the event,
 * or 1 if no start numbers have been assigned yet.
 */
export async function getNextStartNumber(eventId: number): Promise<number> {
  const result = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(MAX(wr.int_startnummer), 0) AS max_nr
       FROM tfx_wertungen wr
       JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
      WHERE w.int_veranstaltungenid = $1
        AND wr.int_startnummer IS NOT NULL
        AND wr.int_startnummer > 0`,
    eventId
  ) as Array<{ max_nr: number }>;

  return (Number(result[0]?.max_nr) || 0) + 1;
}

/**
 * Get the next available start number for a specific competition.
 * Falls back to event-scoped numbering to ensure uniqueness across the event.
 */
export async function getNextStartNumberForCompetition(competitionId: number): Promise<number> {
  // First, get the event ID for this competition
  const competition = await prisma.tfx_wettkaempfe.findUnique({
    where: { int_wettkaempfeid: competitionId },
    select: { int_veranstaltungenid: true }
  });

  if (!competition) {
    return 1;
  }

  return getNextStartNumber(competition.int_veranstaltungenid);
}

/**
 * Generate sequential start numbers for all participants in an event.
 * Assigns 1, 2, 3, ... ordered by participant ID.
 *
 * This assigns each unique participant a consistent start number across
 * all of their competition entries within the event.
 *
 * @returns The number of wertungen entries updated
 */
export async function generateStartNumbersForEvent(eventId: number): Promise<number> {
  // Get all wertungen entries for the event, grouped by participant
  const participants = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT wr.int_teilnehmerid
       FROM tfx_wertungen wr
       JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
      WHERE w.int_veranstaltungenid = $1
      ORDER BY wr.int_teilnehmerid ASC`,
    eventId
  ) as Array<{ int_teilnehmerid: number }>;

  let updatedCount = 0;
  let startNumber = 1;

  for (const participant of participants) {
    // Assign the same start number to all wertungen entries for this participant
    const result = await prisma.$queryRawUnsafe(
      `UPDATE tfx_wertungen SET int_startnummer = $1
        WHERE int_teilnehmerid = $2
          AND int_wettkaempfeid IN (
            SELECT int_wettkaempfeid FROM tfx_wettkaempfe
            WHERE int_veranstaltungenid = $3
          )`,
      startNumber,
      participant.int_teilnehmerid,
      eventId
    );

    updatedCount++;
    startNumber++;
  }

  return updatedCount;
}
