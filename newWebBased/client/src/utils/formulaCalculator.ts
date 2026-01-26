/**
 * Formula Calculator Utility
 * Handles formula parsing, evaluation, and field mapping
 */

/**
 * Parse time format (MM:SS.ms) to seconds
 */
export const parseTimeToSeconds = (timeString: string): number | null => {
  const timeMatch = timeString.match(/^(\d+):(\d+)[.,](\d+)$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);
    const milliseconds = parseInt(timeMatch[3], 10);
    return minutes * 60 + seconds + (milliseconds / 100);
  }
  return null;
};

/**
 * Normalize value for calculation (handle comma/dot decimal separator)
 */
export const normalizeValueForCalculation = (value: string): string => {
  // Check if it's a time format
  const timeSeconds = parseTimeToSeconds(value);
  if (timeSeconds !== null) {
    return timeSeconds.toString();
  }
  
  // Regular number format - replace comma with dot
  return value.replace(',', '.');
};

/**
 * Detect formula type
 */
export const detectFormulaType = (formula: string): 'letter' | 'variable' | 'none' => {
  if (!formula) return 'none';
  // Nur Einzelbuchstaben (A, B, C, ...) als eigene Tokens werten, keine Großbuchstaben in Wörtern
  const hasLetterVariables = /\b[A-Z]\b/.test(formula);
  const hasLowercaseVariables = /\b[a-z]\b/.test(formula);
  if (hasLetterVariables) return 'letter';
  if (hasLowercaseVariables) return 'variable';
  return 'none';
};

/**
 * Extract variables from formula
 */
export const extractVariables = (formula: string, type: 'letter' | 'variable'): string[] => {
  if (type === 'letter') {
    const letters = formula.match(/\b[A-Z]\b/g) || [];
    return Array.from(new Set(letters)).sort();
  } else if (type === 'variable') {
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
 * Get maximum letter index from formula (A=0, B=1, C=2, etc.)
 */
export const getMaxLetterIndex = (formula: string): number => {
  const letters = formula.match(/\b[A-Z]\b/g) || [];
  if (letters.length === 0) return -1;
  
  const uniqueLetters = Array.from(new Set(letters)).sort();
  return uniqueLetters[uniqueLetters.length - 1].charCodeAt(0) - 65;
};

/**
 * Get field letter from index (0=A, 1=B, 2=C, etc.)
 */
export const getFieldLetter = (index: number): string => {
  return String.fromCharCode(65 + index);
};

/**
 * Extract operator after a specific field in the formula
 */
export const getOperatorAfterField = (formula: string, fieldIndex: number): string => {
  if (!formula) return '';
  
  const fieldLetter = getFieldLetter(fieldIndex);
  const letterPattern = new RegExp(`${fieldLetter}\\s*([+\\-*/])`, 'i');
  const match = formula.match(letterPattern);
  
  if (match && match[1]) {
    const op = match[1];
    if (op === '*') return '×';
    if (op === '/') return '÷';
    return op;
  }
  
  return '';
};

/**
 * Replace variables in formula with values
 */
export const replaceVariablesInFormula = (
  formula: string,
  values: number[],
  type: 'letter' | 'variable'
): string => {
  let jsFormula = formula;
  
  // Normalize formula - replace comma with dot for decimal separator
  jsFormula = jsFormula.replace(/,/g, '.');
  
  if (type === 'letter') {
    // Letter-based formula (A, B, C, etc.)
    values.forEach((value, index) => {
      const letter = getFieldLetter(index);
      jsFormula = jsFormula.replace(new RegExp(letter, 'g'), value.toString());
    });
  } else if (type === 'variable') {
    // Variable-based formula (x, y, z)
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
 * CSP-safe arithmetic evaluator (no eval/Function)
 * Uses recursive descent parsing for proper operator precedence
 */
export const evaluateArithmetic = (expression: string): number => {
  // Remove all whitespace
  expression = expression.replace(/\s/g, '');
  
  // Validate expression contains only allowed characters
  if (!/^[\d\.\+\-\*\/\(\)]+$/.test(expression)) {
    throw new Error(`Invalid characters in expression: ${expression}`);
  }
  
  let pos = 0;
  
  const parseExpression = (): number => {
    let result = parseTerm();
    
    while (pos < expression.length) {
      const op = expression[pos];
      if (op !== '+' && op !== '-') break;
      
      pos++; // consume operator
      const right = parseTerm();
      
      if (op === '+') result += right;
      else if (op === '-') result -= right;
    }
    
    return result;
  };
  
  const parseTerm = (): number => {
    let result = parseFactor();
    
    while (pos < expression.length) {
      const op = expression[pos];
      if (op !== '*' && op !== '/') break;
      
      pos++; // consume operator
      const right = parseFactor();
      
      if (op === '*') result *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        result /= right;
      }
    }
    
    return result;
  };
  
  const parseFactor = (): number => {
    // Handle parentheses
    if (expression[pos] === '(') {
      pos++; // consume '('
      const result = parseExpression();
      if (expression[pos] !== ')') {
        throw new Error('Mismatched parentheses');
      }
      pos++; // consume ')'
      return result;
    }
    
    // Handle negative numbers
    if (expression[pos] === '-') {
      pos++; // consume '-'
      return -parseFactor();
    }
    
    // Parse number
    let numStr = '';
    while (pos < expression.length && (expression[pos].match(/[\d\.]/) || expression[pos] === '.')) {
      numStr += expression[pos];
      pos++;
    }
    
    if (numStr === '') {
      throw new Error(`Expected number at position ${pos}`);
    }
    
    const num = parseFloat(numStr);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${numStr}`);
    }
    
    return num;
  };
  
  const result = parseExpression();
  
  // Ensure we consumed the entire expression
  if (pos !== expression.length) {
    throw new Error(`Unexpected characters after position ${pos}`);
  }
  
  return result;
};

/**
 * Calculate formula result from field values
 */
export const calculateFormulaResult = (
  formula: string,
  fieldValues: string[],
  formulaType: 'letter' | 'variable'
): { result: number | null; error: string | null } => {
  try {
    // Parse all field values to numbers
    const numericValues: number[] = [];
    
    for (const value of fieldValues) {
      const normalizedValue = normalizeValueForCalculation(value);
      const numValue = parseFloat(normalizedValue);
      
      if (isNaN(numValue)) {
        return {
          result: null,
          error: `Invalid value: ${value}`
        };
      }
      
      numericValues.push(numValue);
    }
    
    // Replace variables with values
    const jsFormula = replaceVariablesInFormula(formula, numericValues, formulaType);
    
    // Evaluate
    const result = evaluateArithmetic(jsFormula);
    
    return {
      result,
      error: null
    };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Calculation error'
    };
  }
};
