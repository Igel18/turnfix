/**
 * Formula Utilities (Shared)
 * Central logic for formula parsing, calculation, and display
 *
 * SINGLE SOURCE OF TRUTH — used by client, server, and jury-portal.
 * Do NOT duplicate this file. All three projects import from @turnfix/shared.
 *
 * Uses expr-eval for CSP-safe formula evaluation (no Function() constructor).
 */

import { Parser } from 'expr-eval';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormulaField {
  symbol: string;        // A, B, C, etc.
  value: number | null;
  fieldName?: string;
  fieldShortName?: string;
  isStartValue?: boolean;
  isSubtraction?: boolean;
  sortOrder?: number;
}

export interface ParsedFormula {
  originalFormula: string;
  symbols: string[];
  startValue?: number;
  hasParentheses: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Standard variable mapping (A, B, C, ... Z)
 * All uppercase letters that can be used in formulas.
 * Exported for use in formula editors and validators.
 */
export const FORMULA_VARIABLES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract symbols (A, B, C... or x, y, z...) from formula string.
 * Example: "(10 + A) - B" → ["A", "B"]
 * Example: "1*x" → ["x"]
 * Supports both uppercase (letter-based) and lowercase (variable-based/custom) formulas.
 */
export function extractFormulaSymbols(formula: string): string[] {
  if (!formula) return [];

  // Match both uppercase AND lowercase single-letter variables
  const matches = formula.match(/\b[A-Za-z]\b/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Get alphabetic symbol for given index.
 * 0 → A, 1 → B, 2 → C, etc.
 */
export function getFormulaSymbol(index: number): string {
  return FORMULA_VARIABLES[index] || String.fromCharCode(65 + index);
}

/**
 * Parse formula string and extract structure.
 */
export function parseFormula(formula: string): ParsedFormula {
  if (!formula) {
    return {
      originalFormula: '',
      symbols: [],
      hasParentheses: false
    };
  }

  const symbols = extractFormulaSymbols(formula);
  const hasParentheses = formula.includes('(') && formula.includes(')');

  // Try to extract starting value (number at beginning)
  const startValueMatch = formula.match(/^(\d+(\.\d+)?)/);
  const startValue = startValueMatch ? parseFloat(startValueMatch[1]) : undefined;

  return {
    originalFormula: formula,
    symbols,
    startValue,
    hasParentheses
  };
}

// ---------------------------------------------------------------------------
// Formula display
// ---------------------------------------------------------------------------

/**
 * Replace symbols in formula with actual values.
 * Example: "(10 + A) - B" with {A: 6, B: 3.5} → "(10 + 6.00) - 3.50"
 */
export function formatFormulaWithValues(
  formula: string,
  values: Record<string, number>,
  options: {
    decimals?: number;
    replaceStartValue?: number;
  } = {}
): string {
  if (!formula) return '';

  const { decimals = 2, replaceStartValue } = options;
  let result = formula;

  // Detect if this is a custom formula (lowercase variables like x, y, z)
  const hasLowercaseVars = /\b[a-z]\b/.test(formula);

  // Replace start value if provided — only for DB formulas (uppercase vars)
  if (replaceStartValue !== undefined && !hasLowercaseVars) {
    result = result.replace(/^(\d+(\.\d+)?)/, replaceStartValue.toFixed(decimals));
  }

  // Replace each uppercase symbol with its value
  FORMULA_VARIABLES.forEach(variable => {
    if (values[variable] !== undefined) {
      const formattedValue = values[variable].toFixed(decimals);
      const regex = new RegExp(`\\b${variable}\\b`, 'g');
      result = result.replace(regex, formattedValue);
    }
  });

  // Also replace lowercase variable keys (custom formulas like "1*x")
  Object.keys(values).forEach(key => {
    if (key.length === 1 && /^[a-z]$/.test(key) && values[key] !== undefined) {
      const formattedValue = values[key].toFixed(decimals);
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      result = result.replace(regex, formattedValue);
    }
  });

  return result;
}

// ---------------------------------------------------------------------------
// Formula calculation
// ---------------------------------------------------------------------------

/**
 * Calculate formula result.
 * Example: "(10 + A) - B" with {A: 6, B: 3.5} → 12.5
 *
 * Uses expr-eval for CSP-safe evaluation (no Function() constructor).
 */
export function calculateFormula(
  formula: string,
  values: Record<string, number>,
  startValue?: number
): number | null {
  if (!formula) return null;

  try {
    let evalFormula = formula;

    // Detect if this is a custom formula (contains lowercase variables like x, y, z)
    // Custom formulas should NOT have their leading number replaced by startValue,
    // because the number is part of the formula itself (e.g., "1*x", "(((1000/x)-2,158)/0,006)/49")
    const hasLowercaseVars = /\b[a-z]\b/.test(formula);

    // Replace start value if provided — only for DB formulas (uppercase vars like A, B, C)
    if (startValue !== undefined && !hasLowercaseVars) {
      evalFormula = evalFormula.replace(/^(\d+(\.\d+)?)/, startValue.toString());
    }

    // Replace uppercase symbols with values
    FORMULA_VARIABLES.forEach(variable => {
      if (values[variable] !== undefined) {
        const regex = new RegExp(`\\b${variable}\\b`, 'g');
        evalFormula = evalFormula.replace(regex, values[variable].toString());
      } else {
        // Replace undefined variables with 0
        const regex = new RegExp(`\\b${variable}\\b`, 'g');
        evalFormula = evalFormula.replace(regex, '0');
      }
    });

    // Also replace lowercase variable keys (custom formulas like "1*x")
    Object.keys(values).forEach(key => {
      if (key.length === 1 && /^[a-z]$/.test(key) && values[key] !== undefined) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evalFormula = evalFormula.replace(regex, values[key].toString());
      }
    });

    // Replace any remaining lowercase single-letter variables with 0
    evalFormula = evalFormula.replace(/\b[a-z]\b/g, '0');

    // Normalize German decimal commas to periods (e.g., "2,158" → "2.158")
    // Pattern: digit,digit — this safely targets decimal commas without affecting other uses
    evalFormula = evalFormula.replace(/(\d),(\d)/g, '$1.$2');

    // Remove whitespace
    evalFormula = evalFormula.replace(/\s+/g, '');

    // Validate expression (only allow numbers, operators, parentheses)
    if (!/^[0-9+\-*/.() ]+$/.test(evalFormula)) {
      console.warn('[formulaUtils] Formula contains invalid characters:', evalFormula);
      return null;
    }

    // Use CSP-safe expr-eval parser
    const parser = new Parser();
    const result = parser.evaluate(evalFormula);

    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (error) {
    console.error('[formulaUtils] Formula calculation error:', error, { formula, values, startValue });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate formula string.
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  if (!formula || formula.trim() === '') {
    return { valid: false, error: 'Formula is empty' };
  }

  // Check for valid characters (allow both uppercase A-Z and lowercase a-z)
  if (!/^[\d\s+\-*/()A-Za-z.]+$/.test(formula)) {
    return { valid: false, error: 'Formula contains invalid characters' };
  }

  // Check parentheses balance
  let parenthesesCount = 0;
  for (const char of formula) {
    if (char === '(') parenthesesCount++;
    if (char === ')') parenthesesCount--;
    if (parenthesesCount < 0) {
      return { valid: false, error: 'Unbalanced parentheses' };
    }
  }
  if (parenthesesCount !== 0) {
    return { valid: false, error: 'Unbalanced parentheses' };
  }

  // Try to parse with test values
  const symbols = extractFormulaSymbols(formula);
  const testValues: Record<string, number> = {};
  symbols.forEach(symbol => {
    testValues[symbol] = 1;
  });

  const result = calculateFormula(formula, testValues, 10);
  if (result === null) {
    return { valid: false, error: 'Formula cannot be evaluated' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

/**
 * Determine if a field is a subtraction based on field name.
 */
export function isSubtractionField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return lowerName.includes('abzug') ||
         lowerName.includes('ausf') ||
         lowerName.includes('deduction') ||
         lowerName.includes('penalty');
}

/**
 * Build field symbols mapping from jury results.
 * Supports optional sortOrder for proper field ordering.
 */
export function buildFieldSymbolsMap(
  juryResults: Array<{
    fieldName?: string;
    fieldShortName?: string;
    performance: number | null;
    isFinalScore?: boolean;
    isStartingScore?: boolean;
    sortOrder?: number;
  }>,
  formula?: string
): Record<string, FormulaField> {
  // Sort by sortOrder if available
  const sortedJuryResults = [...juryResults].sort((a, b) => {
    if (a.sortOrder === undefined || b.sortOrder === undefined) return 0;
    return a.sortOrder - b.sortOrder;
  });

  const fieldScores = sortedJuryResults.filter(jr => !jr.isStartingScore && !jr.isFinalScore);
  const symbolsMap: Record<string, FormulaField> = {};

  fieldScores.forEach((jr, index) => {
    const symbol = formula ?
      extractFormulaSymbols(formula)[index] || getFormulaSymbol(index) :
      getFormulaSymbol(index);

    symbolsMap[symbol] = {
      symbol,
      value: jr.performance,
      fieldName: jr.fieldName,
      fieldShortName: jr.fieldShortName,
      isSubtraction: jr.fieldName ? isSubtractionField(jr.fieldName) : false,
      sortOrder: jr.sortOrder
    };
  });

  return symbolsMap;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format score with consistent decimal places.
 */
export function formatScore(score: number | null | undefined, decimals: number = 2): string {
  if (score === null || score === undefined || isNaN(score)) {
    return '-';
  }
  return score.toFixed(decimals);
}
