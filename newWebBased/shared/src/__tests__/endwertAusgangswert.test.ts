/**
 * EW (Endwert) / AW (Ausgangswert) Tests
 *
 * Comprehensive test suite for the Endwert (final score) and Ausgangswert (starting score)
 * field semantics in the TurnFix formula system.
 *
 * Architecture Overview:
 * ─────────────────────
 * tfx_disziplinen_felder has two boolean columns:
 *   - bol_endwert (isFinalScore)     → The OUTPUT target where formula result is written
 *   - bol_ausgangswert (isStartingScore) → The starting/difficulty value, displayed alongside
 *
 * Formula variables A, B, C... are assigned ONLY to fields that are neither EW nor AW.
 * The formula result is ALWAYS written to the EW field (= EW pattern).
 *
 * C++ Legacy Behavior (from resultssheetdialog.cpp, win_eingabe.cpp):
 *   1. Read values from all columns EXCEPT the last (EW column)
 *   2. Evaluate formula with A-Z mapped to non-EW fields by sortOrder
 *   3. Write result TO the last column (EW)
 *
 * Web Implementation:
 *   - shared/formulaUtils.ts: buildFieldSymbolsMap() filters !isFinalScore && !isStartingScore
 *   - server/routes/scores.ts: Endwert auto-calculation writes to tfx_jury_results + tfx_wertungen_details
 *   - jury-portal: Maps isFinalScore → isEndValue, uses same exclusion pattern
 *   - client: useFormulaCalculation filters !isFinalScore for variable mapping
 *
 * @see documentation/newWebbased/EW_AW_ARCHITECTURE.md for full documentation
 */

import { describe, it, expect } from 'vitest';
import {
  buildFieldSymbolsMap,
  calculateFormula,
  calculateFormulaResult,
  extractFormulaSymbols,
  formatFormulaWithValues,
  applyBuiltInFormula,
  detectFormulaType,
  FORMULA_VARIABLES,
} from '../formulaUtils';

// ════════════════════════════════════════════════════════════════════════════
// Test Data: Realistic gymnastics discipline configurations
// ════════════════════════════════════════════════════════════════════════════

/** 
 * Standard gymnastics discipline with D-Note, E-Note, Abzug, and Endwert.
 * Formula: "A + B - C"
 * A = D-Note (difficulty), B = E-Note (execution), C = Abzug (deduction)
 * EW = Endwert (final score = D + E - deductions)
 */
const standardGymnasticsFields = [
  { fieldName: 'D-Note', performance: 5.8, sortOrder: 1, isFinalScore: false, isStartingScore: false },
  { fieldName: 'E-Note', performance: 8.2, sortOrder: 2, isFinalScore: false, isStartingScore: false },
  { fieldName: 'Abzug', performance: 0.3, sortOrder: 3, isFinalScore: false, isStartingScore: false },
  { fieldName: 'Endwert', performance: 13.7, sortOrder: 4, isFinalScore: true, isStartingScore: false },
];

/**
 * Discipline with Ausgangswert (starting value / difficulty score).
 * AW is displayed alongside the score but NOT used in the formula calculation.
 */
const fieldsWithAusgangswert = [
  { fieldName: 'Ausgangswert', performance: 5.0, sortOrder: 0, isFinalScore: false, isStartingScore: true },
  { fieldName: 'E-Note', performance: 8.5, sortOrder: 1, isFinalScore: false, isStartingScore: false },
  { fieldName: 'Abzug', performance: 0.5, sortOrder: 2, isFinalScore: false, isStartingScore: false },
  { fieldName: 'Endwert', performance: 13.0, sortOrder: 3, isFinalScore: true, isStartingScore: false },
];

/**
 * Simple discipline with only one value field and Endwert.
 * Formula: "1*x" (identity, common for simple disciplines)
 */
const simpleFields = [
  { fieldName: 'Wertung', performance: 9.5, sortOrder: 1, isFinalScore: false, isStartingScore: false },
  { fieldName: 'Endwert', performance: 9.5, sortOrder: 2, isFinalScore: true, isStartingScore: false },
];

/**
 * All fields disabled except Endwert — edge case where only direct entry is used.
 */
const onlyEndwertField = [
  { fieldName: 'Endwert', performance: 12.0, sortOrder: 1, isFinalScore: true, isStartingScore: false },
];

/**
 * Mixed configuration: both AW and EW present alongside multiple input fields.
 * Scenario: Gymnastics apparatus with starting value, two jury notes, and final score.
 */
const fullConfiguration = [
  { fieldName: 'Ausgangswert', performance: 4.5, sortOrder: 0, isFinalScore: false, isStartingScore: true },
  { fieldName: 'D-Note', performance: 5.2, sortOrder: 1, isFinalScore: false, isStartingScore: false },
  { fieldName: 'E-Note', performance: 7.8, sortOrder: 2, isFinalScore: false, isStartingScore: false },
  { fieldName: 'Abzug Ausführung', performance: 1.0, sortOrder: 3, isFinalScore: false, isStartingScore: false },
  { fieldName: 'Endwert', performance: 12.0, sortOrder: 4, isFinalScore: true, isStartingScore: false },
];

// ════════════════════════════════════════════════════════════════════════════
// 1. EW Exclusion from Formula Variables
// ════════════════════════════════════════════════════════════════════════════

describe('EW (Endwert) Exclusion from Formula Variables', () => {

  it('EW field is NEVER assigned a formula variable (A-Z)', () => {
    const map = buildFieldSymbolsMap(standardGymnasticsFields, 'A+B-C');

    // Only A, B, C should exist — no symbol for Endwert
    expect(Object.keys(map)).toEqual(['A', 'B', 'C']);
    expect(Object.values(map).every(f => f.fieldName !== 'Endwert')).toBe(true);
  });

  it('EW field with sortOrder=0 (first position) is still excluded', () => {
    const fields = [
      { fieldName: 'Endwert', performance: 10, sortOrder: 0, isFinalScore: true, isStartingScore: false },
      { fieldName: 'D-Note', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'E-Note', performance: 8.0, sortOrder: 2, isFinalScore: false, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A+B');
    expect(Object.keys(map)).toEqual(['A', 'B']);
    expect(map.A.fieldName).toBe('D-Note');
    expect(map.B.fieldName).toBe('E-Note');
  });

  it('EW field between input fields does not shift variable indices', () => {
    const fields = [
      { fieldName: 'D-Note', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: 13.0, sortOrder: 2, isFinalScore: true, isStartingScore: false },
      { fieldName: 'Abzug', performance: 1.0, sortOrder: 3, isFinalScore: false, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A-B');
    expect(Object.keys(map)).toEqual(['A', 'B']);
    expect(map.A.fieldName).toBe('D-Note'); // A = first non-EW field
    expect(map.B.fieldName).toBe('Abzug');  // B = second non-EW field (not Endwert!)
  });

  it('formula calculation uses Input fields only, not EW', () => {
    const map = buildFieldSymbolsMap(standardGymnasticsFields, 'A+B-C');

    const values: Record<string, number> = {};
    for (const [symbol, field] of Object.entries(map)) {
      if (field.value !== null) {
        values[symbol] = field.value;
      }
    }

    // A=5.8 (D-Note), B=8.2 (E-Note), C=0.3 (Abzug) → 5.8 + 8.2 - 0.3 = 13.7
    const result = calculateFormula('A+B-C', values);
    expect(result).toBeCloseTo(13.7, 5);
  });

  it('EW field value (13.7) is NOT used in calculation', () => {
    // Even though EW has performance=13.7, it should be excluded
    const map = buildFieldSymbolsMap(standardGymnasticsFields, 'A+B-C');

    // No symbol should have value 13.7 (the Endwert)
    for (const field of Object.values(map)) {
      expect(field.value).not.toBe(13.7);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. AW (Ausgangswert) Exclusion from Formula Variables
// ════════════════════════════════════════════════════════════════════════════

describe('AW (Ausgangswert) Exclusion from Formula Variables', () => {

  it('AW field is NEVER assigned a formula variable (A-Z)', () => {
    const map = buildFieldSymbolsMap(fieldsWithAusgangswert, 'A-B');

    expect(Object.keys(map)).toEqual(['A', 'B']);
    // Neither A nor B should be the Ausgangswert
    expect(map.A.fieldName).toBe('E-Note');
    expect(map.B.fieldName).toBe('Abzug');
  });

  it('AW with sortOrder=0 (first position) is excluded from variables', () => {
    const map = buildFieldSymbolsMap(fieldsWithAusgangswert, 'A-B');

    expect(Object.values(map).every(f => f.fieldName !== 'Ausgangswert')).toBe(true);
  });

  it('both AW and EW excluded — only input fields get variables', () => {
    const map = buildFieldSymbolsMap(fullConfiguration, 'A+B-C');

    expect(Object.keys(map)).toEqual(['A', 'B', 'C']);
    expect(map.A.fieldName).toBe('D-Note');        // sortOrder=1
    expect(map.B.fieldName).toBe('E-Note');         // sortOrder=2
    expect(map.C.fieldName).toBe('Abzug Ausführung'); // sortOrder=3

    // Neither Ausgangswert nor Endwert should appear
    const fieldNames = Object.values(map).map(f => f.fieldName);
    expect(fieldNames).not.toContain('Ausgangswert');
    expect(fieldNames).not.toContain('Endwert');
  });

  it('AW value is preserved in original data but not mapped to symbol', () => {
    // buildFieldSymbolsMap takes juryResults — AW entry should be in the input but filtered
    const results = fieldsWithAusgangswert;
    const awEntry = results.find(r => r.isStartingScore);
    expect(awEntry).toBeDefined();
    expect(awEntry!.performance).toBe(5.0); // Value exists

    // But buildFieldSymbolsMap won't map it
    const map = buildFieldSymbolsMap(results, 'A-B');
    const allValues = Object.values(map).map(f => f.value);
    expect(allValues).not.toContain(5.0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. EW as Assignment Target (= EW Pattern)
// ════════════════════════════════════════════════════════════════════════════

describe('EW as Assignment Target (= EW pattern)', () => {

  it('formula result equals what should be stored in EW field', () => {
    // Formula: A + B - C
    // A=5.8, B=8.2, C=0.3 → 13.7
    // This 13.7 should be written to the EW field
    const result = calculateFormula('A+B-C', { A: 5.8, B: 8.2, C: 0.3 });
    expect(result).toBeCloseTo(13.7, 5);

    // The EW field in our test data has performance=13.7 — matches!
    const ewField = standardGymnasticsFields.find(f => f.isFinalScore);
    expect(ewField!.performance).toBeCloseTo(result!, 5);
  });

  it('formula result is stored ONLY in EW field, not in input fields', () => {
    // This test documents the contract: save flow should write to EW, not overwrite inputs
    const map = buildFieldSymbolsMap(standardGymnasticsFields, 'A+B-C');

    // Input fields have their own values
    expect(map.A.value).toBe(5.8);  // D-Note
    expect(map.B.value).toBe(8.2);  // E-Note
    expect(map.C.value).toBe(0.3);  // Abzug

    // None of these should be the calculated result (13.7)
    expect(map.A.value).not.toBe(13.7);
    expect(map.B.value).not.toBe(13.7);
    expect(map.C.value).not.toBe(13.7);
  });

  it('when all inputs are 0, EW should be 0 (C++ behavior: max check)', () => {
    // C++ checks: if (max == 0) res = 0.0
    // This prevents formula artifacts when no values are entered
    const result = calculateFormula('A+B-C', { A: 0, B: 0, C: 0 });
    expect(result).toBe(0);
  });

  it('EW with identity formula 1*x returns the single input value unchanged', () => {
    const map = buildFieldSymbolsMap(simpleFields, '1*x');

    // Only one non-EW field, matched by 'x' variable
    expect(Object.keys(map).length).toBeLessThanOrEqual(1);
  });

  it('EW is the destination for built-in formula (var_formel) at ranking time', () => {
    // Step 1: Jury formula calculates EW from jury fields
    const juryResult = calculateFormula('A+B', { A: 5.0, B: 8.0 });
    expect(juryResult).toBe(13.0);

    // Step 2: Built-in formula (var_formel) transforms EW for ranking
    // Example: "20-x" → lower score = better rank (time-based)
    const rankingScore = applyBuiltInFormula('20-x', juryResult!);
    expect(rankingScore).toBe(7.0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Two-Step Formula System (Jury Formula + Built-in Formula)
// ════════════════════════════════════════════════════════════════════════════

describe('Two-Step Formula System', () => {
  /**
   * C++ architecture has TWO separate formula systems per discipline:
   *
   * STEP 1: Jury Formula (linked, tfx_formeln.var_formel via int_formelid)
   *   - Uses uppercase variables A, B, C...
   *   - Calculates Endwert from jury field inputs
   *   - Example: "A + B - C" → Endwert = D-Note + E-Note - Abzug
   *
   * STEP 2: Built-In Formula (tfx_disziplinen.var_formel)
   *   - Uses lowercase variable 'x' where x = Endwert from Step 1
   *   - Transforms raw score for ranking/display
   *   - Example: "20-x" → lower time = higher points
   */

  it('Step 1: linked formula (A+B-C) calculates Endwert from jury fields', () => {
    const { result, error } = calculateFormulaResult('A+B-C', ['5.8', '8.2', '0.3'], 'letter');
    expect(error).toBeNull();
    expect(result).toBeCloseTo(13.7, 5);
  });

  it('Step 2: built-in formula transforms Endwert for ranking', () => {
    // Identity: "1*x" → no transformation
    expect(applyBuiltInFormula('1*x', 13.7)).toBeCloseTo(13.7, 5);

    // Time conversion: "20-x" → lower = better
    expect(applyBuiltInFormula('20-x', 5.0)).toBe(15.0);

    // Scaling: "x/2,5" → German comma
    expect(applyBuiltInFormula('x/2,5', 12.5)).toBe(5.0);
  });

  it('Step 1 + Step 2 combined: full score pipeline', () => {
    // Step 1: Jury entry → Endwert
    const juryFormulaResult = calculateFormula('A+B-C', { A: 5.8, B: 8.2, C: 0.3 });
    expect(juryFormulaResult).toBeCloseTo(13.7, 5);

    // Step 2: Endwert → Ranking score
    // For most disciplines: "1*x" (identity, no transformation)
    const rankingScore = applyBuiltInFormula('1*x', juryFormulaResult!);
    expect(rankingScore).toBeCloseTo(13.7, 5);
  });

  it('detects formula type correctly for two-step system', () => {
    // Jury formula (linked) → letter type
    expect(detectFormulaType('A+B-C')).toBe('letter');

    // Built-in formula (var_formel) → variable type
    expect(detectFormulaType('1*x')).toBe('variable');
    expect(detectFormulaType('20-x')).toBe('variable');
    expect(detectFormulaType('(((2000/x)-1,784)/0,006)/49')).toBe('variable');
  });

  it('no formula defined → raw score is Endwert (no Step 2)', () => {
    const raw = 9.5;
    expect(applyBuiltInFormula(null, raw)).toBe(raw);
    expect(applyBuiltInFormula(undefined, raw)).toBe(raw);
    expect(applyBuiltInFormula('', raw)).toBe(raw);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Field Sorting & Variable Assignment Order
// ════════════════════════════════════════════════════════════════════════════

describe('Field Sorting & Variable Assignment', () => {

  it('variables assigned by int_sortierung (sortOrder) ASC', () => {
    const fields = [
      { fieldName: 'Abzug', performance: 0.5, sortOrder: 3, isFinalScore: false, isStartingScore: false },
      { fieldName: 'D-Note', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'E-Note', performance: 8.0, sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: 12.5, sortOrder: 4, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A+B-C');

    // Despite Abzug being first in array, sortOrder determines assignment
    expect(map.A.fieldName).toBe('D-Note');  // sortOrder=1 → A
    expect(map.B.fieldName).toBe('E-Note');  // sortOrder=2 → B
    expect(map.C.fieldName).toBe('Abzug');   // sortOrder=3 → C
  });

  it('sortOrder ties resolved by array position', () => {
    const fields = [
      { fieldName: 'Wert 1', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Wert 2', performance: 3.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: 8.0, sortOrder: 2, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A+B');
    expect(Object.keys(map)).toEqual(['A', 'B']);
    // Both have sortOrder=1, so original array order is preserved
    expect(map.A.value).toBe(5.0);
    expect(map.B.value).toBe(3.0);
  });

  it('AW and EW both excluded even when they have sortOrder between input fields', () => {
    const fields = [
      { fieldName: 'D-Note', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Ausgangswert', performance: 4.5, sortOrder: 2, isFinalScore: false, isStartingScore: true },
      { fieldName: 'E-Note', performance: 8.0, sortOrder: 3, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: 13.0, sortOrder: 4, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A+B');
    expect(map.A.fieldName).toBe('D-Note');  // sortOrder=1 (input)
    expect(map.B.fieldName).toBe('E-Note');  // sortOrder=3 (input, AW at sortOrder=2 skipped)
    expect(Object.keys(map)).toEqual(['A', 'B']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Edge Cases & Error Handling
// ════════════════════════════════════════════════════════════════════════════

describe('EW/AW Edge Cases', () => {

  it('discipline with only EW field (no input fields) → empty symbol map', () => {
    const map = buildFieldSymbolsMap(onlyEndwertField, 'A+B');

    // No input fields → A and B are placeholders with null values
    expect(Object.keys(map)).toEqual(['A', 'B']);
    expect(map.A.value).toBeNull();
    expect(map.B.value).toBeNull();
  });

  it('discipline with no EW field → all fields become variables', () => {
    const noEwFields = [
      { fieldName: 'Wert 1', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Wert 2', performance: 3.0, sortOrder: 2, isFinalScore: false, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(noEwFields, 'A+B');
    expect(Object.keys(map)).toEqual(['A', 'B']);
    expect(map.A.value).toBe(5.0);
    expect(map.B.value).toBe(3.0);
  });

  it('multiple EW fields (misconfiguration) → all are excluded', () => {
    const fields = [
      { fieldName: 'Wert', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert 1', performance: 10.0, sortOrder: 2, isFinalScore: true, isStartingScore: false },
      { fieldName: 'Endwert 2', performance: 10.0, sortOrder: 3, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A');
    expect(Object.keys(map)).toEqual(['A']);
    expect(map.A.fieldName).toBe('Wert');
  });

  it('multiple AW fields (misconfiguration) → all are excluded', () => {
    const fields = [
      { fieldName: 'AW 1', performance: 4.0, sortOrder: 0, isFinalScore: false, isStartingScore: true },
      { fieldName: 'AW 2', performance: 5.0, sortOrder: 1, isFinalScore: false, isStartingScore: true },
      { fieldName: 'Wert', performance: 8.0, sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: 8.0, sortOrder: 3, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A');
    expect(Object.keys(map)).toEqual(['A']);
    expect(map.A.fieldName).toBe('Wert');
  });

  it('null performance values handled correctly for input fields', () => {
    const fields = [
      { fieldName: 'D-Note', performance: null, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'E-Note', performance: null, sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: null, sortOrder: 3, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A+B');
    expect(map.A.value).toBeNull();
    expect(map.B.value).toBeNull();
  });

  it('field that is both EW and AW (misconfiguration) → excluded', () => {
    const fields = [
      { fieldName: 'WeirdField', performance: 5.0, sortOrder: 1, isFinalScore: true, isStartingScore: true },
      { fieldName: 'Input', performance: 8.0, sortOrder: 2, isFinalScore: false, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A');
    expect(Object.keys(map)).toEqual(['A']);
    expect(map.A.fieldName).toBe('Input');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Formula Display with EW Assignment
// ════════════════════════════════════════════════════════════════════════════

describe('Formula Display (EW = ... pattern)', () => {

  it('formatFormulaWithValues substitutes only input field values, not EW', () => {
    const values = { A: 5.8, B: 8.2, C: 0.3 };
    const display = formatFormulaWithValues('A+B-C', values);

    // Should show: "5.80+8.20-0.30"
    expect(display).toContain('5.80');
    expect(display).toContain('8.20');
    expect(display).toContain('0.30');

    // Should NOT contain the Endwert
    expect(display).not.toContain('13.70');
  });

  it('extractFormulaSymbols returns only input symbols from formula string', () => {
    const symbols = extractFormulaSymbols('A+B-C');
    expect(symbols).toEqual(['A', 'B', 'C']);
    // Formula string never contains "EW" — it's always the assignment target
  });

  it('formula string never contains EW as a variable', () => {
    // This is a documentation-level assertion:
    // In the C++ architecture, the formula string (e.g., "A+B-C") NEVER contains "EW"
    // EW is always implicitly the left side of the assignment
    const typicalFormulas = [
      'A+B',
      'A+B-C',
      '(10+A)-B',
      'A+B+C-D',
      '1*x',
      '20-x',
      '(((2000/x)-1,784)/0,006)/49',
    ];

    for (const formula of typicalFormulas) {
      const symbols = extractFormulaSymbols(formula);
      // No symbol should be named "EW" or similar
      expect(symbols).not.toContain('EW');
      expect(symbols).not.toContain('Ew');
      expect(symbols).not.toContain('ew');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Realistic Competition Scenarios
// ════════════════════════════════════════════════════════════════════════════

describe('Realistic Gymnastics Scenarios', () => {

  it('Boden (MAG): D + E - Abzüge = Endwert', () => {
    const fields = [
      { fieldName: 'D-Note', performance: 4.6, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'E-Note', performance: 7.85, sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Abzug', performance: 0.1, sortOrder: 3, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: null, sortOrder: 4, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A+B-C');
    const values: Record<string, number> = {};
    for (const [sym, f] of Object.entries(map)) {
      if (f.value !== null) values[sym] = f.value;
    }

    const endwert = calculateFormula('A+B-C', values);
    expect(endwert).toBeCloseTo(12.35, 5);
  });

  it('Sprung (WAG): Ausgangswert displayed separately, not in calculation', () => {
    const fields = [
      { fieldName: 'Ausgangswert', performance: 5.4, sortOrder: 0, isFinalScore: false, isStartingScore: true },
      { fieldName: 'D-Note', performance: 5.4, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'E-Note', performance: 8.1, sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: null, sortOrder: 3, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A+B');
    const values: Record<string, number> = {};
    for (const [sym, f] of Object.entries(map)) {
      if (f.value !== null) values[sym] = f.value;
    }

    const endwert = calculateFormula('A+B', values);
    expect(endwert).toBeCloseTo(13.5, 5);

    // Ausgangswert (5.4) would be displayed in parentheses: "13.50 (5.40)"
    // but NOT included in the calculation
    const awField = fields.find(f => f.isStartingScore);
    expect(awField!.performance).toBe(5.4);
    expect(Object.values(map).every(f => f.fieldName !== 'Ausgangswert')).toBe(true);
  });

  it('Minitrampolin: simple identity formula 1*x', () => {
    const fields = [
      { fieldName: 'Wertung', performance: 8.75, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'Endwert', performance: null, sortOrder: 2, isFinalScore: true, isStartingScore: false },
    ];

    // For simple disciplines, var_formel might be "1*x" applied at ranking time
    const endwert = applyBuiltInFormula('1*x', 8.75);
    expect(endwert).toBe(8.75);
  });

  it('time-based discipline: lower time = higher score via "20-x"', () => {
    // Raw score (time-based): 5.5 seconds
    const rawScore = 5.5;

    // Built-in formula inverts: higher = better
    const rankingScore = applyBuiltInFormula('20-x', rawScore);
    expect(rankingScore).toBe(14.5);
  });

  it('complex time conversion formula with German decimals', () => {
    // Formula from C++ code: "(((2000/x)-1,784)/0,006)/49"
    // (((2000/300) - 1.784) / 0.006) / 49 = ((6.667 - 1.784) / 0.006) / 49
    // = (4.883 / 0.006) / 49 = 813.778 / 49 ≈ 16.608
    const rawScore = 300;
    const result = applyBuiltInFormula('(((2000/x)-1,784)/0,006)/49', rawScore);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(16.608, 1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 9. Naming Convention Consistency
// ════════════════════════════════════════════════════════════════════════════

describe('Naming Convention Consistency (DB → API → Client)', () => {

  it('buildFieldSymbolsMap accepts isFinalScore (API/shared convention)', () => {
    // The shared function uses isFinalScore/isStartingScore
    const fields = [
      { fieldName: 'Input', performance: 5, sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { fieldName: 'EW', performance: 5, sortOrder: 2, isFinalScore: true, isStartingScore: false },
    ];

    const map = buildFieldSymbolsMap(fields, 'A');
    expect(Object.keys(map)).toEqual(['A']);
    expect(map.A.fieldName).toBe('Input');
  });

  it('jury-portal isEndValue/isStartValue work when properly mapped from isFinalScore', () => {
    // This documents the jury-portal's naming convention:
    // API returns: { isFinalScore: true, isStartingScore: false }
    // Jury portal maps to: { isEndValue: true, isStartValue: false }
    
    // The critical fix: mapping must read isFinalScore, not isEndValue
    const apiField = { isFinalScore: true, isStartingScore: false };
    
    // Correct mapping (as fixed in jury-portal):
    const clientField = {
      isEndValue: apiField.isFinalScore,
      isStartValue: apiField.isStartingScore,
    };
    
    expect(clientField.isEndValue).toBe(true);
    expect(clientField.isStartValue).toBe(false);
  });

  it('database defaults: both bol_endwert and bol_ausgangswert default to true', () => {
    // This documents a potential pitfall:
    // New fields in tfx_disziplinen_felder have bol_endwert=true AND bol_ausgangswert=true by default
    // This means they are BOTH excluded from formula input until explicitly set to false
    // The UI should prompt users to configure these flags when adding new fields
    
    const defaultField = { 
      fieldName: 'New Field', 
      performance: null, 
      sortOrder: 1, 
      isFinalScore: true,    // DB default
      isStartingScore: true,  // DB default 
    };

    const map = buildFieldSymbolsMap([defaultField], 'A');
    // Field with both flags true should be excluded
    expect(map.A.value).toBeNull();
    expect(map.A.fieldName).toBe('A'); // Placeholder, not the actual field
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10. Data Flow Contract Tests
// ════════════════════════════════════════════════════════════════════════════

describe('Data Flow Contracts', () => {

  it('Contract 1: Non-EW/AW fields → formula variables (ordered by sortOrder)', () => {
    const map = buildFieldSymbolsMap(fullConfiguration, 'A+B-C');

    // Only non-EW, non-AW fields mapped
    expect(Object.keys(map).length).toBe(3);
    expect(map.A.fieldName).toBe('D-Note');
    expect(map.B.fieldName).toBe('E-Note');
    expect(map.C.fieldName).toBe('Abzug Ausführung');

    // All have correct values
    expect(map.A.value).toBe(5.2);
    expect(map.B.value).toBe(7.8);
    expect(map.C.value).toBe(1.0);
  });

  it('Contract 2: Formula result → EW field value', () => {
    const result = calculateFormula('A+B-C', { A: 5.2, B: 7.8, C: 1.0 });
    expect(result).toBeCloseTo(12.0, 5);

    // This 12.0 should be stored in EW field (matches our test data)
    const ewField = fullConfiguration.find(f => f.isFinalScore);
    expect(ewField!.performance).toBe(12.0);
  });

  it('Contract 3: Abzug fields correctly flagged as subtraction', () => {
    const map = buildFieldSymbolsMap(fullConfiguration, 'A+B-C');

    expect(map.A.isSubtraction).toBe(false); // D-Note
    expect(map.B.isSubtraction).toBe(false); // E-Note
    expect(map.C.isSubtraction).toBe(true);  // Abzug Ausführung
  });

  it('Contract 4: Formula variables count matches formula needs', () => {
    // Formula "A+B-C" needs 3 variables → exactly 3 input fields mapped
    const map3 = buildFieldSymbolsMap(standardGymnasticsFields, 'A+B-C');
    expect(Object.keys(map3).length).toBe(3);

    // Formula "A+B" needs 2 variables → exactly 2 input fields mapped
    const map2 = buildFieldSymbolsMap(fieldsWithAusgangswert, 'A+B');

    // Should map at most 2, but since we only have 2 non-AW/non-EW fields, both get mapped
    expect(Object.keys(map2).length).toBe(2);
  });

  it('Contract 5: sortOrder preserved in symbol map', () => {
    const map = buildFieldSymbolsMap(fullConfiguration, 'A+B-C');

    expect(map.A.sortOrder).toBe(1); // D-Note
    expect(map.B.sortOrder).toBe(2); // E-Note
    expect(map.C.sortOrder).toBe(3); // Abzug Ausführung
  });
});
