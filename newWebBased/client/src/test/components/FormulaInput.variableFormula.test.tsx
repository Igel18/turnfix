/**
 * TDD Test: FormulaInput rendering for variable-type formulas (e.g., "1*x")
 * 
 * BUG: When a linked formula resolves to a variable-type formula like "1*x",
 * FormulaInput renders the formula display but does NOT create an input field
 * for "x" because the formula rendering logic searches for uppercase letters
 * (A, B, C...) using String.fromCharCode(65 + index), which doesn't match
 * the lowercase "x" in the formula.
 * 
 * This test verifies that variable-type formulas render input fields correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FormulaInput } from '@/components/FormulaInput'

// Mock useFormulaFields to directly control what fields are returned
vi.mock('@/hooks/useFormulaFields', () => ({
  useFormulaFields: ({ onFieldsLoaded }: any) => {
    // Simulate the fields that useFormulaFields would create for "1*x"
    const fields = [
      {
        id: 1,
        name: 'X',
        value: '',
        normalizedValue: '',
        isFinalScore: false,
        isStartingScore: false,
      },
      {
        id: 2,
        name: 'Endwert',
        value: '',
        normalizedValue: '',
        isFinalScore: true,
        isStartingScore: false,
      },
    ]
    return {
      fields,
      calculatedResult: null,
      formulaError: null,
      loadingFormula: false,
      effectiveFormula: '1*x',
      updateFieldValue: vi.fn(),
      normalizeFieldValue: vi.fn(),
      getFieldOperator: vi.fn(() => ''),
      getFieldLetterLabel: vi.fn((i: number) => i === 0 ? 'x' : 'EW'),
    }
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

describe('FormulaInput - variable formula rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('BUG: "1*x" formula must render an input field for x (not just the Endwert)', async () => {
    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        compact={true}
        showTitle={false}
      />
    )

    // Should have at least one text input (for the x variable)
    const inputs = screen.queryAllByRole('textbox')
    
    // BUG: With the current code, this will be 0 because the rendering
    // logic searches for uppercase A in "1*x" and finds nothing.
    // After fix, there should be exactly 1 input (for x).
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('BUG: "1*x" formula must show the Endwert result field', async () => {
    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        compact={true}
        showTitle={false}
      />
    )

    // The Endwert field should show "?" when no calculation result
    expect(screen.getByText('?')).toBeTruthy()
  })

  it('BUG: "1*x" formula must show the "=" sign', async () => {
    render(
      <FormulaInput
        formula="1*x"
        calculationType={3}
        compact={true}
        showTitle={false}
      />
    )

    // The equals sign must be present
    expect(screen.getByText('=')).toBeTruthy()
  })
})
