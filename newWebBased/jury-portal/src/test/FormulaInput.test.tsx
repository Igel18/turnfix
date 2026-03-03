import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormulaInput from '../components/FormulaInput';

describe('FormulaInput - Score clearing on participant navigation', () => {
  const defaultProps = {
    formula: '(10 + A) - B',
    decimals: 2,
    onScoreChange: vi.fn(),
    disciplineFields: [
      { id: 1, name: 'Ausführung', sortOrder: 1 },
      { id: 2, name: 'Abzüge', sortOrder: 2 },
    ],
  };

  it('should show empty fields when initialValues is empty', () => {
    render(<FormulaInput {...defaultProps} initialValues={{}} />);
    
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveValue('');
    });
  });

  it('should show populated fields when initialValues has data', () => {
    render(
      <FormulaInput
        {...defaultProps}
        initialValues={{ A: 8.5, B: 1.2 }}
      />
    );
    
    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('8.50');
    expect(inputs[1]).toHaveValue('1.20');
  });

  it('should clear fields when initialValues changes from populated to empty (participant navigation)', () => {
    // Simulate: Participant A has scores
    const { rerender } = render(
      <FormulaInput
        {...defaultProps}
        initialValues={{ A: 8.5, B: 1.2 }}
      />
    );
    
    // Verify fields are populated
    let inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('8.50');
    expect(inputs[1]).toHaveValue('1.20');
    
    // Simulate: Navigate to Participant B (no scores) - initialValues becomes empty
    rerender(
      <FormulaInput
        {...defaultProps}
        initialValues={{}}
      />
    );
    
    // Fields MUST be cleared
    inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('');
    expect(inputs[1]).toHaveValue('');
  });

  it('should call onScoreChange with null when fields are cleared', () => {
    const onScoreChange = vi.fn();
    
    const { rerender } = render(
      <FormulaInput
        {...defaultProps}
        onScoreChange={onScoreChange}
        initialValues={{ A: 8.5, B: 1.2 }}
      />
    );
    
    onScoreChange.mockClear();
    
    // Navigate to next participant (empty values)
    rerender(
      <FormulaInput
        {...defaultProps}
        onScoreChange={onScoreChange}
        initialValues={{}}
      />
    );
    
    // onScoreChange should have been called with cleared state
    const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1];
    // Field values should be empty
    expect(lastCall[1]).toEqual({});
  });
});
