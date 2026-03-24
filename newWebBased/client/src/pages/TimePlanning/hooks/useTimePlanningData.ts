/**
 * useTimePlanningData hook
 * Point 124: Separation of Concerns
 *
 * Manages all data loading, grouping, and state for the TimePlanning page.
 * Moved from index.tsx to keep the main component focused on rendering.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet } from '@/utils/api';
import type { Competition, Squad, SessionGroup } from '../TimePlanning.types';

interface UseTimePlanningDataProps {
  eventId: string | null | undefined;
}

interface UseTimePlanningDataResult {
  loading: boolean;
  competitions: Competition[];
  squads: Squad[];
  squadDisciplines: any[];
  sessionGroups: SessionGroup[];
  extraRounds: number[];
  setExtraRounds: React.Dispatch<React.SetStateAction<number[]>>;
  disciplineCache: React.MutableRefObject<{ [competitionId: number]: any[] }>;
  groupCompetitionsBySessions: (comps: Competition[], squads: Squad[], extraRoundsArg?: number[]) => void;
  refetch: () => void;
}

export function useTimePlanningData({ eventId }: UseTimePlanningDataProps): UseTimePlanningDataResult {
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [squadDisciplines, setSquadDisciplines] = useState<any[]>([]);
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [extraRounds, setExtraRounds] = useState<number[]>([]);
  const disciplineCache = useRef<{ [competitionId: number]: any[] }>({});

  const groupCompetitionsBySessions = useCallback((comps: Competition[], squadsArg: Squad[], extraRoundsArg?: number[]) => {
    const sessionMap = new Map<number, Competition[]>();
    comps.forEach(comp => {
      const session = comp.round || 1;
      if (!sessionMap.has(session)) {
        sessionMap.set(session, []);
      }
      sessionMap.get(session)!.push(comp);
    });

    if (extraRoundsArg && extraRoundsArg.length > 0) {
      for (const round of extraRoundsArg) {
        if (!sessionMap.has(round)) {
          sessionMap.set(round, []);
        }
      }
    }

    const groups: SessionGroup[] = Array.from(sessionMap.entries()).map(([session, competitions]) => {
      const startTimes = competitions
        .map(c => c.startTime)
        .filter(t => t !== null)
        .sort();

      const startDates = competitions
        .map(c => c.startDate)
        .filter(d => d !== null)
        .sort();

      return {
        session,
        competitions,
        startTime: startTimes.length > 0 ? startTimes[0] : null,
        startDate: startDates.length > 0 ? startDates[0] : null,
        squads: squadsArg.filter(squad => {
          const hasIds = squad.competitionIds && competitions.some(comp =>
            squad.competitionIds!.includes(comp.id)
          );
          console.log(`[TimePlanning] Session ${session}, Squad "${squad.name}":`, {
            competitionIds: squad.competitionIds,
            sessionCompetitionIds: competitions.map(c => c.id),
            included: hasIds
          });
          return hasIds;
        })
      };
    }).sort((a, b) => a.session - b.session);

    setSessionGroups(groups);
  }, []);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const competitionsData = await apiGet(`/time-planning?eventId=${eventId}`);
      const loadedCompetitions = competitionsData.competitions || [];
      const loadedSquads = competitionsData.squads || [];
      const loadedSquadDisciplines = competitionsData.squadDisciplines || [];

      setCompetitions(loadedCompetitions);
      setSquads(loadedSquads);
      setSquadDisciplines(loadedSquadDisciplines);

      if (typeof window !== 'undefined' && (window as any).DEBUG) {
        console.log('[TimePlanning] Loaded squads:', loadedSquads);
        console.log('[TimePlanning] First squad competitionIds:', loadedSquads[0]?.competitionIds);
      }

      for (const comp of loadedCompetitions) {
        if (!disciplineCache.current[comp.id]) {
          try {
            const disciplines = await apiGet(`/competitions/${comp.id}/disciplines`);
            disciplineCache.current[comp.id] = Array.isArray(disciplines) ? disciplines : (disciplines.disciplines || []);
          } catch {
            // ignore — fallback will use generic names
          }
        }
      }

      const backendRounds = new Set(loadedCompetitions.map((c: Competition) => c.round));
      setExtraRounds(prev => {
        const filtered = prev.filter(r => !backendRounds.has(r));
        if (filtered.length !== prev.length) {
          groupCompetitionsBySessions(loadedCompetitions, loadedSquads, filtered);
          return filtered;
        } else {
          groupCompetitionsBySessions(loadedCompetitions, loadedSquads, prev);
          return prev;
        }
      });
    } catch (error) {
      console.error('Error loading time planning data:', error);
      try {
        const competitionsData = await apiGet(`/competitions?event_id=${eventId}`);
        const squadsData = await apiGet(`/squad-management?eventId=${eventId}`);
        const fallbackCompetitions = competitionsData.competitions || [];
        const fallbackSquads = squadsData.squads || [];
        setCompetitions(fallbackCompetitions);
        setSquads(fallbackSquads);
        groupCompetitionsBySessions(fallbackCompetitions, fallbackSquads);
      } catch (fallbackError) {
        console.error('Error loading fallback data:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, groupCompetitionsBySessions]);

  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, loadData]);

  return {
    loading,
    competitions,
    squads,
    squadDisciplines,
    sessionGroups,
    extraRounds,
    setExtraRounds,
    disciplineCache,
    groupCompetitionsBySessions,
    refetch,
  };
}
