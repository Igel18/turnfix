/**
 * FormulaDisplay Component
 * Reusable component for displaying formulas with values
 * 
 * Used by:
 * - Results page (jury results display)
 * - Score Capture (formula preview)
 * - Disciplines page (formula testing)
 * - PDF exports (via formatting utils)
 * - Live View (coming soon)
 * - Jury Server (coming soon)
 * 
 * Modes:
 * - 'compact': 2-line format for tables (field values + formula calculation)
 * - 'full': Extended display with labels and badges
 * - 'inline': Single-line formula display
 */

import { formatFormulaWithValues, formatScore, type FormulaField } from '@/utils/formulaUtils';

export type FormulaDisplayMode = 'compact' | 'full' | 'inline';

interface FormulaDisplayProps {
  formula?: string;
  fields: FormulaField[];
  finalScore: number;
  mode?: FormulaDisplayMode;
  className?: string;
}

export const FormulaDisplay = ({
  formula,
  fields,
  finalScore,
  mode = 'compact',
  className = ''
}: FormulaDisplayProps) => {

  // Build values map for formula replacement
  const valuesMap: Record<string, number> = {};
  fields.forEach(field => {
    if (field.value !== null) {
      valuesMap[field.symbol] = field.value;
    }
  });

  // Format formula with actual values
  const formulaWithValues = formula
    ? formatFormulaWithValues(formula, valuesMap, { 
        decimals: 2
      })
    : null;

  // Inline mode - single line
  if (mode === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {formulaWithValues && (
          <>
            <span className="text-sm text-gray-600 font-mono">
              {formulaWithValues}
            </span>
            <span className="text-gray-400">=</span>
          </>
        )}
        <span className="text-lg font-bold text-gray-900 font-mono">
          {formatScore(finalScore)}
        </span>
      </div>
    );
  }

  // Full mode - extended display with badges
  if (mode === 'full') {
    return (
      <div className={`flex flex-col space-y-3 ${className}`}>
        {/* Field Values */}
        {fields.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 font-medium">Wertungen:</span>
            <div className="flex flex-wrap gap-2">
              {fields.map((field) => (
                <div
                  key={field.symbol}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-500 font-medium">
                      ({field.symbol}) {field.fieldShortName || field.fieldName}
                    </div>
                    <div className="text-base font-bold text-gray-900 font-mono">
                      {formatScore(field.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formula Calculation */}
        {formulaWithValues && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-medium">Berechnung:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-mono">
                {formulaWithValues}
              </span>
              <span className="text-gray-400">=</span>
              <div className="px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                <span className="text-lg font-bold text-green-700 font-mono">
                  {formatScore(finalScore)}
                </span>
                <span className="text-xs text-green-600 ml-1">Pkt.</span>
              </div>
            </div>
          </div>
        )}

        {/* Simple score display if no formula */}
        {!formulaWithValues && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Ergebnis:</span>
            <div className="px-3 py-1 bg-green-50 rounded-lg border border-green-200">
              <span className="text-lg font-bold text-green-700 font-mono">
                {formatScore(finalScore)}
              </span>
              <span className="text-xs text-green-600 ml-1">Pkt.</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact mode - 2-line format for tables (default)
  return (
    <div className={`flex flex-col items-center space-y-1.5 py-2 px-1 ${className}`}>
      {/* Line 1: Field Values with Labels */}
      <div className="flex items-center gap-2 text-xs">
        {fields.map((field, index) => (
          <div key={field.symbol} className="flex items-center">
            {index > 0 && <span className="text-gray-400 mx-1">|</span>}
            <div className="flex flex-col items-center px-2 py-1 bg-gray-50 rounded border border-gray-200">
              <div className="text-[10px] text-gray-500 font-medium">
                ({field.symbol}) {field.fieldShortName || field.fieldName}
              </div>
              <div className="text-sm font-bold text-gray-900 font-mono">
                {formatScore(field.value)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Line 2: Formula Calculation */}
      <div className="flex items-center gap-1.5 text-sm">
        {formulaWithValues && (
          <>
            <span className="text-gray-600 font-mono text-xs">
              {formulaWithValues}
            </span>
            <span className="text-gray-400">=</span>
          </>
        )}
        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded border border-green-200">
          <span className="text-lg font-bold text-green-700 font-mono">
            {formatScore(finalScore)}
          </span>
          <span className="text-xs text-green-600">Pkt.</span>
        </div>
      </div>
    </div>
  );
};
