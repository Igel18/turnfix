/**
 * ResultsTable Component
 * Point 123: Separation of Concerns
 * 
 * Main results display component with two views:
 * - Single Competition View: Shows one competition's ranking
 * - Grouped View: Shows all competitions with separate rankings
 */

import { useTranslation } from 'react-i18next'
import { TrophyIcon } from '@heroicons/react/24/outline'
import { JuryResultsDisplay } from './JuryResultsDisplay'
import { getUnifiedResultsHeaderLabels } from '@/utils/headerLabels'
import type { Participant, CompetitionGroup } from '../Results.types'

interface ResultsTableProps {
  isLoading: boolean
  selectedCompetition: string | null
  filteredRanking: Participant[]
  filteredCompetitionGroups: CompetitionGroup[]
  disciplines: string[]
  disciplineFormulas: Record<string, string>
  showDisciplineScores: boolean
  formatScore: (score: number) => string
  getMedalColor: (rank: number) => string
  getMedalEmoji: (rank: number) => string | number
}

export const ResultsTable = ({
  isLoading,
  selectedCompetition,
  filteredRanking,
  filteredCompetitionGroups,
  disciplines,
  disciplineFormulas,
  showDisciplineScores,
  formatScore,
  getMedalColor,
  getMedalEmoji
}: ResultsTableProps) => {
  const { t } = useTranslation()
  const labels = getUnifiedResultsHeaderLabels(t)

  const getDisciplineFormula = (
    participants: Participant[],
    discipline: string,
    preferredFormula?: string | null
  ): string | null => {
    if (preferredFormula && preferredFormula.trim()) {
      return preferredFormula.trim()
    }

    for (const participant of participants) {
      const formula = participant.formulas?.[discipline]
      if (formula && formula.trim()) {
        return formula.trim()
      }
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border mx-6">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('results.loading')}</p>
        </div>
      </div>
    )
  }

  // Single Competition View
  if (selectedCompetition) {
    if (filteredRanking.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border mx-6">
          <div className="p-6 text-center">
            <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('results.noResultsForCompetition')}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border mx-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {labels.rank}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {labels.startNumber}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {labels.name}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {labels.club}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {labels.age}
                </th>
                {showDisciplineScores && disciplines.map(discipline => (
                  <th key={discipline} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">{discipline}</span>
                      {getDisciplineFormula(filteredRanking, discipline, disciplineFormulas[discipline]) && (
                        <span className="text-[10px] text-gray-500 font-normal normal-case mt-0.5">
                          {getDisciplineFormula(filteredRanking, discipline, disciplineFormulas[discipline])}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-normal">{labels.device}</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-l-2 border-blue-200">
                  <div className="flex flex-col">
                    <span className="font-bold text-blue-700">{labels.total}</span>
                    <span className="text-[10px] text-blue-500 font-normal">{labels.totalScore}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRanking.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getMedalColor(participant.rank)}`}>
                      {getMedalEmoji(participant.rank)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {participant.startNumber ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {participant.startNumber}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {participant.name}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                    {participant.club}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-gray-600">
                    {participant.age}
                  </td>
                  {showDisciplineScores && disciplines.map(discipline => {
                    const juryResults = participant.juryResults?.[discipline] || []
                    const hasJuryResults = juryResults.length > 0
                    const disciplineFormula = getDisciplineFormula(
                      filteredRanking,
                      discipline,
                      disciplineFormulas[discipline]
                    )
                    
                    return (
                      <td key={discipline} className="px-3 py-3 text-center border-l border-gray-100 bg-gray-50">
                        <div className="flex flex-col items-center">
                          {/* Jury Results Display or Simple Score */}
                          {participant.scores[discipline] ? (
                            hasJuryResults ? (
                              <JuryResultsDisplay 
                                juryResults={juryResults}
                                finalScore={participant.scores[discipline]}
                                formula={disciplineFormula || undefined}
                              />
                            ) : (
                              <div className="flex flex-col items-center py-2">
                                <span className="text-2xl font-bold text-gray-900">
                                  {formatScore(participant.scores[discipline])}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">Pkt.</span>
                              </div>
                            )
                          ) : (
                            <div className="py-4">
                              <span className="text-xl font-medium text-gray-400">-</span>
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-4 py-4 whitespace-nowrap text-center bg-blue-50 border-l-2 border-blue-200">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold text-blue-900">
                        {formatScore(participant.totalScore)}
                      </span>
                      <span className="text-xs text-blue-600 mt-1">
                        Total
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Grouped by Competition View
  if (filteredCompetitionGroups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border mx-6">
        <div className="p-6 text-center">
          <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t('results.noResultsForEvent')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border mx-6">
      <div className="space-y-8 p-6">
        {filteredCompetitionGroups.map((group) => (
          <div key={group.competitionId} className="border rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h3 className="text-xl font-bold text-white">{group.competitionName}</h3>
              <p className="text-blue-100 text-sm">{t('results.participantsCount', { count: group.participants.length })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {labels.rank}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {labels.startNumber}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {labels.name}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {labels.club}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {labels.age}
                    </th>
                    {showDisciplineScores && group.disciplineInfo.map(disciplineInfo => (
                      <th key={disciplineInfo.name} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 mb-1">
                            <img 
                              src={disciplineInfo.icon} 
                              alt={disciplineInfo.name}
                              className="w-4 h-4"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                            <span className="font-semibold">{disciplineInfo.name}</span>
                          </div>
                          {getDisciplineFormula(
                            group.participants,
                            disciplineInfo.name,
                            disciplineInfo.fullData?.var_formel || disciplineInfo.fullData?.formula
                          ) && (
                            <span className="text-[10px] text-gray-500 font-normal normal-case mb-1">
                              {getDisciplineFormula(
                                group.participants,
                                disciplineInfo.name,
                                disciplineInfo.fullData?.var_formel || disciplineInfo.fullData?.formula
                              )}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 font-normal">{labels.device}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-l-2 border-blue-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700">{labels.total}</span>
                        <span className="text-[10px] text-blue-500 font-normal">{labels.totalScore}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getMedalColor(participant.rank)}`}>
                          {getMedalEmoji(participant.rank)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {participant.startNumber ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {participant.startNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {participant.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                        {participant.club}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-gray-600">
                        {participant.age}
                      </td>
                      {showDisciplineScores && group.disciplines.map(discipline => {
                        const juryResults = participant.juryResults?.[discipline] || []
                        const hasJuryResults = juryResults.length > 0
                        const disciplineInfo = group.disciplineInfo.find(info => info.name === discipline)
                        const disciplineFormula = getDisciplineFormula(
                          group.participants,
                          discipline,
                          disciplineInfo?.fullData?.var_formel || disciplineInfo?.fullData?.formula
                        )
                        
                        return (
                          <td key={discipline} className="px-3 py-3 text-center border-l border-gray-100 bg-gray-50">
                            <div className="flex flex-col items-center">
                              {/* Jury Results Display or Simple Score */}
                              {participant.scores[discipline] ? (
                                hasJuryResults ? (
                                  <JuryResultsDisplay 
                                    juryResults={juryResults}
                                    finalScore={participant.scores[discipline]}
                                    formula={disciplineFormula || undefined}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center py-2">
                                    <span className="text-2xl font-bold text-gray-900">
                                      {formatScore(participant.scores[discipline])}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">Pkt.</span>
                                  </div>
                                )
                              ) : (
                                <div className="py-4">
                                  <span className="text-xl font-medium text-gray-400">-</span>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-4 py-4 whitespace-nowrap text-center bg-blue-50 border-l-2 border-blue-200">
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-bold text-blue-900">
                            {formatScore(participant.totalScore)}
                          </span>
                          <span className="text-xs text-blue-600 mt-1">
                            Total
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
