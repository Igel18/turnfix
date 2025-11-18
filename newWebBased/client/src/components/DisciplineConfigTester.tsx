/**
 * Discipline Configuration Tester
 * Live testing of Input Mask and Formula calculations
 * 
 * NOTE: This component is now a thin wrapper around FormulaInput.
 * For new implementations, use FormulaInput directly.
 */

import React from 'react';
import { FormulaInput } from './FormulaInput';

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
  return (
    <FormulaInput
      inputMask={inputMask}
      formula={formula}
      formulaId={formulaId}
      calculationType={calculationType}
      unit={unit}
      disciplineId={disciplineId}
      showTitle={true}
    />
  );
};

export default DisciplineConfigTester;

