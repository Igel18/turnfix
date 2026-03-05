/**
 * Formula Utilities — re-export from @turnfix/shared
 *
 * DO NOT add logic here. Edit the canonical source at:
 *   newWebBased/shared/src/formulaUtils.ts
 *
 * This file exists only so that existing imports
 *   import { ... } from '../utils/formulaUtils'
 * continue to work without changing every consumer file.
 */
export {
  FORMULA_VARIABLES,
  applyBuiltInFormula,
  buildFieldSymbolsMap,
  calculateFormula,
  detectFormulaType,
  extractFormulaSymbols,
  formatFormulaWithValues,
  formatScore,
  getFormulaSymbol,
  isSubtractionField,
  parseFormula,
  validateFormula,
} from '@turnfix/shared';

export type { FormulaField, ParsedFormula } from '@turnfix/shared';
