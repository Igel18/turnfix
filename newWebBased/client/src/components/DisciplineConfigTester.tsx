/**
 * Discipline Configuration Tester
 * Live testing of Input Mask and Formula calculations
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BeakerIcon, 
  XCircleIcon
} from '@heroicons/react/24/outline';
import { 
  normalizeScoreInput, 
  getPlaceholder 
} from '../utils/inputMaskUtils';

interface DisciplineConfigTesterProps {
  inputMask: string;
  formula: string;
  formulaId?: number;
  calculationType: number;
  unit: string;
  disciplineId?: number;
}

interface TestField {
  id: number;
  name: string;
  value: string;
  normalizedValue: string;
  isFinalScore?: boolean;
  isStartingScore?: boolean;
}

interface Formula {
  int_formelid: number;
  var_name: string;
  var_formel?: string;
  int_typ?: number;
}

const DisciplineConfigTester: React.FC<DisciplineConfigTesterProps> = ({
  inputMask,
  formula,
  formulaId,
  calculationType,
  unit,
  disciplineId
}) => {
  const { t } = useTranslation();
  const [testFields, setTestFields] = useState<TestField[]>([]);
  const [calculatedResult, setCalculatedResult] = useState<number | null>(null);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [loadedFormula, setLoadedFormula] = useState<Formula | null>(null);
  const [loadingFormula, setLoadingFormula] = useState(false);

  // Load formula from API if formulaId is provided
  useEffect(() => {
    if (!formulaId) {
      setLoadedFormula(null);
      return;
    }

    setLoadingFormula(true);
    fetch(`/api/formulas/${formulaId}`)
      .then(res => res.json())
      .then(data => {
        setLoadedFormula(data);
        setLoadingFormula(false);
      })
      .catch(error => {
        console.error('Error loading formula:', error);
        setLoadingFormula(false);
      });
  }, [formulaId]);

  // Get the effective formula (either from formulaId or direct formula string)
  const effectiveFormula = loadedFormula?.var_formel || formula;

  // Load discipline fields if disciplineId is provided
  useEffect(() => {
    if (!disciplineId) {
      return;
    }

    // If we have disciplineId, load the actual fields from the database
    fetch(`/api/discipline-fields?disciplineId=${disciplineId}`)
      .then(res => res.json())
      .then(data => {
        const disciplineFields = Array.isArray(data) ? data : [];
        
        if (disciplineFields.length > 0) {
          const fields = disciplineFields.map((field: any) => ({
            id: field.id,
            name: field.name,
            value: '',
            normalizedValue: '',
            isFinalScore: field.isFinalScore,
            isStartingScore: field.isStartingScore
          }));
          setTestFields(fields);
        }
      })
      .catch(error => {
        console.error('Error loading discipline fields:', error);
      });
  }, [disciplineId]);

  // Parse formula to extract fields (only if no disciplineId)
  useEffect(() => {
    if (disciplineId) {
      // Skip formula parsing if we have disciplineId (fields loaded from API)
      return;
    }
    
    if (!effectiveFormula) {
      setTestFields([]);
      return;
    }

    try {
      // Extract field names from formula (e.g., [D-Note], [E-Note], etc.)
      const fieldMatches = effectiveFormula.match(/\[([^\]]+)\]/g);
      if (fieldMatches) {
        const uniqueFields = Array.from(new Set(fieldMatches.map(f => f.slice(1, -1))));
        const fields = uniqueFields.map((name, index) => ({
          id: index + 1,
          name,
          value: '',
          normalizedValue: ''
        }));
        setTestFields(fields);
      } else {
        setTestFields([]);
      }
    } catch (error) {
      console.error('Error parsing formula:', error);
      setTestFields([]);
    }
  }, [effectiveFormula, disciplineId]);

  // Update field value
  const handleFieldChange = (fieldId: number, value: string) => {
    // Replace dot with comma immediately on input (Point a)
    const normalizedValue = value.replace('.', ',');
    setTestFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, value: normalizedValue } : f
    ));
  };

  // Normalize field value on blur
  const handleFieldBlur = (fieldId: number) => {
    setTestFields(prev => prev.map(f => {
      if (f.id === fieldId && f.value) {
        try {
          // Always normalize, even without inputMask
          let normalized = f.value;
          
          if (inputMask) {
            normalized = normalizeScoreInput(f.value, inputMask);
          } else {
            // No input mask: just ensure decimal format with comma
            // Convert to number and back to ensure valid format
            const numValue = parseFloat(f.value.replace(',', '.'));
            if (!isNaN(numValue)) {
              // Format with 2 decimals and use comma
              normalized = numValue.toFixed(2).replace('.', ',');
            }
          }
          
          // Update both normalizedValue AND value (show normalized in field)
          return { ...f, value: normalized, normalizedValue: normalized };
        } catch (error) {
          console.error('Normalization error:', error);
          return { ...f, normalizedValue: 'Error' };
        }
      }
      return f;
    }));
  };

  // Extract operators between fields from formula
  const getOperatorAfterField = (fieldIndex: number): string => {
    if (!effectiveFormula) return '';
    
    console.log('🔍 Looking for operator after field index:', fieldIndex);
    console.log('   Formula:', effectiveFormula);
    
    // Formula uses letters: A, B, C, D, etc.
    // Map field index to letter
    const fieldLetter = String.fromCharCode(65 + fieldIndex); // 65 = 'A'
    console.log('   Field letter:', fieldLetter);
    
    // Try pattern: A OPERATOR (e.g., "A+", "B-", "C*")
    const letterPattern = new RegExp(`${fieldLetter}\\s*([+\\-*/])`, 'i');
    const match = effectiveFormula.match(letterPattern);
    
    if (match && match[1]) {
      console.log('   ✅ Found operator:', match[1]);
      const op = match[1];
      if (op === '*') return '×';
      if (op === '/') return '÷';
      return op;
    }
    
    console.log('   ❌ No operator found');
    return '';
  };

  // Get field letter from formula (A, B, C, etc.)
  const getFieldLetter = (fieldIndex: number): string => {
    return String.fromCharCode(65 + fieldIndex); // 65 = 'A'
  };

  // Calculate formula result
  useEffect(() => {
    if (!effectiveFormula || testFields.length === 0) {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    // Check if all NON-FINAL fields have values
    const nonFinalFields = testFields.filter(f => !f.isFinalScore);
    const allFieldsHaveValues = nonFinalFields.every(f => f.value !== '');
    
    if (!allFieldsHaveValues) {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    try {
      // Build a map of field values by index/letter (A, B, C, etc.)
      const fieldValues: number[] = [];
      const nonFinalFields = testFields.filter(f => !f.isFinalScore);
      
      nonFinalFields.forEach(field => {
        // Use the value directly (convert comma to dot for parsing)
        const valueToUse = field.value.replace(',', '.'); 
          
        const fieldValue = parseFloat(valueToUse);
        if (isNaN(fieldValue)) {
          throw new Error(`Invalid value for ${field.name}`);
        }
        fieldValues.push(fieldValue);
      });

      // CSP-safe formula calculation
      // Replace letters (A, B, C) with their values
      let jsFormula = effectiveFormula;
      
      console.log('🧮 Starting calculation:', {
        formula: effectiveFormula,
        fieldValues,
        nonFinalFieldCount: nonFinalFields.length
      });
      
      // Replace each letter with its value
      fieldValues.forEach((value, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, ...
        const before = jsFormula;
        jsFormula = jsFormula.replace(new RegExp(letter, 'g'), value.toString());
        console.log(`   Replaced ${letter} with ${value}: ${before} → ${jsFormula}`);
      });
      
      console.log('🔢 Formula after replacement:', jsFormula);
      
      // Evaluate using safe arithmetic parser
      const result = evaluateArithmetic(jsFormula);
      
      console.log('✅ Calculation result:', result);
      
      if (typeof result === 'number' && !isNaN(result)) {
        setCalculatedResult(result);
        setFormulaError(null);
      } else {
        setCalculatedResult(null);
        setFormulaError('Invalid calculation result');
      }
    } catch (error) {
      console.error('❌ Calculation error:', error);
      setCalculatedResult(null);
      setFormulaError(error instanceof Error ? error.message : 'Calculation error');
    }
  }, [effectiveFormula, testFields, calculationType]);

  // Simple arithmetic evaluator (CSP-safe, no eval)
  const evaluateArithmetic = (expression: string): number => {
    // Remove all whitespace
    expression = expression.replace(/\s/g, '');
    
    console.log('📊 Evaluating expression:', expression);
    
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

  const placeholder = inputMask ? getPlaceholder(inputMask) : '';

  return (
    <div className="space-y-4 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-lg p-6 border-2 border-purple-300">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <BeakerIcon className="h-5 w-5 text-purple-600" />
        <h3 className="text-sm font-semibold text-purple-900">
          {t('disciplines.tester.title', 'Formula Calculation Test')}
        </h3>
      </div>

      {/* Loading State */}
      {loadingFormula && (
        <div className="text-sm text-gray-500 text-center py-4">
          Loading formula...
        </div>
      )}

      {/* Visual Formula Display */}
      {!loadingFormula && testFields.length > 0 && (
        <>
          {/* Formula Breakdown with Inline Inputs */}
          <div className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl border-2 border-purple-300 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {testFields.map((field, index) => {
                const showEquals = field.isFinalScore && index > 0;
                
                // Get field letter (A, B, C, etc.) for non-final fields
                const nonFinalFields = testFields.filter(f => !f.isFinalScore);
                const nonFinalIndex = nonFinalFields.findIndex(f => f.id === field.id);
                const fieldLetter = nonFinalIndex >= 0 ? getFieldLetter(nonFinalIndex) : '';
                
                // Get operator after this field (from formula using field index)
                const operatorAfter = nonFinalIndex >= 0 && nonFinalIndex < nonFinalFields.length - 1
                  ? getOperatorAfterField(nonFinalIndex) 
                  : '';
                
                // For final score, show calculated result
                const isFinalScoreWithResult = field.isFinalScore && calculatedResult !== null;
                const displayValue = isFinalScoreWithResult
                  ? calculatedResult.toFixed(calculationType === 2 ? 2 : 3)
                  : field.value;
                
                return (
                  <React.Fragment key={field.id}>
                    {/* Show = before final score */}
                    {showEquals && (
                      <div className="text-3xl font-bold text-purple-600 px-2">=</div>
                    )}
                    
                    {/* Field with inline input */}
                    <div className="inline-flex flex-col items-center">
                      {/* Show field letter above field name (or EW for final score) */}
                      {fieldLetter ? (
                        <div className="text-xs font-bold text-purple-500 mb-0.5">
                          ({fieldLetter})
                        </div>
                      ) : field.isFinalScore ? (
                        <div className="text-xs font-bold text-green-600 mb-0.5">
                          (EW)
                        </div>
                      ) : (
                        <div className="text-xs mb-0.5">&nbsp;</div>
                      )}
                      <div className="text-xs font-medium text-purple-700 mb-1 whitespace-nowrap">
                        {field.name}
                      </div>
                      
                      {/* For final score, show result in green box */}
                      {field.isFinalScore ? (
                        <div className="px-4 py-2 rounded-lg border-2 bg-gradient-to-r from-green-400 to-green-500 border-green-600 text-white text-xl font-bold min-w-[90px] text-center shadow-sm">
                          {displayValue || '?'}
                        </div>
                      ) : (
                        /* For other fields, show input */
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          onBlur={() => handleFieldBlur(field.id)}
                          placeholder={inputMask ? placeholder : '0,00'}
                          className="w-[90px] px-3 py-2 border-2 border-purple-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center font-bold text-purple-900 shadow-sm"
                        />
                      )}
                    </div>
                    
                    {/* Show operator after field */}
                    {operatorAfter && (
                      <div className="text-3xl font-bold text-purple-600 px-2 select-none">
                        {operatorAfter}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            
            {/* Show unit at the end if available */}
            {unit && (
              <div className="text-lg font-medium text-green-700 ml-2 flex items-center">
                {unit}
              </div>
            )}
          </div>

          {/* Error Display */}
          {formulaError && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2">
                <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="text-sm text-red-700">{formulaError}</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* No Fields */}
      {!loadingFormula && testFields.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <BeakerIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">
            {t('disciplines.tester.noConfig', 'Configure Input Mask or Formula to test')}
          </p>
        </div>
      )}
    </div>
  );
};

export default DisciplineConfigTester;
