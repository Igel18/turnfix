import { describe, it, expect } from 'vitest';
import { ageMatchesByBirthYear, ageMatchesExact } from '../ageCheckUtils';

// ── ageMatchesByBirthYear ─────────────────────────────────────────────────────

describe('ageMatchesByBirthYear', () => {
  const EVENT_YEAR = 2026;

  it('accepts participant whose birth year places them exactly at ageFrom', () => {
    // eventYear(2026) - birthYear(2016) = 10, ageFrom = 10
    expect(ageMatchesByBirthYear(2016, 10, 14, EVENT_YEAR)).toBe(true);
  });

  it('accepts participant whose birth year places them exactly at ageTo', () => {
    // 2026 - 2012 = 14, ageTo = 14
    expect(ageMatchesByBirthYear(2012, 10, 14, EVENT_YEAR)).toBe(true);
  });

  it('accepts participant inside the age range', () => {
    // 2026 - 2014 = 12
    expect(ageMatchesByBirthYear(2014, 10, 14, EVENT_YEAR)).toBe(true);
  });

  it('rejects participant born too recently (too young)', () => {
    // 2026 - 2017 = 9 < 10
    expect(ageMatchesByBirthYear(2017, 10, 14, EVENT_YEAR)).toBe(false);
  });

  it('rejects participant born too long ago (too old)', () => {
    // 2026 - 2011 = 15 > 14
    expect(ageMatchesByBirthYear(2011, 10, 14, EVENT_YEAR)).toBe(false);
  });

  it('ignores month and day — accepts participant who has NOT yet had birthday this year', () => {
    // Born December 2016 → exact age on March 25 is only 9, but year-only gives 10 → PASSES
    // (This is the key difference from exact check)
    expect(ageMatchesByBirthYear(2016, 10, 14, EVENT_YEAR)).toBe(true);
  });

  it('returns true for birthYear = 0 (unknown)', () => {
    expect(ageMatchesByBirthYear(0, 10, 14, EVENT_YEAR)).toBe(true);
  });

  it('returns true for invalid birthYear', () => {
    expect(ageMatchesByBirthYear(NaN, 10, 14, EVENT_YEAR)).toBe(true);
    expect(ageMatchesByBirthYear(-1, 10, 14, EVENT_YEAR)).toBe(true);
  });

  it('handles inverted ageFrom/ageTo gracefully', () => {
    // inverted: ageFrom=14, ageTo=10 — normalises to [10,14]
    expect(ageMatchesByBirthYear(2014, 14, 10, EVENT_YEAR)).toBe(true);
    expect(ageMatchesByBirthYear(2017, 14, 10, EVENT_YEAR)).toBe(false);
  });

  it('uses current year as default eventYear', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 12;
    expect(ageMatchesByBirthYear(birthYear, 10, 14)).toBe(true);
  });
});

// ── ageMatchesExact ───────────────────────────────────────────────────────────

describe('ageMatchesExact', () => {
  // Reference date: 25 March 2026
  const REF = new Date(2026, 2, 25);

  it('accepts participant who has already had birthday this year (exact age 15)', () => {
    // Born 10 Jan 2011 → exact age on 25 Mar 2026 = 15
    expect(ageMatchesExact('2011-01-10', 14, 16, REF)).toBe(true);
  });

  it('rejects participant who has NOT yet had birthday (exact age 14, not yet 15)', () => {
    // Born 31 Dec 2011 → exact age on 25 Mar 2026 = 14; ageFrom = 15 → FAILS
    expect(ageMatchesExact('2011-12-31', 15, 16, REF)).toBe(false);
  });

  it('accepts participant on their exact birthday', () => {
    // Born 25 Mar 2011 → exact age on 25 Mar 2026 = 15
    expect(ageMatchesExact('2011-03-25', 15, 16, REF)).toBe(true);
  });

  it('returns true for empty birthday string', () => {
    expect(ageMatchesExact('', 10, 14, REF)).toBe(true);
  });

  it('returns true for invalid date string', () => {
    expect(ageMatchesExact('not-a-date', 10, 14, REF)).toBe(true);
  });

  it('rejects participant below minimum age', () => {
    // Born 2018 → age 8 < 10
    expect(ageMatchesExact('2018-01-01', 10, 14, REF)).toBe(false);
  });

  it('rejects participant above maximum age', () => {
    // Born 2010 → age 16 > 14
    expect(ageMatchesExact('2010-01-01', 10, 14, REF)).toBe(false);
  });

  it('shows the difference vs year-only: same birthYear but different month gives different result', () => {
    // Born Dec 2011 — year-only says age 15 (passes ageFrom=15), exact says age 14 (fails)
    expect(ageMatchesByBirthYear(2011, 15, 16, 2026)).toBe(true);  // year-only: PASSES
    expect(ageMatchesExact('2011-12-31', 15, 16, REF)).toBe(false); // exact: FAILS
  });
});
