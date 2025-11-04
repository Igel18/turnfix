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
import { apiPost } from '@/utils/api';

interface UseSquadDisciplineStatusProps {
  eventId: string | null;
  activeSquad: string;
  activeDiscipline: number | string | '';
}

interface UseSquadDisciplineStatusReturn {
  squadStatus: number | null;
  squadDisciplineStatuses: { [key: string]: number };
  setSquadStatus: (status: number | null) => void;
  handleSquadStatusChange: (statusId: string) => Promise<void>;
}

export function useSquadDisciplineStatus({
  eventId,
  activeSquad,
  activeDiscipline
}: UseSquadDisciplineStatusProps): UseSquadDisciplineStatusReturn {
  const [squadStatus, setSquadStatus] = useState<number | null>(null);
  const [squadDisciplineStatuses, setSquadDisciplineStatuses] = useState<{ [key: string]: number }>({});

  // Load squad-discipline statuses from API
  useEffect(() => {
    const loadSquadDisciplineStatuses = async () => {
      if (!eventId) return;

      try {
        const response = await fetch(`/api/squad-discipline-status?eventId=${eventId}`);
        const data = await response.json();

        const statusMap: { [key: string]: number } = {};
        data.forEach((item: any) => {
          const key = `${item.squad_name}-${item.discipline_id}`;
          statusMap[key] = item.status_id;
        });

        setSquadDisciplineStatuses(statusMap);

        // Set current squad status if available
        if (activeSquad && activeDiscipline) {
          const key = `${activeSquad}-${activeDiscipline}`;
          setSquadStatus(statusMap[key] || null);
        }
      } catch (error) {
        console.error('Failed to load squad-discipline statuses:', error);
      }
    };

    loadSquadDisciplineStatuses();
  }, [eventId, activeSquad, activeDiscipline]);

  // Update squad status when selection changes
  useEffect(() => {
    if (activeSquad && activeDiscipline) {
      const key = `${activeSquad}-${activeDiscipline}`;
      setSquadStatus(squadDisciplineStatuses[key] || null);
    }
  }, [activeSquad, activeDiscipline, squadDisciplineStatuses]);

  // Handler for squad status change
  const handleSquadStatusChange = async (statusId: string) => {
    const numericStatusId = parseInt(statusId);
    if (isNaN(numericStatusId) || !activeSquad || !activeDiscipline || !eventId) {
      return;
    }

    setSquadStatus(numericStatusId);

    const key = `${activeSquad}-${activeDiscipline}`;
    setSquadDisciplineStatuses(prev => ({
      ...prev,
      [key]: numericStatusId
    }));

    // Save to API
    try {
      await apiPost('/squad-discipline-status', {
        eventId: Number(eventId),
        squadName: activeSquad,
        disciplineId: typeof activeDiscipline === 'number' ? activeDiscipline : null,
        disciplineName: typeof activeDiscipline === 'string' ? activeDiscipline : null,
        statusId: numericStatusId
      });
    } catch (error) {
      console.error('Failed to save squad-discipline status:', error);
    }
  };

  return {
    squadStatus,
    squadDisciplineStatuses,
    setSquadStatus,
    handleSquadStatusChange
  };
}
