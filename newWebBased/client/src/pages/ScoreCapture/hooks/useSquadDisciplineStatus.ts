/**
 * useSquadDisciplineStatus Hook
 * Point 123: Separation of Concerns - Squad/Discipline Status Management
 * 
 * Manages squad-discipline status combinations:
 * - Load squad-discipline statuses from API
 * - Update current squad status based on selection
 * - Save status changes to backend
 */

import { useState, useEffect } from 'react';

interface UseSquadDisciplineStatusProps {
  eventId: string | null;
  activeSquad: string;
  activeDiscipline: number | string | '';
  squadDisciplineStatuses: { [key: string]: number };
  onSquadDisciplineStatusChange?: (key: string, statusId: number) => void;
}

interface UseSquadDisciplineStatusReturn {
  squadStatus: number | null;
  setSquadStatus: (status: number | null) => void;
  handleSquadStatusChange: (statusId: string) => Promise<void>;
}

export function useSquadDisciplineStatus({
  eventId,
  activeSquad,
  activeDiscipline,
  squadDisciplineStatuses,
  onSquadDisciplineStatusChange
}: UseSquadDisciplineStatusProps): UseSquadDisciplineStatusReturn {
  const [squadStatus, setSquadStatus] = useState<number | null>(null);

  // Update squad status whenever the selection or the loaded status map changes
  useEffect(() => {
    if (activeSquad && activeDiscipline) {
      const key = `${activeSquad}-${activeDiscipline}`;
      setSquadStatus(squadDisciplineStatuses[key] ?? null);
    } else {
      setSquadStatus(null);
    }
  }, [activeSquad, activeDiscipline, squadDisciplineStatuses]);

  // Handler for squad status change – uses PUT /:squadName/:disciplineId/status
  const handleSquadStatusChange = async (statusId: string) => {
    const numericStatusId = parseInt(statusId);
    if (isNaN(numericStatusId) || !activeSquad || !activeDiscipline || !eventId) {
      return;
    }

    const disciplineId = typeof activeDiscipline === 'number' ? activeDiscipline : null;
    if (!disciplineId) return;

    setSquadStatus(numericStatusId);

    const key = `${activeSquad}-${activeDiscipline}`;
    onSquadDisciplineStatusChange?.(key, numericStatusId);

    try {
      const response = await fetch(
        `/api/squad-disciplines/${encodeURIComponent(activeSquad)}/${disciplineId}/status?eventId=${eventId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statusId: numericStatusId })
        }
      );
      if (!response.ok) {
        console.error('Failed to save squad-discipline status:', await response.text());
      }
    } catch (error) {
      console.error('Failed to save squad-discipline status:', error);
    }
  };

  return {
    squadStatus,
    setSquadStatus,
    handleSquadStatusChange
  };
}
