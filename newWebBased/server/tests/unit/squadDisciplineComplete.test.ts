/**
 * TDD Tests for Squad Discipline Status Update (Issue #104)
 *
 * Problem:
 *   The Riegen-Status page always shows "kein Status" for all squads.
 *   Root cause: POST /api/squad-management/complete is a stub — it logs
 *   the request but does NOT write to the database (tfx_riegen_x_disziplinen).
 *
 * Additional issues:
 *   1. The endpoint uses authenticateToken middleware, but the jury portal
 *      doesn't send auth tokens → requests are rejected with 401.
 *   2. The jury portal sends status name 'Leistung erfasst' (singular) but
 *      the DB status is named 'Leistungen erfasst' (plural, id=2).
 *
 * Expected behaviour after fix:
 *   - POST /api/squad-management/complete finds the status by name
 *     (case-insensitive, with fallback to partial match) and updates
 *     tfx_riegen_x_disziplinen rows.
 *   - The endpoint must NOT require an auth token (accessible from jury).
 *   - The jury portal sends the correct status name.
 *   - A Socket.IO event 'squad-status-updated' is emitted after the update.
 */

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import {
  findStatusByName,
  normalizeStatusName,
} from '../../src/utils/squadStatusUtils';

// ═══════════════════════════════════════════════════════════════════════
// Unit tests for the helper functions
// ═══════════════════════════════════════════════════════════════════════

const MOCK_STATUSES = [
  { int_statusid: 1, var_name: 'kein Status' },
  { int_statusid: 2, var_name: 'Leistungen erfasst' },
  { int_statusid: 3, var_name: 'Meldung erfasst' },
  { int_statusid: 8, var_name: 'Wettkampf gestartet' },
];

describe('normalizeStatusName', () => {
  it('trims whitespace', () => {
    expect(normalizeStatusName('  kein Status  ')).toBe('kein status');
  });

  it('lowercases the string', () => {
    expect(normalizeStatusName('Leistungen Erfasst')).toBe('leistungen erfasst');
  });

  it('handles empty string', () => {
    expect(normalizeStatusName('')).toBe('');
  });
});

describe('findStatusByName', () => {
  it('finds exact match with correct casing', () => {
    const result = findStatusByName(MOCK_STATUSES, 'Leistungen erfasst');
    expect(result).not.toBeNull();
    expect(result!.int_statusid).toBe(2);
  });

  it('finds case-insensitive match', () => {
    const result = findStatusByName(MOCK_STATUSES, 'LEISTUNGEN ERFASST');
    expect(result).not.toBeNull();
    expect(result!.int_statusid).toBe(2);
  });

  it('finds partial match (singular vs plural typo)', () => {
    // Jury portal historically sent 'Leistung erfasst' (singular)
    // Should still match 'Leistungen erfasst' via partial match
    const result = findStatusByName(MOCK_STATUSES, 'Leistung erfasst');
    expect(result).not.toBeNull();
    expect(result!.int_statusid).toBe(2);
  });

  it('returns null for completely unknown status name', () => {
    const result = findStatusByName(MOCK_STATUSES, 'Unknown Status XYZ');
    expect(result).toBeNull();
  });

  it('returns first status when input is empty string', () => {
    // Empty name should not match anything
    const result = findStatusByName(MOCK_STATUSES, '');
    expect(result).toBeNull();
  });

  it('finds "kein Status" exactly', () => {
    const result = findStatusByName(MOCK_STATUSES, 'kein Status');
    expect(result).not.toBeNull();
    expect(result!.int_statusid).toBe(1);
  });

  it('handles statuses array being empty', () => {
    const result = findStatusByName([], 'Leistungen erfasst');
    expect(result).toBeNull();
  });
});
