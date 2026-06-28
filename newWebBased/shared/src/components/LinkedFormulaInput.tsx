/**
 * LinkedFormulaInput — Shared component for complex/linked formula scoring.
 *
 * The SINGLE source of truth for multi-field formula input across all scoring
 * surfaces (ScoreCaptureV2 and Jury Portal).
 *
 * Design principles:
 * - Pure: no DB/API calls, no hooks, no i18n — all comes in via props.
 * - Consistent: identical UX on every scoring device.
 * - Tested: see client/src/test/components/LinkedFormulaInput.test.tsx
 *
 * Usage:
 *   <LinkedFormulaInput
 *     formula="A + B"
 *     disciplineFields={[{ id: 1, name: 'D-Note' }, { id: 2, name: 'E-Note' }]}
 *     initialValues={{ A: 8.5, B: 1.5 }}
 *     decimals={2}
 *     onScoreChange={(result, fieldValues) => { ... }}
 *   />
 */

import React, { useState, useEffect } from 'react';
import { extractFormulaSymbols, calculateFormula } from '../formulaUtils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LinkedFormulaFieldDef {
  id: number;
  name: string;
  sortOrder?: number;
}

export interface LinkedFormulaInputProps {
  /** The formula string, e.g. "A + B", "1*x", "(A - B) + C" */
  formula: string;

  /** Number of decimal places for display and placeholder */
  decimals?: number;

  /** Disable all inputs (e.g. while saving) */
  disabled?: boolean;

  /**
   * Positional field metadata. field[0] is for the first symbol, field[1]
   * for the second, and so on. Only `name` is used for the label.
   */
  disciplineFields?: LinkedFormulaFieldDef[];

  /**
   * Pre-fill values on mount (or when component is keyed for a new
   * participant). Keys are formula symbols, e.g. { x: 5 } or { A: 8.5 }.
   */
  initialValues?: Record<string, number>;

  /** Auto-focus the first input on mount */
  autoFocusFirst?: boolean;

  /**
   * Called whenever any field changes. Provides the calculated result and
   * the current map of symbol → numeric value.
   */
  onScoreChange: (
    calculatedScore: number | null,
    fieldValues: Record<string, number>
  ) => void;

  /** Additional CSS classes for the wrapper div */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export const LinkedFormulaInput: React.FC<LinkedFormulaInputProps> = ({
  formula,
  decimals = 2,
  disabled = false,
  disciplineFields = [],
  initialValues = {},
  autoFocusFirst = false,
  onScoreChange,
  className = '',
}) => {
  const symbols = extractFormulaSymbols(formula);

  // Numeric values per symbol, e.g. { x: 5, A: 8.5 }
  const [fieldValues, setFieldValues] = useState<Record<string, number>>(
    () => ({ ...initialValues })
  );

  // Display strings per symbol (allows typing "5," before normalising)
  const [fieldInputs, setFieldInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    symbols.forEach(sym => {
      const v = initialValues[sym];
      init[sym] = v !== undefined ? v.toFixed(decimals) : '';
    });
    return init;
  });

  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

  // Only show the result once the user has typed something or initialValues were given
  const [hasInput, setHasInput] = useState(
    () => Object.keys(initialValues).length > 0
  );

  // Stable ref so onScoreChange can change without re-triggering effect
  const onScoreChangeRef = React.useRef(onScoreChange);
  onScoreChangeRef.current = onScoreChange;

  // ── Sync initialValues (e.g. when parent keys a new participant) ──────────
  useEffect(() => {
    const newValues: Record<string, number> = { ...initialValues };
    const newInputs: Record<string, string> = {};
    symbols.forEach(sym => {
      const v = initialValues[sym];
      newInputs[sym] = v !== undefined ? v.toFixed(decimals) : '';
    });
    setFieldValues(newValues);
    setFieldInputs(newInputs);
    setHasInput(Object.keys(initialValues).length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula, JSON.stringify(initialValues)]);

  // ── Recalculate whenever fieldValues change ───────────────────────────────
  useEffect(() => {
    const result = calculateFormula(formula, fieldValues);
    setCalculatedScore(result);
    onScoreChangeRef.current(result, { ...fieldValues });
  }, [formula, fieldValues]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (symbol: string, raw: string) => {
    setHasInput(true);
    setFieldInputs(prev => ({ ...prev, [symbol]: raw }));

    // Accept both comma and dot as decimal separator
    const normalized = raw.replace(',', '.');
    const num = normalized === '' ? 0 : parseFloat(normalized);
    if (!isNaN(num)) {
      setFieldValues(prev => ({ ...prev, [symbol]: num }));
    }
  };

  const handleBlur = (symbol: string) => {
    const num = fieldValues[symbol];
    if (num !== undefined && !isNaN(num)) {
      setFieldInputs(prev => ({ ...prev, [symbol]: num.toFixed(decimals) }));
    }
  };

  const placeholder = '0.' + '0'.repeat(decimals);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-3 ${className}`}>
      {symbols.map((symbol, index) => {
        const fieldName = disciplineFields[index]?.name ?? symbol;
        return (
          <div key={symbol}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {symbol}: {fieldName}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={fieldInputs[symbol] ?? ''}
              onChange={e => handleChange(symbol, e.target.value)}
              onBlur={() => handleBlur(symbol)}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocusFirst && index === 0}
              className="w-full text-3xl sm:text-4xl text-center p-2 sm:p-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 font-bold text-blue-900 bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        );
      })}

      {/* Calculated result */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="text-xs font-medium text-gray-600 mb-1">
          Berechnetes Ergebnis:
        </div>
        <div className="text-3xl font-bold text-green-900 text-center">
          {hasInput && calculatedScore !== null
            ? calculatedScore.toFixed(decimals)
            : '-'}
        </div>
      </div>
    </div>
  );
};
