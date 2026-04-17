/**
 * useResultsData Hook
 * Point 123: Separation of Concerns - Data Loading
 * 
 * Handles all data fetching for Results page
 */

import { useState } from 'react';
import { apiGet } from '@/utils/api';
import { getDisciplineIcon } from '@/utils/disciplineIcons';
import { calculateFormula, buildFieldSymbolsMap, applyBuiltInFormula, detectFormulaType } from '@/utils/formulaUtils';
import type { Participant, CompetitionGroup, DisciplineInfo } from '../Results.types';
import { computeTotalScore, sortAndRank } from '@/utils/rankingUtils';

interface UseResultsDataReturn {
  ranking: Participant[];
  competitionGroups: CompetitionGroup[];
  disciplines: string[];
  disciplineFormulas: Record<string, string>;
  selectedCompetitionDisciplineInfo: DisciplineInfo[];
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
  selectedCompetition: string
): UseResultsDataReturn {
  
  const [ranking, setRanking] = useState<Participant[]>([]);
  const [competitionGroups, setCompetitionGroups] = useState<CompetitionGroup[]>([]);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [disciplineFormulas, setDisciplineFormulas] = useState<Record<string, string>>({});
  const [selectedCompetitionDisciplineInfo, setSelectedCompetitionDisciplineInfo] = useState<DisciplineInfo[]>([]);
  const [eventName, setEventName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [competitions, setCompetitions] = useState<any[]>([]);

  const fetchCompetitions = async (): Promise<any[]> => {
    if (!eventId) return [];

    try {
      const cacheBuster = Date.now();
      const data = await apiGet(`/competitions?eventId=${eventId}&_cb=${cacheBuster}`);
      const competitionsArray = Array.isArray(data) ? data : [];
      // Sort ascending by competition number (numeric), fallback to id
      const sorted = [...competitionsArray].sort((a, b) => {
        const numA = parseInt(String(a.number ?? a.id ?? 0), 10);
        const numB = parseInt(String(b.number ?? b.id ?? 0), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
      setCompetitions(sorted);
      return sorted;
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
      // Note: squadName is intentionally NOT passed here. The Results page must
      // always show ALL scores for the event regardless of which squad is in the
      // URL (it's navigation context only, not a results filter). Passing squadName
      // caused the server to filter WHERE var_riege = ? and silently hid scores
      // for participants in other squads. (Fixed: Item 90)
      if (selectedCompetition) scoresParams.append('competitionId', selectedCompetition);

      const scoresData = await apiGet(`/scores?${scoresParams}`);
      const scores = scoresData.results || [];

      const disciplinesData = await apiGet('/disciplines');
      const disciplineMap = new Map<number, string>();
      disciplinesData.forEach((d: any) => {
        disciplineMap.set(d.id, d.name);
      });
      
      let allowedDisciplines: Set<string> | null = null;
      let selectedCompetitionFormulaMap: Record<string, string> = {};
      let selectedCompetitionDisciplineInfoData: DisciplineInfo[] = [];
      
      if (selectedCompetition) {
        try {
          const competitionDisciplinesData = await apiGet(`/competitions/${selectedCompetition}/disciplines`);
          if (competitionDisciplinesData?.disciplines?.length > 0) {
            allowedDisciplines = new Set(
              competitionDisciplinesData.disciplines.map((d: any) => d.var_name || d.name)
            );
            selectedCompetitionDisciplineInfoData = competitionDisciplinesData.disciplines.map((d: any) => ({
              name: d.var_name || d.name,
              icon: getDisciplineIcon(d.var_name || d.name, d.var_icon),
              iconPath: d.var_icon,
              var_kurz1: d.var_kurz1,
              fullData: d
            }));
            selectedCompetitionFormulaMap = competitionDisciplinesData.disciplines.reduce((acc: Record<string, string>, d: any) => {
              const disciplineName = d.var_name || d.name;
              const formula = d.var_formel || d.formula;
              if (disciplineName && formula && String(formula).trim()) {
                acc[disciplineName] = String(formula).trim();
              }
              return acc;
            }, {});
          }
        } catch (error) {
          console.error('Error fetching competition disciplines:', error);
        }
      }

      const getParticipantCompetitionKey = (participantId: number, competitionId: number) => `${participantId}:${competitionId}`;

      // Pre-load current competition formulas to override old linked formulas
      const competitionCurrentFormulas = new Map<number, Record<string, string>>();
      for (const competition of availableCompetitions) {
        try {
          const competitionDisciplinesData = await apiGet(`/competitions/${competition.id}/disciplines`);
          if (competitionDisciplinesData?.disciplines?.length > 0) {
            const currentFormulas: Record<string, string> = {};
            competitionDisciplinesData.disciplines.forEach((d: any) => {
              const disciplineName = d.var_name || d.name;
              const formula = d.var_formel || d.formula;
              if (disciplineName && formula && String(formula).trim()) {
                currentFormulas[disciplineName] = String(formula).trim();
              }
            });
            competitionCurrentFormulas.set(competition.id, currentFormulas);
          }
        } catch (error) {
          console.error(`Error pre-loading disciplines for competition ${competition.id}:`, error);
        }
      }

      const scoresMap = new Map<string, { [discipline: string]: number }>();
      const juryResultsMap = new Map<string, { [discipline: string]: any[] }>();
      const formulasMap = new Map<string, { [discipline: string]: string }>();
      const disciplineFormulasMap = new Map<string, { [discipline: string]: string }>();
      const disciplineSet = new Set<string>();
      const participantIds = new Set(participants.map((p: any) => p.id));
      const filteredScores = scores.filter((score: any) => participantIds.has(score.participantId));

      filteredScores.forEach((score: any) => {
        const participantId = score.participantId;
        const competitionId = Number(score.competitionId || score.competitionid || 0);
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
        
        if (!participantId || !competitionId || !discipline || scoreValue === null) return;
        if (allowedDisciplines && !allowedDisciplines.has(discipline)) return;

        const participantCompetitionKey = getParticipantCompetitionKey(participantId, competitionId);
        
        disciplineSet.add(discipline);
        if (!scoresMap.has(participantCompetitionKey)) {
          scoresMap.set(participantCompetitionKey, {});
        }
        scoresMap.get(participantCompetitionKey)![discipline] = scoreValue;
        
        // Store jury results if available
        if (score.juryResults && score.juryResults.length > 0) {
          console.log('✅ [Results] Storing jury results for participant', participantId, 'discipline', discipline, ':', score.juryResults);
          if (!juryResultsMap.has(participantCompetitionKey)) {
            juryResultsMap.set(participantCompetitionKey, {});
          }
          juryResultsMap.get(participantCompetitionKey)![discipline] = score.juryResults;
        } else {
          console.log('⚠️ [Results] No jury results for participant', participantId, 'discipline', discipline);
        }
        
        // Store formula and startValue if available
        if (score.formula) {
          if (!formulasMap.has(participantCompetitionKey)) {
            formulasMap.set(participantCompetitionKey, {});
          }
          formulasMap.get(participantCompetitionKey)![discipline] = score.formula;
        }
        // Store built-in formula (var_formel) separately for ranking-time application
        if (score.disciplineFormula) {
          if (!disciplineFormulasMap.has(participantCompetitionKey)) {
            disciplineFormulasMap.set(participantCompetitionKey, {});
          }
          disciplineFormulasMap.get(participantCompetitionKey)![discipline] = score.disciplineFormula;
        }
      });

      console.log('📊 [Results] Final scores map:', Array.from(scoresMap.entries()));
      console.log('📊 [Results] Final jury results map:', Array.from(juryResultsMap.entries()));
      console.log('📊 [Results] Disciplines found:', Array.from(disciplineSet));
       console.log('🔍 DEBUG: total juryResultsMap entries:', juryResultsMap.size);
       if (juryResultsMap.size > 0) {
         const firstKey = Array.from(juryResultsMap.keys())[0];
         console.log('🔍 DEBUG: first entry key:', firstKey, 'value:', juryResultsMap.get(firstKey));
       }

      const buildParticipantCompetitionEntry = (participant: any, competitionId: number, currentFormulas?: Record<string, string>): Participant => {
          const participantCompetitionKey = getParticipantCompetitionKey(participant.id, competitionId);
          const participantScores = scoresMap.get(participantCompetitionKey) || {};
          const participantJuryResults = juryResultsMap.get(participantCompetitionKey) || {};
          const participantFormulas = formulasMap.get(participantCompetitionKey) || {};
          const participantDisciplineFormulas = disciplineFormulasMap.get(participantCompetitionKey) || {};
         
           // DEBUG: Log jury results for this participant
           console.log(`🔍 [Results] Building entry for ${participant.firstname} ${participant.lastname} (key: ${participantCompetitionKey})`, {
             juryResultsKeys: Object.keys(participantJuryResults),
             juryResultsSize: Object.keys(participantJuryResults).length
           });

          // Override old linked formulas with current competition discipline formulas
          const effectiveFormulas: Record<string, string> = {};
          Object.keys(participantFormulas).forEach(discipline => {
            effectiveFormulas[discipline] = currentFormulas?.[discipline] || participantFormulas[discipline] || '';
          });

          // If currentFormulas has discipline not in participantFormulas (fresh discipline), assign it
          if (currentFormulas) {
            Object.keys(currentFormulas).forEach(discipline => {
              if (!(discipline in effectiveFormulas)) {
                effectiveFormulas[discipline] = currentFormulas[discipline];
              }
            });
          }
          
          // Two-step score calculation (C++ backward compatible):
          //   Step 1: If linked formula + jury results exist, recalculate Endwert from fields
          //   Step 2: Apply built-in formula (var_formel) to transform score for ranking
          // This matches result_calc.cpp behavior where var_formel is applied at ranking time.
          const recalculatedScores: { [discipline: string]: number } = {};
          
          Object.keys(participantScores).forEach(discipline => {
            const storedScore = participantScores[discipline];
            const juryResults = participantJuryResults[discipline];
            const formula = effectiveFormulas[discipline];       // use current formula, fallback to old linked
            const discFormula = participantDisciplineFormulas[discipline]; // built-in var_formel
            const formulaType = formula ? detectFormulaType(formula) : 'none'
            
            // Step 1: If we have jury results and linked formula, recalculate Endwert from fields
            let scoreForRanking = storedScore;
            if (juryResults && juryResults.length > 0 && formula && formulaType === 'letter') {
              const fieldsMap = buildFieldSymbolsMap(juryResults, formula);
              const fields = Object.values(fieldsMap);
              
              if (fields.length > 0) {
                const valuesMap: Record<string, number> = {};
                fields.forEach(field => {
                  if (field.value !== null) {
                    valuesMap[field.symbol] = field.value;
                  }
                });
                
                const calculatedScore = calculateFormula(formula, valuesMap);
                
                if (calculatedScore !== null) {
                  scoreForRanking = calculatedScore;
                  
                  if (Math.abs(calculatedScore - storedScore) > 0.01) {
                    console.log(`🔄 [Results] Recalculated ${participant.firstname} ${participant.lastname} - ${discipline}:`, {
                      stored: storedScore,
                      calculated: calculatedScore,
                      difference: calculatedScore - storedScore
                    });
                  }
                }
                // If calculation failed, scoreForRanking stays as storedScore
              }
            } else if (formula && formulaType === 'variable') {
              console.log(`ℹ️ [Results] Skip linked-formula recalculation for variable formula "${formula}" on ${participant.firstname} ${participant.lastname} - ${discipline}; using stored score ${storedScore}`);
            }
            
            // Step 2: Apply built-in formula (var_formel) for ranking
            // This mirrors C++ result_calc.cpp: var_formel transforms the stored
            // score into the ranking value (e.g. "20-x" converts time to points)
            if (discFormula) {
              const transformedScore = applyBuiltInFormula(discFormula, scoreForRanking);
              if (transformedScore !== scoreForRanking) {
                console.log(`📐 [Results] Applied var_formel "${discFormula}" to ${participant.firstname} ${participant.lastname} - ${discipline}: ${scoreForRanking} → ${transformedScore}`);
              }
              scoreForRanking = transformedScore;
            }
            
            recalculatedScores[discipline] = scoreForRanking;
          });
          
          // Calculate total from recalculated scores, respecting Streichwertung
          const currentComp = availableCompetitions.find(c => c.id === competitionId);
          const dropWorstScore: boolean = currentComp?.dropWorstScore ?? false;
          const dropCount: number = currentComp?.dropCount ?? 0;
          const totalScore = computeTotalScore(recalculatedScores, dropWorstScore, dropCount);

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
            totalScore,
            rank: 0,
            competitionId,
            competitionName: (() => {
              const comp = availableCompetitions.find(c => c.id === competitionId);
              return comp ? `${comp.name}${comp.number ? ` (Nr. ${comp.number})` : ''}` : 'Unknown Competition';
            })()
          };
        };

      const participantsList: Participant[] = participants
        .filter((participant: any) => !participant.startet_nicht)
        .flatMap((participant: any) => {
          if (selectedCompetition) {
            const selectedCompetitionId = parseInt(selectedCompetition);
            const currentFormulas = competitionCurrentFormulas.get(selectedCompetitionId) || {};
            return [buildParticipantCompetitionEntry(participant, selectedCompetitionId, currentFormulas)];
          }

          const assignedCompetitions: number[] = Array.isArray(participant.assignedCompetitions)
            ? Array.from(new Set(participant.assignedCompetitions.map((compId: any) => Number(compId)).filter((compId: number) => !Number.isNaN(compId) && compId > 0)))
            : [];

          return assignedCompetitions.map((competitionId: number) => {
            const currentFormulas = competitionCurrentFormulas.get(competitionId) || {};
            return buildParticipantCompetitionEntry(participant, competitionId, currentFormulas);
          });
        });

      if (selectedCompetition) {
        const selectedCompetitionData = availableCompetitions.find(c => c.id === parseInt(selectedCompetition));
        const sortAscending: boolean = selectedCompetitionData?.sortAscending ?? false;
        // sortAndRank returns a new array: correctly sorted + ranks assigned.
        // Use it directly — do NOT assign ranks back by index (that maps ranked[i]
        // onto participantsList[i] which are different participants).
        const ranked = sortAndRank(participantsList, sortAscending);
        setRanking(ranked);
        setCompetitionGroups([]);
        setDisciplineFormulas(selectedCompetitionFormulaMap);
        setSelectedCompetitionDisciplineInfo(selectedCompetitionDisciplineInfoData);
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

          const groupCompetition = availableCompetitions.find(c => c.id === competitionId);
          const groupSortAscending: boolean = groupCompetition?.sortAscending ?? false;
          const groupDropWorst: boolean = groupCompetition?.dropWorstScore ?? false;
          const groupDropCount: number = groupCompetition?.dropCount ?? 0;

          participants.forEach(participant => {
            const disciplineScores = competitionDisciplines.reduce((acc, discipline) => {
              acc[discipline] = participant.scores[discipline] || 0;
              return acc;
            }, {} as Record<string, number>);
            participant.totalScore = computeTotalScore(disciplineScores, groupDropWorst, groupDropCount);
          });

          // sortAndRank returns a new sorted array with ranks assigned.
          // Use it directly for the group — never assign back by index.
          const rankedGroup = sortAndRank(participants, groupSortAscending);

          groups.push({
            competitionId,
            competitionName,
            participants: rankedGroup,
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
        setDisciplineFormulas({});
        setSelectedCompetitionDisciplineInfo([]);
      }

      // Bug #106 fix: when a competition filter is active, use ALL configured disciplines
      // for that competition (from the API), not just disciplines that happen to have scores.
      // This ensures devices/disciplines without scores are still shown as columns.
      if (selectedCompetition && selectedCompetitionDisciplineInfoData.length > 0) {
        setDisciplines(selectedCompetitionDisciplineInfoData.map(d => d.name).sort());
      } else {
        setDisciplines(Array.from(disciplineSet).sort());
      }
      setEventName(`Event ${eventId}`);
    } catch (error) {
      console.error('Error fetching event ranking:', error);
      setRanking([]);
      setCompetitionGroups([]);
      setDisciplines([]);
      setDisciplineFormulas({});
      setSelectedCompetitionDisciplineInfo([]);
      setEventName(`Event ${eventId}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ranking,
    competitionGroups,
    disciplines,
    disciplineFormulas,
    selectedCompetitionDisciplineInfo,
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
