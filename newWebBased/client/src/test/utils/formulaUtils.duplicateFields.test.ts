/**
 * Regression: the server recalculates the score from tfx_jury_results rows.
 * If the same discipline field appears more than once (e.g. rows for different
 * kp/type values), a field must not be counted for two formula symbols.
 * Example from the bug report: A=5, B=7,5 must give 12.5, never 17.5 / 20 / 25.
 */

import { describe, it, expect } from 'vitest';
import { buildFieldSymbolsMap, calculateFormula } from '@turnfix/shared';

const compute = (rows: any[], formula: string) => {
  const map = buildFieldSymbolsMap(rows, formula);
  const values: Record<string, number> = {};
  Object.values(map).forEach(f => { if (f.value !== null) values[f.symbol] = f.value; });
  return calculateFormula(formula, values);
};

const row = (fieldId: number, name: string, sortOrder: number, performance: number) => ({
  fieldId, fieldName: name, fieldShortName: name, sortOrder, performance,
  isFinalScore: false, isStartingScore: false
});

describe('buildFieldSymbolsMap with duplicate field rows', () => {
  it('baseline: A=5, B=7.5 -> 12.5', () => {
    expect(compute([row(1, 'D/A-Note', 1, 5), row(2, 'E/B-Note', 2, 7.5)], 'A + B - C')).toBe(12.5);
  });

  it('does not map a duplicated field row (same field id) to a second symbol', () => {
    const rows = [row(1, 'D/A-Note', 1, 5), row(1, 'D/A-Note', 1, 5), row(2, 'E/B-Note', 2, 7.5)];
    expect(compute(rows, 'A + B - C')).toBe(12.5);
  });

  it('uses the latest row when a duplicated field row has a different value', () => {
    const rows = [row(1, 'D/A-Note', 1, 3), row(2, 'E/B-Note', 2, 7.5), row(1, 'D/A-Note', 1, 5)];
    expect(compute(rows, 'A + B - C')).toBe(12.5);
  });

  it('still works for rows without field ids (legacy callers)', () => {
    const rows = [
      { fieldName: 'D/A-Note', sortOrder: 1, performance: 5, isFinalScore: false, isStartingScore: false },
      { fieldName: 'E/B-Note', sortOrder: 2, performance: 7.5, isFinalScore: false, isStartingScore: false }
    ];
    expect(compute(rows, 'A + B - C')).toBe(12.5);
  });
});
