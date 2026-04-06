/**
 * ScoreTable Component
 * Point 123: Separation of Concerns
 * Point 135: Formula-based Score Input
 * 
 * Main score entry table with:
 * - Participant rows
 * - Discipline columns
 * - Inline score editing (simple or formula-based)
 * - Formula calculation display
 * - Validation
 */

import { useTranslation } from 'react-i18next'
import { GenderBadge } from '@/components/GenderBadge'
import { ScoreInputCell } from './ScoreInputCell'
import type { Participant, Discipline, DisciplineField } from '@/types/ScoreCapture.types'

interface ScoreTableProps {
  filteredParticipants: Participant[]
  displayDisciplines: Discipline[]
  disciplineFields: DisciplineField[]
  scoreMatrix: {[key: string]: string}
  existingScores: any[]
  pendingEndwerts: {[key: string]: string}
  setPendingEndwerts: (value: any) => void
  setExistingScores: (value: any) => void
  getDisciplineFields: (disciplineId: number | string) => DisciplineField[]
  getScoreValidation: (disciplineId: number | string, scoreValue: string) => { isValid: boolean; message?: string }
  getParticipantCompetitions: (participant: Participant) => string[]
  handleScoreChange: (participantId: number, disciplineId: number | string, value: string) => void
  handleFieldScoreChange: (participantId: number, fieldId: number, value: string) => void
  saveScore: (participantId: number, disciplineId: number | string) => Promise<number | null>
  saveFieldScore: (participantId: number, field: DisciplineField, overrideFieldValue?: string | number) => Promise<void>
  parseFormulaDisplay: (formula: string, fields: DisciplineField[], finalFieldName: string) => string | null
  normalizeScoreInput: (value: string, decimalPlaces: number) => string
  getScorePlaceholder: (decimalPlaces: number) => string
  setScoreMatrix: (value: any) => void
}

export const ScoreTable = ({
  filteredParticipants,
  displayDisciplines,
  disciplineFields: _disciplineFields, // intentionally unused for now
  scoreMatrix,
  getDisciplineFields,
  getScoreValidation,
  getParticipantCompetitions,
  handleScoreChange,
  saveScore,
  saveFieldScore,
  normalizeScoreInput,
  getScorePlaceholder,
}: ScoreTableProps) => {
  const { t } = useTranslation()

  if (filteredParticipants.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border text-center text-gray-500">
        {t('scoreCapture.noParticipants')}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30">
              {t('scoreCapture.table.startNumber')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('scoreCapture.table.participant')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('scoreCapture.table.club')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('scoreCapture.table.competition')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('scoreCapture.table.age')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('scoreCapture.table.gender')}
            </th>
            {displayDisciplines.map((discipline, index) => (
              <th 
                key={discipline.int_disziplinid || index} 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {discipline.var_shortname || discipline.var_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredParticipants.map(participant => {
            return (
              <tr key={participant.id} className="hover:bg-gray-50">
                {/* Start Number */}
                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                  {participant.startNumber ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {participant.startNumber}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                
                {/* Participant Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {participant.firstname} {participant.lastname}
                  </div>
                </td>
                
                {/* Club */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {participant.club}
                </td>
                
                {/* Competition */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getParticipantCompetitions(participant).length > 0 ? (
                    <div className="text-gray-700">
                      {getParticipantCompetitions(participant).join(', ')}
                    </div>
                  ) : (
                    <div className="text-red-500 text-xs">
                      No competition
                    </div>
                  )}
                </td>
                
                {/* Age */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {participant.age}
                </td>
                
                {/* Gender */}
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <GenderBadge value={participant.gender} />
                </td>
                
                {/* Discipline Score Cells */}
                {displayDisciplines.map((discipline, disciplineIndex) => {
                  const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${disciplineIndex}` || disciplineIndex
                  const enabledFields = getDisciplineFields(disciplineId)
                  const key = `${participant.id}-${disciplineId}`
                  const score = scoreMatrix[key] ?? ''
                  const validation = getScoreValidation(disciplineId, score)
                  
                  return (
                    <td key={`cell-${participant.id}-${disciplineId}`} className="px-6 py-4 whitespace-nowrap text-center">
                      <ScoreInputCell
                        participantId={participant.id}
                        discipline={discipline}
                        disciplineFields={enabledFields}
                        scoreValue={score}
                        wertungenId={(participant as any).wertungenId || participant.id}
                        onScoreChange={handleScoreChange}
                        onSave={saveScore}
                        onFieldSave={async (participantId, field, value) => {
                          // This will be called when individual fields are changed in formula mode
                          await saveFieldScore(participantId, field, value)
                        }}
                        normalizeScoreInput={normalizeScoreInput}
                        getScorePlaceholder={getScorePlaceholder}
                        validation={validation}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
