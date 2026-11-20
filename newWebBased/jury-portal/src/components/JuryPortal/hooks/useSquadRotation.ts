/**
 * useSquadRotation — loads the chosen squad's device order and completion statuses.
 */

import { useState, useEffect, useCallback } from 'react';
import type { RotationDevice } from '../JuryPortal.types';
import { API_BASE_URL } from '../JuryPortal.types';

interface UseSquadRotationReturn {
  rotation: RotationDevice[];
  completedDisciplineIds: number[];
  loading: boolean;
  refresh: () => () => void;
}

interface SquadDisciplineStatus {
  disciplineId?: number;
  status?: { name?: string | null } | null;
}

export function useSquadRotation(eventId: number | null, squadName: string | undefined): UseSquadRotationReturn {
  const [rotation, setRotation] = useState<RotationDevice[]>([]);
  const [completedDisciplineIds, setCompletedDisciplineIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!eventId || !squadName) {
      setRotation([]);
      setCompletedDisciplineIds([]);
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [rotationResponse, statusResponse] = await Promise.all([
          fetch(
            `${API_BASE_URL}/time-planning/squad-rotation?eventId=${eventId}&squad=${encodeURIComponent(squadName)}`
          ),
          fetch(
            `${API_BASE_URL}/squad-disciplines?eventId=${eventId}&squadName=${encodeURIComponent(squadName)}`
          ),
        ]);
        if (!rotationResponse || !statusResponse || !rotationResponse.ok || !statusResponse.ok) {
          throw new Error(
            `Failed to load squad rotation or status (${rotationResponse?.status ?? 'no response'}, ${statusResponse?.status ?? 'no response'})`
          );
        }

        const [rotationData, statusData] = await Promise.all([
          rotationResponse.json(),
          statusResponse.json(),
        ]);
        if (cancelled) return;

        setRotation(Array.isArray(rotationData?.devices) ? rotationData.devices : []);
        const completedIds = Array.isArray(statusData?.squadDisciplines)
          ? statusData.squadDisciplines
              .filter((item: SquadDisciplineStatus) =>
                item?.status?.name?.trim()?.toLowerCase() === 'leistungen erfasst'
              )
              .map((item: any) => Number(item.disciplineId))
              .filter((id: number) => Number.isFinite(id))
          : [];
        setCompletedDisciplineIds([...new Set<number>(completedIds)]);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load squad rotation and completion status:', error);
          setRotation([]);
          setCompletedDisciplineIds([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [eventId, squadName]);

  useEffect(() => {
    return refresh();
  }, [refresh]);

  return { rotation, completedDisciplineIds, loading, refresh };
}
