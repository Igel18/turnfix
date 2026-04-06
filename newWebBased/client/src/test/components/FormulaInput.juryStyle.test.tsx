/**
 * Unit tests for FormulaInput — juryStyle mode.
 *
 * Key invariant: juryStyle renders exactly as many input fields as there are
 * formula symbols (same as the Jury Portal's FormulaInput). This prevents
 * all database discipline fields from being displayed when the formula only
 * uses a subset of them (e.g., "1*x" has 1 symbol but a discipline may have
 * 6 DB fields like "Wertung, D/A-Note, E/B-Note, Ausgangswert, D-Note, E-Note").
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormulaInput } from '@/components/FormulaInput';

// ── Hoisted mock so it's available inside the vi.mock factory ──────────────
const mockUseFormulaFields = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useFormulaFields', () => ({
  useFormulaFields: mockUseFormulaFields,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'de' },
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

type FieldDef = { id: number; name: string; isFinalScore: boolean };

const makeReturn = (
  effectiveFormula: string,
  fieldDefs: FieldDef[],
  overrides: Partial<ReturnType<typeof makeReturn>> = {}
) => ({
  fields: fieldDefs.map(f => ({
    ...f,
    value: '',
    normalizedValue: '',
    isStartingScore: false,
  })),
  calculatedResult: null,
  formulaError: null,
  loadingFormula: false,
  effectiveFormula,
  updateFieldValue: vi.fn(),
  normalizeFieldValue: vi.fn(),
  getFieldOperator: vi.fn(() => ''),
  getFieldLetterLabel: vi.fn((i: number) => String.fromCharCode(65 + i)),
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('FormulaInput – juryStyle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows exactly 1 input for "1*x" even when 6 DB fields exist', () => {
    mockUseFormulaFields.mockReturnValue(makeReturn('1*x', [
      { id: 1, name: 'Wertung',      isFinalScore: false },
      { id: 2, name: 'D/A-Note',     isFinalScore: false },
      { id: 3, name: 'E/B-Note',     isFinalScore: false },
      { id: 4, name: 'Ausgangswert', isFinalScore: false },
      { id: 5, name: 'D-Note',       isFinalScore: false },
      { id: 6, name: 'E-Note',       isFinalScore: false },
      { id: 7, name: 'Endwert',      isFinalScore: true  },
    ]));

    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        showTitle={false}
        juryStyle={true}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(1);
    expect(screen.getByText('Wertung')).toBeTruthy();
    // Extra DB fields must NOT be visible
    expect(screen.queryByText('D/A-Note')).toBeNull();
    expect(screen.queryByText('E/B-Note')).toBeNull();
  });

  it('shows "Berechnetes Ergebnis:" result box', () => {
    mockUseFormulaFields.mockReturnValue(makeReturn('1*x', [
      { id: 1, name: 'Wertung', isFinalScore: false },
      { id: 2, name: 'Endwert', isFinalScore: true  },
    ]));

    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        showTitle={false}
        juryStyle={true}
      />
    );

    expect(screen.getByText('Berechnetes Ergebnis:')).toBeTruthy();
  });

  it('shows "-" as result when no value has been entered', () => {
    mockUseFormulaFields.mockReturnValue(makeReturn('1*x', [
      { id: 1, name: 'Wertung', isFinalScore: false },
      { id: 2, name: 'Endwert', isFinalScore: true  },
    ]));

    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        showTitle={false}
        juryStyle={true}
      />
    );

    expect(screen.getByText('-')).toBeTruthy();
  });

  it('shows 2 inputs for formula "A + B" with 2 symbols and 4 DB fields', () => {
    mockUseFormulaFields.mockReturnValue(makeReturn('A + B', [
      { id: 1, name: 'D-Note',      isFinalScore: false },
      { id: 2, name: 'E-Note',      isFinalScore: false },
      { id: 3, name: 'Strafpunkte', isFinalScore: false },
      { id: 4, name: 'Bonus',       isFinalScore: false },
      { id: 5, name: 'Endwert',     isFinalScore: true  },
    ]));

    render(
      <FormulaInput
        formula="A + B"
        calculationType={3}
        showTitle={false}
        juryStyle={true}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(screen.getByText('D-Note')).toBeTruthy();
    expect(screen.getByText('E-Note')).toBeTruthy();
    // Third field must NOT appear
    expect(screen.queryByText('Strafpunkte')).toBeNull();
  });

  it('shows loading indicator while formula is loading', () => {
    mockUseFormulaFields.mockReturnValue(makeReturn('1*x', [], {
      loadingFormula: true,
    } as any));

    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        showTitle={false}
        juryStyle={true}
      />
    );

    expect(screen.getByText('Formel wird geladen...')).toBeTruthy();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('does NOT render juryStyle layout when juryStyle is false', () => {
    mockUseFormulaFields.mockReturnValue(makeReturn('1*x', [
      { id: 1, name: 'Wertung', isFinalScore: false },
      { id: 2, name: 'Endwert', isFinalScore: true  },
    ]));

    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        showTitle={false}
        juryStyle={false}
      />
    );

    // juryStyle result box is not shown in normal mode
    expect(screen.queryByText('Berechnetes Ergebnis:')).toBeNull();
  });
});
