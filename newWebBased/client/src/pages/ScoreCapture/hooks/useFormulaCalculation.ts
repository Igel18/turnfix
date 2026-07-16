/**
 * useFormulaCalculation Hook
 * Point 123: Separation of Concerns - Formula Parsing & Calculation
 * REFACTORED: Now uses centralized formulaUtils for all formula operations
 * 
 * Provides Score Capture-specific wrappers around centralized formula utilities
 * Legacy interface maintained for backward compatibility with Score Capture components
 */

import { 
  FORMULA_VARIABLES, 
  calculateFinalScoreFromFieldValues
} from '@/utils/formulaUtils';
import { debugLog } from '@/utils/debug';
import type { DisciplineField } from '@/types/ScoreCapture.types';

interface UseFormulaCalculationReturn {
  parseFormulaDisplay: (formula: string, fields: DisciplineField[], finalFieldName: string) => string | null;
  evaluateFormula: (formula: string, fieldValues: {[key: string]: number}, fields?: DisciplineField[]) => number;
  calculateFinalScoreFromFieldMap: (
    formula: string | null | undefined,
    fields: Array<Pick<DisciplineField, 'id' | 'name' | 'sortOrder' | 'isFinalScore' | 'isStartingScore'>>,
    fieldValues: Record<number, string | number | null | undefined>
  ) => number | null;
}

export function useFormulaCalculation(): UseFormulaCalculationReturn {
  
  /**
   * Parse formula for display - converts formula variables to readable field names
   * Example: "(10 + A) - B" with fields [Stufe, AbzugAusf] → "Endnote = (10 + Stufe) - AbzugAusf"
   * 
   * Wrapper around formatFormulaWithValues that maps field names instead of values
   */
  const parseFormulaDisplay = (formula: string, fields: DisciplineField[], finalFieldName: string): string | null => {
    if (!formula || !fields || fields.length === 0) {
      return null;
    }

    // Build map of symbols to field names (not values)
    const fieldNameMap: {[key: string]: string} = {};
    
    const sortedFields = [...fields]
      .filter(f => !f.isFinalScore)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    sortedFields.forEach((field, index) => {
      if (index < FORMULA_VARIABLES.length) {
        fieldNameMap[FORMULA_VARIABLES[index]] = field.name;
      }
    });

    // Replace symbols with field names
    let displayFormula = formula;
    FORMULA_VARIABLES.forEach(variable => {
      if (fieldNameMap[variable]) {
        const regex = new RegExp(`\\b${variable}\\b`, 'g');
        displayFormula = displayFormula.replace(regex, fieldNameMap[variable]);
      }
    });

    return `${finalFieldName} = ${displayFormula}`;
  };

  /**
   * Evaluate formula with field values
   * Wrapper around calculateFormula() that converts field-based values to symbol-based values
   * 
   * @param formula - Formula string like "(10 + A) - B"
   * @param fieldValues - Values keyed by field name: { "Stufe": 6.0, "AbzugAusf.": 3.5 }
   * @param fields - Optional field definitions for mapping order
   * @returns Calculated result or 0 on error
   */
  const evaluateFormula = (formula: string, fieldValues: {[key: string]: number}, fields?: DisciplineField[]): number => {
    if (!formula) {
      return 0;
    }

    const calculationFields = fields && fields.length > 0
      ? fields.map(field => ({
          fieldId: field.id,
          fieldName: field.name,
          value: fieldValues[field.name] ?? null,
          sortOrder: field.sortOrder,
          isFinalScore: field.isFinalScore,
          isStartingScore: field.isStartingScore,
        }))
      : Object.entries(fieldValues).map(([fieldName, value], index) => ({
          fieldName,
          value,
          sortOrder: index,
          isFinalScore: false,
          isStartingScore: false,
        }));

    debugLog('[useFormulaCalculation] Formula evaluation:', { formula, fieldValues, calculationFields });

    const result = calculateFinalScoreFromFieldValues(formula, calculationFields);
    return result !== null ? result : 0;
  };

  const calculateFinalScoreFromFieldMap = (
    formula: string | null | undefined,
    fields: Array<Pick<DisciplineField, 'id' | 'name' | 'sortOrder' | 'isFinalScore' | 'isStartingScore'>>,
    fieldValues: Record<number, string | number | null | undefined>
  ): number | null => {
    const calculationFields = fields.map(field => {
      const rawValue = fieldValues[field.id];
      const numericValue = rawValue === '' || rawValue === undefined || rawValue === null
        ? null
        : Number(rawValue);

      return {
        fieldId: field.id,
        fieldName: field.name,
        value: numericValue !== null && !Number.isNaN(numericValue) ? numericValue : null,
        sortOrder: field.sortOrder,
        isFinalScore: field.isFinalScore,
        isStartingScore: field.isStartingScore,
      };
    });

    return calculateFinalScoreFromFieldValues(formula, calculationFields);
  };

  return {
    parseFormulaDisplay,
    evaluateFormula,
    calculateFinalScoreFromFieldMap
  };
}
