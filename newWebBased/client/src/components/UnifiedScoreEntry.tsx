/**
 * UnifiedScoreEntry Component
 * Wiederverwendbare Komponente für die Wertungserfassung
 * 
 * Verwendet von:
 * - TeamScoreCapture (Mannschaftswertung)
 * - GroupScoreCapture (Gruppenwertung)
 * - Kann auch für Einzelwertung verwendet werden
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import UnifiedModal from '@/components/UnifiedModal';
import { BlueInfoBox } from '@/components/InfoBoxes';

export interface ScoreField {
  id: number;
  name: string;
  sortOrder: number | null;
  group: number;
  isFinalScore: boolean;
  isStartingScore: boolean;
  enabled: boolean;
}

export interface ScoreComponentValue {
  fieldId: number;
  fieldName: string;
  value: number | null;
}

export interface UnifiedScoreEntryProps {
  // Modal Control
  isOpen: boolean;
  onClose: () => void;
  title: string;
  
  // Data
  fields: ScoreField[];
  components: ScoreComponentValue[];
  onChange: (fieldId: number, value: number | null) => void;
  
  // Calculation
  calculationType: number;
  finalScore?: number | null;
  onCalculate?: () => number;
  
  // Actions
  onSave: () => Promise<void>;
  saving?: boolean;
  
  // Additional Options
  comment?: string;
  onCommentChange?: (comment: string) => void;
  attempt?: number;
  maxAttempts?: number;
  onAttemptChange?: (attempt: number) => void;
  showAttemptSelector?: boolean;
  
  // Info Messages
  infoMessage?: string;
  noFieldsMessage?: string;
}

export const UnifiedScoreEntry: React.FC<UnifiedScoreEntryProps> = ({
  isOpen,
  onClose,
  title,
  fields,
  components,
  onChange,
  calculationType,
  finalScore,
  onCalculate,
  onSave,
  saving = false,
  comment = '',
  onCommentChange,
  attempt = 1,
  maxAttempts = 3,
  onAttemptChange,
  showAttemptSelector = false,
  infoMessage,
  noFieldsMessage
}) => {
  const { t } = useTranslation();
  const [localFinalScore, setLocalFinalScore] = useState<number | null>(null);

  useEffect(() => {
    if (onCalculate) {
      const calculated = onCalculate();
      setLocalFinalScore(calculated);
    } else if (finalScore !== undefined) {
      setLocalFinalScore(finalScore);
    }
  }, [components, finalScore, onCalculate]);

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

  const displayFinalScore = localFinalScore ?? finalScore ?? 0;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="4xl"
      showFooter={false}
    >
      <div className="space-y-6">
        {infoMessage && (
          <BlueInfoBox>
            {infoMessage}
          </BlueInfoBox>
        )}

        {/* Attempt Selector */}
        {showAttemptSelector && maxAttempts > 1 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('scoreCapture.attempt')}
            </label>
            <div className="flex gap-2">
              {Array.from({ length: maxAttempts }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onAttemptChange?.(num)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    attempt === num
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Score Input Fields */}
        {fields.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">
              {t('scoreCapture.scoreComponents')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedFields.map(field => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.name}
                    {field.isFinalScore && (
                      <span className="ml-2 text-xs text-blue-600 font-semibold">
                        ({t('scoreCapture.finalScore')})
                      </span>
                    )}
                    {field.isStartingScore && (
                      <span className="ml-2 text-xs text-green-600">
                        ({t('scoreCapture.startingScore')})
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
                    disabled={saving || field.isFinalScore}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      field.isFinalScore
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold cursor-not-allowed'
                        : 'border-gray-300 focus:ring-blue-500'
                    } ${saving && !field.isFinalScore ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder={`0.${'0'.repeat(getDecimalPlaces(calculationType))}`}
                  />
                  {field.isFinalScore && (
                    <p className="mt-1 text-xs text-gray-500">
                      {t('scoreCapture.calculatedAutomatically')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <BlueInfoBox>
            {noFieldsMessage || t('scoreCapture.noDisciplineFields')}
          </BlueInfoBox>
        )}

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('scoreCapture.comment')}
          </label>
          <textarea
            value={comment}
            onChange={(e) => onCommentChange?.(e.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder={t('scoreCapture.commentPlaceholder')}
          />
        </div>

        {/* Footer with Final Score and Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-lg font-semibold">
            {t('scoreCapture.calculatedFinal')}: {formatValue(displayFinalScore)}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || fields.length === 0}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {t('common.save')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
};

export default UnifiedScoreEntry;
