/**
 * Tests for useLabelPrinting pure utility functions
 * Point 48b / 48c: startRow/startColumn offset + pagesNeeded preview calculation
 */

import { describe, it, expect } from 'vitest';
import {
  calcLabelStartOffset,
  calcLabelPagesNeeded,
  sortParticipantsForLabels,
} from '../hooks/useLabelPrinting';
import type { Participant } from '../EventParticipants.types';

// ---------------------------------------------------------------------------
// calcLabelStartOffset
// ---------------------------------------------------------------------------

describe('calcLabelStartOffset', () => {
  it('returns 0 when start is row 1 / column 1 (no skip)', () => {
    expect(calcLabelStartOffset(1, 1, 4)).toBe(0);
  });

  it('skips first row when startRow=2, startColumn=1', () => {
    // 4 columns → 1 full row skipped = 4
    expect(calcLabelStartOffset(2, 1, 4)).toBe(4);
  });

  it('skips partial row when startRow=1, startColumn=3', () => {
    // column 3 means 2 positions skipped (col 1 and col 2)
    expect(calcLabelStartOffset(1, 3, 4)).toBe(2);
  });

  it('combines row and column offsets correctly', () => {
    // row 3, col 2, 4 cols → 2 full rows (8) + 1 = 9
    expect(calcLabelStartOffset(3, 2, 4)).toBe(9);
  });

  it('handles single-column layout', () => {
    expect(calcLabelStartOffset(5, 1, 1)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// calcLabelPagesNeeded
// ---------------------------------------------------------------------------

const baseConfig = { rows: 8, columns: 4, startRow: 1, startColumn: 1 };

describe('calcLabelPagesNeeded', () => {
  it('returns 0 for 0 participants', () => {
    expect(calcLabelPagesNeeded(0, baseConfig)).toBe(0);
  });

  it('fits exactly one page when count === labelsPerPage', () => {
    // 8 × 4 = 32
    expect(calcLabelPagesNeeded(32, baseConfig)).toBe(1);
  });

  it('needs 2 pages when count > labelsPerPage', () => {
    expect(calcLabelPagesNeeded(33, baseConfig)).toBe(2);
  });

  it('counts partial page as full page', () => {
    // 32 + 1 still = 2 pages
    expect(calcLabelPagesNeeded(63, baseConfig)).toBe(2);
    expect(calcLabelPagesNeeded(64, baseConfig)).toBe(2);
    expect(calcLabelPagesNeeded(65, baseConfig)).toBe(3);
  });

  it('accounts for start offset on first page', () => {
    // 8×4=32 per page, skip 2 rows (8 labels) → first page has 24 free slots
    const cfg = { rows: 8, columns: 4, startRow: 3, startColumn: 1 };
    expect(calcLabelPagesNeeded(24, cfg)).toBe(1);
    expect(calcLabelPagesNeeded(25, cfg)).toBe(2);
  });

  it('handles start on last position of first page → next participant on page 2', () => {
    // skip 31 → only 1 free on first page
    const cfg = { rows: 8, columns: 4, startRow: 8, startColumn: 4 };
    expect(calcLabelPagesNeeded(1, cfg)).toBe(1);
    expect(calcLabelPagesNeeded(2, cfg)).toBe(2);
  });

  it('returns 1 for 1 participant with no offset', () => {
    expect(calcLabelPagesNeeded(1, baseConfig)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// sortParticipantsForLabels
// ---------------------------------------------------------------------------

const makeParticipant = (
  id: number,
  gender: string,
  squad_name: string,
  club: string
): Participant =>
  ({
    id,
    firstname: 'A',
    lastname: 'B',
    gender,
    squad_name,
    club,
    assignedCompetitions: [],
    startNumber: null,
  }) as unknown as Participant;

describe('sortParticipantsForLabels', () => {
  it('sorts male before female', () => {
    const p = [
      makeParticipant(1, 'female', 'A', 'Club'),
      makeParticipant(2, 'male', 'A', 'Club'),
    ];
    const sorted = sortParticipantsForLabels(p);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });

  it('sorts by squad name within same gender', () => {
    const p = [
      makeParticipant(1, 'male', 'Riege B', 'Club'),
      makeParticipant(2, 'male', 'Riege A', 'Club'),
    ];
    const sorted = sortParticipantsForLabels(p);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });

  it('sorts by club within same gender and squad', () => {
    const p = [
      makeParticipant(1, 'male', 'Riege', 'TSV Z'),
      makeParticipant(2, 'male', 'Riege', 'TSV A'),
    ];
    const sorted = sortParticipantsForLabels(p);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });

  it('does not mutate the original array', () => {
    const p = [
      makeParticipant(1, 'female', 'A', 'Club'),
      makeParticipant(2, 'male', 'A', 'Club'),
    ];
    const original = [...p];
    sortParticipantsForLabels(p);
    expect(p[0].id).toBe(original[0].id);
  });
});
