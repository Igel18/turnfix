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
  calculationType: number;
  unit: string;
}

interface TestField {
  id: number;
  name: string;
  value: string;
}

const DisciplineConfigTester: React.FC<DisciplineConfigTesterProps> = ({
  inputMask,
  formula,
  calculationType,
  unit
}) => {
  const { t } = useTranslation();
  const [testValue, setTestValue] = useState('');
  const [normalizedValue, setNormalizedValue] = useState('');
  const [testFields, setTestFields] = useState<TestField[]>([]);
  const [calculatedResult, setCalculatedResult] = useState<number | null>(null);
  const [formulaError, setFormulaError] = useState<string | null>(null);

  // Parse formula to extract fields
  useEffect(() => {
    if (!formula) {
      setTestFields([]);
      return;
    }

    try {
      // Extract field names from formula (e.g., [D-Note], [E-Note], etc.)
      const fieldMatches = formula.match(/\[([^\]]+)\]/g);
      if (fieldMatches) {
        const uniqueFields = Array.from(new Set(fieldMatches.map(f => f.slice(1, -1))));
        const fields = uniqueFields.map((name, index) => ({
          id: index + 1,
          name,
          value: ''
        }));
        setTestFields(fields);
      } else {
        setTestFields([]);
      }
    } catch (error) {
      console.error('Error parsing formula:', error);
      setTestFields([]);
    }
  }, [formula]);

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

  // Calculate formula result
  useEffect(() => {
    if (!formula || testFields.length === 0) {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    // Check if all fields have values
    const allFieldsHaveValues = testFields.every(f => f.value !== '');
    if (!allFieldsHaveValues) {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    try {
      // Replace field placeholders with values
      let evalFormula = formula;
      testFields.forEach(field => {
        const fieldValue = parseFloat(field.value);
        if (isNaN(fieldValue)) {
          throw new Error(`Invalid value for ${field.name}`);
        }
        evalFormula = evalFormula.replace(
          new RegExp(`\\[${field.name}\\]`, 'g'),
          fieldValue.toString()
        );
      });

      // Replace math functions
      evalFormula = evalFormula
        .replace(/max\(/g, 'Math.max(')
        .replace(/min\(/g, 'Math.min(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pow\(/g, 'Math.pow(');

      // Evaluate formula
      // eslint-disable-next-line no-eval
      const result = eval(evalFormula);
      
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
  }, [formula, testFields]);

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
      {formula && testFields.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <CalculatorIcon className="h-4 w-4 mr-2 text-green-600" />
            {t('disciplines.tester.formulaTest', 'Formula Calculation Test')}
          </h4>

          {/* Formula Display */}
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Formula:</div>
            <div className="font-mono text-sm text-gray-900">
              {formula}
            </div>
          </div>

          {/* Field Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {testFields.map(field => (
              <div key={field.id}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {field.name}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={`Enter ${field.name}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                />
              </div>
            ))}
          </div>

          {/* Calculation Result */}
          {calculatedResult !== null && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Calculated Result:</div>
                  <div className="text-2xl font-bold text-green-700 font-mono">
                    {calculatedResult.toFixed(calculationType === 2 ? 2 : 3)}
                    {unit && <span className="text-sm text-gray-600 ml-2">{unit}</span>}
                  </div>
                </div>
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
            </div>
          )}

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
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-xs text-blue-700">
              💡 Enter values for all fields to see the calculation result
            </div>
          )}
        </div>
      )}

      {!inputMask && !formula && (
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
