/**
 * ResultsFilters Component
 * Point 123: Separation of Concerns
 * 
 * Horizontal filter layout for results page with 4 columns:
 * - Search input (participant names, clubs, start numbers)
 * - Competition selection dropdown
 * - Gender filter dropdown
 * - Reset button (disabled when no filters active)
 * 
 * Layout: grid-cols-1 md:grid-cols-4 (responsive - stacks on mobile)
 * Reset button automatically disabled when no active filters
 */

import { useTranslation } from 'react-i18next'

interface Competition {
  id: number
  name: string
  number?: string
}

interface ResultsFiltersProps {
  competitions: Competition[]
  selectedCompetition: string | null
  onCompetitionChange: (competitionId: string | null) => void
  genderFilter: string
  onGenderChange: (gender: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  onReset?: () => void // Optional reset callback
}

export const ResultsFilters = ({
  competitions,
  selectedCompetition,
  onCompetitionChange,
  genderFilter,
  onGenderChange,
  searchTerm,
  onSearchChange,
  onReset
}: ResultsFiltersProps) => {
  const { t } = useTranslation()

  const hasActiveFilters = selectedCompetition || genderFilter || searchTerm

  const handleReset = () => {
    onCompetitionChange(null)
    onGenderChange('')
    onSearchChange('')
    if (onReset) {
      onReset()
    }
  }

  return (
    <div className="mb-6">
      {/* Horizontal Filter Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('results.filters.search')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('results.filters.searchPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Competition Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('results.filters.competition')}
          </label>
          <select
            value={selectedCompetition || ''}
            onChange={(e) => onCompetitionChange(e.target.value || null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('results.filters.allCompetitions')}</option>
            {competitions.map(comp => (
              <option key={comp.id} value={comp.id}>
                {comp.number ? `${comp.number} - ${comp.name}` : comp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Gender Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('results.filters.gender')}
          </label>
          <select
            value={genderFilter}
            onChange={(e) => onGenderChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('results.filters.allGenders')}</option>
            <option value="männlich">{t('common.gender.male')}</option>
            <option value="weiblich">{t('common.gender.female')}</option>
          </select>
        </div>

        {/* Reset Button - Aligned with inputs */}
        <div className="flex items-end">
          <button
            onClick={handleReset}
            disabled={!hasActiveFilters}
            className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              hasActiveFilters
                ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                : 'text-gray-400 bg-gray-50 cursor-not-allowed'
            }`}
          >
            {t('common.resetFilters')}
          </button>
        </div>
      </div>
    </div>
  )
}
