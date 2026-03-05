/**
 * useScoreActions Hook
 * Point 123: Separation of Concerns - Score Save/Update Actions
 * 
 * Handles saving scores, field scores, and calculating discipline totals
 */

import { apiPost } from '@/utils/api';
import { parseScoreInput } from '@/utils/scoreFormatter';
import type { 
  Competition, 
  Participant, 
  Discipline, 
  DisciplineField
} from '@/types/ScoreCapture.types';

type ScoreMatrix = {[key: string]: string | number};

interface UseScoreActionsProps {
  competitionId: string | undefined;
  competitions: Competition[];
  participants: Participant[];
  disciplines: Discipline[];
  displayDisciplines: Discipline[];
  scoreMatrix: ScoreMatrix;
  selectedEvent: any;
  selectedCompetition: any;
  evaluateFormula: (formula: string, fieldValues: {[key: string]: number}, fields?: DisciplineField[]) => number;
}

interface UseScoreActionsReturn {
  saveScore: (participantId: number, disciplineId: number | string) => Promise<void>;
  saveFieldScore: (participantId: number, field: DisciplineField) => Promise<void>;
  calculateDisciplineScores: (disciplineId: number | string, fields: DisciplineField[]) => Promise<void>;
}

export function useScoreActions({
  competitionId,
  competitions,
  participants,
  disciplines,
  displayDisciplines,
  scoreMatrix,
  selectedEvent,
  selectedCompetition,
  evaluateFormula
}: UseScoreActionsProps): UseScoreActionsReturn {

  const saveScore = async (participantId: number, disciplineId: number | string) => {
    // For now, we'll use the original competitionId from URL params or context
    // In a more advanced implementation, we'd need to determine which competition
    // the selected discipline belongs to
    if (!competitionId && !disciplineId) return
    
    // Get the score value directly from the matrix using the standard key
    const regularKey = `${participantId}-${disciplineId}`
    let scoreValue = scoreMatrix[regularKey]
    
    console.log('🔍 saveScore called with:', { 
      participantId, 
      disciplineId, 
      regularKey, 
      scoreValue, 
      availableScoreKeys: Object.keys(scoreMatrix).filter(k => k.includes(`${participantId}-`)) 
    })
    
    if (scoreValue === '' || scoreValue === null || scoreValue === undefined) {
      console.log('❌ No valid score value to save:', scoreValue)
      return
    }
    
    // Only save if we have a valid numeric discipline ID
    // If disciplineId is a string (fallback ID), we need to find the actual discipline
    let numericDisciplineId: number | null = null
    
    if (typeof disciplineId === 'number') {
      numericDisciplineId = disciplineId
    } else if (typeof disciplineId === 'string') {
      // Try to find the discipline by name or fallback pattern
      const discipline = disciplines.find(d => {
        return d.var_name && disciplineId.includes(d.var_name)
      })
      if (discipline && discipline.int_disziplinid) {
        numericDisciplineId = discipline.int_disziplinid
      } else {
        console.log('❌ Cannot save score: invalid discipline ID:', disciplineId)
        return // Skip saving if we can't resolve to a numeric ID
      }
    }
    
    if (!numericDisciplineId) {
      console.log('❌ Cannot save score: no valid numeric discipline ID found')
      return
    }

    try {
      // Find the correct competition ID for this discipline
      let actualCompetitionId = competitionId ? parseInt(competitionId) : null;
      
      console.log('🔍 Determining competition ID...')
      console.log('🔍 Current competitionId from context/URL:', actualCompetitionId)
      console.log('🔍 Looking for discipline:', numericDisciplineId)
      console.log('🔍 Available competitions:', competitions.map(c => ({ 
        id: c.id, 
        name: c.name, 
        disciplineCount: c.disciplines?.length || 0,
        disciplineIds: c.disciplines?.map(d => d.int_disziplinid) || []
      })))
      
      if (!actualCompetitionId) {
        // Try to find the competition that contains this discipline
        console.log('🔍 Method 1: Looking for competition containing discipline:', numericDisciplineId);
        
        const disciplineCompetition = competitions.find(comp => 
          comp.disciplines?.some(d => d.int_disziplinid === numericDisciplineId)
        );
        
        if (disciplineCompetition) {
          actualCompetitionId = disciplineCompetition.id;
          console.log(`✅ Method 1 Success: Found competition ID ${actualCompetitionId} (${disciplineCompetition.name}) for discipline ${numericDisciplineId}`);
        } else {
          console.log('❌ Method 1 Failed: No competition found containing this discipline');
          
          // Fallback: if participant has assigned competitions, use the first one
          const participant = participants.find(p => p.id === participantId);
          console.log('🔍 Method 2: Using participant assigned competitions:', participant?.assignedCompetitions);
          
          if (participant && participant.assignedCompetitions && participant.assignedCompetitions.length > 0) {
            actualCompetitionId = participant.assignedCompetitions[0];
            console.log(`✅ Method 2 Success: Using participant's first assigned competition: ${actualCompetitionId}`);
          } else {
            console.log('❌ Method 2 Failed: Participant has no assigned competitions');
            
            // Last resort: use the first available competition
            if (competitions.length > 0) {
              actualCompetitionId = competitions[0].id;
              console.log(`✅ Method 3 Success: Using first available competition as fallback: ${actualCompetitionId} (${competitions[0].name})`);
            } else {
              console.error('❌ Method 3 Failed: No competitions available at all');
              console.error('❌ Debug info:');
              console.error('❌   - Discipline ID:', numericDisciplineId);
              console.error('❌   - Participant:', participant);
              console.error('❌   - Available competitions:', competitions);
              alert('Error: Could not determine competition for this discipline. Please check that the discipline is properly assigned to a competition.');
              return;
            }
          }
        }
      } else {
        console.log(`✅ Using provided competition ID: ${actualCompetitionId}`);
      }
      
      const scoreData = {
        competitionId: actualCompetitionId,
        participantId: participantId,
        disciplineId: numericDisciplineId,
        score: typeof scoreValue === 'string' ? parseScoreInput(scoreValue) : scoreValue
      }
      
      console.log('🟢 Sending score data to API:', scoreData)
      
      // Use the new save-value endpoint
      const response = await apiPost('/scores/save-value', scoreData)
      
      console.log('🟢 API Response:', response)
      
      if (response.success) {
        console.log('✅ Score saved successfully to database:', response)
        
        // Auto-set status to "Leistung erfasst" (ID: 9) when score is saved
        // DISABLED: Status management not available until database schema is updated
        // const leistungErfasstStatus = statuses.find(s => s.var_name === 'Leistungen erfasst')
        // if (leistungErfasstStatus && !participantStatuses[participantId]) {
        //   saveParticipantStatus(participantId, leistungErfasstStatus.int_statusid)
        // }
        
        // Optionally show success message
        // You could add a toast notification here
      } else {
        console.error('❌ API returned failure:', response)
        alert('Failed to save score: ' + (response.error || 'Unknown error'))
      }
      
    } catch (error) {
      console.error('❌ Error saving score:', error)
      alert('Failed to save score')
    }
  }

  // Save field-specific score using jury results API
  const saveFieldScore = async (participantId: number, field: DisciplineField) => {
    const fieldKey = `${participantId}-${field.id}`
    const fieldValue = scoreMatrix[fieldKey]
    
    if (fieldValue === '' || fieldValue === null || fieldValue === undefined) {
      console.log(`Skipping save for empty field: ${fieldKey}`)
      return
    }
    
    const numericValue = typeof fieldValue === 'string' ? parseScoreInput(fieldValue) : fieldValue
    if (isNaN(numericValue)) {
      console.log(`Skipping save for non-numeric value: ${fieldValue}`)
      return
    }
    
    console.log(`Saving field score for participant ${participantId}, field "${field.name}" (ID: ${field.id}), value: ${numericValue}`)
    
    try {
      const scoreData = {
        participantId: participantId,
        disciplineFieldId: field.id,
        attempt: 1, // Default attempt
        performance: numericValue,
        type: 0, // Default type (0=Pflicht, 1=Kür) - TODO: determine from context
        eventId: selectedEvent?.int_eventid,
        competitionId: selectedCompetition?.id
      }
      
      console.log('Sending to API:', scoreData)
      
      // Use the new jury results save endpoint
      const response = await apiPost('/jury-results/save-field-score', scoreData)
      
      console.log('API Response:', response)
      
      if (response.success) {
        console.log('✅ Field score saved successfully:', response.data)
        // Show brief success indicator
        const fieldElement = document.querySelector(`input[data-field="${fieldKey}"]`)
        if (fieldElement) {
          fieldElement.classList.add('bg-green-50', 'border-green-300')
          setTimeout(() => {
            fieldElement.classList.remove('bg-green-50', 'border-green-300')
          }, 2000)
        }
      } else {
        console.error('❌ Failed to save field score:', response)
        alert(`Failed to save ${field.name}: ${response.error || 'Unknown error'}`)
      }
      
    } catch (error: any) {
      console.error('❌ Error saving field score:', error)
      alert(`Failed to save ${field.name}: ${error.message || 'Network error'}`)
    }
  }

  // Calculate final scores for a discipline based on field values and formula
  const calculateDisciplineScores = async (disciplineId: number | string, fields: DisciplineField[]) => {
    console.log(`Calculating scores for discipline ${disciplineId}`)
    
    // Find the discipline to get its formula
    const discipline = displayDisciplines.find(d => 
      d.int_disziplinid === disciplineId || d.var_name === disciplineId
    )
    
    if (!discipline) {
      console.log('Discipline not found for calculation:', disciplineId)
      return
    }

    const formula = (discipline as any).formula
    if (!formula) {
      console.log('No formula defined for discipline:', discipline.var_name)
      return
    }

    // Get all participants that have values for this discipline's fields
    const participantsToCalculate = participants.filter(participant => {
      const hasFieldValues = fields.some(field => {
        const fieldKey = `${participant.id}-${field.id}`
        return scoreMatrix[fieldKey] !== undefined && scoreMatrix[fieldKey] !== ''
      })
      return hasFieldValues
    })

    console.log(`Found ${participantsToCalculate.length} participants with field values to calculate`)

    // Calculate for each participant
    for (const participant of participantsToCalculate) {
      const fieldValues: {[key: string]: number} = {}
      
      // Collect field values for this participant
      fields.forEach(field => {
        if (!field.isFinalScore) {
          const fieldKey = `${participant.id}-${field.id}`
          const value = scoreMatrix[fieldKey]
          if (value !== undefined && value !== '') {
            fieldValues[field.name] = typeof value === 'string' ? parseScoreInput(value) : value
          }
        }
      })

      // Calculate using formula
      const calculatedScore = evaluateFormula(formula, fieldValues, fields)
      
      if (calculatedScore > 0) {
        console.log(`Calculated score for ${participant.firstname} ${participant.lastname}: ${calculatedScore}`)
        
        // Save the calculated score
        await saveScore(participant.id, disciplineId)
      }
    }
  }

  return {
    saveScore,
    saveFieldScore,
    calculateDisciplineScores
  };
}
