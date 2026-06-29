/**
 * useScoreMatrix Hook
 * Point 123: Separation of Concerns - Score Matrix Management
 * 
 * Manages the score matrix state and initialization for all participants/disciplines
 */

import { useState } from 'react';
import { apiGet } from '@/utils/api';
import { normalizeScoreInput } from '@/utils/scoreFormatter';
import type {
  Participant,
  Discipline,
  DisciplineField,
  Score
} from '@/types/ScoreCapture.types';

interface UseScoreMatrixProps {
  eventId: string | null;
  competitionId?: string;
  activeSquad: string;
  activeDiscipline: number | string | '';
  participants: Participant[];
  disciplines: Discipline[];
  disciplineFields: DisciplineField[];
  existingScores: Score[];
  getDisciplineFields: (disciplineId: number | string) => DisciplineField[];
  getFilteredDisciplines: () => Discipline[];
}

interface UseScoreMatrixReturn {
  scoreMatrix: {[key: string]: string};
  pendingEndwerts: {[key: string]: string};
  setScoreMatrix: (matrix: {[key: string]: string} | ((prev: {[key: string]: string}) => {[key: string]: string})) => void;
  setPendingEndwerts: (pending: {[key: string]: string} | ((prev: {[key: string]: string}) => {[key: string]: string})) => void;
  initializeScoreMatrix: (participants: Participant[], disciplines: Discipline[], existingScores: Score[]) => Promise<void>;
}

export function useScoreMatrix({
  eventId,
  competitionId,
  activeSquad,
  activeDiscipline,
  disciplineFields,
  getDisciplineFields,
  getFilteredDisciplines
}: UseScoreMatrixProps): UseScoreMatrixReturn {
  
  const [scoreMatrix, setScoreMatrix] = useState<{[key: string]: string}>({});
  const [pendingEndwerts, setPendingEndwerts] = useState<{[key: string]: string}>({});

  const initializeScoreMatrix = async (
    participants: Participant[], 
    disciplines: Discipline[], 
    existingScores: Score[]
  ) => {
    console.log('initializeScoreMatrix called with:');
    console.log('participants:', participants, 'type:', typeof participants, 'isArray:', Array.isArray(participants));
    console.log('disciplines:', disciplines, 'type:', typeof disciplines, 'isArray:', Array.isArray(disciplines));
    console.log('existingScores:', existingScores, 'type:', typeof existingScores, 'isArray:', Array.isArray(existingScores));
    console.log('activeSquad filter:', activeSquad);
    console.log('disciplineFields:', disciplineFields);
    
    if (existingScores.length > 0) {
      console.log('First score object properties:', Object.keys(existingScores[0]));
      console.log('First score object full:', existingScores[0]);
      console.log('participantId field:', existingScores[0].participantId);
      console.log('disciplineId field:', existingScores[0].disciplineId);
    }
    
    const matrix: {[key: string]: string} = {};
    
    const safeParticipants = Array.isArray(participants) ? participants : [];
    const safeDisciplines = getFilteredDisciplines();
    
    console.log('🎯 Matrix creation - Active squad:', activeSquad);
    console.log('🎯 Matrix creation - Filtered disciplines count:', safeDisciplines.length);
    console.log('🎯 Matrix creation - Filtered disciplines:', safeDisciplines.map(d => d.var_name));
    
    // Filter participants by active squad if set
    const filteredParticipants = !activeSquad 
      ? safeParticipants 
      : safeParticipants.filter(participant => participant.squad_name === activeSquad);
    
    console.log(`Processing ${filteredParticipants.length} participants (filtered from ${safeParticipants.length} total):`);
    filteredParticipants.forEach(p => {
      console.log(`Participant ${p.id}: ${p.firstname} ${p.lastname}, Squad: ${p.squad_name}`);
    });
    
    const safeExistingScores = Array.isArray(existingScores) ? existingScores : [];
    
    console.log('Processing matrix for:', filteredParticipants.length, 'participants and', safeDisciplines.length, 'disciplines');
    console.log('With', safeExistingScores.length, 'existing scores');
    
    filteredParticipants.forEach(participant => {
      safeDisciplines.forEach((discipline, index) => {
        const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}` || index;
        console.log(`Processing ${participant.firstname} ${participant.lastname} (ID: ${participant.id}) - ${discipline.var_name} (DisciplineID: ${disciplineId}, int_disziplinid: ${discipline.int_disziplinid})`);
        
        const enabledFields = getDisciplineFields(disciplineId);
        console.log(`📋 Discipline ${disciplineId} (${discipline.var_name}) has ${enabledFields.length} enabled fields:`, 
          enabledFields.map(f => `${f.name} (sortOrder: ${f.sortOrder}, id: ${f.id})`).join(', '));
        
        if (enabledFields.length === 0) {
          // Fallback: if no fields configured, use single score per discipline
          const key = `${participant.id}-${disciplineId}`;
          if (pendingEndwerts[key] !== undefined) {
            matrix[key] = pendingEndwerts[key];
          } else {
            const existingScore = safeExistingScores.find(s => {
              const matchesParticipant = s.participantId === participant.id;
              const matchesDiscipline = 
                s.disciplineId === discipline.int_disziplinid || 
                s.disciplineId === disciplineId ||
                s.disciplineId === (discipline as any).disciplineId ||
                (typeof disciplineId === 'number' && s.disciplineId === disciplineId) ||
                (typeof disciplineId === 'string' && disciplineId.includes('-') && s.disciplineId === parseInt(disciplineId.split('-')[0]));
              
              if (matchesParticipant && matchesDiscipline) {
                console.log(`✅ Found existing score for ${participant.firstname} ${participant.lastname} - ${discipline.var_name}: ${s.score}`);
              }
              return matchesParticipant && matchesDiscipline;
            });
            const scoreStr = existingScore ? existingScore.score.toString() : '';
            matrix[key] = scoreStr ? normalizeScoreInput(scoreStr, discipline.int_berechnung || 2) : '';
          }
        } else {
          // New behavior: create entries for each field
          enabledFields.forEach(field => {
            const fieldKey = `${participant.id}-${field.id}`;
            matrix[fieldKey] = '';
          });
          
          // Also create the main score entry for Endwert
          const key = `${participant.id}-${disciplineId}`;
          const existingScore = safeExistingScores.find(s => {
            const matchesParticipant = s.participantId === participant.id;
            const matchesDiscipline = 
              s.disciplineId === discipline.int_disziplinid || 
              s.disciplineId === disciplineId ||
              s.disciplineId === (discipline as any).disciplineId ||
              (typeof disciplineId === 'number' && s.disciplineId === disciplineId) ||
              (typeof disciplineId === 'string' && disciplineId.includes('-') && s.disciplineId === parseInt(disciplineId.split('-')[0]));
            
            if (matchesParticipant && matchesDiscipline) {
              console.log(`✅ Found existing score for ${participant.firstname} ${participant.lastname} - ${discipline.var_name}: ${s.score}`);
            }
            return matchesParticipant && matchesDiscipline;
          });
          
          if (pendingEndwerts[key] !== undefined) {
            matrix[key] = pendingEndwerts[key];
          } else if (existingScore) {
            matrix[key] = normalizeScoreInput(existingScore.score.toString(), discipline.int_berechnung || 2);
          } else {
            matrix[key] = '';
          }

          // Pre-fill per-field values from /scores payload when available.
          // This is the primary source after reload because /scores already
          // includes juryResults for the corresponding wertung/discipline.
          const scoreWithJuryResults = existingScore as any;
          if (Array.isArray(scoreWithJuryResults?.juryResults)) {
            scoreWithJuryResults.juryResults.forEach((jr: any) => {
              if (jr?.disciplineFieldId && jr?.performance !== null && jr?.performance !== undefined) {
                const fieldKey = `${participant.id}-${jr.disciplineFieldId}`;
                matrix[fieldKey] = normalizeScoreInput(String(jr.performance), discipline.int_berechnung || 2);
              }
            });
          }
          
          console.log(`Initialized Endwert for ${participant.firstname} ${participant.lastname} (${participant.id}) - ${discipline.var_name} (${disciplineId}): ${matrix[key]} (from ${existingScore ? 'DB' : 'default'})`);
          
          const conflictingFields = enabledFields.filter(field => {
            const fieldKey = `${participant.id}-${field.id}`;
            return fieldKey === key;
          });
          if (conflictingFields.length > 0) {
            console.warn(`⚠️  Key conflict detected for ${key}:`, conflictingFields);
          }
        }
      });
    });

    // Load existing jury results for field-specific scores
    if (eventId && filteredParticipants.length > 0) {
      try {
        console.log('Loading jury results for event:', eventId);
        const cacheBuster = Date.now();
        const query = new URLSearchParams({
          eventId: String(eventId),
          attempt: '1',
          type: '0',
          limit: '1000',
          _cb: String(cacheBuster),
        });

        if (competitionId) {
          query.set('competitionId', String(competitionId));
        }

        if (typeof activeDiscipline === 'number') {
          query.set('disciplineId', String(activeDiscipline));
        }

        const juryResults = await apiGet(`/jury-results?${query.toString()}`);
        console.log('Loaded jury results:', juryResults.results?.length || 0, 'entries');
        
        if (juryResults.results) {
          juryResults.results.forEach((result: any) => {
            const isForFilteredParticipant = filteredParticipants.some(p => p.id === result.participantId);
            if (isForFilteredParticipant) {
              const fieldKey = `${result.participantId}-${result.disciplineFieldId}`;
              const performanceStr = result.performance?.toString() || '';
              matrix[fieldKey] = performanceStr ? normalizeScoreInput(performanceStr, 2) : '';
              console.log(`Loaded field score: ${fieldKey} = ${result.performance} (field: ${result.fieldName})`);
            }
          });
        }
      } catch (error) {
        console.error('Error loading jury results:', error);
      }
    }
    
    console.log('Final score matrix:', matrix);
    setScoreMatrix(matrix);
  };

  return {
    scoreMatrix,
    pendingEndwerts,
    setScoreMatrix,
    setPendingEndwerts,
    initializeScoreMatrix
  };
}
