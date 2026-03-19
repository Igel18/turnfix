/**
 * ScheduleMatrixView — Zeitplan-Tabelle (Schedule Matrix)
 * Point 85: Time Planning tabular view
 *
 * Columns = disciplines (devices), Rows = rotation slots, Cells = squad dropdowns.
 * Assignments are persisted in tfx_riegen_x_disziplinen (no schema change needed):
 *   int_runde      → row (rotation slot 1, 2, …)
 *   int_disziplinenid → column (discipline)
 *   var_riege      → cell value (squad name)
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPut } from '@/utils/api';
import type { TimeSettings, MatrixData } from '../TimePlanning.types';

// ── Pure helpers (exported for unit testing) ─────────────────────────────────

/** Add minutes to a HH:MM time string. Wraps at 24 h. */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

/**
 * Calculate the wall-clock time for a given rotation slot.
 * Round 1 = baseTime, Round 2 = baseTime + intervalMinutes, …
 */
export function calculateRoundTime(baseTime: string, round: number, intervalMinutes: number): string {
  return addMinutesToTime(baseTime, (round - 1) * intervalMinutes);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ScheduleMatrixViewProps {
  eventId: string;
  timeSettings: TimeSettings;
  /** Earliest competition start time (HH:MM) used as round-1 anchor. Falls back to '09:00'. */
  baseStartTime: string | null;
}

export function ScheduleMatrixView({ eventId, timeSettings, baseStartTime }: ScheduleMatrixViewProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [localMaxRound, setLocalMaxRound] = useState(1);
  const [localDisciplines, setLocalDisciplines] = useState<MatrixData['disciplines']>([]);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data: MatrixData = await apiGet(`/time-planning/matrix?eventId=${eventId}`);
      setMatrixData(data);
      setLocalMaxRound(Math.max(data.maxRound, 1));
      setLocalDisciplines(data.disciplines);
    } catch (e) {
      console.error('[ScheduleMatrixView] Failed to load matrix data', e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) loadMatrix();
  }, [eventId, loadMatrix]);

  const getCellValue = (disciplineId: number, round: number): string => {
    if (!matrixData) return '';
    return matrixData.assignments.find(a => a.disciplineId === disciplineId && a.round === round)?.squadName ?? '';
  };

  const handleCellChange = async (disciplineId: number, round: number, squadName: string) => {
    const cellKey = `${disciplineId}_${round}`;
    setSavingCell(cellKey);

    // Optimistic update
    setMatrixData(prev => {
      if (!prev) return prev;
      const newAssignments = prev.assignments.filter(
        a => !(a.disciplineId === disciplineId && a.round === round)
      );
      if (squadName) {
        newAssignments.push({ disciplineId, round, squadName, isFirstDevice: false });
      }
      return { ...prev, assignments: newAssignments };
    });

    try {
      await apiPut('/time-planning/matrix/cell', {
        eventId: parseInt(eventId),
        disciplineId,
        round,
        squadName,
      });
    } catch (e) {
      console.error('[ScheduleMatrixView] Failed to save cell', e);
      loadMatrix(); // revert optimistic update on error
    } finally {
      setSavingCell(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
        {t('timePlanning.loading')}
      </div>
    );
  }

  if (!matrixData) return null;

  const { squads } = matrixData;
  const startTime = baseStartTime || '09:00';
  const intervalMinutes = timeSettings.rotationIntervalMinutes;

  const localDiscIds = new Set(localDisciplines.map(d => d.id));
  const availableForPicker = (matrixData.availableDisciplines ?? []).filter(d => !localDiscIds.has(d.id));

  const handleAddColumn = (disciplineIdStr: string) => {
    const disciplineId = parseInt(disciplineIdStr);
    if (!disciplineId) return;
    const disc = (matrixData.availableDisciplines ?? []).find(d => d.id === disciplineId);
    if (disc) setLocalDisciplines(prev => [...prev, disc]);
  };

  if (localDisciplines.length === 0 && availableForPicker.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
        {t('timePlanning.matrix.noDisciplines')}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Info strip */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
        {t('timePlanning.matrix.info', { interval: intervalMinutes })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                {t('timePlanning.matrix.time')}
              </th>
              {localDisciplines.map(disc => (
                <th
                  key={disc.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]"
                >
                  <div className="font-semibold text-gray-800">{disc.shortName || disc.name}</div>
                  {disc.shortName && disc.name !== disc.shortName && (
                    <div className="text-gray-400 font-normal normal-case text-xs mt-0.5">{disc.name}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: localMaxRound }, (_, i) => i + 1).map(round => {
              const roundTime = calculateRoundTime(startTime, round, intervalMinutes);
              return (
                <tr key={round} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900 bg-gray-50">
                    {roundTime}
                  </td>
                  {localDisciplines.map(disc => {
                    const cellKey = `${disc.id}_${round}`;
                    const isSaving = savingCell === cellKey;
                    const value = getCellValue(disc.id, round);
                    return (
                      <td key={disc.id} className="px-3 py-2">
                        <select
                          value={value}
                          onChange={e => handleCellChange(disc.id, round, e.target.value)}
                          disabled={isSaving}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            isSaving
                              ? 'opacity-50 cursor-wait bg-gray-100 border-gray-300'
                              : value
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : 'bg-white border-gray-300 text-gray-500'
                          }`}
                        >
                          <option value="">– {t('timePlanning.matrix.emptyCell')} –</option>
                          {squads.map(squad => (
                            <option key={squad} value={squad}>
                              {squad}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Row + Column controls */}
      <div className="px-4 py-3 border-t bg-gray-50 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setLocalMaxRound(prev => prev + 1)}
          className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          + {t('timePlanning.matrix.addRow')}
        </button>
        {localMaxRound > 1 && (
          <button
            onClick={() => setLocalMaxRound(prev => prev - 1)}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 bg-white hover:bg-red-50 transition-colors"
          >
            − {t('timePlanning.matrix.removeRow')}
          </button>
        )}
        <span className="text-xs text-gray-400">
          {t('timePlanning.matrix.rowsInfo', { count: localMaxRound })}
        </span>

        {/* Divider */}
        <span className="h-4 border-l border-gray-300 mx-1" />

        {/* Column controls */}
        {availableForPicker.length > 0 && (
          <select
            value=""
            onChange={e => handleAddColumn(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="">+ {t('timePlanning.matrix.addColumn')}</option>
            {availableForPicker.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}{d.shortName ? ` (${d.shortName})` : ''}
              </option>
            ))}
          </select>
        )}
        {localDisciplines.length > 1 && (
          <button
            onClick={() => setLocalDisciplines(prev => prev.slice(0, -1))}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 bg-white hover:bg-red-50 transition-colors"
          >
            − {t('timePlanning.matrix.removeColumn')}
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {t('timePlanning.matrix.columnsInfo', { count: localDisciplines.length })}
        </span>
      </div>
    </div>
  );
}
