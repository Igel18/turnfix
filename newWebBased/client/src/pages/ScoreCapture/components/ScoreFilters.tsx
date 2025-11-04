/**
 * ScoreFilters Component
 * Point 123: Separation of Concerns
 * 
 * Filter controls for ScoreCapture page:
 * - Squad selection dropdown
 * - Discipline selection dropdown
 * - Search input for participants
 * - Show Jury Scores toggle
 */

import { useTranslation } from 'react-i18next'
import type { Squad, Discipline } from '@/types/ScoreCapture.types'

interface ScoreFiltersProps {
  // Squad filter
  squads: Squad[]
  activeSquad: string
  onSquadChange: (squadName: string) => void
  
  // Discipline filter
  disciplines: Discipline[]
  activeDiscipline: number | string | ''
  onDisciplineChange: (disciplineValue: number | string) => void
  
  // Search
  searchTerm: string
  onSearchChange: (term: string) => void
  
  // Jury scores toggle
  showJuryScores: boolean
  onShowJuryScoresChange: (checked: boolean) => void
}

export const ScoreFilters = ({
  squads,
  activeSquad,
  onSquadChange,
  disciplines,
  activeDiscipline,
  onDisciplineChange,
  searchTerm,
  onSearchChange,
  showJuryScores,
  onShowJuryScoresChange
}: ScoreFiltersProps) => {
  const { t } = useTranslation()

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Squad Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('scoreCapture.filters.squad')}
          </label>
          <select
            value={activeSquad}
            onChange={(e) => onSquadChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('scoreCapture.filters.allSquads')}</option>
            {squads.map((squad) => (
              <option key={squad.name} value={squad.name}>
                {squad.name} ({squad.participant_count})
              </option>
            ))}
          </select>
        </div>

        {/* Discipline Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('scoreCapture.filters.discipline')}
          </label>
          <select
            value={activeDiscipline}
            onChange={(e) => {
              const value = e.target.value
              // Try to parse as number, otherwise keep as string
              const disciplineValue = !isNaN(Number(value)) ? Number(value) : value
              onDisciplineChange(disciplineValue)
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!activeSquad}
          >
            <option value="">{t('scoreCapture.filters.allDisciplines')}</option>
            {disciplines.map((discipline) => (
              <option 
                key={discipline.int_disziplinid || discipline.var_name} 
                value={discipline.int_disziplinid || discipline.var_name}
              >
                {discipline.var_name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('scoreCapture.filters.search')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('scoreCapture.filters.searchPlaceholder')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Show Jury Scores Toggle */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <input
          type="checkbox"
          id="showJuryScores"
          checked={showJuryScores}
          onChange={(e) => onShowJuryScoresChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="showJuryScores" className="text-sm font-medium text-gray-700">
          {t('scoreCapture.filters.showJuryScores')}
        </label>
      </div>
    </div>
  )
}
