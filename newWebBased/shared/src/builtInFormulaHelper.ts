/**
 * Built-in Formula Helper
 *
 * Shared utility for handling built-in formula disciplines.
 * Used by both JuryPortal and ScoreCapture.
 *
 * When a discipline uses a built-in formula (var_formel with lowercase variables
 * like "1*x", "20-x", "5,5*x"), the stored score IS the raw value of the variable.
 * The formula is applied at ranking/display time by applyBuiltInFormula().
 *
 * This helper provides functions to:
 * - Detect built-in formulas
 * - Map stored scores back to formula variables for FormulaInput
 * - Determine what score should be saved (raw vs calculated)
 */

import { extractFormulaSymbols } from './formulaUtils';

/**
 * Checks whether a formula is a "built-in" formula.
 *
 * Built-in formulas:
 *  - Contain at least one lowercase variable (e.g., "x" in "20-x" or "1*x")
 *  - Have NO linked discipline fields (disciplineFieldCount === 0)
 *
 * Linked formulas use uppercase variables (A, B, C) with discipline fields.
 *
 * @param formula - The discipline's var_formel
 * @param disciplineFieldCount - Number of linked discipline fields
 */
export function isBuiltInFormula(
  formula: string | null | undefined,
  disciplineFieldCount: number
): boolean {
  if (!formula || disciplineFieldCount > 0) return false;
  return /[a-z]/.test(formula);
}

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

/**
 * Determines what score value should be saved to rel_leistung.
 *
 * - **Built-in formulas** (lowercase vars like "x", no discipline fields):
 *   Store the RAW input value. The var_formel is applied at ranking time
 *   by applyBuiltInFormula(). This matches C++ behavior.
 *
 * - **Linked formulas** (uppercase vars like A/B/C, with discipline fields):
 *   Store the CALCULATED result. Individual field values are saved separately
 *   to tfx_jury_results.
 *
 * @param calculatedScore - The result of evaluating the formula
 * @param fieldValues - Map of variable → entered value (e.g., { x: 5 })
 * @param formula - The discipline's var_formel
 * @param disciplineFieldCount - Number of linked discipline fields
 * @returns The score value that should be stored in rel_leistung
 */
export function getScoreToSave(
  calculatedScore: number,
  fieldValues: Record<string, number>,
  formula: string,
  disciplineFieldCount: number
): number {
  if (isBuiltInFormula(formula, disciplineFieldCount)) {
    // Extract the single lowercase variable value (the raw user input)
    const lowercaseEntries = Object.entries(fieldValues)
      .filter(([key]) => /^[a-z]$/.test(key));
    if (lowercaseEntries.length === 1) {
      return lowercaseEntries[0][1];
    }
  }
  // Linked formula or complex: store the calculated result
  return calculatedScore;
}
