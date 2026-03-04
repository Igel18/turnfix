/**
 * Formula Calculator Utility — Re-export wrapper
 *
 * All logic has been migrated to @turnfix/shared/formulaUtils.
 * This file keeps the same public API for backwards compatibility.
 */

export {
  parseTimeToSeconds,
  normalizeValueForCalculation,
  detectFormulaType,
  getMaxLetterIndex,
  getOperatorAfterField,
  calculateFormulaResult,
  // Aliases: client used these names, shared uses slightly different ones
  getFormulaSymbol as getFieldLetter,
  extractFormulaSymbols,
  calculateFormula,
} from '@turnfix/shared';

import {
  getFormulaSymbol,
  calculateFormula,
} from '@turnfix/shared';

/**
 * Extract variables from formula — wraps extractFormulaSymbols with type param.
 * Kept for backwards compatibility with useFormulaFields hook.
 */
export const extractVariables = (formula: string, type: 'letter' | 'variable'): string[] => {
  if (type === 'letter') {
    // Only return uppercase single-letter variables, sorted
    const letters = formula.match(/\b[A-Z]\b/g) || [];
    return Array.from(new Set(letters)).sort();
  } else if (type === 'variable') {
    // Shared extractFormulaSymbols returns all — filter by the custom variable map
    const variableMap = ['x', 'y', 'z', 'a', 'b', 'c'];
    const usedVariables: string[] = [];
    variableMap.forEach(variable => {
      const regex = new RegExp(`\\b${variable}\\b`, 'i');
      if (regex.test(formula)) {
        usedVariables.push(variable);
      }
    });
    return usedVariables;
  }
  return [];
};

/**
 * Replace variables in formula with numeric values.
 * Wraps shared logic for the array-based API used by client code.
 */
export const replaceVariablesInFormula = (
  formula: string,
  values: number[],
  type: 'letter' | 'variable'
): string => {
  let jsFormula = formula;

  // Normalize formula — replace comma with dot for decimal separator
  jsFormula = jsFormula.replace(/,/g, '.');

  if (type === 'letter') {
    values.forEach((value, index) => {
      const letter = getFormulaSymbol(index);
      jsFormula = jsFormula.replace(new RegExp(letter, 'g'), value.toString());
    });
  } else if (type === 'variable') {
    const variableMap = ['x', 'y', 'z', 'a', 'b', 'c'];
    values.forEach((value, index) => {
      if (index < variableMap.length) {
        const variable = variableMap[index];
        const regex = new RegExp(`\\b${variable}\\b`, 'gi');
        jsFormula = jsFormula.replace(regex, value.toString());
      }
    });
  }

  return jsFormula;
};

/**
 * CSP-safe arithmetic evaluator.
 * Delegates to shared calculateFormula (expr-eval) but keeps the same
 * throw-on-error API that existing tests expect.
 */
export const evaluateArithmetic = (expression: string): number => {
  // Remove all whitespace
  expression = expression.replace(/\s/g, '');

  // Validate expression contains only allowed characters
  if (!/^[\d\.\+\-\*\/\(\)]+$/.test(expression)) {
    throw new Error(`Invalid characters in expression: ${expression}`);
  }

  // Use shared calculateFormula with no variables (pure arithmetic)
  // calculateFormula normalizes commas → dots internally, but we've already
  // stripped whitespace. We pass an empty values map.
  const result = calculateFormula(expression, {});

  if (result === null) {
    throw new Error('Calculation error');
  }

  if (!isFinite(result)) {
    throw new Error('Division by zero');
  }

  return result;
};
