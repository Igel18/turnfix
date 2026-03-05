/**
 * useScoreValidation Hook
 * Point 123: Separation of Concerns - Score Validation
 * 
 * Handles score validation, status colors, and participant filtering
 */

import { useMemo } from 'react';
import type {
  Participant,
  Discipline,
  Competition,
  Status,
  ScoreValidation
} from '@/types/ScoreCapture.types';

interface UseScoreValidationProps {
  disciplines: Discipline[];
  competitions: Competition[];
  statuses: Status[];
  participants: Participant[];
  activeSquad: string;
  activeDiscipline: number | string | '';
  searchTerm: string;
}

interface UseScoreValidationReturn {
  getScoreValidation: (disciplineId: number | string, scoreValue: string) => ScoreValidation;
  getStatusColor: (statusId: number) => string;
  getParticipantCompetitions: (participant: Participant) => string[];
  filteredParticipants: Participant[];
  displayDisciplines: Discipline[];
}

export function useScoreValidation({
  disciplines,
  competitions,
  statuses,
  participants,
  activeSquad,
  activeDiscipline,
  searchTerm
}: UseScoreValidationProps): UseScoreValidationReturn {

  // Filter disciplines to show only selected one, or all if none selected
  const displayDisciplines = useMemo(() => {
    if (!activeDiscipline) {
      return Array.isArray(disciplines) ? disciplines : [];
    }
    
    return Array.isArray(disciplines) 
      ? disciplines.filter(d => 
          d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline
        )
      : [];
  }, [disciplines, activeDiscipline]);

  // Filter participants by search term and squad
  const filteredParticipants = useMemo(() => {
    return Array.isArray(participants) 
      ? participants.filter(participant => {
          const matchesSearch =
            participant.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            participant.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${participant.firstname || ''} ${participant.lastname || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            participant.club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (participant.startNumber && participant.startNumber.toString().includes(searchTerm));
          
          const matchesSquad = !activeSquad || participant.squad_name === activeSquad;

          return matchesSearch && matchesSquad;
        })
      : [];
  }, [participants, searchTerm, activeSquad]);

  // Helper function to check if score exceeds maximum
  const getScoreValidation = (disciplineId: number | string, scoreValue: string): ScoreValidation => {
    const discipline = displayDisciplines.find(d => 
      d.int_disziplinid === disciplineId || d.var_name === disciplineId
    );
    
    console.log('🔍 Score Validation:', {
      disciplineId,
      scoreValue,
      foundDiscipline: discipline?.var_name,
      maxScore: discipline?.maxScore,
      allDisciplines: displayDisciplines.map(d => ({ id: d.int_disziplinid, name: d.var_name, maxScore: d.maxScore }))
    });
    
    if (!discipline || !discipline.maxScore || discipline.maxScore <= 0) {
      console.log('❌ No validation: discipline=%o, maxScore=%o', discipline, discipline?.maxScore);
      return { isValid: true, message: '' };
    }
    
    const numericScore = parseFloat(String(scoreValue).replace(',', '.'));
    if (isNaN(numericScore) || scoreValue === '') {
      return { isValid: true, message: '' };
    }
    
    if (numericScore > discipline.maxScore) {
      console.log('⚠️ Score exceeds maximum!', numericScore, '>', discipline.maxScore);
      return { 
        isValid: false, 
        message: `Score exceeds maximum of ${discipline.maxScore.toFixed(2)} points`,
        maxScore: discipline.maxScore
      };
    }
    
    console.log('✅ Score is valid');
    return { isValid: true, message: '' };
  };

  // Get status color based on color code
  const getStatusColor = (statusId: number): string => {
    const status = statuses.find(s => s.int_statusid === statusId);
    if (!status) {
      return 'bg-gray-100 text-gray-800';
    }
    
    const colorCode = status.ary_colorcode;
    if (colorCode.includes('255,0,0') || colorCode.includes('#ff0000') || colorCode.includes('red')) {
      return 'bg-red-100 text-red-800';
    } else if (colorCode.includes('0,255,0') || colorCode.includes('#00ff00') || colorCode.includes('green')) {
      return 'bg-green-100 text-green-800';
    } else if (colorCode.includes('255,255,0') || colorCode.includes('#ffff00') || colorCode.includes('yellow')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (colorCode.includes('0,0,255') || colorCode.includes('#0000ff') || colorCode.includes('blue')) {
      return 'bg-blue-100 text-blue-800';
    }
    
    return 'bg-gray-100 text-gray-800';
  };

  // Helper function to get competition names for a participant
  const getParticipantCompetitions = (participant: Participant): string[] => {
    if (!participant.assignedCompetitions || participant.assignedCompetitions.length === 0) {
      return [];
    }
    
    return participant.assignedCompetitions
      .map(competitionId => {
        const competition = competitions.find(c => c.id === competitionId);
        return competition?.name || competition?.var_name || `Competition ${competitionId}`;
      })
      .filter(name => name);
  };

  return {
    getScoreValidation,
    getStatusColor,
    getParticipantCompetitions,
    filteredParticipants,
    displayDisciplines
  };
}
