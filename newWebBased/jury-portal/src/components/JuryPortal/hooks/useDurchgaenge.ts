/**
 * useDurchgaenge — loads the Durchgänge (competition rounds) with their squads
 * so the jury can pick a Durchgang before picking a squad.
 */

import { useState, useEffect } from 'react';
import type { Durchgang } from '../JuryPortal.types';
import { API_BASE_URL } from '../JuryPortal.types';

interface UseDurchgaengeReturn {
  durchgaenge: Durchgang[];
  loading: boolean;
}

export function useDurchgaenge(eventId: number | null): UseDurchgaengeReturn {
  const [durchgaenge, setDurchgaenge] = useState<Durchgang[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setDurchgaenge([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/time-planning/durchgaenge?eventId=${eventId}`);
        const data = response.ok ? await response.json() : null;
        if (!cancelled) {
          setDurchgaenge(Array.isArray(data?.durchgaenge) ? data.durchgaenge : []);
        }
      } catch {
        if (!cancelled) setDurchgaenge([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [eventId]);

  return { durchgaenge, loading };
}
