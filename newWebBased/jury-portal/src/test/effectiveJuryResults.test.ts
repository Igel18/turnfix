/**
 * TDD Tests for computeEffectiveJuryResults
 *
 * These tests verify the core logic that determines what initial values
 * FormulaInput receives when a participant is selected.
 *
 * The critical bug this caught:
 *   Built-in formula "1*x" + discipline has fields (Wert, Abzug, Endwert)
 *   → old code returned {} (treated as linked formula)
 *   → FormulaInput showed 0.00 instead of the saved score
 */

import { describe, it, expect } from 'vitest';
import { computeEffectiveJuryResults } from '../utils/effectiveJuryResults';

describe('computeEffectiveJuryResults', () => {
  // ─── Built-in formulas (lowercase vars: x, y) ─────────────────────

  describe('built-in formula "1*x"', () => {
    it('returns {x: score} when participant has a saved score and NO discipline fields', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 4.10 },
        '1*x',
        0, // no discipline fields
        {}
      );
      expect(result).toEqual({ x: 4.10 });
    });

    it('returns {x: score} when participant has a saved score AND discipline fields exist (THE BUG)', () => {
      // This is the exact scenario from the bug report:
      // Discipline "Boden" (ID 74) has formula "1*x" AND 3 discipline fields
      // (Wert, Abzug, Endwert). The formula is built-in, so the stored
      // currentScore IS the raw value ("x"). Discipline fields don't change this.
      const result = computeEffectiveJuryResults(
        { currentScore: 4.00 },
        '1*x',
        3, // Boden has 3 fields: Wert, Abzug, Endwert
        {} // no async jury results loaded (because it's built-in!)
      );
      expect(result).toEqual({ x: 4.00 });
    });

    it('returns {} when participant has NO saved score', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: null },
        '1*x',
        0,
        {}
      );
      expect(result).toEqual({});
    });

    it('returns {x: 0} when participant has score = 0 (valid score)', () => {
      // currentScore of 0 is a valid score — should still map it
      const result = computeEffectiveJuryResults(
        { currentScore: 0 },
        '1*x',
        0,
        {}
      );
      // 0 is a valid numeric score, gets mapped to x
      expect(result).toEqual({ x: 0 });
    });
  });

  describe('built-in formula "20-x"', () => {
    it('returns {x: score} with discipline fields present', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 15 },
        '20-x',
        2, // some discipline fields exist
        {}
      );
      expect(result).toEqual({ x: 15 });
    });

    it('returns {x: score} without discipline fields', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 3.5 },
        '20-x',
        0,
        {}
      );
      expect(result).toEqual({ x: 3.5 });
    });
  });

  // ─── Linked formulas (uppercase vars: A, B, C) ────────────────────

  describe('linked formula "A+B"', () => {
    it('returns loadedJuryResults (from async API call)', () => {
      const asyncResults = { A: 3.0, B: 4.0 };
      const result = computeEffectiveJuryResults(
        { currentScore: 7.0 },
        'A+B',
        2,
        asyncResults
      );
      expect(result).toEqual({ A: 3.0, B: 4.0 });
    });

    it('returns empty when async results not yet loaded', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 7.0 },
        'A+B',
        2,
        {} // not loaded yet
      );
      expect(result).toEqual({});
    });
  });

  describe('linked formula "(10+A)-B"', () => {
    it('returns loadedJuryResults', () => {
      const asyncResults = { A: 6.0, B: 3.5 };
      const result = computeEffectiveJuryResults(
        { currentScore: 12.5 },
        '(10+A)-B',
        2,
        asyncResults
      );
      expect(result).toEqual({ A: 6.0, B: 3.5 });
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns {} when no participant', () => {
      const result = computeEffectiveJuryResults(
        undefined,
        '1*x',
        0,
        {}
      );
      expect(result).toEqual({});
    });

    it('returns {} when no formula', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 5.0 },
        null,
        0,
        {}
      );
      expect(result).toEqual({});
    });

    it('returns {} when formula is empty string', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 5.0 },
        '',
        0,
        {}
      );
      expect(result).toEqual({});
    });

    it('handles mixed formula with both uppercase and lowercase vars', () => {
      // A formula like "x*A" has both lowercase and uppercase
      // The lowercase var detection should still trigger built-in handling
      const result = computeEffectiveJuryResults(
        { currentScore: 5.0 },
        'x*A',
        1,
        { A: 3.0 }
      );
      // Has lowercase "x" → built-in path, maps currentScore to "x"
      expect(result).toEqual({ x: 5.0 });
    });

    it('ignores loadedJuryResults for built-in formulas', () => {
      // Even if async results somehow loaded, built-in should use currentScore
      const result = computeEffectiveJuryResults(
        { currentScore: 4.10 },
        '1*x',
        3,
        { x: 999 } // stale/wrong async result
      );
      expect(result).toEqual({ x: 4.10 });
    });
  });

  // ─── Real-world scenarios from the bug report ─────────────────────

  describe('real-world: Boden w (Ida, Emilia, Anni)', () => {
    const formula = '1*x';
    const disciplineFieldCount = 3; // Wert, Abzug, Endwert

    it('Ida Von Preislinger: score 4.10 → x=4.10', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 4.10 },
        formula,
        disciplineFieldCount,
        {}
      );
      expect(result).toEqual({ x: 4.10 });
    });

    it('Emilia Bartos: score 4.00 → x=4.00', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 4.00 },
        formula,
        disciplineFieldCount,
        {}
      );
      expect(result).toEqual({ x: 4.00 });
    });

    it('Anni Schäffeler: score 3.90 → x=3.90', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: 3.90 },
        formula,
        disciplineFieldCount,
        {}
      );
      expect(result).toEqual({ x: 3.90 });
    });

    it('Karoline Breitkopf: no score → {}', () => {
      const result = computeEffectiveJuryResults(
        { currentScore: null },
        formula,
        disciplineFieldCount,
        {}
      );
      expect(result).toEqual({});
    });
  });
});
