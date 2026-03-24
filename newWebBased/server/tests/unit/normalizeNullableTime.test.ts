/**
 * Unit tests — normalizeNullableTime (competitionHelpers.ts)
 *
 * Bug context (Point 122):
 *   The TimePlanning edit dialog sends `startTime: null` and `warmupTime: null`
 *   when fields are empty.  The competitions PUT route passed these directly to
 *   `parseTimeInput(time: string | undefined)`, which caused a TypeScript/Zod
 *   validation error on the production DB.
 *
 *   Fix: normalizeNullableTime converts null/undefined/"" → undefined before
 *   passing to parseTimeInput, so parseTimeInput never receives null.
 */

import { normalizeNullableTime } from '../../src/utils/competitionHelpers';

describe('normalizeNullableTime', () => {

  // ── null / undefined / empty → normalize to undefined ──────────────────────

  it('returns undefined for null (legacy DB value)', () => {
    expect(normalizeNullableTime(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeNullableTime(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(normalizeNullableTime('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(normalizeNullableTime('   ')).toBeUndefined();
  });

  // ── valid time strings → pass through unchanged ──────────────────────────

  it('passes through a valid HH:MM time string', () => {
    expect(normalizeNullableTime('09:00')).toBe('09:00');
  });

  it('passes through midnight', () => {
    expect(normalizeNullableTime('00:00')).toBe('00:00');
  });

  it('passes through end-of-day time', () => {
    expect(normalizeNullableTime('23:59')).toBe('23:59');
  });

  it('passes through a time with leading zero in hour', () => {
    expect(normalizeNullableTime('08:30')).toBe('08:30');
  });

  // ── integration: result is safe to pass into parseTimeInput ────────────────

  it('result can be passed to parseTimeInput without TypeScript null error', () => {
    // This test documents the type contract: the return type is string | undefined,
    // never null — so it is always safe to forward to parseTimeInput.
    const result: string | undefined = normalizeNullableTime(null);
    expect(result).toBeUndefined();

    const result2: string | undefined = normalizeNullableTime('10:15');
    expect(result2).toBe('10:15');
  });
});
