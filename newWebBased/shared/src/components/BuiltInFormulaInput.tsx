/**
 * Built-In Formula Input Component
 * Shared UI component for single-variable formula input (x, y, z)
 * Used in both Score-Capture and Jury-Portal for consistent UX
 * 
 * Point 135: Unified formula input across all scoring interfaces
 */

import React from 'react';

export interface BuiltInFormulaInputProps {
  /** The formula string (e.g., "1*x", "20-x", "(1000/x-2,158)/0,006/49") */
  formula: string;
  
  /** Variable name (usually 'x', 'y', or 'z') */
  variable?: string;
  
  /** Current input value */
  value: string;
  
  /** Calculated result (pass null if no value entered) */
  calculatedResult: number | null;
  
  /** Number of decimal places for display */
  decimalPlaces?: number;

  /** Display unit (e.g., 'Pkt.', 'sec') */
  unit?: string;
  
  /** Maximum allowed score (optional) */
  maxScore?: number;
  
  /** Input placeholder text */
  placeholder?: string;
  
  /** Called when user types */
  onChange: (value: string) => void;
  
  /** Called when input loses focus */
  onBlur?: () => void;
  
  /** Called when Enter key is pressed */
  onEnter?: () => void;
  
  /** Validation state */
  validation?: {
    isValid: boolean;
    message?: string;
  };
  
  /** Compact mode for table cells */
  compact?: boolean;
  
  /** Auto-focus on mount */
  autoFocus?: boolean;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Style variant: 'jury' (large, centered) or 'capture' (inline, compact) */
  variant?: 'jury' | 'capture';

  /** Whether formula should be displayed inside the component */
  showFormulaDisplay?: boolean;

  /** Optional data attribute for E2E selectors */
  dataParticipant?: number | string;

  /** Optional data attribute for E2E selectors */
  dataDiscipline?: number | string;

  /** Ref forwarded to the inner <input> element */
  inputRef?: React.RefObject<HTMLInputElement>;
}

/**
 * BuiltInFormulaInput Component
 * 
 * Renders a consistent UI for built-in formula input across Score-Capture and Jury-Portal.
 * 
 * Layout:
 * - Jury variant: Large centered input with formula display and result
 * - Capture variant: Inline compact input for table cells
 * 
 * Features:
 * - Auto-calculates result from formula
 * - Shows validation errors
 * - Handles Enter key for quick save
 * - Responsive design for mobile and desktop
 */
export const BuiltInFormulaInput: React.FC<BuiltInFormulaInputProps> = ({
  formula,
  variable = 'x',
  value,
  calculatedResult,
  decimalPlaces = 2,
  unit = '',
  maxScore,
  placeholder = '0.00',
  onChange,
  onBlur,
  onEnter,
  validation = { isValid: true },
  compact = false,
  autoFocus = false,
  disabled = false,
  variant = 'capture',
  showFormulaDisplay = true,
  dataParticipant,
  dataDiscipline,
  inputRef
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.();
      e.currentTarget.blur();
    }
  };

  // Replace variable in formula with actual value for display
  const formulaWithValue = value && calculatedResult !== null
    ? formula.replace(new RegExp(`\\b${variable}\\b`, 'g'), value)
    : formula;

  // Jury variant: Large centered input (similar to current Jury-Portal)
  if (variant === 'jury') {
    return (
      <div className="space-y-3">
        {/* Formula Display */}
        {showFormulaDisplay && (
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formel:
            </label>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg px-4 py-2">
              <span className="text-lg font-mono text-purple-900">
                {calculatedResult !== null ? formulaWithValue : formula}
              </span>
            </div>
          </div>
        )}

        {/* X-Input */}
        <div className={validation.isValid ? '' : 'mb-8'}>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            {variable}-Wertung
            {unit && (
              <span className="ml-1 text-purple-600">({unit})</span>
            )}
            {maxScore && maxScore > 0 && (
              <span className="ml-2 text-purple-600">
                (max. {maxScore.toFixed(decimalPlaces)})
              </span>
            )}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocus}
              className={`w-full text-3xl text-center p-3 border-2 rounded-lg focus:outline-none font-bold transition-colors ring-1 ${
                validation.isValid
                  ? 'border-purple-400 ring-purple-100 focus:border-purple-600 focus:ring-purple-200 text-purple-900 bg-white placeholder-purple-300'
                  : 'border-red-300 ring-red-100 focus:border-red-500 focus:ring-red-200 text-red-900 bg-red-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {!validation.isValid && validation.message && (
              <div className="absolute left-0 right-0 mt-1 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1 text-center z-10">
                ⚠️ {validation.message}
              </div>
            )}
          </div>
        </div>

        {/* Calculated Result */}
        {calculatedResult !== null && (
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Berechnetes Ergebnis:
              {unit && (
                <span className="ml-1 text-green-700">({unit})</span>
              )}
            </label>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg px-4 py-3">
              <span className="text-2xl font-bold text-green-700">
                {calculatedResult.toFixed(decimalPlaces)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Capture variant: Compact inline input (for table cells)
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Variable Badge */}
        <span className="text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200 rounded px-2 py-1 uppercase flex-shrink-0">
          {variable}
        </span>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          data-participant={dataParticipant}
          data-discipline={dataDiscipline}
          className={`${compact ? 'w-20' : 'w-24'} px-2 py-1 text-sm border rounded focus:ring-2 focus:border-transparent transition-colors ${
            validation.isValid
              ? 'border-gray-300 focus:ring-purple-500'
              : 'border-red-300 bg-red-50 focus:ring-red-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        {/* Calculated Result Badge */}
        {calculatedResult !== null && (
          <span
            className="text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1 whitespace-nowrap flex-shrink-0"
            title={`Formel: ${formula}\n${formulaWithValue} = ${calculatedResult.toFixed(decimalPlaces)}`}
          >
            = {calculatedResult.toFixed(decimalPlaces)}
          </span>
        )}
      </div>

      {/* Formula Text (shown below in capture mode) */}
      {!compact && (
        <div className="mt-1 text-xs text-purple-500 truncate max-w-[200px]" title={formula}>
          {showFormulaDisplay ? `Formel: ${formula}` : null}
        </div>
      )}

      {!compact && unit && (
        <div className="mt-1 text-xs text-gray-500">Einheit: {unit}</div>
      )}

      {/* Validation Error */}
      {!validation.isValid && validation.message && (
        <div className="absolute -bottom-6 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1 z-10 whitespace-nowrap">
          ⚠️ {validation.message}
        </div>
      )}

      {/* Max Score Hint */}
      {maxScore && maxScore > 0 && (
        <div className="absolute -top-6 left-0 right-0 text-xs text-gray-500 whitespace-nowrap">
          Max: {maxScore.toFixed(decimalPlaces)}
        </div>
      )}
    </div>
  );
};

export default BuiltInFormulaInput;
