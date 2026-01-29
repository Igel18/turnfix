/**
 * Formula Input Component for Jury Portal
 * Simplified version for formula-based scoring
 * 
 * BASED ON: client/src/components/FormulaInput.tsx (simplified for jury-portal)
 * Displays formula fields (A, B, C...) and calculates result automatically
 */

import React, { useState, useEffect } from 'react';
import { 
  extractFormulaSymbols, 
  calculateFormula, 
  formatFormulaWithValues,
  formatScore 
} from '../utils/formulaUtils';

interface DisciplineField {
  id: number;
  name: string;
  sortOrder: number;
}

interface FormulaInputProps {
  formula: string;
  startValue?: number;
  decimals: number;
  onScoreChange: (calculatedScore: number | null, fieldValues: Record<string, number>) => void;
  disabled?: boolean;
  disciplineFields?: DisciplineField[];
}

/**
 * FormulaInput Component
 * Shows individual input fields for each formula variable (A, B, C...)
 * Calculates result automatically as user types
 */
const FormulaInput: React.FC<FormulaInputProps> = ({
  formula,
  startValue,
  decimals,
  onScoreChange,
  disabled = false,
  disciplineFields = []
}) => {
  const [fieldValues, setFieldValues] = useState<Record<string, number>>({});
  const [fieldInputs, setFieldInputs] = useState<Record<string, string>>({}); // String inputs for editing
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

  // Extract symbols from formula
  const symbols = extractFormulaSymbols(formula);

  // Calculate score whenever field values change
  useEffect(() => {
    const result = calculateFormula(formula, fieldValues, startValue);
    setCalculatedScore(result);
    onScoreChange(result, fieldValues);
  }, [fieldValues, formula, startValue, onScoreChange]);

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
          {formatFormulaWithValues(formula, fieldValues, { decimals, replaceStartValue: startValue })}
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
