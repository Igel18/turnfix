/**
 * Built-in Formula Helper
 *
 * When a discipline uses a built-in formula (var_formel with lowercase variables
 * like "1*x", "20-x"), the stored score IS the raw value of the variable.
 *
 * This helper maps the stored score back to the formula variable so that
 * FormulaInput can display it correctly.
 */

import { extractFormulaSymbols } from './formulaUtils';

/**
 * Get initial formula field values for built-in formula disciplines.
 *
 * Built-in formulas use lowercase variables (e.g., "x" in "1*x" or "20-x").
 * When a participant already has a stored score, that score IS the raw value
 * of the lowercase variable. This function creates the mapping.
 *
 * Returns empty object when:
 * - No formula / no stored score
 * - Formula doesn't have lowercase variables (linked formula with A, B, C)
 * - Discipline has linked fields that provide their own jury results
 *
 * @param formula - The discipline's var_formel (e.g., "1*x", "20-x")
 * @param currentScore - The participant's stored score (the raw value)
 * @param disciplineFieldCount - How many discipline fields (tfx_disziplinen_felder) exist
 * @returns Record<string, number> mapping lowercase variable → stored score
 */
export function getBuiltInFormulaInitialValues(
  formula: string | null | undefined,
  currentScore: number | string | null | undefined,
  disciplineFieldCount: number
): Record<string, number> {
  // Nothing to map
  if (!formula || currentScore == null) return {};

  // If there are discipline fields, this is a linked formula — jury results
  // are loaded separately from tfx_jury_results
  if (disciplineFieldCount > 0) return {};

  const symbols = extractFormulaSymbols(formula);

  // Find lowercase symbols (built-in formula variables)
  const lowercaseSymbols = symbols.filter(s => /^[a-z]$/.test(s));

  // If no lowercase variables, this is a purely uppercase (linked) formula
  if (lowercaseSymbols.length === 0) return {};

  // Parse score to number
  const scoreNum = typeof currentScore === 'string' ? parseFloat(currentScore) : currentScore;
  if (isNaN(scoreNum)) return {};

  // Map the stored score to the first lowercase variable
  // (built-in formulas typically use a single variable like "x")
  const result: Record<string, number> = {};
  result[lowercaseSymbols[0]] = scoreNum;

  return result;
}
