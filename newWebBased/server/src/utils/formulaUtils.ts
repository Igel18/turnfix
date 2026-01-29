/**
 * Formula Utilities - Server Version
 * Central logic for formula parsing, calculation, and display
 * 
 * COPIED FROM: client/src/utils/formulaUtils.ts
 * UPDATED: Uses expr-eval for safe formula evaluation
 * 
 * Used by:
 * - Scores API (Socket.IO live updates)
 * - Results API (score recalculation)
 * - Competition management
 */

import { Parser } from 'expr-eval';

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

/**
 * Standard variable mapping (A, B, C, ... Z)
 * All uppercase letters that can be used in formulas
 * Exported for use in formula editors and validators
 */
export const FORMULA_VARIABLES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

/**
 * Extract symbols (A, B, C...) from formula string
 * Example: "(10 + A) - B" → ["A", "B"]
 */
export function extractFormulaSymbols(formula: string): string[] {
  if (!formula) return [];
  
  const matches = formula.match(/\b[A-Z]\b/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Get alphabetic symbol for given index
 * 0 → A, 1 → B, 2 → C, etc.
 */
export function getFormulaSymbol(index: number): string {
  return FORMULA_VARIABLES[index] || String.fromCharCode(65 + index);
}

/**
 * Parse formula string and extract structure
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

/**
 * Replace symbols in formula with actual values
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

  // Replace start value if provided
  if (replaceStartValue !== undefined) {
    result = result.replace(/^(\d+(\.\d+)?)/, replaceStartValue.toFixed(decimals));
  }

  // Replace each symbol with its value
  FORMULA_VARIABLES.forEach(variable => {
    if (values[variable] !== undefined) {
      const formattedValue = values[variable].toFixed(decimals);
      const regex = new RegExp(`\\b${variable}\\b`, 'g');
      result = result.replace(regex, formattedValue);
    }
  });

  return result;
}

/**
 * Calculate formula result
 * Example: "(10 + A) - B" with {A: 6, B: 3.5} → 12.5
 * 
 * Uses expr-eval for safe evaluation
 */
export function calculateFormula(
  formula: string,
  values: Record<string, number>,
  startValue?: number
): number | null {
  if (!formula) return null;

  try {
    let evalFormula = formula;
    
    // Replace start value if provided
    if (startValue !== undefined) {
      evalFormula = evalFormula.replace(/^(\d+(\.\d+)?)/, startValue.toString());
    }

    // Replace symbols with values
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

    // Remove whitespace
    evalFormula = evalFormula.replace(/\s+/g, '');
    
    // Validate expression (only allow numbers, operators, parentheses)
    if (!/^[0-9+\-*/.() ]+$/.test(evalFormula)) {
      console.warn('[Server formulaUtils] Formula contains invalid characters:', evalFormula);
      return null;
    }

    // Use safe expr-eval parser
    const parser = new Parser();
    const result = parser.evaluate(evalFormula);
    
    if (process.env.DEBUG === 'true') {
      console.log(`[Server formulaUtils] Formula "${formula}" with values ${JSON.stringify(values)} = ${result}`);
    }
    
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (error) {
    console.error('[Server formulaUtils] Formula calculation error:', error, { formula, values, startValue });
    return null;
  }
}

/**
 * Validate formula string
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  if (!formula || formula.trim() === '') {
    return { valid: false, error: 'Formula is empty' };
  }

  // Check for valid characters
  if (!/^[\d\s+\-*/()A-Z.]+$/.test(formula)) {
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

/**
 * Determine if a field is a subtraction based on field name
 */
export function isSubtractionField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return lowerName.includes('abzug') || 
         lowerName.includes('ausf') || 
         lowerName.includes('deduction') ||
         lowerName.includes('penalty');
}

/**
 * Build field symbols mapping from jury results
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

/**
 * Format score with consistent decimal places
 */
export function formatScore(score: number | null | undefined, decimals: number = 2): string {
  if (score === null || score === undefined || isNaN(score)) {
    return '-';
  }
  return score.toFixed(decimals);
}
