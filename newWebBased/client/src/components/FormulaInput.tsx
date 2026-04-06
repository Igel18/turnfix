/**
 * Formula Input Component
 * Reusable component for formula-based field input and calculation display
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BeakerIcon, 
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useFormulaFields, FormulaField } from '../hooks/useFormulaFields';
import { getPlaceholder } from '../utils/inputMaskUtils';
import { detectFormulaType, extractFormulaSymbols } from '@turnfix/shared';

export interface FormulaInputProps {
  inputMask?: string;
  formula?: string;
  formulaId?: number | null;
  calculationType?: number;
  unit?: string;
  disciplineId?: number;
  showTitle?: boolean;
  className?: string;
  compact?: boolean; // New: compact mode for table display
  initialValues?: Record<number, string>; // Field ID -> value mapping
  onFieldsLoaded?: (fields: FormulaField[]) => void;
  onFieldChange?: (fieldId: number, value: string) => void;
  onCalculationComplete?: (result: number | null) => void;
}

/**
 * Formula Input Component
 * Displays formula fields with inline inputs and automatic calculation
 */
export const FormulaInput: React.FC<FormulaInputProps> = ({
  inputMask = '',
  formula = '',
  formulaId,
  calculationType = 3,
  unit = '',
  disciplineId,
  showTitle = true,
  className = '',
  compact = false, // Default to full size
  initialValues = {},
  onFieldsLoaded,
  onFieldChange,
  onCalculationComplete
}) => {
  const { t } = useTranslation();

  const {
    fields,
    calculatedResult,
    formulaError,
    loadingFormula,
    effectiveFormula,
    updateFieldValue,
    normalizeFieldValue
  } = useFormulaFields({
    formula,
    formulaId,
    disciplineId,
    inputMask,
    calculationType,
    initialValues,
    onFieldChange,
    onFieldsLoaded,
    onCalculationComplete
  });

  const placeholder = inputMask ? getPlaceholder(inputMask) : '';

  // Conditional sizing based on compact prop
  const sizeClasses = compact ? {
    container: 'p-3',
    gap: 'gap-2',
    textSize: 'text-lg',
    equalsSize: 'text-2xl',
    letterSize: 'text-[10px]',
    nameSize: 'text-[10px]',
    inputWidth: 'w-[70px]',
    inputPadding: 'px-2 py-1',
    inputBorder: 'border',
    resultWidth: 'min-w-[70px]',
    resultPadding: 'px-3 py-1',
    resultText: 'text-lg'
  } : {
    container: 'p-6',
    gap: 'gap-3',
    textSize: 'text-2xl',
    equalsSize: 'text-3xl',
    letterSize: 'text-xs',
    nameSize: 'text-xs',
    inputWidth: 'w-[90px]',
    inputPadding: 'px-3 py-2',
    inputBorder: 'border-2',
    resultWidth: 'min-w-[100px]',
    resultPadding: 'px-4 py-2',
    resultText: 'text-xl'
  };

  return (
    <div className={`${sizeClasses.container} bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl ${compact ? 'border' : 'border-2'} border-purple-300 shadow-sm ${className}`}>
      {/* Header */}
      {showTitle && (
        <div className="flex items-center space-x-2">
          <BeakerIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-purple-900">
            {t('disciplines.tester.title', 'Formula Calculation Test')}
          </h3>
        </div>
      )}

      {/* Loading State */}
      {loadingFormula && (
        <div className="text-sm text-gray-500 text-center py-4">
          {t('common.loading', 'Loading')}...
        </div>
      )}

      {/* Visual Formula Display */}
      {!loadingFormula && fields.length > 0 && (
        <>
          {/* Formula Breakdown with Inline Inputs */}
          <div className={`flex flex-wrap items-center justify-center ${sizeClasses.gap}`}>
              {effectiveFormula ? (
                // Show formula with constants and operators
                (() => {
                  // Parse formula to extract constants and structure
                  const nonFinalFields = fields.filter(f => !f.isFinalScore);
                  const formulaParts: Array<{type: 'constant' | 'field' | 'equals', content: string, fieldIndex?: number}> = [];
                  
                  let remainingFormula = effectiveFormula;
                  
                  // Detect formula type to determine how to find variables
                  const fType = detectFormulaType(effectiveFormula);
                  const formulaSymbols = extractFormulaSymbols(effectiveFormula);
                  
                  // Find each variable in order
                  nonFinalFields.forEach((_field, index) => {
                    // For letter-type formulas, use uppercase A, B, C...
                    // For variable-type formulas, use the actual symbol from the formula (x, y, z...)
                    let letter: string;
                    if (fType === 'variable' && index < formulaSymbols.length) {
                      letter = formulaSymbols[index]; // e.g. 'x', 'y'
                    } else {
                      letter = String.fromCharCode(65 + index); // A, B, C...
                    }
                    const regex = new RegExp(`\\b${letter}\\b`, fType === 'variable' ? 'i' : undefined);
                    const match = remainingFormula.search(regex);
                    
                    if (match !== -1) {
                      // Add constant before this field
                      if (match > 0) {
                        formulaParts.push({
                          type: 'constant',
                          content: remainingFormula.substring(0, match).trim()
                        });
                      }
                      
                      // Add the field
                      formulaParts.push({
                        type: 'field',
                        content: letter,
                        fieldIndex: index
                      });
                      
                      // Move past this letter
                      remainingFormula = remainingFormula.substring(match + 1);
                    }
                  });
                  
                  // Add any remaining constant after last field
                  if (remainingFormula.trim()) {
                    formulaParts.push({
                      type: 'constant',
                      content: remainingFormula.trim()
                    });
                  }
                  
                  // Add equals and final field
                  formulaParts.push({ type: 'equals', content: '=' });
                  formulaParts.push({ 
                    type: 'field', 
                    content: 'EW',
                    fieldIndex: nonFinalFields.length
                  });
                  
                  return formulaParts.map((part, partIndex) => {
                    if (part.type === 'constant') {
                      return (
                        <div key={`const-${partIndex}`} className={`${sizeClasses.textSize} font-bold text-purple-600 px-1`}>
                          {part.content}
                        </div>
                      );
                    } else if (part.type === 'equals') {
                      return (
                        <div key="equals" className={`${sizeClasses.equalsSize} font-bold text-purple-600 px-2`}>=</div>
                      );
                    } else if (part.type === 'field') {
                      const fieldIndex = part.fieldIndex!;
                      const field = fieldIndex < nonFinalFields.length 
                        ? nonFinalFields[fieldIndex]
                        : fields.find(f => f.isFinalScore);
                      
                      if (!field) return null;
                      
                      const fieldLetter = part.content;
                      const isFinalScoreWithResult = field.isFinalScore && calculatedResult !== null;
                      const displayValue = isFinalScoreWithResult
                        ? calculatedResult.toFixed(calculationType === 2 ? 2 : 3).replace('.', ',')
                        : field.value;
                      
                      return (
                        <div key={`field-${field.id}`} className="inline-flex flex-col items-center">
                          {/* Show field letter above field name (or EW for final score) */}
                          <div className={`${sizeClasses.letterSize} font-bold mb-0.5 ${field.isFinalScore ? 'text-green-600' : 'text-purple-500'}`}>
                            ({fieldLetter})
                          </div>
                          <div className={`${sizeClasses.nameSize} font-medium text-purple-700 mb-1 whitespace-nowrap`}>
                            {field.name}
                          </div>
                          
                          {/* For final score, show result in green box */}
                          {field.isFinalScore ? (
                            <div className={`${sizeClasses.resultPadding} rounded-lg ${sizeClasses.inputBorder} bg-gradient-to-r from-green-400 to-green-500 border-green-600 text-white ${sizeClasses.resultText} font-bold ${sizeClasses.resultWidth} text-center shadow-sm`}>
                              {displayValue !== '' ? displayValue : '?'}
                            </div>
                          ) : (
                            /* For other fields, show input */
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateFieldValue(field.id, e.target.value)}
                              onBlur={() => normalizeFieldValue(field.id)}
                              placeholder={inputMask ? placeholder : '0,00'}
                              className={`${sizeClasses.inputWidth} ${sizeClasses.inputPadding} ${sizeClasses.inputBorder} border-purple-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center font-bold text-purple-900 shadow-sm`}
                            />
                          )}
                        </div>
                      );
                    }
                    return null;
                  });
                })()
              ) : (
                // No formula - just show fields without operators
                fields.map((field, index) => {
                  const showEquals = field.isFinalScore && index > 0;
                  const nonFinalFields = fields.filter(f => !f.isFinalScore);
                  const nonFinalIndex = nonFinalFields.findIndex(f => f.id === field.id);
                  const fieldLetter = nonFinalIndex >= 0 ? String.fromCharCode(65 + nonFinalIndex) : '';
                  
                  const isFinalScoreWithResult = field.isFinalScore && calculatedResult !== null;
                  const displayValue = isFinalScoreWithResult
                    ? calculatedResult.toFixed(calculationType === 2 ? 2 : 3).replace('.', ',')
                    : field.value;
                  
                  return (
                    <React.Fragment key={field.id}>
                      {showEquals && (
                        <div className={`${sizeClasses.equalsSize} font-bold text-purple-600 px-2`}>=</div>
                      )}
                      
                      <div className="inline-flex flex-col items-center">
                        <div className={`${sizeClasses.letterSize} font-bold mb-0.5 ${field.isFinalScore ? 'text-green-600' : 'text-purple-500'}`}>
                          ({fieldLetter || 'EW'})
                        </div>
                        <div className={`${sizeClasses.nameSize} font-medium text-purple-700 mb-1 whitespace-nowrap`}>
                          {field.name}
                        </div>
                        
                        {field.isFinalScore ? (
                          <div className={`${sizeClasses.resultPadding} rounded-lg ${sizeClasses.inputBorder} bg-gradient-to-r from-green-400 to-green-500 border-green-600 text-white ${sizeClasses.resultText} font-bold ${sizeClasses.resultWidth} text-center shadow-sm`}>
                            {displayValue !== '' ? displayValue : '?'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => updateFieldValue(field.id, e.target.value)}
                            onBlur={() => normalizeFieldValue(field.id)}
                            placeholder={inputMask ? placeholder : '0,00'}
                            className={`${sizeClasses.inputWidth} ${sizeClasses.inputPadding} ${sizeClasses.inputBorder} border-purple-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center font-bold text-purple-900 shadow-sm`}
                          />
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
            
          {/* Show unit at the end if available */}
          {unit && (
            <div className="text-lg font-medium text-green-700 ml-2 flex items-center mt-2">
              {unit}
            </div>
          )}

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
      {!loadingFormula && fields.length === 0 && (
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

export default FormulaInput;
