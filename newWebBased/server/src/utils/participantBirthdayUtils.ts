/**
 * Utility functions for participant birthday handling (Issue #102)
 *
 * PostgreSQL DATE columns (dat_geburtstag) are returned by Prisma raw queries
 * as JavaScript Date objects set to UTC midnight of that day.
 * We must expose the full date (YYYY-MM-DD) to the client so that the
 * "Teilnehmer bearbeiten" form can show the correct day and month — not just
 * the year.
 */

/**
 * Formats a raw birthday value (JS Date, ISO string, or null) as a
 * YYYY-MM-DD string suitable for <input type="date">.
 *
 * Uses UTC methods since PostgreSQL DATE columns are returned as
 * UTC-midnight Date objects by Prisma.
 *
 * @returns YYYY-MM-DD string, or null when the value is missing / invalid.
 */
export function formatBirthday(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  const d = new Date(value as any);

  if (isNaN(d.getTime())) return null;

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Maps a raw DB participant row fragment that has `dat_geburtstag` to a
 * typed object with both `birthday` (full date string) and `birthYear`
 * (integer year).
 */
export function mapParticipantBirthday(raw: { dat_geburtstag: Date | string | null | undefined }): {
  birthday: string | null;
  birthYear: number | null;
} {
  const birthday = formatBirthday(raw.dat_geburtstag);
  const birthYear = birthday ? parseInt(birthday.split('-')[0], 10) : null;
  return { birthday, birthYear };
}
