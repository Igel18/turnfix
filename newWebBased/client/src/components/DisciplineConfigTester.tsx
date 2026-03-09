/**
 * Discipline Configuration Tester
 * Live testing of Input Mask and Formula calculations
 * 
 * Automatically detects formula type and uses the appropriate component:
 * - Built-in formulas (x, y, z): BuiltInFormulaInput
 * - Linked formulas (A, B, C): FormulaInput
 */

import React, { useEffect, useState } from 'react';
import { FormulaInput } from './FormulaInput';
import { BuiltInFormulaInput, detectFormulaType, applyBuiltInFormula, resolveScoringInputMode } from '@turnfix/shared';
import { normalizeValueForCalculation } from '@/utils/formulaCalculator';

const linkedFormulaCache = new Map<number, string>();

interface DisciplineConfigTesterProps {
  inputMask: string;
  formula: string;
  formulaId?: number;
  calculationType: number;
  unit: string;
  disciplineId?: number;
}

const DisciplineConfigTester: React.FC<DisciplineConfigTesterProps> = ({
  inputMask,
  formula,
  formulaId,
  calculationType,
  unit,
  disciplineId
}) => {
  const [testValue, setTestValue] = useState('');
  const [resolvedFormula, setResolvedFormula] = useState(formula || '');

  useEffect(() => {
    let isActive = true;

    const loadFormula = async () => {
      if (!formulaId) {
        if (isActive) {
          setResolvedFormula(formula || '');
        }
        return;
      }

      if (linkedFormulaCache.has(formulaId)) {
        if (isActive) {
          setResolvedFormula(linkedFormulaCache.get(formulaId) || formula || '');
        }
        return;
      }

      try {
        const response = await fetch(`/api/formulas/${formulaId}`);
        const formulaData = await response.json();
        const linkedFormula = formulaData?.var_formel || formula || '';
        linkedFormulaCache.set(formulaId, linkedFormula);
        if (isActive) {
          setResolvedFormula(linkedFormula);
        }
      } catch {
        if (isActive) {
          setResolvedFormula(formula || '');
        }
      }
    };

    loadFormula();

    return () => {
      isActive = false;
    };
  }, [formula, formulaId]);

  // Determine which component to use based on formula type
  const mode = resolveScoringInputMode({ formula: resolvedFormula, formulaId });
  const isBuiltInFormula = mode === 'builtInFormula' && detectFormulaType(resolvedFormula) === 'variable';

  if (isBuiltInFormula) {
    const normalizedValue = normalizeValueForCalculation(testValue);
    const numericValue = parseFloat(normalizedValue) || 0;
    const calculatedResult = testValue ? applyBuiltInFormula(resolvedFormula, numericValue) : null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium text-purple-900 mb-4">Formula Calculation Test</h3>
        <BuiltInFormulaInput
          formula={resolvedFormula}
          variable="x"
          value={testValue}
          calculatedResult={calculatedResult}
          decimalPlaces={calculationType}
          unit={unit}
          placeholder={`Test ${formula}`}
          onChange={setTestValue}
          validation={{ isValid: true }}
          variant="jury"
          showFormulaDisplay={true}
        />
      </div>
    );
  }

  // Use FormulaInput for linked formulas (A, B, C fields)
  return (
    <FormulaInput
      inputMask={inputMask}
      formula={resolvedFormula}
      formulaId={formulaId}
      calculationType={calculationType}
      unit={unit}
      disciplineId={disciplineId}
      showTitle={true}
    />
  );
};

export default DisciplineConfigTester;

