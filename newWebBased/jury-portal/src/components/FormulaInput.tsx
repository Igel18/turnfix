/**
 * Formula Input Component for Jury Portal
 * Simplified version for formula-based scoring
 * 
 * BASED ON: client/src/components/FormulaInput.tsx (simplified for jury-portal)
 * Displays formula fields (A, B, C...) and calculates result automatically
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  extractFormulaSymbols, 
  calculateFormula, 
  formatFormulaWithValues,
  formatScore 
} from '../utils/formulaUtils';
import type { DisciplineField } from './JuryPortal/JuryPortal.types';

interface FormulaInputProps {
  formula: string;
  decimals: number;
  onScoreChange: (calculatedScore: number | null, fieldValues: Record<string, number>) => void;
  disabled?: boolean;
  disciplineFields?: Pick<DisciplineField, 'id' | 'name' | 'sortOrder'>[];
  initialValues?: Record<string, number>;
}

/**
 * FormulaInput Component
 * Shows individual input fields for each formula variable (A, B, C...)
 * Calculates result automatically as user types
 */
const FormulaInput: React.FC<FormulaInputProps> = ({
  formula,
  decimals,
  onScoreChange,
  disabled = false,
  disciplineFields = [],
  initialValues = {}
}) => {
  const [fieldValues, setFieldValues] = useState<Record<string, number>>(initialValues);
  const [fieldInputs, setFieldInputs] = useState<Record<string, string>>(() => {
    // Format initial values for display
    const formatted: Record<string, string> = {};
    Object.entries(initialValues).forEach(([key, value]) => {
      formatted[key] = value.toFixed(decimals);
    });
    return formatted;
  });
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

  // Stable ref for onScoreChange to avoid infinite re-render loops
  // (parent passes inline arrow function that changes every render)
  const onScoreChangeRef = useRef(onScoreChange);
  onScoreChangeRef.current = onScoreChange;

  // Extract symbols from formula
  const symbols = extractFormulaSymbols(formula);

  // Update field values when initialValues change (on participant change)
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setFieldValues(initialValues);
      
      // Format for display
      const formatted: Record<string, string> = {};
      Object.entries(initialValues).forEach(([key, value]) => {
        formatted[key] = value.toFixed(decimals);
      });
      setFieldInputs(formatted);
    } else {
      // Clear fields if no initial values
      setFieldValues({});
      setFieldInputs({});
    }
  }, [initialValues, decimals]);

  // Calculate score whenever field values change
  useEffect(() => {
    const result = calculateFormula(formula, fieldValues);
    setCalculatedScore(result);
    onScoreChangeRef.current(result, fieldValues);
  }, [fieldValues, formula]);

  const handleFieldChange = (symbol: string, value: string) => {
    // Allow typing with decimal separators (both . and ,)
    setFieldInputs(prev => ({
      ...prev,
      [symbol]: value
    }));
    
    // Parse and update numeric value
    const normalized = value.replace(',', '.');
    const numValue = normalized === '' ? 0 : parseFloat(normalized);
    
    if (!isNaN(numValue)) {
      setFieldValues(prev => ({
        ...prev,
        [symbol]: numValue
      }));
    }
  };

  const handleFieldBlur = (symbol: string) => {
    // Format on blur
    const numValue = fieldValues[symbol];
    if (numValue !== undefined && !isNaN(numValue)) {
      setFieldInputs(prev => ({
        ...prev,
        [symbol]: numValue.toFixed(decimals)
      }));
    }
  };

  const getFieldPlaceholder = (): string => {
    return '0.' + '0'.repeat(decimals);
  };

  return (
    <div className="space-y-3">
      {/* Formula Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-xs font-medium text-gray-600 mb-1">Formel:</div>
        <div className="text-lg font-mono text-blue-900">
          {formatFormulaWithValues(formula, fieldValues, { decimals })}
        </div>
      </div>

      {/* Individual Field Inputs */}
      <div className="grid grid-cols-2 gap-2">
        {symbols.map((symbol, index) => {
          const fieldName = disciplineFields[index]?.name || `Feld ${symbol}`;
          return (
          <div key={symbol}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {symbol}: {fieldName}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={fieldInputs[symbol] || ''}
              onChange={(e) => handleFieldChange(symbol, e.target.value)}
              onBlur={() => handleFieldBlur(symbol)}
              placeholder={getFieldPlaceholder()}
              disabled={disabled}
              className="w-full text-lg text-center p-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        );
        })}
      </div>

      {/* Calculated Result */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="text-xs font-medium text-gray-600 mb-1">Berechnetes Ergebnis:</div>
        <div className="text-3xl font-bold text-green-900 text-center">
          {calculatedScore !== null ? formatScore(calculatedScore, decimals) : '-'}
        </div>
      </div>
    </div>
  );
};

export default FormulaInput;
