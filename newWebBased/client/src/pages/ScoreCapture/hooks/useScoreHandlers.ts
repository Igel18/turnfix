/**
 * useScoreHandlers Hook
 * Point 123: Separation of Concerns - UI Event Handlers
 * 
 * Bundles all handler functions for ScoreCapture:
 * - Score change handlers (matrix updates + auto-save)
 * - Squad/Discipline selection handlers (with context sync)
 * - Settings handlers (showJuryScores)
 * - Export handlers (CSV)
 */

import { useEvent } from '@/contexts/EventContext';
import type { 
  Participant, 
  Discipline, 
  DisciplineField, 
  Squad
} from '@/types/ScoreCapture.types';interface UseScoreHandlersProps {
  eventId: string | null;
  competitionId: string | null;
  scoreMatrix: {[key: string]: string};
  setScoreMatrix: (matrix: {[key: string]: string} | ((prev: {[key: string]: string}) => {[key: string]: string})) => void;
  disciplineFields: DisciplineField[];
  saveFieldScore: (participantId: number, field: DisciplineField) => Promise<void>;
  participants: Participant[];
  disciplines: Discipline[];
  squads: Squad[];
  activeDiscipline: number | string | '';
  setActiveDiscipline: (value: number | string | '') => void;
  selectedEvent: any | null;
}

interface UseScoreHandlersReturn {
  handleScoreChange: (participantId: number, disciplineId: number | string, value: string) => void;
  handleFieldScoreChange: (participantId: number, fieldId: number, value: string) => void;
  handleSquadChange: (squadName: string) => void;
  handleDisciplineChange: (disciplineValue: number | string) => void;
  handleShowJuryScoresChange: (checked: boolean) => Promise<void>;
  handleExportCSV: () => void;
}

export function useScoreHandlers({
  scoreMatrix,
  setScoreMatrix,
  disciplineFields,
  saveFieldScore,
  participants,
  disciplines,
  squads,
  activeDiscipline,
  setActiveDiscipline,
  selectedEvent
}: UseScoreHandlersProps): UseScoreHandlersReturn {
  const { setSelectedSquad, setSelectedDiscipline } = useEvent();

  // Handle simple score change (just update matrix)
  const handleScoreChange = (participantId: number, disciplineId: number | string, value: string) => {
    const key = `${participantId}-${disciplineId}`;
    setScoreMatrix(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle field score change (update matrix + debounced auto-save)
  const handleFieldScoreChange = (participantId: number, fieldId: number, value: string) => {
    const key = `${participantId}-${fieldId}`;
    setScoreMatrix(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Auto-save after a short delay (debounced)
    clearTimeout((window as any).fieldSaveTimeout);
    (window as any).fieldSaveTimeout = setTimeout(() => {
      if (value && value.trim() !== '') {
        const field = disciplineFields.find(f => f.id === fieldId);
        if (field) {
          console.log(`Auto-saving field score: participant=${participantId}, field=${fieldId}, value=${value}`);
          saveFieldScore(participantId, field);
        }
      }
    }, 1000); // Save 1 second after user stops typing
  };

  // Handle squad selection change (update context)
  const handleSquadChange = (squadName: string) => {
    // Store in context
    if (squadName) {
      const selectedSquadData = squads.find(s => s.name === squadName);
      if (selectedSquadData) {
        setSelectedSquad({
          squad_name: selectedSquadData.name,
          participant_count: selectedSquadData.participant_count,
          individual_count: 0,
          group_count: 0,
          team_count: 0
        });
      }
    } else {
      setSelectedSquad(null);
    }

    // Reset discipline when squad changes
    if (activeDiscipline) {
      setActiveDiscipline('');
      setSelectedDiscipline(null);
    }
  };

  // Handle discipline selection change (update context)
  const handleDisciplineChange = (disciplineValue: number | string) => {
    setActiveDiscipline(disciplineValue);
    const discipline = disciplines.find(d => 
      d.int_disziplinid === disciplineValue || d.var_name === disciplineValue
    );
    if (discipline) {
      setSelectedDiscipline(discipline);
    }
  };

  // Handle showJuryScores checkbox (save to backend)
  const handleShowJuryScoresChange = async (checked: boolean) => {
    try {
      await fetch('/api/app-settings/scoreCapture/showJuryScores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: checked })
      });
    } catch (error) {
      console.error('Failed to save jury scores setting:', error);
    }
  };

  // Handle CSV export
  const handleExportCSV = () => {
    if (!selectedEvent) {
      console.error('No event selected for export');
      return;
    }

    // Prepare CSV content
    const csvData = participants.map(participant => {
      const row: any = {
        'Start Number': participant.startNumber || '',
        'Participant': `${participant.firstname} ${participant.lastname}`,
        'Club': participant.club,
        'Gender': participant.gender,
        'Age': participant.age
      };
      
      disciplines.forEach((discipline, index) => {
        const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}` || index;
        const key = `${participant.id}-${disciplineId}`;
        row[discipline.var_name] = scoreMatrix[key] || '';
      });
      
      return row;
    });
    
    console.log('Export score data as CSV', csvData);
    // TODO: Implement actual CSV download
  };

  return {
    handleScoreChange,
    handleFieldScoreChange,
    handleSquadChange,
    handleDisciplineChange,
    handleShowJuryScoresChange,
    handleExportCSV
  };
}
