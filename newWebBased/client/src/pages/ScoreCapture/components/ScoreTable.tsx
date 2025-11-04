/**
 * ScoreTable Component
 * Point 123: Separation of Concerns
 * 
 * Main score entry table with:
 * - Participant rows
 * - Discipline columns
 * - Inline score editing
 * - Formula calculation display
 * - Validation
 */

import { useTranslation } from 'react-i18next'
import { GenderBadge } from '@/components/GenderBadge'
import type { Participant, Discipline, DisciplineField } from '@/types/ScoreCapture.types'

interface ScoreTableProps {
  filteredParticipants: Participant[]
  displayDisciplines: Discipline[]
  disciplineFields: DisciplineField[]
  scoreMatrix: {[key: string]: string}
  showJuryScores: boolean
  existingScores: any[]
  pendingEndwerts: {[key: string]: string}
  setPendingEndwerts: (value: any) => void
  setExistingScores: (value: any) => void
  getDisciplineFields: (disciplineId: number | string) => DisciplineField[]
  getScoreValidation: (disciplineId: number | string, scoreValue: string) => { isValid: boolean; message?: string }
  getParticipantCompetitions: (participant: Participant) => string[]
  handleScoreChange: (participantId: number, disciplineId: number | string, value: string) => void
  handleFieldScoreChange: (participantId: number, fieldId: number, value: string) => void
  saveScore: (participantId: number, disciplineId: number | string) => Promise<void>
  saveFieldScore: (participantId: number, field: DisciplineField) => Promise<void>
  parseFormulaDisplay: (formula: string, fields: DisciplineField[], finalFieldName: string) => string | null
  normalizeScoreInput: (value: string, decimalPlaces: number) => string
  getScorePlaceholder: (decimalPlaces: number) => string
  setScoreMatrix: (value: any) => void
  disciplines: Discipline[]
  competitionId?: string
}

export const ScoreTable = ({
  filteredParticipants,
  displayDisciplines,
  // disciplineFields, // TODO: Unused - wird für Multi-Field Mode benötigt
  scoreMatrix,
  // showJuryScores, // TODO: Unused - wird für Jury-Scores benötigt
  // existingScores, // TODO: Unused - wird für Multi-Field Mode benötigt
  // pendingEndwerts, // TODO: Unused - wird für Multi-Field Mode benötigt
  // setPendingEndwerts, // TODO: Unused - wird für Multi-Field Mode benötigt
  // setExistingScores, // TODO: Unused - wird für Multi-Field Mode benötigt
  getDisciplineFields,
  getScoreValidation,
  getParticipantCompetitions,
  handleScoreChange,
  // handleFieldScoreChange, // TODO: Unused - wird für Multi-Field Mode benötigt
  saveScore,
  // saveFieldScore, // TODO: Unused - wird für Multi-Field Mode benötigt
  // parseFormulaDisplay, // TODO: Unused - wird für Multi-Field Mode benötigt
  normalizeScoreInput,
  getScorePlaceholder,
  // setScoreMatrix, // TODO: Unused - wird für Multi-Field Mode benötigt
  // disciplines, // TODO: Unused - wird für Multi-Field Mode benötigt
  // competitionId // TODO: Unused - wird für Multi-Field Mode benötigt
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
                  
                  // TEMPORARY FIX: Always use simple mode (single input field)
                  // Multi-field mode is not yet implemented (placeholder at line 227-236)
                  // TODO: Implement multi-field mode properly in Point 130+
                  const useSimpleMode = true; // Always true for now
                  
                  if (enabledFields.length === 0 || useSimpleMode) {
                    // Fallback: single input field (simple mode)
                    const key = `${participant.id}-${disciplineId}`
                    const score = scoreMatrix[key] ?? ''
                    const validation = getScoreValidation(disciplineId, score)
                    
                    return (
                      <td key={`cell-${participant.id}-${disciplineId}`} className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={score}
                            onChange={(e) => handleScoreChange(participant.id, disciplineId, e.target.value)}
                            onBlur={(e) => {
                              console.log('🟡 onBlur FIRED for participant:', participant.id, 'discipline:', disciplineId);
                              console.log('🟡 saveScore type:', typeof saveScore, 'is function:', typeof saveScore === 'function');
                              
                              // Normalize score to show all decimal places
                              const normalized = normalizeScoreInput(e.target.value, discipline.int_berechnung || 2)
                              if (normalized !== e.target.value) {
                                handleScoreChange(participant.id, disciplineId, normalized)
                              }
                              
                              console.log('🟡 About to call saveScore with:', participant.id, disciplineId);
                              saveScore(participant.id, disciplineId)
                              console.log('🟡 saveScore call completed');
                            }}
                            onKeyDown={(e) => {
                              const currentRow = filteredParticipants.findIndex(p => p.id === participant.id)
                              
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                // Normalize and save
                                const normalized = normalizeScoreInput(e.currentTarget.value, discipline.int_berechnung || 2)
                                if (normalized !== e.currentTarget.value) {
                                  handleScoreChange(participant.id, disciplineId, normalized)
                                }
                                saveScore(participant.id, disciplineId)
                                // Blur the input field
                                e.currentTarget.blur()
                              } else if (e.key === 'ArrowRight' && currentRow < filteredParticipants.length - 1) {
                                e.preventDefault()
                                // Move to next participant
                                const nextParticipant = filteredParticipants[currentRow + 1]
                                const nextInput = document.querySelector<HTMLInputElement>(
                                  `input[data-participant="${nextParticipant.id}"][data-discipline="${disciplineId}"]`
                                )
                                if (nextInput) nextInput.focus()
                              } else if (e.key === 'ArrowLeft' && currentRow > 0) {
                                e.preventDefault()
                                // Move to previous participant
                                const prevParticipant = filteredParticipants[currentRow - 1]
                                const prevInput = document.querySelector<HTMLInputElement>(
                                  `input[data-participant="${prevParticipant.id}"][data-discipline="${disciplineId}"]`
                                )
                                if (prevInput) prevInput.focus()
                              }
                            }}
                            data-participant={participant.id}
                            data-discipline={disciplineId}
                            className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:border-transparent ${
                              validation.isValid 
                                ? 'border-gray-300 focus:ring-blue-500' 
                                : 'border-red-300 bg-red-50 focus:ring-red-500'
                            }`}
                            placeholder={getScorePlaceholder(discipline.int_berechnung || 2)}
                            title={!validation.isValid ? validation.message : ''}
                          />
                          {!validation.isValid && (
                            <div className="absolute -bottom-6 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1 z-10 whitespace-nowrap">
                              ⚠️ {validation.message}
                            </div>
                          )}
                          {discipline.maxScore && discipline.maxScore > 0 && (
                            <div className="absolute -top-6 left-0 right-0 text-xs text-gray-500 whitespace-nowrap">
                              Max: {discipline.maxScore.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  } else {
                    // New behavior: multiple input fields for enabled discipline fields
                    // This is too complex - extract to separate component in next iteration
                    return (
                      <td key={`cell-${participant.id}-${disciplineId}`} className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 text-center">
                          Multi-field mode
                          <br />
                          ({enabledFields.length} fields)
                        </div>
                      </td>
                    )
                  }
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
