/**
 * useActiveSquads — polls the active-squads endpoint every 60 seconds
 * so the SquadSelection screen can highlight the squads that are currently
 * on the competition floor.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ActiveSquadInfo, ActiveSquadsResponse } from '../JuryPortal.types';
import { API_BASE_URL } from '../JuryPortal.types';

interface UseActiveSquadsReturn {
  activeSquadInfos: ActiveSquadInfo[];
  currentTime: string;
  loading: boolean;
  /** Call this to immediately re-fetch (e.g. when the user lands on the squad screen) */
  refresh: () => void;
}

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useActiveSquads(eventId: number | null): UseActiveSquadsReturn {
  const [activeSquadInfos, setActiveSquadInfos] = useState<ActiveSquadInfo[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchActive = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const resp = await fetch(
        `${API_BASE_URL}/time-planning/active-squads?eventId=${eventId}`
      );
      if (!resp.ok) return;
      const data: ActiveSquadsResponse = await resp.json();
      setActiveSquadInfos(data.squadInfos ?? []);
      setCurrentTime(data.currentTime ?? '');
    } catch {
      // Silently ignore — time-based highlights are best-effort
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Fetch on mount and whenever eventId changes
  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  // Periodic refresh
  useEffect(() => {
    if (!eventId) return;
    const id = setInterval(fetchActive, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [eventId, fetchActive]);

  return { activeSquadInfos, currentTime, loading, refresh: fetchActive };
}
