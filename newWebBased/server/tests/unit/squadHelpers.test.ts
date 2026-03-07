/**
 * TDD Tests for Squad Management — Available Participants Filtering
 *
 * Bug report: Participants who are already assigned to a squad (e.g. "wBlau")
 * still appear in the "available participants" list (middle column).
 *
 * Root cause: The SQL query used row-level WHERE filtering on var_riege.
 * A participant registered in 2 competitions would appear if ANY of their
 * competition rows had no squad assignment, even if another row did.
 *
 * These tests verify the correct behavior:
 * - A participant is "available" ONLY if ALL their competition rows are unassigned
 * - A participant with ANY squad assignment should NOT appear as available
 */

import { isParticipantAvailable, isUnassignedSquadValue } from '../../src/utils/squadHelpers';

describe('Squad Helpers — Available Participant Filtering', () => {

  // ─── isUnassignedSquadValue ───────────────────────────────────────

  describe('isUnassignedSquadValue', () => {
    it.each([
      [null, true],
      [undefined, true],
      ['', true],
      ['  ', true],
      ['Unassigned', true],
    ])('returns true for unassigned value: %p', (value, expected) => {
      expect(isUnassignedSquadValue(value as any)).toBe(expected);
    });

    it.each([
      ['wBlau', false],
      ['wRot', false],
      ['mGrün', false],
      ['Squad1', false],
      ['A', false],
    ])('returns false for assigned value: %p', (value, expected) => {
      expect(isUnassignedSquadValue(value)).toBe(expected);
    });
  });

  // ─── isParticipantAvailable ───────────────────────────────────────

  describe('isParticipantAvailable', () => {

    describe('single competition', () => {
      it('returns true when squad is null (no assignment)', () => {
        expect(isParticipantAvailable([null])).toBe(true);
      });

      it('returns true when squad is empty string', () => {
        expect(isParticipantAvailable([''])).toBe(true);
      });

      it('returns true when squad is "Unassigned"', () => {
        expect(isParticipantAvailable(['Unassigned'])).toBe(true);
      });

      it('returns false when squad is a real name', () => {
        expect(isParticipantAvailable(['wBlau'])).toBe(false);
      });
    });

    describe('multiple competitions — THE BUG SCENARIO', () => {

      it('returns false when ALL competitions have a squad (fully assigned)', () => {
        // Participant in 2 competitions, both assigned to wBlau
        expect(isParticipantAvailable(['wBlau', 'wBlau'])).toBe(false);
      });

      it('returns false when SOME competitions have a squad (partially assigned) — THIS IS THE BUG', () => {
        // Participant in 2 competitions:
        // - Competition 1: assigned to "wBlau"
        // - Competition 2: not yet assigned (null)
        // OLD BEHAVIOR (WRONG): returned true (participant appeared as available)
        // NEW BEHAVIOR (CORRECT): returns false (participant is already in a squad)
        expect(isParticipantAvailable(['wBlau', null])).toBe(false);
      });

      it('returns false when first competition unassigned but second assigned', () => {
        expect(isParticipantAvailable([null, 'wRot'])).toBe(false);
      });

      it('returns false when one is empty and another has a squad', () => {
        expect(isParticipantAvailable(['', 'wBlau'])).toBe(false);
      });

      it('returns true when ALL competitions are unassigned (null/empty mix)', () => {
        expect(isParticipantAvailable([null, '', 'Unassigned'])).toBe(true);
      });

      it('returns true when no competition rows at all', () => {
        expect(isParticipantAvailable([])).toBe(true);
      });
    });

    describe('real-world scenarios from bug report', () => {

      it('Ida Von Preislinger: 2 competitions, "wBlau" + null → NOT available', () => {
        // Ida is in "Gerätvierkampf w (0-6Jahre)" with squad "wBlau"
        // and also in "Gerätvierkampf w (17-20Jahre)" without a squad
        const idaSquadValues = ['wBlau', null];
        expect(isParticipantAvailable(idaSquadValues)).toBe(false);
      });

      it('Emilia Bartos: 2 competitions, "wBlau" + null → NOT available', () => {
        const emiliaSquadValues = ['wBlau', null];
        expect(isParticipantAvailable(emiliaSquadValues)).toBe(false);
      });

      it('Anni Schäffeler: 2 competitions, "wBlau" + null → NOT available', () => {
        const anniSquadValues = ['wBlau', null];
        expect(isParticipantAvailable(anniSquadValues)).toBe(false);
      });

      it('New participant: 1 competition, null → IS available', () => {
        expect(isParticipantAvailable([null])).toBe(true);
      });

      it('Participant in 3 competitions, all unassigned → IS available', () => {
        expect(isParticipantAvailable([null, null, ''])).toBe(true);
      });
    });
  });
});
