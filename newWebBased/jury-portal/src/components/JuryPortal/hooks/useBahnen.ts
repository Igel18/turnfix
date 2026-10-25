/**
 * useBahnen — loads the Bahnen (lanes) per Durchgang with their competitions and squads
 * so the jury can pick a Bahn after the discipline.
 */

import { useState, useEffect } from 'react';
import type { BahnDetail } from '../JuryPortal.types';
import { API_BASE_URL } from '../JuryPortal.types';

interface UseBahnenReturn {
  bahnen: BahnDetail[];
  loading: boolean;
}

export function useBahnen(eventId: number | null): UseBahnenReturn {
  const [bahnen, setBahnen] = useState<BahnDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setBahnen([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/time-planning/bahn-details?eventId=${eventId}`);
        const data = response.ok ? await response.json() : null;
        if (!cancelled) setBahnen(Array.isArray(data?.bahnen) ? data.bahnen : []);
      } catch {
        if (!cancelled) setBahnen([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [eventId]);

  return { bahnen, loading };
}
