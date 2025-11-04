/**
 * useScoreData Hook
 * Point 123: Separation of Concerns - Data Loading & Management
 * 
 * Handles all data fetching for ScoreCapture:
 * - Participants, Disciplines, Squads, Competitions
 * - Statuses, Existing Scores, Squad-Discipline Statuses
 */

import { useState } from 'react';
import { apiGet } from '@/utils/api';
import type {
  Participant,
  Discipline,
  DisciplineField,
  Squad,
  Competition,
  Status,
  Score
} from '@/types/ScoreCapture.types';

interface UseScoreDataProps {
  eventId: string | null;
}

interface UseScoreDataReturn {
  participants: Participant[];
  disciplines: Discipline[];
  disciplineFields: DisciplineField[];
  squads: Squad[];
  competitions: Competition[];
  statuses: Status[];
  existingScores: Score[];
  squadDisciplineStatuses: { [key: string]: number };
  loading: boolean;
  isInitializing: boolean;
  loadInitialData: () => Promise<void>;
  setParticipants: (participants: Participant[]) => void;
  setDisciplines: (disciplines: Discipline[]) => void;
  setDisciplineFields: (fields: DisciplineField[]) => void;
  setSquads: (squads: Squad[]) => void;
  setCompetitions: (competitions: Competition[]) => void;
  setStatuses: (statuses: Status[]) => void;
  setExistingScores: (scores: Score[]) => void;
  setSquadDisciplineStatuses: (statuses: { [key: string]: number }) => void;
}

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useScoreData({
  eventId
}: UseScoreDataProps): UseScoreDataReturn {
  
  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [existingScores, setExistingScores] = useState<Score[]>([]);
  const [squadDisciplineStatuses, setSquadDisciplineStatuses] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const loadInitialData = async () => {
    if (isInitializing) return; // Prevent duplicate calls
    
    console.log('Loading initial data for eventId:', eventId);
    setLoading(true);
    setIsInitializing(true);
    
    try {
      // Load all participants for the event
      const participantsResponse = await apiGet(`/event-participants?eventId=${eventId}&includeAvailable=true`);
      await delay(100);
      
      const participantsData = participantsResponse?.participants || [];
      setParticipants(participantsData);
      
      // Load squads for the event
      const squadsData = await apiGet(`/squad-management?eventId=${eventId}`);
      await delay(100);
      console.log('Loaded squads:', squadsData);
      setSquads(squadsData.squads || []);
      
      // Load all disciplines/competitions for the event
      const competitionsData = await apiGet(`/competitions?eventId=${eventId}`);
      await delay(100);
      console.log('Loaded competitions:', competitionsData);
      setCompetitions(competitionsData || []);
      
      // Load all disciplines from all competitions and track their competition associations
      let allDisciplines: Discipline[] = [];
      const disciplineToCompetitionMap = new Map<number | string, number>();
      
      console.log('🔍 DEBUG: Starting discipline loading for competitions:', competitionsData?.map((c: any) => ({ id: c.id, name: c.name })));
      
      for (const competition of competitionsData || []) {
        try {
          await delay(50);
          console.log(`🔍 Loading disciplines for competition ${competition.id} (${competition.name})`);
          const disciplinesData = await apiGet(`/competitions/${competition.id}/disciplines`);
          const competitionDisciplines = disciplinesData.disciplines || [];
          
          console.log(`🔍 Competition ${competition.id} returned ${competitionDisciplines.length} disciplines:`, 
            competitionDisciplines.map((d: any) => ({ id: d.int_disziplinid, name: d.var_name })));
          
          // Track which competition each discipline belongs to
          competitionDisciplines.forEach((discipline: Discipline) => {
            const disciplineKey = discipline.int_disziplinid || discipline.var_name;
            disciplineToCompetitionMap.set(disciplineKey, competition.id);
            console.log(`🔍 Mapped discipline "${discipline.var_name}" (ID: ${discipline.int_disziplinid}) to competition ${competition.id}`);
          });
          
          allDisciplines = [...allDisciplines, ...competitionDisciplines];
        } catch (error) {
          console.error(`❌ Error loading disciplines for competition ${competition.id}:`, error);
        }
      }
      
      console.log('🔍 Final discipline-to-competition mapping:', Array.from(disciplineToCompetitionMap.entries()));
      
      // Remove duplicate disciplines based on int_disziplinid and var_name
      const uniqueDisciplines = allDisciplines.reduce((acc: Discipline[], current: Discipline) => {
        const existingIndex = acc.findIndex(d => 
          (d.int_disziplinid && current.int_disziplinid && d.int_disziplinid === current.int_disziplinid) ||
          (d.var_name === current.var_name && d.int_disziplinid === current.int_disziplinid)
        );
        if (existingIndex === -1) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Enhance disciplines with detailed information including formulas
      const enhancedDisciplines = await Promise.all(
        uniqueDisciplines.map(async (discipline) => {
          try {
            if (discipline.int_disziplinid) {
              await delay(25);
              const detailedDiscipline = await apiGet(`/disciplines/${discipline.int_disziplinid}`);
              console.log(`Enhanced discipline ${discipline.int_disziplinid}:`, detailedDiscipline);
              return {
                ...discipline,
                ...detailedDiscipline,
                var_formel: detailedDiscipline.advanced_formula || detailedDiscipline.formula || detailedDiscipline.var_formel,
                formula_name: detailedDiscipline.formula_name,
                maxScore: discipline.maxScore || detailedDiscipline.maxScore
              };
            }
            return discipline;
          } catch (error) {
            console.error(`Error loading detailed info for discipline ${discipline.int_disziplinid}:`, error);
            return discipline;
          }
        })
      );
      
      setDisciplines(enhancedDisciplines);
      console.log('All loaded disciplines (before dedup):', allDisciplines);
      console.log('Unique disciplines (after dedup):', uniqueDisciplines);
      console.log('Enhanced disciplines (with formulas):', enhancedDisciplines);
      
      // Load discipline fields for all disciplines
      try {
        const disciplineFieldsData = await apiGet('/discipline-fields');
        console.log('Loaded discipline fields:', disciplineFieldsData);
        setDisciplineFields(disciplineFieldsData || []);
      } catch (error) {
        console.error('Error loading discipline fields:', error);
      }
      
      // Load existing scores for the event
      let loadedScores: Score[] = [];
      try {
        console.log('Fetching ALL scores with URL:', `/scores?eventId=${eventId}&limit=1000`);
        const scoresData = await apiGet(`/scores?eventId=${eventId}&limit=1000`);
        console.log('Raw scores response:', scoresData);
        loadedScores = scoresData?.results || [];
        console.log('Loaded existing scores:', loadedScores);
        console.log('Number of existing scores:', loadedScores.length);
        if (loadedScores.length > 0) {
          console.log('Sample score object:', loadedScores[0]);
        }
        setExistingScores(loadedScores);
      } catch (error) {
        console.error('Error loading existing scores:', error);
      }
      
      // Load available statuses
      try {
        const statusesData = await apiGet('/statuses?limit=100');
        await delay(100);
        console.log('Loaded statuses:', statusesData);
        setStatuses(statusesData.statuses || []);
      } catch (error) {
        console.error('Error loading statuses:', error);
      }

      // Load current squad status from database
      try {
        if (eventId) {
          const squadDisciplinesData = await apiGet(`/squad-disciplines?eventId=${eventId}`);
          console.log('Loaded squad disciplines:', squadDisciplinesData);
          
          const statusMap: { [key: string]: number } = {};
          squadDisciplinesData.squadDisciplines?.forEach((sd: any) => {
            const key = `${sd.squadName}-${sd.disciplineId}`;
            statusMap[key] = sd.statusId;
          });
          setSquadDisciplineStatuses(statusMap);
        }
      } catch (error) {
        console.error('Error loading squad statuses:', error);
        setSquadDisciplineStatuses({});
      }
      
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      
      if (error.message?.includes('429')) {
        console.warn('Rate limited while loading initial data, API will handle retry automatically');
      } else {
        alert('Failed to load initial data. Please refresh the page.');
      }
    } finally {
      setLoading(false);
      setIsInitializing(false);
    }
  };

  return {
    participants,
    disciplines,
    disciplineFields,
    squads,
    competitions,
    statuses,
    existingScores,
    squadDisciplineStatuses,
    loading,
    isInitializing,
    loadInitialData,
    setParticipants,
    setDisciplines,
    setDisciplineFields,
    setSquads,
    setCompetitions,
    setStatuses,
    setExistingScores,
    setSquadDisciplineStatuses
  };
}
