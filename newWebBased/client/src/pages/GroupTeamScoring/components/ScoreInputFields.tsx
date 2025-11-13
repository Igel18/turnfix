import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DisciplineField, ScoreComponent } from '../GroupTeamScoring.types';

interface ScoreInputFieldsProps {
  fields: DisciplineField[];
  components: ScoreComponent[];
  onChange: (fieldId: number, value: number | null) => void;
  disabled?: boolean;
  calculationType: number;
}

export const ScoreInputFields: React.FC<ScoreInputFieldsProps> = ({
  fields,
  components,
  onChange,
  disabled = false,
  calculationType
}) => {
  const { t } = useTranslation();

  const getDecimalPlaces = (calcType: number): number => {
    return calcType >= 0 && calcType <= 3 ? calcType : 2;
  };

  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '';
    const decimals = getDecimalPlaces(calculationType);
    return value.toFixed(decimals);
  };

  const parseValue = (input: string): number | null => {
    if (!input || input.trim() === '') return null;
    const parsed = parseFloat(input.replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
  };

  const handleChange = (fieldId: number, value: string) => {
    const numValue = parseValue(value);
    onChange(fieldId, numValue);
  };

  const getValue = (fieldId: number): string => {
    const component = components.find(c => c.fieldId === fieldId);
    return component?.value !== null && component?.value !== undefined
      ? component.value.toString()
      : '';
  };

  const sortedFields = [...fields].sort((a, b) => {
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    return orderA - orderB;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">
        {t('groupTeamScoring.scoreComponents')}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedFields.map(field => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.name}
              {field.isFinalScore && (
                <span className="ml-2 text-xs text-blue-600 font-semibold">
                  ({t('groupTeamScoring.finalScore')})
                </span>
              )}
              {field.isStartingScore && (
                <span className="ml-2 text-xs text-green-600">
                  ({t('groupTeamScoring.startingScore')})
                </span>
              )}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={getValue(field.id)}
              onChange={(e) => handleChange(field.id, e.target.value)}
              onBlur={(e) => {
                const val = parseValue(e.target.value);
                if (val !== null) {
                  e.target.value = formatValue(val);
                }
              }}
              disabled={disabled || field.isFinalScore}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                field.isFinalScore
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold cursor-not-allowed'
                  : 'border-gray-300 focus:ring-blue-500'
              } ${disabled && !field.isFinalScore ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder={`0.${'0'.repeat(getDecimalPlaces(calculationType))}`}
            />
            {field.isFinalScore && (
              <p className="mt-1 text-xs text-gray-500">
                {t('groupTeamScoring.finalScoreInfo')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
