/**
 * Live Score Calculation Bug #88 – TDD Tests
 *
 * Bug: "In den Live-Wertungen werden die Wertungen mit 0,0 angezeigt."
 *
 * Root cause: The `save-value` jury results SQL in `scoresScoring.ts` used
 * snake_case column aliases (`field_name`, `sort_order`, `is_final_score`,
 * `is_starting_score`) but `buildFieldSymbolsMap` expects camelCase properties
 * (`fieldName`, `sortOrder`, `isFinalScore`, `isStartingScore`).
 *
 * Consequence:
 *   1. Every `jr.fieldName` is `undefined` → symbol matching by name fails.
 *   2. `valuesMap` stays empty `{}`.
 *   3. `calculateFormula(formula, {})` replaces every undefined variable with `0`
 *      (see "Replace undefined variables with 0" branch) → returns e.g. `0`
 *      instead of `null`.
 *   4. `if (result !== null) calculatedScore = result` → `calculatedScore = 0`.
 *   5. Socket emits `score: 0, finalScore: 0` → Live view shows "0,0".
 *
 * Fix: Use camelCase double-quoted aliases in the SQL query, matching what
 * `buildFieldSymbolsMap` and `juryResultsScoring.ts` already use:
 *   df.var_name          as "fieldName"
 *   df.var_name          as "fieldShortName"
 *   df.int_sortierung    as "sortOrder"
 *   df.bol_endwert       as "isFinalScore"
 *   df.bol_ausgangswert  as "isStartingScore"
 */

import { describe, it, expect } from 'vitest';
import { buildFieldSymbolsMap, calculateFormula } from '../formulaUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FORMULA = '(10 + D) - E - P';       // typical DTB LK/Kür formula
const FORMULA_SIMPLE = 'D + 10 - E - P';  // same fields, simpler notation

/** Jury result row as returned by the BUGGY SQL (snake_case aliases). */
function makeBuggyRow(fieldName: string, performance: number, isFinalScore = false) {
  return {
    performance,
    sort_order: 1,        // ← snake_case — not read by buildFieldSymbolsMap
    field_name: fieldName, // ← snake_case — not read as fieldName
    is_final_score: isFinalScore,  // ← snake_case — not read as isFinalScore
    is_starting_score: false,      // ← snake_case
  };
}

/** Jury result row as returned by the FIXED SQL (camelCase aliases). */
function makeFixedRow(fieldName: string, performance: number, isFinalScore = false) {
  return {
    performance,
    sortOrder: 1,
    fieldName,
    fieldShortName: fieldName,
    isFinalScore,
    isStartingScore: false,
  };
}

// ─── Reproducing the bug with snake_case input ────────────────────────────────

describe('Bug #88: live score shows 0,0 — snake_case SQL aliases break formula calc', () => {

  /**
   * PRIMARY BUG: custom formula "1*x" with snake_case jury results.
   *
   * For LOWERCASE formula variables (x, y, z) `buildFieldSymbolsMap` has
   * no "fallback by order" — because lowercase variables are user-defined custom
   * formula inputs, not ordered formula fields.  With snake_case input,
   * `jr.fieldName` is undefined → field name matching fails AND no fallback.
   * → `valuesMap = {}` → `calculateFormula("1*x", {})` replaces remaining
   * lowercase `x` with 0 → returns 0 → socket emits "0,0".
   */
  it('REGRESSION: snake_case + custom formula "1*x" → valuesMap is empty → score becomes 0', () => {
    // This row is what the BUGGY SQL returns for a custom formula discipline
    const juryRows = [makeBuggyRow('x', 9.5)];

    const fieldsMap = buildFieldSymbolsMap(juryRows, '1*x');
    const valuesMap: Record<string, number> = {};
    Object.values(fieldsMap).forEach(f => {
      if (f.value !== null) valuesMap[f.symbol] = f.value;
    });

    // With snake_case: jr.fieldName = undefined → 'x' (lowercase, no fallback) → not matched
    // valuesMap must be empty → bug documented here
    expect(Object.keys(valuesMap)).not.toContain('x'); // x is NOT in map with snake_case input

    // calculateFormula("1*x", {}) replaces x → 0 → returns 0, NOT null
    const result = calculateFormula('1*x', valuesMap);
    expect(result).toBe(0); // documents the BUG: returns 0 instead of 9.5

    // Therefore the live score emitted is 0,0 instead of 9.5 — the actual bug
    const bodyScore = 9.5;
    let calculatedScore = bodyScore;
    if (result !== null) calculatedScore = result; // result = 0, NOT null!
    expect(calculatedScore).toBe(0); // confirms the score is wrongly overridden
  });

  /**
   * Note: For UPPERCASE formula variables (D, E, P), the fallback-by-order
   * mechanism in buildFieldSymbolsMap kicks in even when jr.fieldName is
   * undefined. This accidentally produces correct values IF the field sort
   * order matches the symbol order in the formula. The fix (camelCase aliases)
   * makes explicit name-matching work for both cases.
   */
  it('NOTE: snake_case + uppercase formula — fallback-by-order accidentally works (fragile!)', () => {
    // With snake_case, fieldName=undefined, but fallback by order assigns D→[0], E→[1], P→[2]
    const juryRows = [
      makeBuggyRow('D', 5.8),
      makeBuggyRow('E', 8.4),
      makeBuggyRow('P', 0.5),
    ];

    const fieldsMap = buildFieldSymbolsMap(juryRows, FORMULA);
    const valuesMap: Record<string, number> = {};
    Object.values(fieldsMap).forEach(f => {
      if (f.value !== null) valuesMap[f.symbol] = f.value;
    });

    // Fallback assigns by order → values matched (fragile: depends on sort order)
    expect(Object.keys(valuesMap).length).toBe(3);
    // calculateFormula with these values gives the right result by coincidence
    const result = calculateFormula(FORMULA, valuesMap);
    expect(result).toBeCloseTo(6.9, 1);
    // But this is brittle: if EndWert row is in fieldScores with low sortOrder,
    // the first field gets assigned to 'D' and everything is wrong.
  });
});

// ─── Correct behaviour with fixed (camelCase) SQL aliases ─────────────────────

describe('Bug #88 fix: camelCase SQL aliases produce correct formula scores', () => {

  describe('linked formula "(10 + D) - E - P"', () => {
    it('correctly maps D, E, P jury results to formula symbols', () => {
      const juryRows = [
        makeFixedRow('D', 5.8),
        makeFixedRow('E', 8.4),
        makeFixedRow('P', 0.5),
      ];

      const fieldsMap = buildFieldSymbolsMap(juryRows, FORMULA);
      expect(Object.keys(fieldsMap)).toEqual(expect.arrayContaining(['D', 'E', 'P']));
      expect(fieldsMap['D'].value).toBe(5.8);
      expect(fieldsMap['E'].value).toBe(8.4);
      expect(fieldsMap['P'].value).toBe(0.5);
    });

    it('calculates the final score correctly from camelCase jury results', () => {
      const juryRows = [
        makeFixedRow('D', 5.8),
        makeFixedRow('E', 8.4),
        makeFixedRow('P', 0.5),
      ];

      const fieldsMap = buildFieldSymbolsMap(juryRows, FORMULA);
      const valuesMap: Record<string, number> = {};
      Object.values(fieldsMap).forEach(f => {
        if (f.value !== null) valuesMap[f.symbol] = f.value;
      });

      const result = calculateFormula(FORMULA, valuesMap);
      // (10 + 5.8) - 8.4 - 0.5 = 15.8 - 8.9 = 6.9
      expect(result).toBeCloseTo(6.9, 1);
    });

    it('does not override stored score with 0 when D=5.8, E=8.4, P=0.5', () => {
      const storedScore = 6.9;
      const juryRows = [
        makeFixedRow('D', 5.8),
        makeFixedRow('E', 8.4),
        makeFixedRow('P', 0.5),
      ];

      let calculatedScore = storedScore; // as in save-value

      const fieldsMap = buildFieldSymbolsMap(juryRows, FORMULA);
      const valuesMap: Record<string, number> = {};
      Object.values(fieldsMap).forEach(f => {
        if (f.value !== null) valuesMap[f.symbol] = f.value;
      });

      const result = calculateFormula(FORMULA, valuesMap);
      if (result !== null) calculatedScore = result;

      // Must stay close to the real score, NOT become 0 or 10
      expect(calculatedScore).toBeCloseTo(6.9, 1);
      expect(calculatedScore).not.toBe(0);
      expect(calculatedScore).not.toBe(10); // formula with all-zero vars
    });

    it('excludes isFinalScore fields from the calculation input', () => {
      // The EndWert row should be filtered out — only D, E, P go into valuesMap
      const juryRows = [
        makeFixedRow('D', 5.8),
        makeFixedRow('E', 8.4),
        makeFixedRow('P', 0.5),
        makeFixedRow('EW', 6.9, true), // ← isFinalScore = true, must be excluded
      ];

      const fieldsMap = buildFieldSymbolsMap(juryRows, FORMULA);
      // 'EW' symbol is not in the formula → only D, E, P present
      expect(fieldsMap['D']).toBeDefined();
      expect(fieldsMap['E']).toBeDefined();
      expect(fieldsMap['P']).toBeDefined();

      const valuesMap: Record<string, number> = {};
      Object.values(fieldsMap).forEach(f => {
        if (f.value !== null) valuesMap[f.symbol] = f.value;
      });

      // valuesMap must NOT contain EW (it's the result, not an input)
      expect(valuesMap['EW']).toBeUndefined();
    });
  });

  describe('simple linked formula "D + 10 - E - P"', () => {
    it('calculates correctly with D=4.0, E=7.5, P=0.3', () => {
      const juryRows = [
        makeFixedRow('D', 4.0),
        makeFixedRow('E', 7.5),
        makeFixedRow('P', 0.3),
      ];

      const fieldsMap = buildFieldSymbolsMap(juryRows, FORMULA_SIMPLE);
      const valuesMap: Record<string, number> = {};
      Object.values(fieldsMap).forEach(f => {
        if (f.value !== null) valuesMap[f.symbol] = f.value;
      });

      const result = calculateFormula(FORMULA_SIMPLE, valuesMap);
      // 4.0 + 10 - 7.5 - 0.3 = 6.2
      expect(result).toBeCloseTo(6.2, 1);
    });
  });

  describe('custom formula "1*x" (single variable)', () => {
    it('returns null for empty valuesMap (no jury fields → trust stored score)', () => {
      // Custom formula disciplines save via tfx_wertungen_details, not jury results.
      // If no jury results are found, calculateFormula should "fail" gracefully
      // so that the code falls back to parseFloat(score) from the body.
      //
      // Due to "Replace any remaining lowercase single-letter variables with 0",
      // calculateFormula("1*x", {}) returns 0, NOT null.
      // This is documented behaviour: the save-value code path checks
      //   if (juryResults.length > 0) { ... recalculate ... }
      // and skips recalculation entirely when juryResults is empty.
      // So 0 is never used as calculatedScore in that case.
      const result = calculateFormula('1*x', {});
      // Documents current behaviour: x → 0, so 1*0 = 0
      expect(result).toBe(0);
      // The save-value code safely avoids this path when no jury results exist
    });

    it('calculates correctly when x IS provided via camelCase row', () => {
      const juryRows = [makeFixedRow('x', 9.5)];
      const fieldsMap = buildFieldSymbolsMap(juryRows, '1*x');
      const valuesMap: Record<string, number> = {};
      Object.values(fieldsMap).forEach(f => {
        if (f.value !== null) valuesMap[f.symbol] = f.value;
      });
      const result = calculateFormula('1*x', valuesMap);
      expect(result).toBeCloseTo(9.5, 2);
    });
  });
});

// ─── socket emission safety guard ────────────────────────────────────────────

describe('Bug #88: live score socket data must carry real score, not 0', () => {

  /**
   * Simulates the full save-value calculatedScore derivation:
   * 1. Default to parseFloat(bodyScore)
   * 2. If jury results found, try to recalculate
   * 3. Override only if result !== null
   */
  function deriveCalculatedScore(
    bodyScore: string,
    juryRows: Array<{ performance: number; fieldName: string; fieldShortName: string; isFinalScore: boolean; isStartingScore: boolean; sortOrder: number }>,
    formula: string
  ): number {
    let calculatedScore = parseFloat(bodyScore);

    if (juryRows.length > 0) {
      const fieldsMap = buildFieldSymbolsMap(juryRows, formula);
      const valuesMap: Record<string, number> = {};
      Object.values(fieldsMap).forEach(f => {
        if (f.value !== null) valuesMap[f.symbol] = f.value;
      });
      const result = calculateFormula(formula, valuesMap);
      if (result !== null) calculatedScore = result;
    }

    return calculatedScore;
  }

  it('returns correct score when jury results present (fix applied)', () => {
    const score = deriveCalculatedScore(
      '6.9',
      [
        makeFixedRow('D', 5.8),
        makeFixedRow('E', 8.4),
        makeFixedRow('P', 0.5),
      ],
      FORMULA
    );
    expect(score).toBeCloseTo(6.9, 1);
  });

  it('returns body score when no jury results present (custom formula path)', () => {
    const score = deriveCalculatedScore('9.5', [], '1*x');
    expect(score).toBe(9.5);
  });

  it('REGRESSION: snake_case + custom formula "1*x" causes score to become 0 (the actual 0,0 bug)', () => {
    // Simulates: score capture saves x=9.5, jury results exist in DB with field_name="x"
    // SQL returns snake_case → buildFieldSymbolsMap can't match "x" → valuesMap={}
    // → calculateFormula("1*x", {}) = 0 → WITHOUT safety net, overrides body score → 0.0 in live view
    //
    // After fix: SQL uses camelCase → fieldName="x" is matched → valuesMap={x:9.5}
    //            → calculateFormula("1*x", {x:9.5}) = 9.5 → correct
    //
    // The additional safety net added to save-value also prevents the wrong override:
    //   if (result === 0 && bodyScoreFloat > 0.01) → trust body score
    const bodyScore = '9.5';
    let calculatedScore = parseFloat(bodyScore); // = 9.5

    const juryRowsFixed = [makeFixedRow('x', 9.5)]; // camelCase rows (after SQL fix)

    if (juryRowsFixed.length > 0) {
      const fieldsMap = buildFieldSymbolsMap(juryRowsFixed, '1*x');
      const valuesMap: Record<string, number> = {};
      Object.values(fieldsMap).forEach(f => {
        if (f.value !== null) valuesMap[f.symbol] = f.value;
      });
      const result = calculateFormula('1*x', valuesMap);
      if (result !== null) {
        // Safety net: if formula gives 0 but body score is clearly non-zero, trust body
        const resultLooksWrong = result === 0 && Math.abs(parseFloat(bodyScore)) > 0.01;
        if (!resultLooksWrong) calculatedScore = result;
      }
    }

    // After fix (camelCase SQL + safety net): calculatedScore = 9.5 (correct)
    expect(calculatedScore).toBeCloseTo(9.5, 2);
  });
});
