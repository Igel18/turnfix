/**
 * Age eligibility check utilities for competitions.
 *
 * Two modes are supported:
 *
 * 1. **Year-only** (`ageMatchesByBirthYear`) — **DEFAULT**
 *    German gymnastics practice: only the birth *year* is compared against the
 *    competition's age window.  Month and day are ignored.
 *    Formula: `eventYear - birthYear ∈ [ageFrom, ageTo]`
 *
 * 2. **Exact** (`ageMatchesExact`)
 *    Uses the exact date of birth.  A participant who turns the required age
 *    AFTER the reference date does not yet qualify.
 *    Kept for completeness; not the default.
 *
 * Both functions return `true` when the input data is unknown / invalid so
 * that missing data never unintentionally blocks a participant.
 */

// ── Year-only (DEFAULT) ───────────────────────────────────────────────────────

/**
 * Year-only age check (DEFAULT mode).
 *
 * Only the participant's birth year is compared — month and day are irrelevant.
 * A participant born in a given year is treated as turning `eventYear - birthYear`
 * during that event year, regardless of the actual month they were born in.
 *
 * @param birthYear  - The participant's birth year (e.g. 2010).
 * @param ageFrom    - Minimum age for the competition (inclusive).
 * @param ageTo      - Maximum age for the competition (inclusive).
 * @param eventYear  - The year of the event (defaults to current year).
 * @returns `true` if the participant is eligible, `false` otherwise.
 */
export function ageMatchesByBirthYear(
  birthYear: number,
  ageFrom: number,
  ageTo: number,
  eventYear: number = new Date().getFullYear(),
): boolean {
  if (!birthYear || isNaN(birthYear) || birthYear <= 0) return true; // unknown → pass
  const age = eventYear - birthYear;
  if (age <= 0) return true; // implausible data → pass
  const minAge = Math.min(ageFrom, ageTo);
  const maxAge = Math.max(ageFrom, ageTo);
  return age >= minAge && age <= maxAge;
}

// ── Exact (kept for reference) ────────────────────────────────────────────────

/**
 * Exact age check (NOT the default).
 *
 * Takes the full birthdate into account.  A participant who turns the required
 * age AFTER the reference date does not yet pass.
 *
 * @param birthday      - Full birthdate string in `YYYY-MM-DD` format.
 * @param ageFrom       - Minimum age for the competition (inclusive).
 * @param ageTo         - Maximum age for the competition (inclusive).
 * @param referenceDate - Date used as "today" (defaults to actual today).
 * @returns `true` if the participant is eligible, `false` otherwise.
 */
export function ageMatchesExact(
  birthday: string,
  ageFrom: number,
  ageTo: number,
  referenceDate: Date = new Date(),
): boolean {
  if (!birthday) return true;
  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return true;
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age <= 0) return true;
  const minAge = Math.min(ageFrom, ageTo);
  const maxAge = Math.max(ageFrom, ageTo);
  return age >= minAge && age <= maxAge;
}
