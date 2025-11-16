/**
 * DisciplineSelector Component
 * Generic discipline selection with visual grid layout
 * 
 * Based on ScoreCapture DisciplineFilters pattern
 * Used in TeamScoreCapture and other scoring interfaces
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

export interface DisciplineSelectorOption {
  id: number | string;
  name: string;
  short_name?: string;
  icon?: string;
}

interface DisciplineSelectorProps {
  disciplines: DisciplineSelectorOption[];
  selectedDisciplineId: number | string | null;
  onDisciplineChange: (disciplineId: number | string | null) => void;
  disabled?: boolean;
  label?: string;
  showAsGrid?: boolean;
  className?: string;
}

export const DisciplineSelector: React.FC<DisciplineSelectorProps> = ({
  disciplines,
  selectedDisciplineId,
  onDisciplineChange,
  disabled = false,
  label,
  showAsGrid = true,
  className = ""
}) => {
  const { t } = useTranslation();

  const getIconForDiscipline = (name: string): string => {
    const disciplineName = name.toLowerCase();
    
    if (disciplineName.includes('boden')) return '⬛';
    if (disciplineName.includes('sprung')) return '⚡';
    if (disciplineName.includes('barren')) return '‖';
    if (disciplineName.includes('reck')) return '🏗️';
    if (disciplineName.includes('ringe')) return '⚭';
    if (disciplineName.includes('pauschenpferd') || disciplineName.includes('pferd')) return '🏇';
    if (disciplineName.includes('stufenbarren')) return '⋈';
    if (disciplineName.includes('schwebebalken') || disciplineName.includes('balken')) return '━';
    if (disciplineName.includes('minitrampolin')) return '🤸';
    if (disciplineName.includes('gerätebahn')) return '🏃';
    
    return '🏅'; // Default sport icon
  };

  if (showAsGrid) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {label} *
          </label>
        )}
        
        <div className="grid grid-cols-3 gap-3">
          {/* Alter Button (Age category selector placeholder) */}
          <button
            type="button"
            disabled
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400"
          >
            <span className="text-2xl mb-2">👶</span>
            <span className="text-xs font-medium">Alter</span>
          </button>

          {/* Discipline Grid */}
          {disciplines.map((discipline) => (
            <button
              key={discipline.id}
              type="button"
              disabled={disabled}
              onClick={() => onDisciplineChange(
                selectedDisciplineId === discipline.id ? null : discipline.id
              )}
              className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                selectedDisciplineId === discipline.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'}`}
            >
              <span className="text-2xl mb-2">
                {discipline.icon || getIconForDiscipline(discipline.name)}
              </span>
              <span className="text-xs font-medium text-center leading-tight">
                {discipline.short_name || discipline.name}
              </span>
            </button>
          ))}
        </div>

        {disciplines.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              {selectedDisciplineId 
                ? `${disciplines.length} ${t('common.disciplines')} verfügbar zum Werten`
                : t('scoreCapture.chooseDiscipline', 'Klicken Sie auf das Gerät, für das Sie Wertungen erfassen möchten')
              }
            </p>
          </div>
        )}

        {disciplines.length === 0 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-sm text-orange-800">
              ⚠️ {t('scoreCapture.noDisciplinesAvailable', 'Keine Disziplinen verfügbar')}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Fallback: Simple dropdown selector
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} *
        </label>
      )}
      <select
        value={selectedDisciplineId || ''}
        onChange={(e) => {
          const value = e.target.value;
          onDisciplineChange(value ? (isNaN(Number(value)) ? value : Number(value)) : null);
        }}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                 focus:outline-none focus:ring-2 focus:ring-blue-500
                 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">{t('scoreCapture.chooseDiscipline', 'Disziplin auswählen')}</option>
        {disciplines.map((discipline) => (
          <option key={discipline.id} value={discipline.id}>
            {discipline.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DisciplineSelector;