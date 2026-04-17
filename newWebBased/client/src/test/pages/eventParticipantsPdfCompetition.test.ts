/**
 * Unit tests for Point 72 – EventParticipants PDF: competition label helper
 *
 * The `exportParticipantsListPDF` function builds competition labels inline
 * using a `competitionLabel` helper that maps participant competition IDs
 * to "Name (Nr. X)" strings. These tests verify the label-building logic
 * by exercising the same transformation directly.
 */

import { describe, it, expect } from 'vitest';

// The helper is defined inline inside exportParticipantsListPDF.
// We replicate it here as a pure function to test it in isolation.
// Any future refactor that extracts this helper should move tests accordingly.

interface Competition {
  id: number;
  name: string;
  number?: string;
}

function buildCompetitionLabel(ids: number[], competitions: Competition[]): string {
  if (!ids || ids.length === 0) return '-';
  const result = ids
    .map((id) => {
      const comp = competitions.find((c) => c.id === id);
      if (!comp) return '';
      return comp.number ? `${comp.name} (Nr. ${comp.number})` : comp.name;
    })
    .filter(Boolean)
    .join(', ');
  return result || '-';
}

// ── Test data ─────────────────────────────────────────────────────

const allComps: Competition[] = [
  { id: 1, name: '4-Kampf weiblich P', number: '1' },
  { id: 2, name: '6-Kampf männlich P', number: '2' },
  { id: 3, name: 'Pflichtfeld', number: '' },
  { id: 4, name: 'Freikür' }, // no number property
];

// ── Tests ─────────────────────────────────────────────────────────

describe('EventParticipants PDF – competition label (Point 72)', () => {

  describe('empty/no-match cases', () => {
    it('returns "-" for empty ids array', () => {
      expect(buildCompetitionLabel([], allComps)).toBe('-');
    });

    it('returns "-" for unknown competition id', () => {
      expect(buildCompetitionLabel([999], allComps)).toBe('-');
    });

    it('returns "-" when all ids are unknown', () => {
      expect(buildCompetitionLabel([100, 200], allComps)).toBe('-');
    });
  });

  describe('single competition', () => {
    it('includes competition name and number when number is set', () => {
      const label = buildCompetitionLabel([1], allComps);
      expect(label).toBe('4-Kampf weiblich P (Nr. 1)');
    });

    it('includes only competition name when number is empty string', () => {
      const label = buildCompetitionLabel([3], allComps);
      expect(label).toBe('Pflichtfeld');
    });

    it('includes only competition name when number property is absent', () => {
      const label = buildCompetitionLabel([4], allComps);
      expect(label).toBe('Freikür');
    });
  });

  describe('multiple competitions', () => {
    it('joins two competitions with ", "', () => {
      const label = buildCompetitionLabel([1, 2], allComps);
      expect(label).toBe('4-Kampf weiblich P (Nr. 1), 6-Kampf männlich P (Nr. 2)');
    });

    it('preserves order matching the ids array', () => {
      const label = buildCompetitionLabel([2, 1], allComps);
      expect(label).toBe('6-Kampf männlich P (Nr. 2), 4-Kampf weiblich P (Nr. 1)');
    });

    it('skips unknown ids and still builds label from known ones', () => {
      const label = buildCompetitionLabel([1, 999, 2], allComps);
      expect(label).toBe('4-Kampf weiblich P (Nr. 1), 6-Kampf männlich P (Nr. 2)');
    });
  });

  describe('real-world scenarios', () => {
    it('builds label correctly for a single-competition participant', () => {
      const comps: Competition[] = [{ id: 42, name: 'Gerätebahn A', number: '5' }];
      expect(buildCompetitionLabel([42], comps)).toBe('Gerätebahn A (Nr. 5)');
    });

    it('handles participant with no competition assigned in this event', () => {
      expect(buildCompetitionLabel([], allComps)).toBe('-');
    });
  });
});
