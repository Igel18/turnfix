/**
 * useResultsData Hook
 * Point 123: Separation of Concerns - Data Loading
 * 
 * Handles all data fetching for Results page
 */

import { useState } from 'react';
import { apiGet } from '@/utils/api';
import { getDisciplineIcon } from '@/utils/disciplineIcons';
import { calculateFormula, buildFieldSymbolsMap } from '@/utils/formulaUtils';
import type { Participant, CompetitionGroup, DisciplineInfo } from '../Results.types';

interface UseResultsDataReturn {
  ranking: Participant[];
  competitionGroups: CompetitionGroup[];
  disciplines: string[];
  eventName: string;
  competitions: any[];
  isLoading: boolean;
  fetchCompetitions: () => Promise<any[]>;
  fetchEventRanking: (competitionsData?: any[]) => Promise<void>;
  setRanking: (ranking: Participant[]) => void;
  setCompetitionGroups: (groups: CompetitionGroup[]) => void;
  setDisciplines: (disciplines: string[]) => void;
  setCompetitions: (competitions: any[]) => void;
}

export function useResultsData(
  eventId: string | null,
  squadName: string | null,
  selectedCompetition: string
): UseResultsDataReturn {
  
  const [ranking, setRanking] = useState<Participant[]>([]);
  const [competitionGroups, setCompetitionGroups] = useState<CompetitionGroup[]>([]);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [eventName, setEventName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [competitions, setCompetitions] = useState<any[]>([]);

  const fetchCompetitions = async (): Promise<any[]> => {
    if (!eventId) return [];

    try {
      const cacheBuster = Date.now();
      const data = await apiGet(`/competitions?eventId=${eventId}&_cb=${cacheBuster}`);
      const competitionsArray = Array.isArray(data) ? data : [];
      setCompetitions(competitionsArray);
      return competitionsArray;
    } catch (error) {
      console.error('Error fetching competitions:', error);
      setCompetitions([]);
      return [];
    }
  };

  const fetchEventRanking = async (competitionsData?: any[]) => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      const availableCompetitions = competitionsData || competitions;
      const participantsParams = new URLSearchParams({ eventId });
      if (selectedCompetition) {
        participantsParams.append('competitionId', selectedCompetition);
      }

      const participantsData = await apiGet(`/event-participants?${participantsParams}`);
      const participants = participantsData.participants || [];

      if (participants.length === 0) {
        setRanking([]);
        setCompetitionGroups([]);
        setDisciplines([]);
        setEventName(`Event ${eventId}`);
        return;
      }

      const scoresParams = new URLSearchParams({ 
        limit: '1000',
        eventId,
        _cb: Date.now().toString()
      });
      if (squadName) scoresParams.append('squadName', squadName);
      if (selectedCompetition) scoresParams.append('competitionId', selectedCompetition);

      const scoresData = await apiGet(`/scores?${scoresParams}`);
      const scores = scoresData.results || [];

      const disciplinesData = await apiGet('/disciplines');
      const disciplineMap = new Map<number, string>();
      disciplinesData.forEach((d: any) => {
        disciplineMap.set(d.id, d.name);
      });
      
      let allowedDisciplines: Set<string> | null = null;
      
      if (selectedCompetition) {
        try {
          const competitionDisciplinesData = await apiGet(`/competitions/${selectedCompetition}/disciplines`);
          if (competitionDisciplinesData?.disciplines?.length > 0) {
            allowedDisciplines = new Set(
              competitionDisciplinesData.disciplines.map((d: any) => d.var_name || d.name)
            );
          }
        } catch (error) {
          console.error('Error fetching competition disciplines:', error);
        }
      }

      const scoresMap = new Map<number, { [discipline: string]: number }>();
      const juryResultsMap = new Map<number, { [discipline: string]: any[] }>();
      const formulasMap = new Map<number, { [discipline: string]: string }>();
      const startValuesMap = new Map<number, { [discipline: string]: number }>();
      const disciplineSet = new Set<string>();
      const participantIds = new Set(participants.map((p: any) => p.id));
      const filteredScores = scores.filter((score: any) => participantIds.has(score.participantId));

      filteredScores.forEach((score: any) => {
        const participantId = score.participantId;
        const discipline = score.discipline?.name || score.disciplineName;
        const scoreValue = score.score || 0;
        
        console.log('🔍 [Results] Processing score:', { 
          participantId, 
          discipline, 
          scoreValue, 
          juryResults: score.juryResults,
          juryResultsCount: score.juryResults?.length || 0,
          fullScore: score 
        });
        
        if (!participantId || !discipline || scoreValue === null) return;
        if (allowedDisciplines && !allowedDisciplines.has(discipline)) return;
        
        disciplineSet.add(discipline);
        if (!scoresMap.has(participantId)) {
          scoresMap.set(participantId, {});
        }
        scoresMap.get(participantId)![discipline] = scoreValue;
        
        // Store jury results if available
        if (score.juryResults && score.juryResults.length > 0) {
          console.log('✅ [Results] Storing jury results for participant', participantId, 'discipline', discipline, ':', score.juryResults);
          if (!juryResultsMap.has(participantId)) {
            juryResultsMap.set(participantId, {});
          }
          juryResultsMap.get(participantId)![discipline] = score.juryResults;
        } else {
          console.log('⚠️ [Results] No jury results for participant', participantId, 'discipline', discipline);
        }
        
        // Store formula and startValue if available
        if (score.formula) {
          if (!formulasMap.has(participantId)) {
            formulasMap.set(participantId, {});
          }
          formulasMap.get(participantId)![discipline] = score.formula;
        }
        if (score.startValue !== undefined) {
          if (!startValuesMap.has(participantId)) {
            startValuesMap.set(participantId, {});
          }
          startValuesMap.get(participantId)![discipline] = score.startValue;
        }
      });

      console.log('📊 [Results] Final scores map:', Array.from(scoresMap.entries()));
      console.log('📊 [Results] Final jury results map:', Array.from(juryResultsMap.entries()));
      console.log('📊 [Results] Disciplines found:', Array.from(disciplineSet));

      const participantsList: Participant[] = participants
        .filter((participant: any) => !participant.startet_nicht)
        .map((participant: any) => {
          const participantScores = scoresMap.get(participant.id) || {};
          const participantJuryResults = juryResultsMap.get(participant.id) || {};
          const participantFormulas = formulasMap.get(participant.id) || {};
          const participantStartValues = startValuesMap.get(participant.id) || {};
          
          // IMPORTANT: Recalculate scores from juryResults if formula exists
          // This ensures totalScore uses correct calculated values, not stored DB values
          const recalculatedScores: { [discipline: string]: number } = {};
          
          Object.keys(participantScores).forEach(discipline => {
            const storedScore = participantScores[discipline];
            const juryResults = participantJuryResults[discipline];
            const formula = participantFormulas[discipline];
            const startValue = participantStartValues[discipline] || 10;
            
            // If we have jury results and formula, recalculate
            if (juryResults && juryResults.length > 0 && formula) {
              const fieldsMap = buildFieldSymbolsMap(juryResults, formula);
              const fields = Object.values(fieldsMap);
              
              if (fields.length > 0) {
                const valuesMap: Record<string, number> = {};
                fields.forEach(field => {
                  if (field.value !== null) {
                    valuesMap[field.symbol] = field.value;
                  }
                });
                
                const calculatedScore = calculateFormula(formula, valuesMap, startValue);
                
                if (calculatedScore !== null) {
                  recalculatedScores[discipline] = calculatedScore;
                  
                  if (Math.abs(calculatedScore - storedScore) > 0.01) {
                    console.log(`🔄 [Results] Recalculated ${participant.firstname} ${participant.lastname} - ${discipline}:`, {
                      stored: storedScore,
                      calculated: calculatedScore,
                      difference: calculatedScore - storedScore
                    });
                  }
                } else {
                  // Calculation failed, use stored score
                  recalculatedScores[discipline] = storedScore;
                }
              } else {
                // No fields, use stored score
                recalculatedScores[discipline] = storedScore;
              }
            } else {
              // No jury results or formula, use stored score
              recalculatedScores[discipline] = storedScore;
            }
          });
          
          // Calculate total from recalculated scores
          const totalScore = Object.values(recalculatedScores).reduce((sum: number, score: number) => sum + score, 0);

          return {
            id: participant.id,
            name: `${participant.firstname} ${participant.lastname}`,
            club: participant.club || 'Unknown Club',
            startNumber: participant.startNumber || 0,
            age: participant.age || 0,
            gender: participant.gender || 'unbekannt',
            startet_nicht: participant.startet_nicht || false,
            scores: recalculatedScores, // Use recalculated scores instead of stored scores
            juryResults: participantJuryResults,
            formulas: participantFormulas,
            startValues: participantStartValues,
            totalScore,
            rank: 0,
            competitionId: participant.assignedCompetitions?.[0],
            competitionName: (() => {
              const comp = availableCompetitions.find(c => c.id === participant.assignedCompetitions?.[0]);
              return comp ? `${comp.name}${comp.number ? ` (Nr. ${comp.number})` : ''}` : 'Unknown Competition';
            })()
          };
        });

      if (selectedCompetition) {
        participantsList.sort((a, b) => b.totalScore - a.totalScore);
        participantsList.forEach((participant, index) => {
          participant.rank = index + 1;
        });
        setRanking(participantsList);
        setCompetitionGroups([]);
      } else {
        const competitionMap = new Map<number, Participant[]>();
        participantsList.forEach(participant => {
          const compId = participant.competitionId || 0;
          if (!competitionMap.has(compId)) {
            competitionMap.set(compId, []);
          }
          competitionMap.get(compId)!.push(participant);
        });

        const groups: CompetitionGroup[] = [];
        
        for (const [competitionId, participants] of competitionMap) {
          const competition = availableCompetitions.find(c => c.id === competitionId);
          const competitionName = competition 
            ? `${competition.name}${competition.number ? ` (Nr. ${competition.number})` : ''}` 
            : `Competition ${competitionId}`;

          let competitionDisciplines: string[] = [];
          let competitionDisciplineInfo: DisciplineInfo[] = [];
          
          try {
            const competitionDisciplinesData = await apiGet(`/competitions/${competitionId}/disciplines`);
            if (competitionDisciplinesData?.disciplines?.length > 0) {
              competitionDisciplines = competitionDisciplinesData.disciplines.map((d: any) => d.var_name || d.name);
              competitionDisciplineInfo = competitionDisciplinesData.disciplines.map((d: any) => ({
                name: d.var_name || d.name,
                icon: getDisciplineIcon(d.var_name || d.name, d.var_icon),
                iconPath: d.var_icon,
                var_kurz1: d.var_kurz1,
                fullData: d
              }));
            }
          } catch (error) {
            console.error(`Error fetching disciplines for competition ${competitionId}:`, error);
            competitionDisciplines = Array.from(disciplineSet);
            competitionDisciplineInfo = competitionDisciplines.map(name => ({
              name,
              icon: getDisciplineIcon(name),
              iconPath: undefined
            }));
          }

          participants.forEach(participant => {
            const competitionSpecificTotal = competitionDisciplines.reduce((sum, discipline) => {
              return sum + (participant.scores[discipline] || 0);
            }, 0);
            participant.totalScore = competitionSpecificTotal;
          });

          participants.sort((a, b) => b.totalScore - a.totalScore);
          participants.forEach((participant, index) => {
            participant.rank = index + 1;
          });

          groups.push({
            competitionId,
            competitionName,
            participants,
            disciplines: competitionDisciplines.sort(),
            disciplineInfo: competitionDisciplineInfo.sort((a, b) => a.name.localeCompare(b.name))
          });
        }

        groups.sort((a, b) => {
          const compA = availableCompetitions.find(c => c.id === a.competitionId);
          const compB = availableCompetitions.find(c => c.id === b.competitionId);
          
          if (compA?.number && compB?.number) {
            return compA.number.localeCompare(compB.number, undefined, { numeric: true });
          }
          if (compA?.number && !compB?.number) return -1;
          if (!compA?.number && compB?.number) return 1;
          return a.competitionName.localeCompare(b.competitionName);
        });
        
        setCompetitionGroups(groups);
        setRanking([]);
      }

      setDisciplines(Array.from(disciplineSet).sort());
      setEventName(`Event ${eventId}`);
    } catch (error) {
      console.error('Error fetching event ranking:', error);
      setRanking([]);
      setCompetitionGroups([]);
      setDisciplines([]);
      setEventName(`Event ${eventId}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ranking,
    competitionGroups,
    disciplines,
    eventName,
    competitions,
    isLoading,
    fetchCompetitions,
    fetchEventRanking,
    setRanking,
    setCompetitionGroups,
    setDisciplines,
    setCompetitions
  };
}
