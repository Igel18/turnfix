/**
 * useSquadRotation — loads the devices of the chosen squad in rotation order
 * so the scoring view can show what is done, current and next.
 */

import { useState, useEffect } from 'react';
import type { RotationDevice } from '../JuryPortal.types';
import { API_BASE_URL } from '../JuryPortal.types';

interface UseSquadRotationReturn {
  rotation: RotationDevice[];
  loading: boolean;
}

export function useSquadRotation(eventId: number | null, squadName: string | undefined): UseSquadRotationReturn {
  const [rotation, setRotation] = useState<RotationDevice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId || !squadName) {
      setRotation([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/time-planning/squad-rotation?eventId=${eventId}&squad=${encodeURIComponent(squadName)}`
        );
        const data = response.ok ? await response.json() : null;
        if (!cancelled) setRotation(Array.isArray(data?.devices) ? data.devices : []);
      } catch {
        if (!cancelled) setRotation([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [eventId, squadName]);

  return { rotation, loading };
}
