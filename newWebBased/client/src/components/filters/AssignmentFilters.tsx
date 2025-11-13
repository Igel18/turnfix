/**
 * AssignmentFilters Component
 * Generic reusable filter buttons for assignment UIs (Groups, Teams, Squads, etc.)
 * 
 * Provides consistent filtering across all M:N assignment interfaces:
 * - "Hide Planned" - Exclude participants already assigned to scores
 * - "Hide Other Clubs" - Show only participants from the selected entity's club
 */

import { useTranslation } from 'react-i18next';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface AssignmentFiltersState {
  hidePlanned: boolean;
  hideOtherClubs: boolean;
}

interface AssignmentFiltersProps {
  filters: AssignmentFiltersState;
  onToggleHidePlanned: (value: boolean) => void;
  onToggleHideOtherClubs: (value: boolean) => void;
  onResetFilters: () => void;
  disabled?: boolean;
  translationPrefix?: string; // e.g., 'groups', 'teams', 'squads'
}

export function AssignmentFilters({
  filters,
  onToggleHidePlanned,
  onToggleHideOtherClubs,
  onResetFilters,
  disabled = false,
  translationPrefix = 'common'
}: AssignmentFiltersProps) {
  const { t } = useTranslation();

  const hasActiveFilters = filters.hidePlanned || filters.hideOtherClubs;

  // Try entity-specific translations first, fall back to common
  const getTranslation = (key: string) => {
    const entityKey = `${translationPrefix}.filters.${key}`;
    const commonKey = `common.filters.${key}`;
    const translated = t(entityKey);
    // If translation returns the key itself, try common
    return translated === entityKey ? t(commonKey) : translated;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Filter Icon & Label */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <FunnelIcon className="h-4 w-4" />
        <span>{t('common.filters')}:</span>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Hide Planned */}
        <button
          type="button"
          onClick={() => onToggleHidePlanned(!filters.hidePlanned)}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-all
            ${filters.hidePlanned
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {getTranslation('hidePlanned')}
        </button>

        {/* Hide Other Clubs */}
        <button
          type="button"
          onClick={() => onToggleHideOtherClubs(!filters.hideOtherClubs)}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-all
            ${filters.hideOtherClubs
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {getTranslation('hideOtherClubs')}
        </button>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          disabled={disabled}
          className="ml-auto px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <XMarkIcon className="h-4 w-4" />
          {t('common.reset')}
        </button>
      )}
    </div>
  );
}
