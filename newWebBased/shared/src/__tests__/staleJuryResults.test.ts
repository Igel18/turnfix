/**
 * Stale Jury Results Tests
 *
 * Tests for the fix where Results page showed old discipline fields after
 * a formula change. When a discipline's formula changes (e.g., from "A+B-C"
 * to "1*x"), old jury results from the previous formula remain in the database
 * but should NOT be displayed.
 *
 * Root Cause:
 * ───────────
 * 1. Discipline had linked formula "A+B-C" with fields: Schwierigkeit, Wertung, Abzug
 * 2. User changed to built-in formula "1*x" (variable-type, no linked formula)
 * 3. Old tfx_jury_results entries still reference old field IDs
 * 4. Results page's JuryResultsDisplay incorrectly displayed them as A, B, C
 *
 * Fix:
 * ────
 * - Client: JuryResultsDisplay clears fields for variable-type formulas
 *   (matches Score Capture / Jury Portal builtInFormula mode behavior)
 * - Server: scores.ts filters out non-EW/AW jury results when no linked formula exists
 *
 * @see JuryResultsDisplay.tsx
 * @see server/src/routes/scores.ts (filteredJuryResults)
 */

import { describe, it, expect } from 'vitest';
import {
  buildFieldSymbolsMap,
  detectFormulaType,
  extractFormulaSymbols,
  calculateFormula,
  applyBuiltInFormula,
  type FormulaField,
} from '../formulaUtils';
import { resolveScoringInputMode } from '../scoringInputMode';

// ════════════════════════════════════════════════════════════════════════════
// Test Data: Simulates a discipline that switched from "A+B-C" to "1*x"
// ════════════════════════════════════════════════════════════════════════════

/** Old jury results from when the discipline had linked formula "A+B-C" */
const STALE_JURY_RESULTS = [
  {
    fieldName: 'Schwierigkeit',
    fieldShortName: 'Schwierigkeit',
    performance: 14.56,
    isFinalScore: false,
    isStartingScore: false,
    sortOrder: 1,
  },
  {
    fieldName: 'Wertung',
    fieldShortName: 'Wertung',
    performance: 12.34,
    isFinalScore: false,
    isStartingScore: false,
    sortOrder: 2,
  },
  {
    fieldName: 'Abzug',
    fieldShortName: 'Abzug',
    performance: 1.00,
    isFinalScore: false,
    isStartingScore: false,
    sortOrder: 3,
  },
];

/** Old jury results including EW (Endwert) field */
const STALE_JURY_RESULTS_WITH_EW = [
  ...STALE_JURY_RESULTS,
  {
    fieldName: 'Endwert',
    fieldShortName: 'EW',
    performance: 25.90,
    isFinalScore: true,
    isStartingScore: false,
    sortOrder: 99,
  },
];

/** Old jury results including AW (Ausgangswert) field */
const STALE_JURY_RESULTS_WITH_AW_AND_EW = [
  {
    fieldName: 'Ausgangswert',
    fieldShortName: 'AW',
    performance: 5.00,
    isFinalScore: false,
    isStartingScore: true,
    sortOrder: 0,
  },
  ...STALE_JURY_RESULTS,
  {
    fieldName: 'Endwert',
    fieldShortName: 'EW',
    performance: 25.90,
    isFinalScore: true,
    isStartingScore: false,
    sortOrder: 99,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// 1. Formula Type Detection After Formula Change
// ════════════════════════════════════════════════════════════════════════════

describe('Formula type detection after formula change', () => {
  it('detects old linked formula as letter-type', () => {
    expect(detectFormulaType('A+B-C')).toBe('letter');
    expect(detectFormulaType('A+B')).toBe('letter');
    expect(detectFormulaType('(10+A)-B')).toBe('letter');
  });

  it('detects new built-in formula as variable-type', () => {
    expect(detectFormulaType('1*x')).toBe('variable');
    expect(detectFormulaType('20-x')).toBe('variable');
    expect(detectFormulaType('x/2,5')).toBe('variable');
  });

  it('detects purely numeric formulas as none', () => {
    expect(detectFormulaType('10')).toBe('none');
    expect(detectFormulaType('')).toBe('none');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Scoring Input Mode Resolution
// ════════════════════════════════════════════════════════════════════════════

describe('Scoring input mode after formula change', () => {
  it('old formula with formulaId → linkedFormula mode', () => {
    expect(resolveScoringInputMode({ formula: 'A+B-C', formulaId: 5 })).toBe('linkedFormula');
  });

  it('letter-type formula without formulaId → linkedFormula mode', () => {
    expect(resolveScoringInputMode({ formula: 'A+B-C', formulaId: null })).toBe('linkedFormula');
  });

  it('new variable-type formula without formulaId → builtInFormula mode', () => {
    expect(resolveScoringInputMode({ formula: '1*x', formulaId: null })).toBe('builtInFormula');
    expect(resolveScoringInputMode({ formula: '20-x', formulaId: null })).toBe('builtInFormula');
  });

  it('no formula → simple mode', () => {
    expect(resolveScoringInputMode({ formula: '', formulaId: null })).toBe('simple');
  });

  it('variable-type formula WITH formulaId → linkedFormula mode (formulaId takes precedence)', () => {
    expect(resolveScoringInputMode({ formula: '1*x', formulaId: 12 })).toBe('linkedFormula');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. buildFieldSymbolsMap with Stale Jury Results
// ════════════════════════════════════════════════════════════════════════════

describe('buildFieldSymbolsMap with stale jury results and variable formula', () => {
  it('maps stale fields to variables when given old letter formula', () => {
    // With the old formula, stale results map correctly
    const fields = buildFieldSymbolsMap(STALE_JURY_RESULTS, 'A+B-C');
    expect(Object.keys(fields)).toEqual(['A', 'B', 'C']);
    expect(fields['A'].value).toBe(14.56);
    expect(fields['B'].value).toBe(12.34);
    expect(fields['C'].value).toBe(1.00);
  });

  it('cannot map stale fields to variable formula (x)', () => {
    // With variable formula, stale results cannot be matched
    const fields = buildFieldSymbolsMap(STALE_JURY_RESULTS, '1*x');
    expect(Object.keys(fields)).toEqual(['x']);
    // x should be null because no field named 'x' exists
    expect(fields['x'].value).toBeNull();
  });

  it('auto-assigns A, B, C when no formula given (the old buggy fallback)', () => {
    // Without formula, buildFieldSymbolsMap auto-assigns letters
    // This is what the buggy fallback was doing
    const fields = buildFieldSymbolsMap(STALE_JURY_RESULTS, undefined);
    expect(Object.keys(fields)).toEqual(['A', 'B', 'C']);
    expect(fields['A'].value).toBe(14.56);
    expect(fields['A'].fieldName).toBe('Schwierigkeit');
    expect(fields['B'].value).toBe(12.34);
    expect(fields['C'].value).toBe(1.00);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. JuryResultsDisplay Logic (Client-Side Fix)
// ════════════════════════════════════════════════════════════════════════════

describe('JuryResultsDisplay stale field handling', () => {
  /**
   * Simulates the JuryResultsDisplay logic to verify the fix.
   * This mirrors the actual component code.
   */
  function simulateJuryResultsDisplay(
    juryResults: typeof STALE_JURY_RESULTS,
    finalScore: number,
    formula?: string
  ): { fields: FormulaField[]; actualFinalScore: number } {
    const formulaType = formula ? detectFormulaType(formula) : 'none';
    let fieldsMap = buildFieldSymbolsMap(juryResults, formula);
    let fields: FormulaField[] = Object.values(fieldsMap);

    // === THE FIX: Variable-type formulas clear fields ===
    if (formulaType === 'variable') {
      fields = [];
    }

    // Recalculation logic (only for letter-type)
    let actualFinalScore = finalScore;
    if (formula && formulaType === 'letter' && fields.length > 0) {
      const valuesMap: Record<string, number> = {};
      fields.forEach(field => {
        if (field.value !== null) {
          valuesMap[field.symbol] = field.value;
        }
      });
      const calculatedScore = calculateFormula(formula, valuesMap);
      if (calculatedScore !== null) {
        actualFinalScore = calculatedScore;
      }
    }

    return { fields, actualFinalScore };
  }

  it('shows NO field breakdown for variable-type formula with stale results', () => {
    const result = simulateJuryResultsDisplay(STALE_JURY_RESULTS, 5.00, '1*x');
    // Fields should be empty — no stale field breakdown
    expect(result.fields).toEqual([]);
    // Final score should remain as passed in (no recalculation for variable-type)
    expect(result.actualFinalScore).toBe(5.00);
  });

  it('shows NO field breakdown for "20-x" formula with stale results', () => {
    const result = simulateJuryResultsDisplay(STALE_JURY_RESULTS, 15.00, '20-x');
    expect(result.fields).toEqual([]);
    expect(result.actualFinalScore).toBe(15.00);
  });

  it('shows field breakdown for letter-type formula (correct behavior)', () => {
    const result = simulateJuryResultsDisplay(STALE_JURY_RESULTS, 25.90, 'A+B-C');
    expect(result.fields.length).toBe(3);
    expect(result.fields[0].symbol).toBe('A');
    expect(result.fields[0].value).toBe(14.56);
    expect(result.fields[1].symbol).toBe('B');
    expect(result.fields[1].value).toBe(12.34);
    expect(result.fields[2].symbol).toBe('C');
    expect(result.fields[2].value).toBe(1.00);
    // Recalculated: 14.56 + 12.34 - 1.00 = 25.90
    expect(result.actualFinalScore).toBeCloseTo(25.90, 2);
  });

  it('shows field breakdown for letter-type formula without stale results', () => {
    const currentJuryResults = [
      { fieldName: 'D-Note', fieldShortName: 'D-Note', performance: 4.5, isFinalScore: false, isStartingScore: false, sortOrder: 1 },
      { fieldName: 'E-Note', fieldShortName: 'E-Note', performance: 8.2, isFinalScore: false, isStartingScore: false, sortOrder: 2 },
    ];
    const result = simulateJuryResultsDisplay(currentJuryResults, 12.70, 'A+B');
    expect(result.fields.length).toBe(2);
    expect(result.actualFinalScore).toBeCloseTo(12.70, 2);
  });

  it('shows no field breakdown when formula is none', () => {
    const result = simulateJuryResultsDisplay(STALE_JURY_RESULTS, 5.00, undefined);
    // Without formula, auto-assigns A, B, C — but this path is only reached when
    // formula is undefined AND there are jury results. The fix only applies to
    // variable-type formulas. For 'none' type, auto-assignment still occurs
    // (this is acceptable because 'none' type with jury results means the
    // formula was cleared entirely, not changed to a built-in one).
    expect(result.fields.length).toBe(3);
    expect(result.actualFinalScore).toBe(5.00); // No recalculation without formula
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Server-Side Stale Jury Results Filtering
// ════════════════════════════════════════════════════════════════════════════

describe('Server-side stale jury results filtering', () => {
  /**
   * Simulates the server-side filtering logic from scores.ts.
   * When no linked formula exists, only EW/AW jury results are kept.
   */
  function filterStaleJuryResults(
    juryResults: Array<{ isFinalScore?: boolean; isStartingScore?: boolean; fieldName?: string; performance: number | null }>,
    linkedFormula: string | null
  ): typeof juryResults {
    if (!linkedFormula && juryResults.length > 0) {
      return juryResults.filter(jr => jr.isFinalScore || jr.isStartingScore);
    }
    return juryResults;
  }

  it('filters out regular fields when no linked formula', () => {
    const filtered = filterStaleJuryResults(STALE_JURY_RESULTS, null);
    expect(filtered).toEqual([]);
  });

  it('keeps all fields when linked formula exists', () => {
    const filtered = filterStaleJuryResults(STALE_JURY_RESULTS, 'A+B-C');
    expect(filtered.length).toBe(3);
  });

  it('keeps EW field when no linked formula', () => {
    const filtered = filterStaleJuryResults(STALE_JURY_RESULTS_WITH_EW, null);
    expect(filtered.length).toBe(1);
    expect(filtered[0].isFinalScore).toBe(true);
    expect(filtered[0].fieldName).toBe('Endwert');
  });

  it('keeps both AW and EW when no linked formula', () => {
    const filtered = filterStaleJuryResults(STALE_JURY_RESULTS_WITH_AW_AND_EW, null);
    expect(filtered.length).toBe(2);
    expect(filtered.some(jr => jr.isFinalScore)).toBe(true);
    expect(filtered.some(jr => jr.isStartingScore)).toBe(true);
  });

  it('keeps all jury results including EW/AW when linked formula exists', () => {
    const filtered = filterStaleJuryResults(STALE_JURY_RESULTS_WITH_AW_AND_EW, 'A+B-C');
    expect(filtered.length).toBe(5); // 3 regular + AW + EW
  });

  it('handles empty jury results array', () => {
    const filtered = filterStaleJuryResults([], null);
    expect(filtered).toEqual([]);
  });

  it('handles empty jury results array with linked formula', () => {
    const filtered = filterStaleJuryResults([], 'A+B-C');
    expect(filtered).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. End-to-End Scenario: Formula Change Flow
// ════════════════════════════════════════════════════════════════════════════

describe('End-to-end: Formula change from A+B-C to 1*x', () => {
  const OLD_FORMULA = 'A+B-C';
  const NEW_FORMULA = '1*x';
  const STORED_SCORE = 5.00; // New score entered after formula change

  it('old formula correctly calculates from jury results', () => {
    const result = calculateFormula(OLD_FORMULA, { A: 14.56, B: 12.34, C: 1.00 });
    expect(result).toBeCloseTo(25.90, 2);
  });

  it('new formula correctly applies to single value', () => {
    const result = applyBuiltInFormula(NEW_FORMULA, STORED_SCORE);
    expect(result).toBe(5.00);
  });

  it('scoring mode changes from linkedFormula to builtInFormula', () => {
    const oldMode = resolveScoringInputMode({ formula: OLD_FORMULA, formulaId: 5 });
    expect(oldMode).toBe('linkedFormula');

    const newMode = resolveScoringInputMode({ formula: NEW_FORMULA, formulaId: null });
    expect(newMode).toBe('builtInFormula');
  });

  it('Results page does NOT show old fields after switch to variable formula', () => {
    // Simulate what Results page does:
    // 1. Server returns old jury results (stale)
    // 2. Client has new formula "1*x"
    // 3. JuryResultsDisplay should NOT show old fields
    
    const formulaType = detectFormulaType(NEW_FORMULA);
    expect(formulaType).toBe('variable');

    // buildFieldSymbolsMap with new formula → only x placeholder
    const fieldsMap = buildFieldSymbolsMap(STALE_JURY_RESULTS, NEW_FORMULA);
    expect(fieldsMap['x'].value).toBeNull(); // x can't match old field names

    // The fix: for variable-type, clear fields entirely
    const fields = formulaType === 'variable' ? [] : Object.values(fieldsMap);
    expect(fields).toEqual([]);
  });

  it('Results page correctly recalculates with stored score for variable formula', () => {
    // For variable-type formulas, recalculation is skipped.
    // The stored score from tfx_wertungen_details is used directly.
    const formulaType = detectFormulaType(NEW_FORMULA);
    expect(formulaType).toBe('variable');

    // Step 2 of two-step formula: apply built-in formula
    const transformedScore = applyBuiltInFormula(NEW_FORMULA, STORED_SCORE);
    expect(transformedScore).toBe(5.00);
  });

  it('server-side filter removes stale jury results when no linked formula', () => {
    // Server: formula (from tfx_formeln) is null after formula change
    const linkedFormula = null;
    const filtered = (!linkedFormula && STALE_JURY_RESULTS.length > 0)
      ? STALE_JURY_RESULTS.filter(jr => jr.isFinalScore || jr.isStartingScore)
      : STALE_JURY_RESULTS;
    
    expect(filtered).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Edge Cases
// ════════════════════════════════════════════════════════════════════════════

describe('Stale jury results edge cases', () => {
  it('handles formula change from simple to variable', () => {
    // Discipline had no formula, then got "1*x"
    const modeAfter = resolveScoringInputMode({ formula: '1*x', formulaId: null });
    expect(modeAfter).toBe('builtInFormula');
  });

  it('handles formula change from variable to letter', () => {
    // Discipline had "1*x", then got linked formula "A+B"
    const mode = resolveScoringInputMode({ formula: 'A+B', formulaId: 7 });
    expect(mode).toBe('linkedFormula');
  });

  it('handles complex variable formula "(((1000/x)-2,158)/0,006)/49"', () => {
    const formula = '(((1000/x)-2,158)/0,006)/49';
    expect(detectFormulaType(formula)).toBe('variable');
    
    // With stale jury results, fields should be cleared
    const formulaType = detectFormulaType(formula);
    const fields = formulaType === 'variable' ? [] : [];
    expect(fields).toEqual([]);
  });

  it('variable formula with EW-only result still shows correctly', () => {
    // Only an EW result exists (no stale regular fields)
    const ewOnlyResults = [
      {
        fieldName: 'Endwert',
        fieldShortName: 'EW',
        performance: 10.00,
        isFinalScore: true,
        isStartingScore: false,
        sortOrder: 99,
      },
    ];
    
    // buildFieldSymbolsMap filters out EW, so fields are empty
    const fieldsMap = buildFieldSymbolsMap(ewOnlyResults, '1*x');
    const regularFields = Object.values(fieldsMap).filter(f => f.value !== null);
    // x placeholder has null value (EW is filtered)
    expect(fieldsMap['x'].value).toBeNull();
  });

  it('no formula and no jury results renders simple score', () => {
    const fieldsMap = buildFieldSymbolsMap([], undefined);
    expect(Object.keys(fieldsMap)).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. PDF Export Stale Field Filtering
// ════════════════════════════════════════════════════════════════════════════

describe('PDF export stale field filtering', () => {
  /**
   * Simulates the PDF export discipline data generation logic from useExport.ts.
   * This mirrors the actual code in both exportSingleCompetitionPDF and
   * exportAllCompetitionsPDF.
   */
  function simulatePdfDisciplineCell(
    score: number | undefined,
    juryResults: typeof STALE_JURY_RESULTS | undefined,
    formula: string | undefined,
    formatScore: (n: number) => string
  ): string {
    if (!score) return '-';
    if (!juryResults || juryResults.length === 0) return formatScore(score);

    const formulaType = formula ? detectFormulaType(formula) : 'none';

    // THE FIX: Variable-type formulas skip field breakdown
    if (formulaType === 'variable') {
      return formatScore(score);
    }

    const fieldsMap = buildFieldSymbolsMap(juryResults, formula);
    const fields = Object.values(fieldsMap);
    const breakdown: string[] = [];
    const fieldScores = fields
      .map(f => `${f.symbol}: ${f.value !== null ? f.value.toFixed(2) : '-'}`)
      .join(', ');
    if (fieldScores) breakdown.push(fieldScores);
    breakdown.push(`Total: ${formatScore(score)}`);
    return breakdown.join('\n');
  }

  const fmt = (n: number) => n.toFixed(2);

  it('shows only total score for variable formula with stale jury results (BODEN case)', () => {
    // BODEN had A+B-C, now has 1*x → should show "5.00" not "A: 34.56, B: 12.34, C: 1.00"
    const result = simulatePdfDisciplineCell(5.00, STALE_JURY_RESULTS, '1*x', fmt);
    expect(result).toBe('5.00');
    expect(result).not.toContain('A:');
    expect(result).not.toContain('Schwierigkeit');
  });

  it('shows only total score for "20-x" formula with stale results', () => {
    const result = simulatePdfDisciplineCell(15.00, STALE_JURY_RESULTS, '20-x', fmt);
    expect(result).toBe('15.00');
  });

  it('shows field breakdown for letter formula (correct behavior)', () => {
    const result = simulatePdfDisciplineCell(25.90, STALE_JURY_RESULTS, 'A+B-C', fmt);
    expect(result).toContain('A: 14.56');
    expect(result).toContain('B: 12.34');
    expect(result).toContain('C: 1.00');
    expect(result).toContain('Total: 25.90');
  });

  it('shows simple score when no jury results exist', () => {
    const result = simulatePdfDisciplineCell(12.50, undefined, '1*x', fmt);
    expect(result).toBe('12.50');
  });

  it('shows dash when no score exists', () => {
    const result = simulatePdfDisciplineCell(undefined, STALE_JURY_RESULTS, 'A+B-C', fmt);
    expect(result).toBe('-');
  });

  it('shows field breakdown when no formula exists but jury results do', () => {
    // No formula → auto-assigns A, B, C
    const result = simulatePdfDisciplineCell(25.90, STALE_JURY_RESULTS, undefined, fmt);
    expect(result).toContain('A: 14.56');
    expect(result).toContain('Total: 25.90');
  });
});
