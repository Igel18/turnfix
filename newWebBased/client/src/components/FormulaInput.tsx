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

export interface FormulaInputProps {
  inputMask?: string;
  formula?: string;
  formulaId?: number | null;
  calculationType?: number;
  unit?: string;
  disciplineId?: number;
  showTitle?: boolean;
  className?: string;
  onFieldsLoaded?: (fields: FormulaField[]) => void;
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
  onFieldsLoaded,
  onCalculationComplete
}) => {
  const { t } = useTranslation();

  const {
    fields,
    calculatedResult,
    formulaError,
    loadingFormula,
    updateFieldValue,
    normalizeFieldValue,
    getFieldOperator,
    getFieldLetterLabel
  } = useFormulaFields({
    formula,
    formulaId,
    disciplineId,
    inputMask,
    calculationType,
    onFieldsLoaded,
    onCalculationComplete
  });

  const placeholder = inputMask ? getPlaceholder(inputMask) : '';

  return (
    <div className={`space-y-4 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-lg p-6 border-2 border-purple-300 ${className}`}>
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
          <div className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl border-2 border-purple-300 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {fields.map((field, index) => {
                const showEquals = field.isFinalScore && index > 0;
                
                // Get field letter (A, B, C, etc.) for non-final fields
                const nonFinalFields = fields.filter(f => !f.isFinalScore);
                const nonFinalIndex = nonFinalFields.findIndex(f => f.id === field.id);
                const fieldLetter = nonFinalIndex >= 0 ? getFieldLetterLabel(nonFinalIndex) : '';
                
                // Get operator after this field
                const operatorAfter = nonFinalIndex >= 0 && nonFinalIndex < nonFinalFields.length - 1
                  ? getFieldOperator(nonFinalIndex) 
                  : '';
                
                // For final score, show calculated result
                const isFinalScoreWithResult = field.isFinalScore && calculatedResult !== null;
                const displayValue = isFinalScoreWithResult
                  ? calculatedResult.toFixed(calculationType === 2 ? 2 : 3).replace('.', ',')
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
                          onChange={(e) => updateFieldValue(field.id, e.target.value)}
                          onBlur={() => normalizeFieldValue(field.id)}
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
              <div className="text-lg font-medium text-green-700 ml-2 flex items-center mt-2">
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
