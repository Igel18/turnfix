/**
 * ScheduleMatrixView — Zeitplan-Tabelle (Schedule Matrix)
 * Point 85: Time Planning tabular view
 *
 * Columns = disciplines (devices), Rows = rotation slots, Cells = squad dropdowns.
 * Assignments are persisted in tfx_riegen_x_disziplinen (no schema change needed):
 *   int_runde      → row (rotation slot 1, 2, …)
 *   int_disziplinenid → column (discipline)
 *   var_riege      → cell value (squad name)
 *
 * Column order is persisted in localStorage per eventId (no schema change needed).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import { apiGet, apiPut } from '@/utils/api';
import type { TimeSettings, MatrixData, MatrixDiscipline, SessionGroup } from '../TimePlanning.types';

// ── localStorage column-order helpers ────────────────────────────────────────

function loadColOrder(eventId: string): number[] {
  try {
    const v = localStorage.getItem(`schedule-matrix-cols-${eventId}`);
    return v ? (JSON.parse(v) as number[]) : [];
  } catch {
    return [];
  }
}

function saveColOrder(eventId: string, disciplines: MatrixDiscipline[]): void {
  localStorage.setItem(
    `schedule-matrix-cols-${eventId}`,
    JSON.stringify(disciplines.map(d => d.id))
  );
}

/** Re-order disciplines according to saved ids; unknowns are appended at the end. */
function applyColOrder(disciplines: MatrixDiscipline[], savedIds: number[]): MatrixDiscipline[] {
  if (savedIds.length === 0) return disciplines;
  return [...disciplines].sort((a, b) => {
    const ia = savedIds.indexOf(a.id);
    const ib = savedIds.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

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

/**
 * Build a round → time map for the schedule matrix.
 *
 * The rotation interval for each session is derived from:
 *   maxSquadParticipantCount × exerciseDurationMinutes
 * (the same formula used in the Durchgänge view).
 *
 * Sessions are separated by their configured startTime.  The number of rounds
 * that fit in a session is:  floor((nextSessionStart - thisSessionStart) / interval).
 * The last (or only) session receives all remaining rounds.
 *
 * Falls back to an empty map when sessionGroups is empty/missing, so callers
 * can fall back to the simple calculateRoundTime helper.
 */
export function buildRoundTimeMap(
  totalRounds: number,
  sessionGroups: Pick<SessionGroup, 'session' | 'startTime' | 'squads'>[],
  exerciseDurationMinutes: number,
  fallbackIntervalMinutes: number
): Map<number, string> {
  const result = new Map<number, string>();

  const sorted = [...sessionGroups]
    .filter(sg => sg.startTime)
    .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));

  if (sorted.length === 0) return result;

  const toMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  let currentRound = 1;
  for (let si = 0; si < sorted.length; si++) {
    const sg = sorted[si];
    const maxParticipants =
      sg.squads.length > 0
        ? Math.max(...sg.squads.map(s => s.participantCount || 1))
        : 1;
    const interval = Math.max(
      1,
      maxParticipants > 0 ? maxParticipants * exerciseDurationMinutes : fallbackIntervalMinutes
    );
    const start = sg.startTime!;

    let roundsInSession: number;
    if (si < sorted.length - 1) {
      const nextStart = sorted[si + 1].startTime!;
      const durationMinutes = toMinutes(nextStart) - toMinutes(start);
      roundsInSession = Math.max(1, Math.floor(durationMinutes / interval));
    } else {
      roundsInSession = totalRounds - currentRound + 1;
    }

    for (let idx = 0; idx < roundsInSession && currentRound <= totalRounds; idx++, currentRound++) {
      result.set(currentRound, addMinutesToTime(start, idx * interval));
    }
  }

  return result;
}

/**
 * Compute the set of conflicting cell keys ("disciplineId_round") where the
 * same squad is assigned to more than one discipline in the same round.
 * Pure function — safe to call in tests without any React context.
 */
export function buildConflictCells(assignments: { disciplineId: number; round: number; squadName: string }[]): Set<string> {
  const result = new Set<string>();
  // round → squadName → [disciplineIds]
  const byRound = new Map<number, Map<string, number[]>>();
  for (const a of assignments) {
    if (!a.squadName) continue;
    if (!byRound.has(a.round)) byRound.set(a.round, new Map());
    const bySquad = byRound.get(a.round)!;
    if (!bySquad.has(a.squadName)) bySquad.set(a.squadName, []);
    bySquad.get(a.squadName)!.push(a.disciplineId);
  }
  for (const [round, bySquad] of byRound) {
    for (const discIds of bySquad.values()) {
      if (discIds.length > 1) {
        for (const discId of discIds) {
          result.add(`${discId}_${round}`);
        }
      }
    }
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ScheduleMatrixViewProps {
  eventId: string;
  timeSettings: TimeSettings;
  /** Earliest competition start time (HH:MM) used as round-1 anchor. Falls back to '09:00'. */
  baseStartTime: string | null;
  /** The selected event (used for PDF header/footer). */
  selectedEvent?: {
    int_eventid?: number;
    var_eventname?: string;
    dat_eventstartdate?: string;
    dat_eventenddate?: string;
    var_location?: string;
    status?: string;
  } | null;
  /** Callback to register the printMatrix function with the parent (for header button). */
  onRegisterPrint?: (fn: () => Promise<void>) => void;
  /** Session groups for visual Durchgang separators and per-session interval calculation. */
  sessionGroups?: SessionGroup[];
}

export function ScheduleMatrixView({ eventId, timeSettings, baseStartTime, selectedEvent, onRegisterPrint, sessionGroups }: ScheduleMatrixViewProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [localMaxRound, setLocalMaxRound] = useState(1);
  const [localDisciplines, setLocalDisciplines] = useState<MatrixDiscipline[]>([]);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Drag-and-drop column state
  const [dragColId, setDragColId] = useState<number | null>(null);
  const [dragOverColId, setDragOverColId] = useState<number | null>(null);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data: MatrixData = await apiGet(`/time-planning/matrix?eventId=${eventId}`);
      setMatrixData(data);
      setLocalMaxRound(Math.max(data.maxRound, 1));
      // Apply saved column order (persisted in localStorage per event)
      const savedOrder = loadColOrder(eventId);
      setLocalDisciplines(applyColOrder(data.disciplines, savedOrder));
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
    setSaveError(null);

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
      setSaveError(t('timePlanning.matrix.saveError'));
      loadMatrix(); // revert optimistic update on error
    } finally {
      setSavingCell(null);
    }
  };

  // ── Column drag-and-drop ─────────────────────────────────────────────────────

  const handleColDragStart = (e: React.DragEvent, id: number) => {
    setDragColId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColId(id);
  };

  const handleColDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragColId === null || dragColId === targetId) {
      setDragColId(null);
      setDragOverColId(null);
      return;
    }
    setLocalDisciplines(prev => {
      const next = [...prev];
      const fromIdx = next.findIndex(d => d.id === dragColId);
      const toIdx = next.findIndex(d => d.id === targetId);
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      saveColOrder(eventId, next);
      return next;
    });
    setDragColId(null);
    setDragOverColId(null);
  };

  const handleColDragEnd = () => {
    setDragColId(null);
    setDragOverColId(null);
  };

  // ── printMatrix — defined here (before early returns) to satisfy Rules of Hooks ──

  const printMatrix = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { setupPDFWithHeaderFooter, getUnifiedTableStyles } = await import('@/utils/pdfUtils');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const contentArea = setupPDFWithHeaderFooter(doc, selectedEvent as any, t('timePlanning.matrix.printTitle'));

      const startTimePdf = baseStartTime || '09:00';
      const interval = timeSettings.rotationIntervalMinutes;

      // Use the same per-session interval calculation as the UI
      const pdfRoundTimeMap = buildRoundTimeMap(
        localMaxRound,
        sessionGroups ?? [],
        timeSettings.exerciseDurationMinutes,
        interval
      );
      const getPdfRoundTime = (r: number): string =>
        pdfRoundTimeMap.get(r) ?? calculateRoundTime(startTimePdf, r, interval);

      const head = [
        [t('timePlanning.matrix.time'), ...localDisciplines.map(d => d.shortName || d.name)],
      ];

      const colCount = localDisciplines.length + 1; // time column + discipline columns
      const body: any[] = [];
      let lastSession: number | null = null;

      Array.from({ length: localMaxRound }, (_, i) => i + 1).forEach(round => {
        const timeStr = getPdfRoundTime(round);

        // Insert a Durchgang section header row when session changes
        if (sessionGroups && sessionGroups.length >= 2) {
          // Find which session this round belongs to (latest startTime <= roundTime)
          let bestSg: { session: number; startTime: string } | null = null;
          for (const sg of sessionGroups) {
            if (sg.startTime && sg.startTime <= timeStr) {
              if (!bestSg || sg.startTime > bestSg.startTime) {
                bestSg = { session: sg.session, startTime: sg.startTime };
              }
            }
          }
          if (bestSg && bestSg.session !== lastSession) {
            lastSession = bestSg.session;
            const label = `${t('timePlanning.round', 'Durchgang')} ${bestSg.session}  –  ${t('timePlanning.startTime', 'Startzeit')}: ${bestSg.startTime}`;
            body.push([{ content: label, colSpan: colCount, styles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 } }]);
          }
        }

        body.push([timeStr, ...localDisciplines.map(d =>
          matrixData?.assignments.find(a => a.disciplineId === d.id && a.round === round)?.squadName || ''
        )]);
      });

      autoTable(doc, {
        startY: contentArea.startY,
        head,
        body,
        ...getUnifiedTableStyles(),
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 } },
        margin: { left: 14, right: 14 },
      });

      doc.save(`zeitplan-tabelle-${eventId}.pdf`);
    } catch (err) {
      console.error('[ScheduleMatrixView] PDF print failed', err);
    }
  }, [localMaxRound, localDisciplines, matrixData, baseStartTime, timeSettings, selectedEvent, eventId, t]);

  // Register print function with parent so the header button can trigger it
  useEffect(() => {
    onRegisterPrint?.(printMatrix);
  }, [printMatrix, onRegisterPrint]);

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

  // Per-session rotation intervals based on max squad size × exercise duration.
  // Falls back to the fixed rotationIntervalMinutes when no sessionGroups are available.
  const roundTimeMap = buildRoundTimeMap(
    localMaxRound,
    sessionGroups ?? [],
    timeSettings.exerciseDurationMinutes,
    intervalMinutes
  );
  const getRoundTime = (round: number): string =>
    roundTimeMap.get(round) ?? calculateRoundTime(startTime, round, intervalMinutes);

  // Determine which session (Durchgang) a given round time belongs to.
  // Returns the session with the latest startTime that is <= roundTime.
  // Only active when there are 2+ sessions (single-session events need no header).
  const getSessionForTime = (roundTime: string): { session: number; startTime: string } | null => {
    if (!sessionGroups || sessionGroups.length < 2) return null;
    let best: { session: number; startTime: string } | null = null;
    for (const sg of sessionGroups) {
      if (sg.startTime && sg.startTime <= roundTime) {
        if (!best || sg.startTime > best.startTime) {
          best = { session: sg.session, startTime: sg.startTime };
        }
      }
    }
    return best;
  };

  // Build a Set of "disciplineId_round" keys for every cell where the same
  // squad appears in more than one discipline in the same round (conflict).
  const conflictCells = buildConflictCells(matrixData?.assignments ?? []);

  const localDiscIds = new Set(localDisciplines.map(d => d.id));
  const availableForPicker = (matrixData.availableDisciplines ?? []).filter(d => !localDiscIds.has(d.id));

  const handleAddColumn = (disciplineIdStr: string) => {
    const disciplineId = parseInt(disciplineIdStr);
    if (!disciplineId) return;
    const disc = (matrixData.availableDisciplines ?? []).find(d => d.id === disciplineId);
    if (disc) {
      setLocalDisciplines(prev => {
        const next = [...prev, disc];
        saveColOrder(eventId, next);
        return next;
      });
    }
  };

  const handleRemoveLastColumn = () => {
    setLocalDisciplines(prev => {
      const next = prev.slice(0, -1);
      saveColOrder(eventId, next);
      return next;
    });
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
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700 flex items-center gap-3">
        <span>{t('timePlanning.matrix.info', { interval: intervalMinutes })}</span>
        <span className="text-blue-400 text-xs flex items-center gap-1">
          <GripVertical className="w-3 h-3" />
          {t('timePlanning.matrix.dragHint')}
        </span>
      </div>

      {/* Save error */}
      {saveError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

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
                  draggable
                  onDragStart={e => handleColDragStart(e, disc.id)}
                  onDragOver={e => handleColDragOver(e, disc.id)}
                  onDrop={e => handleColDrop(e, disc.id)}
                  onDragEnd={handleColDragEnd}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] select-none transition-colors ${
                    dragColId === disc.id
                      ? 'opacity-40 bg-blue-50'
                      : dragOverColId === disc.id
                      ? 'bg-blue-100 border-l-2 border-blue-400'
                      : 'cursor-grab hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-800">{disc.shortName || disc.name}</div>
                      {disc.shortName && disc.name !== disc.shortName && (
                        <div className="text-gray-400 font-normal normal-case text-xs mt-0.5">{disc.name}</div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: localMaxRound }, (_, i) => i + 1).map((round, idx) => {
              const roundTime = getRoundTime(round);
              const sessionInfo = getSessionForTime(roundTime);
              const prevRoundTime = idx > 0 ? getRoundTime(round - 1) : null;
              const prevSessionInfo = prevRoundTime ? getSessionForTime(prevRoundTime) : null;
              const isNewSession = sessionInfo !== null && sessionInfo.session !== prevSessionInfo?.session;
              return (
                <React.Fragment key={round}>
                  {isNewSession && (
                    <tr className="bg-blue-600 text-white">
                      <td colSpan={localDisciplines.length + 1} className="px-4 py-2 font-semibold text-sm">
                        {t('timePlanning.round', 'Durchgang')} {sessionInfo!.session}
                        <span className="ml-3 font-normal opacity-90 text-xs">
                          {t('timePlanning.startTime', 'Startzeit')}: {sessionInfo!.startTime}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900 bg-gray-50">
                      {roundTime}
                    </td>
                    {localDisciplines.map(disc => {
                      const cellKey = `${disc.id}_${round}`;
                      const isSaving = savingCell === cellKey;
                      const value = getCellValue(disc.id, round);
                      const isConflict = conflictCells.has(cellKey);
                      return (
                        <td key={disc.id} className="px-3 py-2">
                          <select
                            value={value}
                            onChange={e => handleCellChange(disc.id, round, e.target.value)}
                            disabled={isSaving}
                            title={isConflict ? t('timePlanning.matrix.conflictTooltip', 'Diese Riege ist in diesem Zeitslot bereits einem anderen Gerät zugewiesen!') : undefined}
                            className={`w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              isSaving
                                ? 'opacity-50 cursor-wait bg-gray-100 border-gray-300'
                                : isConflict
                                ? 'bg-red-50 border-red-500 border-2 text-red-800 ring-1 ring-red-400'
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
                </React.Fragment>
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
            onClick={handleRemoveLastColumn}
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
