/**
 * TDD: A formula field without a DB field must be rendered disabled with a tooltip.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormulaInput } from '@/components/FormulaInput';

vi.mock('@/hooks/useFormulaFields', () => ({
  useFormulaFields: () => ({
    fields: [
      { id: 11, name: 'D/A-Note', value: '', normalizedValue: '', isFinalScore: false },
      { id: 12, name: 'E/B-Note', value: '', normalizedValue: '', isFinalScore: false },
      { id: 1002, name: 'Field C', value: '', normalizedValue: '', isFinalScore: false, isMissingInDb: true },
      { id: 15, name: 'Endwert', value: '', normalizedValue: '', isFinalScore: true },
    ],
    calculatedResult: null,
    formulaError: null,
    loadingFormula: false,
    effectiveFormula: 'A + B - C',
    updateFieldValue: vi.fn(),
    normalizeFieldValue: vi.fn(),
    getFieldOperator: vi.fn(() => ''),
    getFieldLetterLabel: vi.fn(() => ''),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('FormulaInput - field missing in database', () => {
  it.each([
    ['default layout', { juryStyle: false }],
    ['jury style layout', { juryStyle: true }],
  ])('disables the missing field and shows a tooltip (%s)', (_label, props) => {
    render(<FormulaInput formula="A + B - C" showTitle={false} {...props} />);

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs).toHaveLength(3);
    expect(inputs[0]).not.toBeDisabled();
    expect(inputs[1]).not.toBeDisabled();
    expect(inputs[2]).toBeDisabled();
    expect(inputs[2]).toHaveAttribute('title', 'formulaInput.missingField');
  });
});
