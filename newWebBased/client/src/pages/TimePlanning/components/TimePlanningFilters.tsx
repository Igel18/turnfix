import { useTranslation } from 'react-i18next'

const RESET_BUTTON_ACTIVE_CLASS = 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
const RESET_BUTTON_DISABLED_CLASS = 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'

interface FilterOption {
  value: string
  label: string
}

interface TimePlanningFiltersProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  sessionFilter: string
  onSessionFilterChange: (value: string) => void
  laneFilter: string
  onLaneFilterChange: (value: string) => void
  squadFilter: string
  onSquadFilterChange: (value: string) => void
  competitionFilter: string
  onCompetitionFilterChange: (value: string) => void
  sessionOptions: FilterOption[]
  laneOptions: FilterOption[]
  squadOptions: FilterOption[]
  competitionOptions: FilterOption[]
  onResetFilters: () => void
}

export function TimePlanningFilters({
  searchTerm,
  onSearchTermChange,
  sessionFilter,
  onSessionFilterChange,
  laneFilter,
  onLaneFilterChange,
  squadFilter,
  onSquadFilterChange,
  competitionFilter,
  onCompetitionFilterChange,
  sessionOptions,
  laneOptions,
  squadOptions,
  competitionOptions,
  onResetFilters,
}: TimePlanningFiltersProps) {
  const { t } = useTranslation()

  const hasActiveFilters =
    searchTerm !== '' ||
    sessionFilter !== '' ||
    laneFilter !== '' ||
    squadFilter !== '' ||
    competitionFilter !== ''

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('common.search')}
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={t('timePlanning.filters.searchPlaceholder')}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('timePlanning.session')}
        </label>
        <select
          value={sessionFilter}
          onChange={(event) => onSessionFilterChange(event.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('common.all')} {t('timePlanning.session')}</option>
          {sessionOptions.map(option => (
            <option key={`session-${option.value}`} value={option.value}>
              {t('timePlanning.session')} {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('timePlanning.laneLabel')}
        </label>
        <select
          value={laneFilter}
          onChange={(event) => onLaneFilterChange(event.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('common.all')} {t('timePlanning.laneLabel')}</option>
          {laneOptions.map(option => (
            <option key={`lane-${option.value}`} value={option.value}>
              {t('timePlanning.laneLabel')} {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('timePlanning.squads')}
        </label>
        <select
          value={squadFilter}
          onChange={(event) => onSquadFilterChange(event.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('common.all')} {t('timePlanning.squads')}</option>
          {squadOptions.map(option => (
            <option key={`squad-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('timePlanning.filters.competition')}
        </label>
        <select
          value={competitionFilter}
          onChange={(event) => onCompetitionFilterChange(event.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('common.all')} {t('timePlanning.filters.competition')}</option>
          {competitionOptions.map(option => (
            <option key={`competition-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <button
          onClick={onResetFilters}
          disabled={!hasActiveFilters}
          className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            hasActiveFilters
              ? RESET_BUTTON_ACTIVE_CLASS
              : RESET_BUTTON_DISABLED_CLASS
          }`}
        >
          {t('common.resetFilters')}
        </button>
      </div>
    </div>
  )
}