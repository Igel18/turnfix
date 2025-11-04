/**
 * useFormulaCalculation Hook
 * Point 123: Separation of Concerns - Formula Parsing & Calculation
 * 
 * Handles formula parsing, evaluation, and score calculations for disciplines
 */

import type { DisciplineField } from '@/types/ScoreCapture.types';

interface UseFormulaCalculationReturn {
  parseFormulaDisplay: (formula: string, fields: DisciplineField[], finalFieldName: string) => string | null;
  evaluateFormula: (formula: string, fieldValues: {[key: string]: number}, fields?: DisciplineField[]) => number;
}

export function useFormulaCalculation(): UseFormulaCalculationReturn {
  
  // Generic formula parsing helper - converts formula variables to readable field names
  const parseFormulaDisplay = (formula: string, fields: DisciplineField[], finalFieldName: string): string | null => {
    if (!formula || !fields || fields.length === 0) {
      return null;
    }

    const variableMap: {[key: string]: string} = {};
    const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    const sortedFields = [...fields]
      .filter(f => !f.isFinalScore)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    sortedFields.forEach((field, index) => {
      if (index < variables.length) {
        variableMap[variables[index]] = field.name;
      }
    });

    let displayFormula = formula;
    
    variables.forEach(variable => {
      if (variableMap[variable]) {
        const regex = new RegExp(`\\b${variable}\\b`, 'g');
        displayFormula = displayFormula.replace(regex, variableMap[variable]);
      }
    });

    return `${finalFieldName} = ${displayFormula}`;
  };

  // Generic formula evaluation helper
  const evaluateFormula = (formula: string, fieldValues: {[key: string]: number}, fields?: DisciplineField[]): number => {
    if (!formula) {
      return 0;
    }

    const variableMap: {[key: string]: number} = {};
    const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    if (fields && fields.length > 0) {
      const sortedFields = [...fields]
        .filter(f => !f.isFinalScore)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      sortedFields.forEach((field, index) => {
        if (index < variables.length && fieldValues[field.name] !== undefined) {
          variableMap[variables[index]] = fieldValues[field.name];
          if (process.env.DEBUG === 'true') {
            console.log(`  ${variables[index]} = ${field.name} (sortOrder: ${field.sortOrder}) = ${fieldValues[field.name]}`);
          }
        }
      });
    } else {
      const availableFields = Object.keys(fieldValues);
      availableFields.forEach((fieldName, index) => {
        if (index < variables.length && fieldValues[fieldName] !== undefined) {
          variableMap[variables[index]] = fieldValues[fieldName];
        }
      });
    }

    console.log('Formula evaluation:', { formula, fieldValues, variableMap });

    try {
      let evalFormula = formula;
      variables.forEach(variable => {
        if (variableMap[variable] !== undefined) {
          const regex = new RegExp(`\\b${variable}\\b`, 'g');
          evalFormula = evalFormula.replace(regex, variableMap[variable].toString());
        } else {
          const regex = new RegExp(`\\b${variable}\\b`, 'g');
          evalFormula = evalFormula.replace(regex, '0');
        }
      });

      evalFormula = evalFormula.replace(/\s+/g, '');
      
      if (!/^[0-9+\-*/.() ]+$/.test(evalFormula)) {
        console.warn('Formula contains invalid characters:', evalFormula);
        return 0;
      }

      const result = Function(`"use strict"; return (${evalFormula})`)();
      
      console.log(`Formula "${formula}" with values ${JSON.stringify(variableMap)} = ${result}`);
      return isNaN(result) ? 0 : result;
      
    } catch (error) {
      console.error('Error evaluating formula:', formula, error);
      return 0;
    }
  };

  return {
    parseFormulaDisplay,
    evaluateFormula
  };
}
