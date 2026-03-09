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

  return {
    originalFormula: formula,
    symbols,
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
  } = {}
): string {
  if (!formula) return '';

  const { decimals = 2 } = options;
  let result = formula;

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
  values: Record<string, number>
): number | null {
  if (!formula) return null;

  try {
    let evalFormula = formula;

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
    console.error('[formulaUtils] Formula calculation error:', error, { formula, values });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Built-in formula (var_formel) — applied at ranking/display time
// ---------------------------------------------------------------------------

/**
 * Apply a discipline's built-in formula (var_formel) to a raw score.
 *
 * This mirrors the C++ result_calc.cpp behaviour where var_formel is applied
 * **at ranking time**, not at save time.  The raw score is stored unchanged
 * in tfx_wertungen_details.rel_leistung; the built-in formula transforms it
 * into the value used for ranking &amp; display.
 *
 * Built-in formulas use lowercase 'x' as the score variable:
 *  - "1*x"    → identity (most common, no transformation)
 *  - "20-x"   → subtract from 20 (time-based: lower time = higher score)
 *  - "x/2,5"  → scaling (German decimal comma)
 *  - "(((1000/x)-2,158)/0,006)/49" → complex time conversion
 *
 * @param formula  The discipline's var_formel (e.g. "20-x", "1*x").
 *                 Pass null/undefined/empty to skip transformation.
 * @param rawScore The raw score value from rel_leistung.
 * @returns        The transformed score, or rawScore unchanged when no
 *                 valid formula is provided.
 */
export function applyBuiltInFormula(
  formula: string | null | undefined,
  rawScore: number
): number {
  if (!formula) return rawScore;

  const result = calculateFormula(formula, { x: rawScore });
  return result !== null ? result : rawScore;
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

  const result = calculateFormula(formula, testValues);
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
  const formulaSymbols = formula ? extractFormulaSymbols(formula) : [];

  if (formulaSymbols.length === 0) {
    fieldScores.forEach((jr, index) => {
      const symbol = getFormulaSymbol(index);

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

  const usedFieldIndexes = new Set<number>();
  const normalizedFieldValue = (value?: string) => (value || '').trim().toLowerCase();

  formulaSymbols.forEach((symbol) => {
    const normalizedSymbol = symbol.toLowerCase();

    // 1) Prefer explicit symbol mapping via short name or exact field name
    let matchedFieldIndex = fieldScores.findIndex((jr, index) => {
      if (usedFieldIndexes.has(index)) return false;
      const shortNameMatches = normalizedFieldValue(jr.fieldShortName) === normalizedSymbol;
      const fieldNameMatches = normalizedFieldValue(jr.fieldName) === normalizedSymbol;
      return shortNameMatches || fieldNameMatches;
    });

    // 2) Fallback to next available field by order
    if (matchedFieldIndex === -1) {
      matchedFieldIndex = fieldScores.findIndex((_, index) => !usedFieldIndexes.has(index));
    }

    if (matchedFieldIndex !== -1) {
      usedFieldIndexes.add(matchedFieldIndex);
      const jr = fieldScores[matchedFieldIndex];

      symbolsMap[symbol] = {
        symbol,
        value: jr.performance,
        fieldName: jr.fieldName,
        fieldShortName: jr.fieldShortName,
        isSubtraction: jr.fieldName ? isSubtractionField(jr.fieldName) : false,
        sortOrder: jr.sortOrder
      };
      return;
    }

    // 3) If no field exists for this symbol, keep placeholder to show expected formula input
    symbolsMap[symbol] = {
      symbol,
      value: null,
      fieldName: symbol,
      fieldShortName: symbol,
      isSubtraction: false,
      sortOrder: undefined
    };
  });

  return symbolsMap;
}

// ---------------------------------------------------------------------------
// Formula type detection & helpers (migrated from client/formulaCalculator.ts)
// ---------------------------------------------------------------------------

/**
 * Detect formula type based on variable style.
 * - 'letter': Has uppercase single-letter variables (A, B, C…)
 * - 'variable': Has lowercase single-letter variables (x, y, z…)
 * - 'none': No single-letter variables (pure numeric)
 *
 * Letter takes precedence when both are present (A + x → 'letter').
 */
export function detectFormulaType(formula: string): 'letter' | 'variable' | 'none' {
  if (!formula) return 'none';
  const hasLetterVariables = /\b[A-Z]\b/.test(formula);
  const hasLowercaseVariables = /\b[a-z]\b/.test(formula);
  if (hasLetterVariables) return 'letter';
  if (hasLowercaseVariables) return 'variable';
  return 'none';
}

/**
 * Get maximum letter index from formula.
 * A=0, B=1, C=2, … Returns -1 if no uppercase letter variables found.
 */
export function getMaxLetterIndex(formula: string): number {
  const letters = formula.match(/\b[A-Z]\b/g) || [];
  if (letters.length === 0) return -1;
  const uniqueLetters = Array.from(new Set(letters)).sort();
  return uniqueLetters[uniqueLetters.length - 1].charCodeAt(0) - 65;
}

/**
 * Extract the operator that follows a specific field in the formula.
 * Converts * → × and / → ÷ for UI display.
 * Returns empty string when no operator follows.
 */
export function getOperatorAfterField(formula: string, fieldIndex: number): string {
  if (!formula) return '';
  const fieldLetter = getFormulaSymbol(fieldIndex);
  const letterPattern = new RegExp(`${fieldLetter}\\s*([+\\-*/])`, 'i');
  const match = formula.match(letterPattern);
  if (match && match[1]) {
    const op = match[1];
    if (op === '*') return '×';
    if (op === '/') return '÷';
    return op;
  }
  return '';
}

/**
 * Parse time format (MM:SS.ms or MM:SS,ms) to seconds.
 * Returns null if the string is not a recognized time format.
 */
export function parseTimeToSeconds(timeString: string): number | null {
  const timeMatch = timeString.match(/^(\d+):(\d+)[.,](\d+)$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);
    const milliseconds = parseInt(timeMatch[3], 10);
    return minutes * 60 + seconds + (milliseconds / 100);
  }
  return null;
}

/**
 * Normalize a value string for use in formula calculation.
 * Handles time format (MM:SS.ms) and German decimal commas.
 */
export function normalizeValueForCalculation(value: string): string {
  // Check if it's a time format first
  const timeSeconds = parseTimeToSeconds(value);
  if (timeSeconds !== null) {
    return timeSeconds.toString();
  }
  // Regular number — replace comma with dot
  return value.replace(',', '.');
}

/**
 * Calculate formula result from ordered field values.
 * Convenience API that wraps `calculateFormula` with an array-based interface.
 *
 * @param formula - The formula string (e.g., "A + B", "1*x")
 * @param fieldValues - Ordered string values for each variable
 * @param formulaType - 'letter' (A,B,C) or 'variable' (x,y,z)
 * @returns Object with `result` (number|null) and `error` (string|null)
 */
export function calculateFormulaResult(
  formula: string,
  fieldValues: string[],
  formulaType: 'letter' | 'variable'
): { result: number | null; error: string | null } {
  try {
    // Build a Record<string, number> from the ordered values
    const values: Record<string, number> = {};

    // Determine variable names based on type
    const variableMap = formulaType === 'letter'
      ? FORMULA_VARIABLES  // A, B, C, …
      : ['x', 'y', 'z', 'a', 'b', 'c'];  // lowercase custom

    for (let i = 0; i < fieldValues.length; i++) {
      const raw = fieldValues[i];
      const normalized = normalizeValueForCalculation(raw);
      const num = parseFloat(normalized);

      if (isNaN(num)) {
        return { result: null, error: `Invalid value: ${raw}` };
      }

      const key = i < variableMap.length ? variableMap[i] : getFormulaSymbol(i);
      values[key] = num;
    }

    const result = calculateFormula(formula, values);

    if (result === null) {
      return { result: null, error: 'Calculation error' };
    }

    // Check for division by zero (Infinity/-Infinity)
    if (!isFinite(result)) {
      return { result: null, error: 'Division by zero' };
    }

    return { result, error: null };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Calculation error'
    };
  }
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
