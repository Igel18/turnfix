/**
 * TDD Tests for Participant Birthday Mapping (Issue #102)
 *
 * Problem:
 *   In the event-participants UI (e.g. "Teilnehmer bearbeiten") the birthday
 *   field always shows "01.01." because the API only returns `birthYear` and
 *   the form constructs the date as `YYYY-01-01`.
 *
 * Root causes:
 *   1. Server maps `dat_geburtstag` to `birthYear` only — full date lost.
 *   2. EditParticipantForm.tsx builds `birthday = `${birthYear}-01-01`` —
 *      day and month are always January 1st.
 *
 * Expected behaviour after fix:
 *   - API response includes `birthday` field as ISO date string (YYYY-MM-DD)
 *   - EditParticipantForm initialises its date input from `participant.birthday`
 *     (not from `birthYear`)
 */

import { describe, it, expect } from '@jest/globals';
import { formatBirthday, mapParticipantBirthday } from '../../src/utils/participantBirthdayUtils';

// ─── formatBirthday ────────────────────────────────────────────────────────

describe('formatBirthday()', () => {
  it('returns null for null input', () => {
    expect(formatBirthday(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatBirthday(undefined as any)).toBeNull();
  });

  it('formats a Date object as YYYY-MM-DD', () => {
    // PostgreSQL DATE columns come back as JS Date at UTC midnight
    const d = new Date('2005-03-22T00:00:00.000Z');
    expect(formatBirthday(d)).toBe('2005-03-22');
  });

  it('formats an ISO string date correctly', () => {
    expect(formatBirthday('2010-07-04T00:00:00.000Z')).toBe('2010-07-04');
  });

  it('formats a plain date string YYYY-MM-DD correctly', () => {
    expect(formatBirthday('1999-12-31')).toBe('1999-12-31');
  });

  it('preserves day and month — not just year', () => {
    const d = new Date('2008-11-05T00:00:00.000Z');
    const result = formatBirthday(d);
    expect(result).not.toBe(`${d.getUTCFullYear()}-01-01`); // must NOT be Jan 1st
    expect(result).toBe('2008-11-05');
  });

  it('returns null for an invalid date', () => {
    expect(formatBirthday('not-a-date')).toBeNull();
  });
});

// ─── mapParticipantBirthday ────────────────────────────────────────────────

describe('mapParticipantBirthday()', () => {
  it('adds birthday field alongside birthYear when dat_geburtstag is set', () => {
    const raw = { dat_geburtstag: new Date('2005-03-22T00:00:00.000Z') };
    const result = mapParticipantBirthday(raw);
    expect(result.birthday).toBe('2005-03-22');
    expect(result.birthYear).toBe(2005);
  });

  it('sets both birthday and birthYear to null when dat_geburtstag is null', () => {
    const raw = { dat_geburtstag: null };
    const result = mapParticipantBirthday(raw);
    expect(result.birthday).toBeNull();
    expect(result.birthYear).toBeNull();
  });

  it('preserves day and month in birthday field', () => {
    const raw = { dat_geburtstag: new Date('2000-09-15T00:00:00.000Z') };
    const result = mapParticipantBirthday(raw);
    // must NOT be September 15 reduced to January 1
    expect(result.birthday).toBe('2000-09-15');
    expect(result.birthday).not.toContain('-01-01');
  });
});
