/**
 * Custom Hook for Formula-based Field Management
 * Handles dynamic field creation, formula evaluation, and field state
 */

import { useState, useEffect } from 'react';
import { debugLog } from '../utils/debug';
import {
  detectFormulaType,
  extractVariables,
  getMaxLetterIndex,
  calculateFormulaResult,
  getFieldLetter,
  getOperatorAfterField
} from '../utils/formulaCalculator';
import {
  normalizeScoreInput,
  parseInputMask
} from '../utils/inputMaskUtils';

export interface FormulaField {
  id: number;
  name: string;
  value: string;
  normalizedValue: string;
  isFinalScore?: boolean;
  isStartingScore?: boolean;
}

export interface UseFormulaFieldsOptions {
  formula?: string;
  formulaId?: number | null;
  disciplineId?: number;
  inputMask?: string;
  calculationType?: number;
  initialValues?: Record<number, string>; // Field ID -> value mapping
  onFieldsLoaded?: (fields: FormulaField[]) => void;
  onFieldChange?: (fieldId: number, value: string) => void;
  onCalculationComplete?: (result: number | null) => void;
}

export interface UseFormulaFieldsResult {
  fields: FormulaField[];
  calculatedResult: number | null;
  formulaError: string | null;
  loadingFormula: boolean;
  effectiveFormula: string;
  updateFieldValue: (fieldId: number, value: string) => void;
  normalizeFieldValue: (fieldId: number) => void;
  getFieldOperator: (fieldIndex: number) => string;
  getFieldLetterLabel: (fieldIndex: number) => string;
}

/**
 * Hook for managing formula-based fields
 */
export const useFormulaFields = (options: UseFormulaFieldsOptions): UseFormulaFieldsResult => {
  const {
    formula = '',
    formulaId,
    disciplineId,
    inputMask,
    initialValues: _initialValues = {},
    onFieldsLoaded,
    onFieldChange,
    onCalculationComplete
  } = options;

  const [fields, setFields] = useState<FormulaField[]>([]);
  const [calculatedResult, setCalculatedResult] = useState<number | null>(null);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [loadedFormula, setLoadedFormula] = useState<any>(null);
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

  // Get the effective formula
  const effectiveFormula = loadedFormula?.var_formel || formula;

  // Detect formula type
  const formulaType = detectFormulaType(effectiveFormula);
  const hasLowercaseVariables = formulaType === 'variable';

  // Load discipline fields for letter-based formulas
  // Also load for variable-type formulas when disciplineId is available,
  // so we get real DB field IDs for saving (not synthetic ones)
  useEffect(() => {
    // Skip variable-type formulas ONLY when there's no disciplineId
    // (in that case, the variable-based useEffect will create synthetic fields)
    if (hasLowercaseVariables && !disciplineId) {
      return;
    }

    // Helper function to create generic fields from formula
    const createGenericFieldsFromFormula = () => {
      if (!effectiveFormula || formulaType !== 'letter') {
        return [];
      }
      
      const maxLetterIndex = getMaxLetterIndex(effectiveFormula);
      debugLog(`🔧 [useFormulaFields] Creating ${maxLetterIndex + 1} generic fields from formula`);
      
      const genericFields: FormulaField[] = [];
      
      // Create fields A, B, C, ... based on formula
      for (let i = 0; i <= maxLetterIndex; i++) {
        const letter = getFieldLetter(i);
        genericFields.push({
          id: 1000 + i,
          name: `Field ${letter}`,
          value: '',
          normalizedValue: '',
          isFinalScore: false,
          isStartingScore: false
        });
      }
      
      // Add final score field
      genericFields.push({
        id: 9999,
        name: 'Endwert',
        value: '',
        normalizedValue: '',
        isFinalScore: true,
        isStartingScore: false
      });
      
      return genericFields;
    };

    // If we have a disciplineId, try to load fields from API
    if (disciplineId) {
      fetch(`/api/discipline-fields?disciplineId=${disciplineId}`)
        .then(res => res.json())
        .then(data => {
          const disciplineFields = Array.isArray(data) ? data : [];
          
          debugLog('📋 [useFormulaFields] Loaded discipline fields from API:', disciplineFields);
          
          if (disciplineFields.length > 0) {
            let loadedFields = disciplineFields.map((field: any) => {
              // Apply initial value if available
              const initialValue = _initialValues[field.id];
              const valueToUse = initialValue !== undefined ? initialValue : '';
              
              return {
                id: field.id,
                name: field.name,
                value: valueToUse,
                normalizedValue: valueToUse,
                isFinalScore: field.isFinalScore,
                isStartingScore: field.isStartingScore
              };
            });
            
            // Check if formula requires more fields than we have
            if (effectiveFormula && formulaType === 'letter') {
              const maxLetterIndex = getMaxLetterIndex(effectiveFormula);
              const nonFinalFields = loadedFields.filter(f => !f.isFinalScore);
              const missingFieldsCount = (maxLetterIndex + 1) - nonFinalFields.length;
              
              debugLog(`🔍 [useFormulaFields] Formula requires ${maxLetterIndex + 1} fields, we have ${nonFinalFields.length} non-final fields`);
              
              if (missingFieldsCount > 0) {
                debugLog(`⚠️ [useFormulaFields] Creating ${missingFieldsCount} missing fields via API...`);
                
                // Auto-create missing fields in the database so they get real IDs
                const createPromises: Promise<any>[] = [];
                for (let i = nonFinalFields.length; i <= maxLetterIndex; i++) {
                  const letter = getFieldLetter(i);
                  const existingEndwertField = loadedFields.find(f => f.isFinalScore);
                  const maxSortOrder = Math.max(
                    ...loadedFields.filter(f => !f.isFinalScore).map(f => (f as any).sortOrder ?? 0),
                    0
                  );
                  createPromises.push(
                    fetch('/api/discipline-fields', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        disciplineId,
                        name: `Field ${letter}`,
                        sortOrder: maxSortOrder + i - nonFinalFields.length + 1,
                        isFinalScore: false,
                        isStartingScore: false,
                        group: existingEndwertField ? (existingEndwertField as any).group ?? 1 : 1,
                        enabled: true,
                      }),
                    })
                      .then(r => r.json())
                      .then(created => {
                        const newId = created?.id ?? created?.int_disziplinen_felderid;
                        debugLog(`✅ [useFormulaFields] Auto-created field "${letter}" with DB ID ${newId}`);
                        return {
                          id: newId ?? 1000 + i, // fallback to synthetic if API fails
                          name: `Field ${letter}`,
                          value: '',
                          normalizedValue: '',
                          isFinalScore: false,
                          isStartingScore: false,
                        };
                      })
                      .catch(err => {
                        console.error(`[useFormulaFields] Failed to auto-create field ${letter}:`, err);
                        return {
                          id: 1000 + i,
                          name: `Field ${letter}`,
                          value: '',
                          normalizedValue: '',
                          isFinalScore: false,
                          isStartingScore: false,
                        };
                      })
                  );
                }
                
                // Wait for all field creations, then insert into loadedFields
                Promise.all(createPromises).then(createdFields => {
                  const finalFields = [...loadedFields];
                  const endwertCount = finalFields.filter(f => f.isFinalScore).length;
                  for (const cf of createdFields) {
                    finalFields.splice(finalFields.length - endwertCount, 0, cf);
                  }
                  debugLog('✅ [useFormulaFields] Fields after auto-creation:', finalFields);
                  setFields(finalFields);
                  if (onFieldsLoaded) {
                    onFieldsLoaded(finalFields);
                  }
                });
                
                // Don't set fields yet — wait for Promise.all above
                return;
              }
            }
            
            debugLog('✅ [useFormulaFields] Mapped fields:', loadedFields);
            
            setFields(loadedFields);
            if (onFieldsLoaded) {
              onFieldsLoaded(loadedFields);
            }
          } else {
            // No fields from API - use generic fields
            debugLog('⚠️ [useFormulaFields] No discipline fields found in API response - using generic fields');
            const genericFields = createGenericFieldsFromFormula();
            if (genericFields.length > 0) {
              debugLog('✅ [useFormulaFields] Created generic fields:', genericFields);
              setFields(genericFields);
              if (onFieldsLoaded) {
                onFieldsLoaded(genericFields);
              }
            }
          }
        })
        .catch(error => {
          console.error('[useFormulaFields] Error loading discipline fields:', error);
          // On error - use generic fields as fallback
          const genericFields = createGenericFieldsFromFormula();
          if (genericFields.length > 0) {
            debugLog('✅ [useFormulaFields] Created generic fields after API error:', genericFields);
            setFields(genericFields);
            if (onFieldsLoaded) {
              onFieldsLoaded(genericFields);
            }
          }
        });
    } else {
      // No disciplineId - create generic fields from formula
      const genericFields = createGenericFieldsFromFormula();
      if (genericFields.length > 0) {
        debugLog('✅ [useFormulaFields] Created generic fields (no disciplineId):', genericFields);
        setFields(genericFields);
        if (onFieldsLoaded) {
          onFieldsLoaded(genericFields);
        }
      }
    }
  }, [disciplineId, hasLowercaseVariables, effectiveFormula, formulaType, onFieldsLoaded, _initialValues]);

  // Parse variable-based formulas (only when no disciplineId — otherwise DB fields are used)
  useEffect(() => {
    if (!effectiveFormula || formulaType !== 'variable') {
      // Don't clear fields if formulaType is 'none' and we have disciplineId
      // (fields will be loaded from discipline-fields endpoint)
      if (formulaType === 'none' && !disciplineId) {
        setFields([]);
      }
      return;
    }

    // When disciplineId is available, the first useEffect loads real DB fields.
    // Don't overwrite them with synthetic fields here.
    if (disciplineId) {
      return;
    }

    const variables = extractVariables(effectiveFormula, 'variable');
    debugLog('🔍 [useFormulaFields] Variables found in formula:', variables);

    // Create input fields for each used variable
    const variableFields = variables.map((variable, index) => ({
      id: index + 1,
      name: variable.toUpperCase(),
      value: '',
      normalizedValue: '',
      isFinalScore: false,
      isStartingScore: false
    }));

    // Add final score field
    variableFields.push({
      id: variableFields.length + 1,
      name: 'Endwert',
      value: '',
      normalizedValue: '',
      isFinalScore: true,
      isStartingScore: false
    });

    setFields(variableFields);
    if (onFieldsLoaded) {
      onFieldsLoaded(variableFields);
    }
  }, [effectiveFormula, formulaType, onFieldsLoaded]);

  // Calculate formula result
  useEffect(() => {
    if (!effectiveFormula || fields.length === 0 || formulaType === 'none') {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    const nonFinalFields = fields.filter(f => !f.isFinalScore);
    const allFieldsHaveValues = nonFinalFields.every(f => f.value !== '');
    
    if (!allFieldsHaveValues) {
      setCalculatedResult(null);
      setFormulaError(null);
      return;
    }

    // Get field values
    const fieldValues = nonFinalFields.map(f => f.value);
    
    // Calculate
    const { result, error } = calculateFormulaResult(
      effectiveFormula,
      fieldValues,
      formulaType as 'letter' | 'variable'
    );
    
    setCalculatedResult(result);
    setFormulaError(error);
    
    if (onCalculationComplete) {
      onCalculationComplete(result);
    }
  }, [effectiveFormula, fields, formulaType, onCalculationComplete]);

  // Update field value
  const updateFieldValue = (fieldId: number, value: string) => {
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, value } : f
    ));
    
    // Notify parent component of field change
    if (onFieldChange) {
      onFieldChange(fieldId, value);
    }
  };

  // Normalize field value on blur
  const normalizeFieldValue = (fieldId: number) => {
    setFields(prev => prev.map(f => {
      if (f.id === fieldId && f.value) {
        try {
          let normalized = f.value;
          
          if (inputMask) {
            const maskInfo = parseInputMask(inputMask);
            const alreadyFormatted = maskInfo.type === 'time' && /^\d{2}:\d{2}\.\d{2}$/.test(f.value);
            
            if (!alreadyFormatted) {
              let valueToNormalize = f.value;
              if (maskInfo.type === 'decimal' && valueToNormalize.includes(',')) {
                valueToNormalize = valueToNormalize.replace(',', '.');
              }
              normalized = normalizeScoreInput(valueToNormalize, inputMask);
            }
          } else {
            const numValue = parseFloat(f.value.replace(',', '.'));
            if (!isNaN(numValue)) {
              normalized = numValue.toFixed(2).replace('.', ',');
            }
          }
          
          return { ...f, value: normalized, normalizedValue: normalized };
        } catch (error) {
          console.error('[useFormulaFields] Normalization error:', error);
          return { ...f, normalizedValue: 'Error' };
        }
      }
      return f;
    }));
  };

  // Get operator after field
  const getFieldOperator = (fieldIndex: number): string => {
    return getOperatorAfterField(effectiveFormula, fieldIndex);
  };

  // Get field letter label
  const getFieldLetterLabel = (fieldIndex: number): string => {
    return getFieldLetter(fieldIndex);
  };

  return {
    fields,
    calculatedResult,
    formulaError,
    loadingFormula,
    effectiveFormula,
    updateFieldValue,
    normalizeFieldValue,
    getFieldOperator,
    getFieldLetterLabel
  };
};
