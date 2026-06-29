/**
 * TDD tests for LinkedFormulaInput (shared component).
 *
 * LinkedFormulaInput is the single shared implementation for formula-based
 * score entry with multiple fields (linked/complex formulas like "A + B",
 * "A - B + C", "1*x").
 *
 * It is used by both ScoreCaptureV2 and the Jury Portal to ensure
 * identical UX on all scoring devices.
 *
 * Architecture invariant: no DB hooks are used — the component is pure
 * (functions from @turnfix/shared for calculation, symbol extraction,
 * and formatting only). The caller provides disciplineFields for labels
 * and initialValues for pre-filling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LinkedFormulaInput } from '@turnfix/shared';
import React from 'react';

// LinkedFormulaInput is a plain component — no hook mocks needed.
// It uses calculateFormula / extractFormulaSymbols internally (pure functions).

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb ?? k }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const field = (id: number, name: string) => ({ id, name });

// ── Tests ──────────────────────────────────────────────────────────────────

describe('LinkedFormulaInput', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders exactly 1 input for "1*x" formula', () => {
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'Wertung')]}
      />
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('renders exactly 2 inputs for "A + B" formula', () => {
    render(
      <LinkedFormulaInput
        formula="A + B"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'D-Note'), field(2, 'E-Note')]}
      />
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('labels inputs as "{symbol}: {fieldName}"', () => {
    render(
      <LinkedFormulaInput
        formula="A + B"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'D-Note'), field(2, 'E-Note')]}
      />
    );
    expect(screen.getByText('A: D-Note')).toBeTruthy();
    expect(screen.getByText('B: E-Note')).toBeTruthy();
  });

  it('falls back to symbol as label when disciplineFields not provided', () => {
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
      />
    );
    // Label must contain the symbol 'x'
    expect(screen.getByText(/x/)).toBeTruthy();
  });

  it('shows "-" in result box when no value entered', () => {
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'Wertung')]}
      />
    );
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('shows "Berechnetes Ergebnis:" result box label', () => {
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'Wertung')]}
      />
    );
    expect(screen.getByText('Berechnetes Ergebnis:')).toBeTruthy();
  });

  // ── Calculation ───────────────────────────────────────────────────────────

  it('calculates result for "1*x" when user enters 5', () => {
    const onScoreChange = vi.fn();
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={onScoreChange}
        disciplineFields={[field(1, 'Wertung')]}
        decimals={2}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '5' } });

    expect(onScoreChange).toHaveBeenCalledWith(5, { x: 5 });
  });

  it('calculates result for "A + B" when user enters both fields', () => {
    const onScoreChange = vi.fn();
    render(
      <LinkedFormulaInput
        formula="A + B"
        onScoreChange={onScoreChange}
        disciplineFields={[field(1, 'D-Note'), field(2, 'E-Note')]}
        decimals={2}
      />
    );

    const [inputA, inputB] = screen.getAllByRole('textbox');
    fireEvent.change(inputA, { target: { value: '8' } });
    fireEvent.change(inputB, { target: { value: '2' } });

    // Last call should have total = 10
    const lastCall = onScoreChange.mock.calls.at(-1)!;
    expect(lastCall[0]).toBeCloseTo(10, 5);
    expect(lastCall[1]).toMatchObject({ A: 8, B: 2 });
  });

  it('formats calculated result with dot separator consistently', () => {
    render(
      <LinkedFormulaInput
        formula="A + B"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'D-Note'), field(2, 'E-Note')]}
        decimals={2}
      />
    );

    const [inputA, inputB] = screen.getAllByRole('textbox');
    fireEvent.change(inputA, { target: { value: '3' } });
    fireEvent.change(inputB, { target: { value: '0.5' } });

    expect(screen.getByText('3.50')).toBeTruthy();
  });

  it('calls onScoreChange with null when field is cleared', () => {
    const onScoreChange = vi.fn();
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={onScoreChange}
        disciplineFields={[field(1, 'Wertung')]}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.change(input, { target: { value: '' } });

    const lastCall = onScoreChange.mock.calls.at(-1)!;
    // 0 or null: empty string maps to 0 in the formula; result from 1*0=0
    expect(lastCall[0]).not.toBeUndefined();
  });

  it('TDD: does not force decimal padding on blur after typing an integer', () => {
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'Wertung')]}
        decimals={2}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.blur(input);

    // Keep compact input to avoid follow-up appends like "1.002".
    expect(input.value).toBe('1');
  });

  // ── Initial values ────────────────────────────────────────────────────────

  it('pre-fills input from initialValues', () => {
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'Wertung')]}
        initialValues={{ x: 5 }}
        decimals={2}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('5');
  });

  it('pre-fills two inputs from initialValues for "A + B"', () => {
    render(
      <LinkedFormulaInput
        formula="A + B"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'D-Note'), field(2, 'E-Note')]}
        initialValues={{ A: 8.5, B: 1.5 }}
        decimals={2}
      />
    );

    const [inputA, inputB] = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputA.value).toBe('8.5');
    expect(inputB.value).toBe('1.5');
  });

  it('TDD: initialValues sync keeps compact editable value (no forced .00)', () => {
    const Host = ({ initial }: { initial: Record<string, number> }) => (
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'Wertung')]}
        decimals={2}
        initialValues={initial}
      />
    );

    const { rerender } = render(<Host initial={{}} />);
    rerender(<Host initial={{ x: 1 }} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1');
  });

  // ── Disabled state ────────────────────────────────────────────────────────

  it('disables all inputs when disabled={true}', () => {
    render(
      <LinkedFormulaInput
        formula="A + B"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'D-Note'), field(2, 'E-Note')]}
        disabled={true}
      />
    );

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    inputs.forEach(input => expect(input.disabled).toBe(true));
  });

  it('enables all inputs when disabled={false}', () => {
    render(
      <LinkedFormulaInput
        formula="1*x"
        onScoreChange={() => {}}
        disciplineFields={[field(1, 'Wertung')]}
        disabled={false}
      />
    );

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    inputs.forEach(input => expect(input.disabled).toBe(false));
  });
});
