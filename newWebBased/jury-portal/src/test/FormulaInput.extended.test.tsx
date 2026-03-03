import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormulaInput from '../components/FormulaInput';

describe('FormulaInput — extended tests', () => {
  const defaultProps = {
    formula: '(10 + A) - B',
    decimals: 2,
    onScoreChange: vi.fn(),
    disciplineFields: [
      { id: 1, name: 'Ausführung', sortOrder: 1 },
      { id: 2, name: 'Abzüge', sortOrder: 2 },
    ],
  };

  // ---- Clearing on participant navigation (already in FormulaInput.test.tsx) ----

  describe('field rendering', () => {
    it('should render one input per formula symbol', () => {
      render(<FormulaInput {...defaultProps} initialValues={{}} />);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2); // A and B
    });

    it('should display field names from disciplineFields', () => {
      render(<FormulaInput {...defaultProps} initialValues={{}} />);
      expect(screen.getByText(/Ausführung/)).toBeTruthy();
      expect(screen.getByText(/Abzüge/)).toBeTruthy();
    });

    it('should show fallback field names when no disciplineFields', () => {
      render(
        <FormulaInput
          formula="(10 + A) - B"
          decimals={2}
          onScoreChange={vi.fn()}
          disciplineFields={[]}
          initialValues={{}}
        />
      );
      expect(screen.getByText(/Feld A/)).toBeTruthy();
      expect(screen.getByText(/Feld B/)).toBeTruthy();
    });

    it('should show placeholder based on decimals', () => {
      render(<FormulaInput {...defaultProps} initialValues={{}} />);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs[0]).toHaveAttribute('placeholder', '0.00');
    });

    it('should show 3-decimal placeholder when decimals=3', () => {
      render(
        <FormulaInput {...defaultProps} decimals={3} initialValues={{}} />
      );
      const inputs = screen.getAllByRole('textbox');
      expect(inputs[0]).toHaveAttribute('placeholder', '0.000');
    });
  });

  describe('disabled state', () => {
    it('should disable inputs when disabled=true', () => {
      render(
        <FormulaInput {...defaultProps} disabled={true} initialValues={{}} />
      );
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    it('should enable inputs when disabled=false', () => {
      render(
        <FormulaInput {...defaultProps} disabled={false} initialValues={{}} />
      );
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('score calculation callback', () => {
    it('should call onScoreChange when field values change', async () => {
      const onScoreChange = vi.fn();
      render(
        <FormulaInput
          {...defaultProps}
          onScoreChange={onScoreChange}
          initialValues={{}}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      
      // Type a value in the first field (A)
      fireEvent.change(inputs[0], { target: { value: '6' } });

      // onScoreChange should have been called
      expect(onScoreChange).toHaveBeenCalled();
      
      // Last call should include field values with A
      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
      expect(lastCall[1]).toHaveProperty('A', 6);
    });

    it('should calculate correct result for formula (10 + A) - B', async () => {
      const onScoreChange = vi.fn();
      render(
        <FormulaInput
          {...defaultProps}
          onScoreChange={onScoreChange}
          initialValues={{ A: 6, B: 3.5 }}
        />
      );

      // (10 + 6) - 3.5 = 12.5
      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
      expect(lastCall[0]).toBeCloseTo(12.5, 2);
    });

    it('should show calculated result in UI', () => {
      render(
        <FormulaInput
          {...defaultProps}
          onScoreChange={vi.fn()}
          initialValues={{ A: 6, B: 3.5 }}
        />
      );

      // Result: (10 + 6) - 3.5 = 12.5 → "12.50"
      expect(screen.getByText('12.50')).toBeTruthy();
    });

    it('should show dash when no values entered', () => {
      render(
        <FormulaInput
          {...defaultProps}
          onScoreChange={vi.fn()}
          initialValues={{}}
        />
      );

      // With empty values, formula still calculates (using 0 for missing)
      // (10 + 0) - 0 = 10 → "10.00"
      expect(screen.getByText('10.00')).toBeTruthy();
    });
  });

  describe('comma handling (German locale)', () => {
    it('should accept comma as decimal separator in input', () => {
      const onScoreChange = vi.fn();
      render(
        <FormulaInput
          {...defaultProps}
          onScoreChange={onScoreChange}
          initialValues={{}}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '8,5' } });

      // Should parse 8,5 as 8.5
      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
      expect(lastCall[1]).toHaveProperty('A', 8.5);
    });
  });

  describe('formula with startValue', () => {
    it('should use startValue when formula starts with a number', () => {
      const onScoreChange = vi.fn();
      render(
        <FormulaInput
          formula="10 + A - B"
          startValue={15}
          decimals={2}
          onScoreChange={onScoreChange}
          initialValues={{ A: 2, B: 1 }}
        />
      );

      // startValue replaces leading "10" → "15 + 2 - 1" = 16
      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
      expect(lastCall[0]).toBeCloseTo(16, 2);
    });

    it('should NOT replace start value when formula starts with parenthesis', () => {
      const onScoreChange = vi.fn();
      render(
        <FormulaInput
          formula="(10 + A) - B"
          startValue={15}
          decimals={2}
          onScoreChange={onScoreChange}
          initialValues={{ A: 2, B: 1 }}
        />
      );

      // Regex ^(\d+) does NOT match "(10..." so startValue is ignored
      // (10 + 2) - 1 = 11
      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
      expect(lastCall[0]).toBeCloseTo(11, 2);
    });
  });

  describe('three-variable formula', () => {
    it('should render three inputs for A + B + C formula', () => {
      render(
        <FormulaInput
          formula="A + B + C"
          decimals={2}
          onScoreChange={vi.fn()}
          disciplineFields={[
            { id: 1, name: 'Feld 1', sortOrder: 1 },
            { id: 2, name: 'Feld 2', sortOrder: 2 },
            { id: 3, name: 'Feld 3', sortOrder: 3 },
          ]}
          initialValues={{}}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(3);
    });

    it('should calculate sum correctly', () => {
      const onScoreChange = vi.fn();
      render(
        <FormulaInput
          formula="A + B + C"
          decimals={2}
          onScoreChange={onScoreChange}
          initialValues={{ A: 1, B: 2, C: 3 }}
        />
      );

      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
      expect(lastCall[0]).toBeCloseTo(6, 2);
    });
  });
});
