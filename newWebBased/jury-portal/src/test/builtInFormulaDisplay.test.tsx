/**
 * TDD Tests — Built-in Formula Score Display in Jury Portal
 *
 * When a participant already has a stored score for a discipline with a
 * built-in formula (var_formel like "1*x" or "20-x"):
 *   - The stored raw value should appear in the "x: Feld x" input
 *   - The "Berechnetes Ergebnis" should show the formula-applied result
 *
 * These tests cover:
 *   1. getBuiltInFormulaInitialValues() helper (unit)
 *   2. FormulaInput rendering for lowercase built-in formulas (component)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getBuiltInFormulaInitialValues } from '@turnfix/shared';
import FormulaInput from '../components/FormulaInput';

// ─── Unit: getBuiltInFormulaInitialValues ──────────────────────────────────

describe('getBuiltInFormulaInitialValues', () => {
  it('should map stored score to lowercase "x" for formula "1*x"', () => {
    const result = getBuiltInFormulaInitialValues('1*x', 7.5, 0);
    expect(result).toEqual({ x: 7.5 });
  });

  it('should map stored score to lowercase "x" for formula "20-x"', () => {
    const result = getBuiltInFormulaInitialValues('20-x', 15, 0);
    expect(result).toEqual({ x: 15 });
  });

  it('should map string score values', () => {
    const result = getBuiltInFormulaInitialValues('1*x', '8.25', 0);
    expect(result).toEqual({ x: 8.25 });
  });

  it('should return empty for null formula', () => {
    expect(getBuiltInFormulaInitialValues(null, 7.5, 0)).toEqual({});
  });

  it('should return empty for null score', () => {
    expect(getBuiltInFormulaInitialValues('1*x', null, 0)).toEqual({});
  });

  it('should return empty for undefined score', () => {
    expect(getBuiltInFormulaInitialValues('1*x', undefined, 0)).toEqual({});
  });

  it('should return empty for empty formula', () => {
    expect(getBuiltInFormulaInitialValues('', 7.5, 0)).toEqual({});
  });

  it('should return empty when discipline has linked fields (linked formula)', () => {
    // If disciplineFieldCount > 0, jury results are loaded separately
    expect(getBuiltInFormulaInitialValues('(10+A)-B', 12.5, 2)).toEqual({});
  });

  it('should return empty for purely uppercase formula with no linked fields', () => {
    // Formula has uppercase symbols only → linked formula without fields (edge case)
    expect(getBuiltInFormulaInitialValues('(10+A)-B', 12.5, 0)).toEqual({});
  });

  it('should handle NaN string score', () => {
    expect(getBuiltInFormulaInitialValues('1*x', 'abc', 0)).toEqual({});
  });

  it('should handle zero score', () => {
    const result = getBuiltInFormulaInitialValues('1*x', 0, 0);
    expect(result).toEqual({ x: 0 });
  });
});

// ─── Component: FormulaInput with lowercase built-in formulas ──────────────

describe('FormulaInput — built-in formula display (lowercase x)', () => {
  it('should render "x: Feld x" field for formula "1*x"', () => {
    render(
      <FormulaInput
        formula="1*x"
        decimals={2}
        onScoreChange={vi.fn()}
        disciplineFields={[]}
        initialValues={{}}
      />
    );

    expect(screen.getByText(/x: Feld x/)).toBeTruthy();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(1);
  });

  it('should populate "x" field from initialValues for scored participant', () => {
    render(
      <FormulaInput
        formula="1*x"
        decimals={2}
        onScoreChange={vi.fn()}
        disciplineFields={[]}
        initialValues={{ x: 7.5 }}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('7.50');
  });

  it('should show calculated result for identity formula "1*x" with x=7.5', () => {
    render(
      <FormulaInput
        formula="1*x"
        decimals={2}
        onScoreChange={vi.fn()}
        disciplineFields={[]}
        initialValues={{ x: 7.5 }}
      />
    );

    // 1 * 7.5 = 7.5 → "7.50"
    expect(screen.getByText('7.50')).toBeTruthy();
  });

  it('should show transformed result for formula "20-x" with x=15', () => {
    const onScoreChange = vi.fn();
    render(
      <FormulaInput
        formula="20-x"
        decimals={2}
        onScoreChange={onScoreChange}
        disciplineFields={[]}
        initialValues={{ x: 15 }}
      />
    );

    // 20 - 15 = 5 → "5.00"
    expect(screen.getByText('5.00')).toBeTruthy();

    // onScoreChange should have been called with the calculated result
    const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
    expect(lastCall[0]).toBeCloseTo(5.0, 2);
  });

  it('should clear "x" field when participant changes to unsaved (initialValues empty)', () => {
    const { rerender } = render(
      <FormulaInput
        formula="1*x"
        decimals={2}
        onScoreChange={vi.fn()}
        disciplineFields={[]}
        initialValues={{ x: 7.5 }}
      />
    );

    // Field should be populated
    let inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('7.50');

    // Navigate to new participant with no score
    rerender(
      <FormulaInput
        formula="1*x"
        decimals={2}
        onScoreChange={vi.fn()}
        disciplineFields={[]}
        initialValues={{}}
      />
    );

    // Field should be cleared
    inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('');
  });

  it('should update "x" field when switching between scored participants', () => {
    const { rerender } = render(
      <FormulaInput
        formula="1*x"
        decimals={2}
        onScoreChange={vi.fn()}
        disciplineFields={[]}
        initialValues={{ x: 7.5 }}
      />
    );

    // Participant A: x=7.5
    let inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('7.50');

    // Navigate to Participant B: x=9.0
    rerender(
      <FormulaInput
        formula="1*x"
        decimals={2}
        onScoreChange={vi.fn()}
        disciplineFields={[]}
        initialValues={{ x: 9.0 }}
      />
    );

    inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('9.00');
  });
});
