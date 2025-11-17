/**
 * Discipline Configuration Tester
 * Live testing of Input Mask and Formula calculations
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BeakerIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  CalculatorIcon 
} from '@heroicons/react/24/outline';
import { 
  normalizeScoreInput, 
  parseInputMask, 
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
  const [testValue, setTestValue] = useState('');
  const [normalizedValue, setNormalizedValue] = useState('');
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

  // Normalize input value on blur
  const handleTestValueBlur = () => {
    if (!testValue || !inputMask) return;
    
    try {
      const normalized = normalizeScoreInput(testValue, inputMask);
      setNormalizedValue(normalized);
    } catch (error) {
      console.error('Normalization error:', error);
      setNormalizedValue('Error');
    }
  };

  // Update field value
  const handleFieldChange = (fieldId: number, value: string) => {
    setTestFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, value } : f
    ));
  };

  // Normalize field value on blur
  const handleFieldBlur = (fieldId: number) => {
    if (!inputMask) return;
    
    setTestFields(prev => prev.map(f => {
      if (f.id === fieldId && f.value) {
        try {
          const normalized = normalizeScoreInput(f.value, inputMask);
          return { ...f, normalizedValue: normalized };
        } catch (error) {
          console.error('Normalization error:', error);
          return { ...f, normalizedValue: 'Error' };
        }
      }
      return f;
    }));
  };

  // Calculate formula result
  useEffect(() => {
    if (!effectiveFormula || testFields.length === 0) {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    // Check if all fields have normalized values (or raw values if no mask)
    const allFieldsHaveValues = testFields.every(f => 
      inputMask ? f.normalizedValue !== '' : f.value !== ''
    );
    
    if (!allFieldsHaveValues) {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    try {
      // Build a map of field values
      const fieldValues: Record<string, number> = {};
      testFields.forEach(field => {
        // Use normalized value if available (with mask), otherwise raw value
        const valueToUse = inputMask && field.normalizedValue 
          ? field.normalizedValue.replace(',', '.') // Handle comma decimal separator
          : field.value;
          
        const fieldValue = parseFloat(valueToUse);
        if (isNaN(fieldValue)) {
          throw new Error(`Invalid value for ${field.name}`);
        }
        fieldValues[field.name] = fieldValue;
      });

      // Parse and calculate formula using Function constructor (safer than eval)
      // Replace field placeholders with variable names
      let jsFormula = effectiveFormula;
      testFields.forEach(field => {
        // Create safe variable name (replace spaces and special chars)
        const safeVarName = field.name.replace(/[^a-zA-Z0-9]/g, '_');
        jsFormula = jsFormula.replace(
          new RegExp(`\\[${field.name}\\]`, 'g'),
          safeVarName
        );
      });

      // Replace math functions
      jsFormula = jsFormula
        .replace(/max\(/g, 'Math.max(')
        .replace(/min\(/g, 'Math.min(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pow\(/g, 'Math.pow(');

      // Create function parameters and arguments
      const paramNames = testFields.map(f => f.name.replace(/[^a-zA-Z0-9]/g, '_'));
      const paramValues = testFields.map(f => fieldValues[f.name]);

      // Use Function constructor instead of eval (CSP-safe)
      const calculateFn = new Function(...paramNames, `return ${jsFormula};`);
      const result = calculateFn(...paramValues);
      
      if (typeof result === 'number' && !isNaN(result)) {
        setCalculatedResult(result);
        setFormulaError(null);
      } else {
        setCalculatedResult(null);
        setFormulaError('Invalid calculation result');
      }
    } catch (error) {
      setCalculatedResult(null);
      setFormulaError(error instanceof Error ? error.message : 'Calculation error');
    }
  }, [effectiveFormula, testFields, inputMask]);

  const maskInfo = inputMask ? parseInputMask(inputMask) : null;
  const placeholder = inputMask ? getPlaceholder(inputMask) : '';

  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
      <div className="flex items-center space-x-2">
        <BeakerIcon className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('disciplines.tester.title', 'Configuration Tester')}
        </h3>
      </div>

      <p className="text-sm text-gray-600">
        {t('disciplines.tester.description', 'Test input mask normalization and formula calculation without creating a competition.')}
      </p>

      {/* Input Mask Test */}
      {inputMask && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <CalculatorIcon className="h-4 w-4 mr-2 text-blue-600" />
            {t('disciplines.tester.inputMaskTest', 'Input Mask Test')}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('disciplines.tester.inputValue', 'Input Value')}
              </label>
              <input
                type="text"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                onBlur={handleTestValueBlur}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('disciplines.tester.normalizedValue', 'Normalized Value')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={normalizedValue}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono"
                />
                {normalizedValue && normalizedValue !== 'Error' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
                {normalizedValue === 'Error' && (
                  <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('disciplines.tester.maskInfo', 'Mask Info')}
              </label>
              {maskInfo && (
                <div className="space-y-1 text-xs bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900">{maskInfo.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Decimals:</span>
                    <span className="font-medium text-gray-900">{maskInfo.decimalPlaces}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Length:</span>
                    <span className="font-medium text-gray-900">{maskInfo.totalLength}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
            <strong>Examples:</strong> 
            {inputMask === '0.00' && ' Try: 5 → 5.00, 5.5 → 5.50'}
            {inputMask === '00.00' && ' Try: 5 → 05.00, 15 → 15.00'}
            {inputMask === '0:00.00' && ' Try: 65.5 → 1:05.50 (seconds → MM:SS)'}
            {inputMask === 'h:mm:ss' && ' Try: 3661 → 1:01:01 (seconds → HH:MM:SS)'}
            {inputMask === '0,00' && ' Try: 5 → 5,00, 5.5 → 5,50'}
            {!['0.00', '00.00', '0:00.00', 'h:mm:ss', '0,00'].includes(inputMask) && 
              ` Type a value and press Tab/blur to see normalization`}
          </div>
        </div>
      )}

      {/* Formula Test */}
      {(loadingFormula || effectiveFormula) && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <CalculatorIcon className="h-4 w-4 mr-2 text-green-600" />
            {t('disciplines.tester.formulaTest', 'Formula Calculation Test')}
          </h4>

          {/* Loading State */}
          {loadingFormula && (
            <div className="text-sm text-gray-500 text-center py-4">
              Loading formula...
            </div>
          )}

          {/* Formula Display */}
          {!loadingFormula && effectiveFormula && (
            <>
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Formula:</div>
                <div className="font-mono text-sm text-gray-900">
                  {effectiveFormula}
                  {loadedFormula && (
                    <span className="ml-2 text-xs text-blue-600">
                      (loaded from ID {formulaId})
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Formula Display with Values */}
              {testFields.length > 0 && (
                <div className="mb-4">
                  {/* Title */}
                  <div className="text-xs font-semibold text-purple-900 mb-3 flex items-center">
                    <span className="mr-2">📊</span> 
                    Formula Calculation Breakdown
                  </div>
                  
                  {/* Formula with Values */}
                  <div className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl border-2 border-purple-300 shadow-sm">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {/* Show fields in order, with special handling for final score */}
                      {testFields.map((field, index) => {
                        // For final score field, show calculated result if available
                        let displayValue = inputMask && field.normalizedValue 
                          ? field.normalizedValue 
                          : field.value || '?';
                        
                        // If this is the final score and we have a calculated result, use that
                        if (field.isFinalScore && calculatedResult !== null) {
                          displayValue = calculatedResult.toFixed(calculationType === 2 ? 2 : 3);
                        }
                        
                        const hasValue = field.value !== '' || (field.isFinalScore && calculatedResult !== null);
                        
                        // If this is the final score (Endwert), show "=" before it
                        const showEquals = field.isFinalScore && index > 0;
                        
                        return (
                          <React.Fragment key={field.id}>
                            {/* Show = before final score */}
                            {showEquals && (
                              <div className="text-3xl font-bold text-purple-600 px-2">=</div>
                            )}
                            
                            {/* Field box */}
                            <div className="inline-flex flex-col items-center transform hover:scale-105 transition-transform">
                              <div className="text-xs font-medium text-purple-700 mb-1 whitespace-nowrap">
                                {field.name}
                              </div>
                              <div className={`px-4 py-2 rounded-lg border-2 font-bold min-w-[70px] text-center shadow-sm ${
                                field.isFinalScore
                                  ? 'bg-gradient-to-r from-green-400 to-green-500 border-green-600 text-white text-xl'
                                  : hasValue 
                                    ? 'bg-white border-purple-400 text-purple-900' 
                                    : 'bg-gray-100 border-gray-300 text-gray-400'
                              }`}>
                                {displayValue}
                              </div>
                            </div>
                            
                            {/* Show operator after field (except for last field or before final score) */}
                            {!field.isFinalScore && index < testFields.length - 1 && !testFields[index + 1].isFinalScore && (
                              <div className="text-3xl font-bold text-purple-600 px-2 select-none">
                                {effectiveFormula.includes('+') ? '+' : 
                                 effectiveFormula.includes('-') ? '-' : 
                                 effectiveFormula.includes('*') ? '×' : 
                                 effectiveFormula.includes('/') ? '÷' : '+'}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                      
                      {/* Show unit at the end if available */}
                      {unit && testFields.some(f => f.isFinalScore && f.value) && (
                        <div className="text-lg font-medium text-green-700 ml-1">
                          {unit}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Info: Dummy Fields */}
              {inputMask && testFields.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800">
                  <strong>💡 Interactive Mode:</strong> Enter values below using input mask <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-300">{inputMask}</span> and watch the formula calculation update above in real-time.
                </div>
              )}

              {/* Field Inputs - Compact Grid */}
              {testFields.length > 0 && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {testFields.map(field => (
                      <div key={field.id}>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          {field.name}
                        </label>
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          onBlur={() => handleFieldBlur(field.id)}
                          placeholder={inputMask ? placeholder : '0.00'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-center font-mono"
                        />
                        {inputMask && field.normalizedValue && (
                          <div className="text-xs text-center mt-1 text-gray-500">
                            → {field.normalizedValue}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {formulaError && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Error:</div>
                          <div className="text-sm text-red-700">{formulaError}</div>
                        </div>
                        <XCircleIcon className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                  )}

                  {!calculatedResult && !formulaError && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 text-sm text-blue-900">
                      <div className="flex items-start space-x-2">
                        <span className="text-2xl">💡</span>
                        <div>
                          <div className="font-semibold mb-1">Ready to calculate!</div>
                          <div className="text-xs text-blue-700">
                            {inputMask 
                              ? 'Fill in all fields below and press Tab to normalize. The formula visualization above will update automatically.'
                              : 'Fill in all fields below to see the live calculation in the formula visualization above.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {testFields.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200 text-xs text-yellow-700">
                  ⚠️ No fields found in formula. Formula should contain field references like [D-Note], [E-Note], etc.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!inputMask && !effectiveFormula && !loadingFormula && (
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
