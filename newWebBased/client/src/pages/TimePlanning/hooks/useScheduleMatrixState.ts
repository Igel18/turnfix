import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPut } from '@/utils/api';
import type { MatrixData } from '../TimePlanning.types';
import {
  addDisciplineColumn,
  buildColumnList,
  consolidateColumns,
  parseStoredColumns,
  removeDisciplineColumn,
  removeLastDisciplineColumn,
  reorderColumns,
  serializeColumns,
  type DisciplineColumn,
  type StoredColumn,
} from '../matrixColumnHelpers';
import type { SquadCellActualTimes } from '../components/ScheduleRoundPlanTable';

const columnStorageKey = (eventId: string) => `schedule-matrix-cols-${eventId}`;
const actualTimesStorageKey = (eventId: string) => `time-planning-ist-times-${eventId}-all`;

export function useScheduleMatrixState(
  eventId: string,
  sessionGroups?: unknown,
) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [localMaxRound, setLocalMaxRound] = useState(1);
  const [squadCellSaving, setSquadCellSaving] = useState<string | null>(null);
  const [actualTimesByRound, setActualTimesByRound] = useState<Record<number, SquadCellActualTimes>>({});
  const [storedColumns, setStoredColumns] = useState<StoredColumn[]>([]);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dragColKey, setDragColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

  const localColumns = useMemo(
    () => buildColumnList(storedColumns, matrixData?.disciplines ?? []),
    [storedColumns, matrixData],
  );

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data: MatrixData = await apiGet(`/time-planning/matrix?eventId=${eventId}`);
      setMatrixData(data);
      setLocalMaxRound(Math.max(data.maxRound, 1));

      let stored = parseStoredColumns(localStorage.getItem(columnStorageKey(eventId)));
      if (stored.length === 0) {
        stored = data.disciplines.map(discipline => ({ t: 'd' as const, id: discipline.id }));
      } else {
        stored = consolidateColumns(stored, data.disciplines);
      }
      setStoredColumns(stored);
    } catch (error) {
      console.error('[ScheduleMatrixView] Failed to load matrix data', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) void loadMatrix();
  }, [eventId, loadMatrix]);

  useEffect(() => {
    if (!matrixData) {
      setActualTimesByRound({});
      return;
    }

    const raw = localStorage.getItem(actualTimesStorageKey(eventId));
    if (!raw) {
      setActualTimesByRound({});
      return;
    }

    try {
      setActualTimesByRound(JSON.parse(raw) || {});
    } catch {
      setActualTimesByRound({});
    }
  }, [eventId, matrixData, sessionGroups]);

  useEffect(() => {
    if (matrixData) {
      localStorage.setItem(actualTimesStorageKey(eventId), JSON.stringify(actualTimesByRound));
    }
  }, [actualTimesByRound, eventId, matrixData, sessionGroups]);

  const getCellValue = (disciplineId: number, round: number): string => {
    return matrixData?.assignments.find(assignment =>
      assignment.disciplineId === disciplineId && assignment.round === round,
    )?.squadName ?? '';
  };

  const handleCellChange = async (disciplineId: number, round: number, squadName: string) => {
    const cellKey = `${disciplineId}_${round}`;
    setSavingCell(cellKey);
    setSaveError(null);
    setMatrixData(previous => {
      if (!previous) return previous;
      const assignments = previous.assignments.filter(
        assignment => !(assignment.disciplineId === disciplineId && assignment.round === round),
      );
      if (squadName) assignments.push({ disciplineId, round, squadName, isFirstDevice: false });
      return { ...previous, assignments };
    });

    try {
      await apiPut('/time-planning/matrix/cell', {
        eventId: parseInt(eventId),
        disciplineId,
        round,
        squadName,
      });
    } catch (error) {
      console.error('[ScheduleMatrixView] Failed to save cell', error);
      setSaveError(t('timePlanning.matrix.saveError'));
      void loadMatrix();
    } finally {
      setSavingCell(null);
    }
  };

  const getSquadRoundDiscipline = (squadName: string, round: number): number | null => {
    return matrixData?.squadRoundAssignments?.find(
      assignment => assignment.squadName === squadName && assignment.round === round,
    )?.disciplineId ?? null;
  };

  const handleSquadRoundCellChange = async (squadName: string, round: number, disciplineId: number | null) => {
    const key = `${squadName}_${round}`;
    setSquadCellSaving(key);
    setSaveError(null);
    setMatrixData(previous => {
      if (!previous) return previous;
      const assignments = (previous.squadRoundAssignments ?? []).filter(
        assignment => !(assignment.squadName === squadName && assignment.round === round),
      );
      return {
        ...previous,
        squadRoundAssignments: disciplineId === null
          ? assignments
          : [...assignments, { squadName, round, disciplineId }],
      };
    });

    try {
      await apiPut('/time-planning/matrix/squad-cell', {
        eventId: parseInt(eventId, 10),
        squadName,
        round,
        disciplineId,
      });
    } catch (error) {
      console.error('[ScheduleMatrixView] Failed to save squad-round cell', error);
      setSaveError(t('timePlanning.matrix.saveError'));
      void loadMatrix();
    } finally {
      setSquadCellSaving(null);
    }
  };

  const handleActualTimeChange = (round: number, field: keyof SquadCellActualTimes, value: string) => {
    setActualTimesByRound(previous => ({
      ...previous,
      [round]: {
        actualStart: field === 'actualStart' ? value : previous[round]?.actualStart || '',
        actualEnd: field === 'actualEnd' ? value : previous[round]?.actualEnd || '',
      },
    }));
  };

  const handleColDragStart = (event: React.DragEvent, key: string) => {
    setDragColKey(key);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (event: React.DragEvent, key: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverColKey(key);
  };

  const handleColDrop = (event: React.DragEvent, targetKey: string) => {
    event.preventDefault();
    if (!dragColKey || dragColKey === targetKey) {
      setDragColKey(null);
      setDragOverColKey(null);
      return;
    }

    const findStoredColumnIndex = (key: string): number => {
      if (key.startsWith('d|')) {
        const id = parseInt(key.slice(2));
        return storedColumns.findIndex(column => column.t === 'd' && column.id === id);
      }
      if (key.startsWith('p|')) {
        const id = key.slice(2);
        return storedColumns.findIndex(column => column.t === 'p' && column.id === id);
      }
      return -1;
    };
    const fromIndex = findStoredColumnIndex(dragColKey);
    const toIndex = findStoredColumnIndex(targetKey);
    if (fromIndex === -1 || toIndex === -1) {
      setDragColKey(null);
      setDragOverColKey(null);
      return;
    }

    setStoredColumns(previous => {
      const next = reorderColumns(previous, fromIndex, toIndex);
      localStorage.setItem(columnStorageKey(eventId), serializeColumns(next));
      return next;
    });
    setDragColKey(null);
    setDragOverColKey(null);
  };

  const handleColDragEnd = () => {
    setDragColKey(null);
    setDragOverColKey(null);
  };

  const handleAddColumn = (disciplineIdValue: string) => {
    const disciplineId = parseInt(disciplineIdValue);
    if (!disciplineId) return;
    setStoredColumns(previous => {
      const next = addDisciplineColumn(previous, disciplineId);
      localStorage.setItem(columnStorageKey(eventId), serializeColumns(next));
      return next;
    });
  };

  const handleRemoveLastColumn = () => {
    setStoredColumns(previous => {
      const next = removeLastDisciplineColumn(previous);
      localStorage.setItem(columnStorageKey(eventId), serializeColumns(next));
      return next;
    });
  };

  const handleRemoveUnlinkedColumn = (disciplineId: number) => {
    setStoredColumns(previous => {
      const next = removeDisciplineColumn(previous, disciplineId);
      localStorage.setItem(columnStorageKey(eventId), serializeColumns(next));
      return next;
    });
  };

  const discColumnsCount = localColumns.filter(column => column.kind === 'discipline').length;
  const shownDisciplineIds = new Set(
    localColumns.filter((column): column is DisciplineColumn => column.kind === 'discipline').map(column => column.id),
  );
  const availableForPicker = (matrixData?.availableDisciplines ?? [])
    .filter(discipline => !shownDisciplineIds.has(discipline.id));
  const unlinkedDisciplineIds = new Set((matrixData?.availableDisciplines ?? []).map(discipline => discipline.id));
  const isDisciplineRemovable = (column: DisciplineColumn) =>
    unlinkedDisciplineIds.has(column.id) || /^pause/i.test(column.name);

  const removePauseFromStored = (pauseId: string) => {
    setStoredColumns(previous => {
      const next = previous.filter(column => !(column.t === 'p' && column.id === pauseId));
      localStorage.setItem(columnStorageKey(eventId), serializeColumns(next));
      return next;
    });
  };

  return {
    loading,
    matrixData,
    localMaxRound,
    setLocalMaxRound,
    actualTimesByRound,
    squadCellSaving,
    savingCell,
    saveError,
    setSaveError,
    localColumns,
    dragColKey,
    dragOverColKey,
    handleCellChange,
    getCellValue,
    handleSquadRoundCellChange,
    getSquadRoundDiscipline,
    handleActualTimeChange,
    handleColDragStart,
    handleColDragOver,
    handleColDrop,
    handleColDragEnd,
    handleAddColumn,
    handleRemoveLastColumn,
    handleRemoveUnlinkedColumn,
    isDisciplineRemovable,
    removePauseFromStored,
    discColumnsCount,
    availableForPicker,
    loadMatrix,
  };
}