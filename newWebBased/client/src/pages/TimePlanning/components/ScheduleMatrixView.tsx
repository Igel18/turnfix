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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import type { Competition, SessionGroup, Squad, TimeSettings } from '../TimePlanning.types';
import { ScheduleRoundPlanTable } from './ScheduleRoundPlanTable';
import {
  addMinutesToTime,
  buildConflictCells,
  buildDisciplineLaneMap,
  buildRoundTimeMap,
  buildSquadDisciplineOptions,
  calculateRoundTime,
  getSessionSquads,
  getSessionVisibleColumns,
} from '../scheduleMatrixUtils';
import { printScheduleMatrixPdf } from '../scheduleMatrixPdf';
import { ScheduleAssignmentTable } from './ScheduleAssignmentTable';
import { useScheduleMatrixState } from '../hooks/useScheduleMatrixState';

// ── Component ─────────────────────────────────────────────────────────────────

interface ScheduleMatrixViewProps {
  eventId: string;
  timeSettings: TimeSettings;
  competitions: Competition[];
  squads: Squad[];
  disciplineCache: Record<number, any[]>;
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

export function ScheduleMatrixView({
  eventId,
  timeSettings,
  competitions,
  squads,
  disciplineCache,
  baseStartTime,
  selectedEvent,
  onRegisterPrint,
  sessionGroups,
}: ScheduleMatrixViewProps) {
  const { t } = useTranslation();
  const {
    loading,
    matrixData,
    localMaxRound,
    setLocalMaxRound,
    squadCellSaving,
    actualTimesByRound,
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
  } = useScheduleMatrixState(eventId, sessionGroups);
  const [averageMinutesPerParticipant, setAverageMinutesPerParticipant] = useState<number>(3);
  const [scheduleStartTime, setScheduleStartTime] = useState<string>(baseStartTime || '09:00');

  // ── printMatrix — defined here (before early returns) to satisfy Rules of Hooks ──
  const printMatrix = useCallback(() => printScheduleMatrixPdf({
    eventId,
    totalRounds: localMaxRound,
    columns: localColumns,
    matrixData,
    baseStartTime,
    timeSettings,
    selectedEvent,
    sessionGroups,
    t,
  }), [eventId, localMaxRound, localColumns, matrixData, baseStartTime, timeSettings, selectedEvent, sessionGroups, t]);

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

  const { squads: squadNames } = matrixData;
  const startTime = baseStartTime || '09:00';
  const intervalMinutes = timeSettings.rotationIntervalMinutes;
  const hasMultipleSessions = Boolean(sessionGroups && sessionGroups.length > 1);
  // Session narrowing is handled entirely by the page-level filter now; the
  // matrix always renders all (already-filtered) sessions grouped together.
  const effectiveSelectedSession: number | null = null;

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

  const allRoundRows = Array.from({ length: localMaxRound }, (_, idx) => {
    const round = idx + 1;
    const roundTime = getRoundTime(round);
    const sessionInfo = getSessionForTime(roundTime);
    return { round, roundTime, sessionInfo };
  });

  const filteredRoundRows = effectiveSelectedSession === null
    ? allRoundRows
    : allRoundRows.filter(row => row.sessionInfo?.session === effectiveSelectedSession);

  const activeSessionSquadNames = getSessionSquads(
    effectiveSelectedSession,
    sessionGroups,
    squadNames,
  );
  const activeSquadObjects = squads.filter(squad => activeSessionSquadNames.includes(squad.name));
  const squadDisciplineOptions = buildSquadDisciplineOptions(
    activeSquadObjects,
    competitions,
    effectiveSelectedSession,
    disciplineCache,
    matrixData.disciplines,
  );
  const maxParticipants = activeSquadObjects.length > 0
    ? Math.max(...activeSquadObjects.map(squad => squad.participantCount || 1))
    : 1;
  const slotDurationMinutes = Math.max(1, Math.round(averageMinutesPerParticipant * maxParticipants));

  const plannedScheduleRows = filteredRoundRows.map((row, index) => {
    const plannedStart = addMinutesToTime(scheduleStartTime, index * slotDurationMinutes);
    const plannedEnd = addMinutesToTime(plannedStart, slotDurationMinutes);
    return {
      round: row.round,
      plannedStart,
      plannedEnd,
      switchTime: plannedEnd,
    };
  });
  const plannedCompetitionEnd = plannedScheduleRows.length > 0
    ? plannedScheduleRows[plannedScheduleRows.length - 1].plannedEnd
    : scheduleStartTime;

  const activeSessionForColumns = effectiveSelectedSession;
  const activeColumns = getSessionVisibleColumns(
    localColumns,
    matrixData.sessionDisciplineIds,
    activeSessionForColumns,
  );
  const disciplineLaneMap = buildDisciplineLaneMap(matrixData.sessionLaneDisciplineIds, effectiveSelectedSession);

  const getLaneLabel = (disciplineId: number): string | null => {
    const lanes = disciplineLaneMap.get(disciplineId);
    if (!lanes || lanes.length === 0) {
      return null;
    }
    const laneText = lanes.join('/');
    return `${t('timePlanning.laneLabel')} ${laneText}`;
  };

  // Build a Set of "disciplineId_round" keys for every cell where the same
  // squad appears in more than one discipline in the same round (conflict).
  const conflictCells = buildConflictCells(matrixData?.assignments ?? []);

  if (discColumnsCount === 0 && availableForPicker.length === 0) {
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

      <ScheduleRoundPlanTable
        squads={activeSquadObjects}
        plannedRows={plannedScheduleRows}
        disciplineOptions={squadDisciplineOptions}
        disciplines={matrixData.disciplines}
        squadCellSaving={squadCellSaving}
        getSquadRoundDiscipline={getSquadRoundDiscipline}
        onSquadRoundCellChange={handleSquadRoundCellChange}
        actualTimesByRound={actualTimesByRound}
        onActualTimeChange={handleActualTimeChange}
        averageMinutesPerParticipant={averageMinutesPerParticipant}
        onAverageMinutesPerParticipantChange={setAverageMinutesPerParticipant}
        scheduleStartTime={scheduleStartTime}
        onScheduleStartTimeChange={setScheduleStartTime}
        maxParticipants={maxParticipants}
        slotDurationMinutes={slotDurationMinutes}
        plannedCompetitionEnd={plannedCompetitionEnd}
      />

      <ScheduleAssignmentTable
        matrixData={matrixData}
        localColumns={localColumns}
        activeColumns={activeColumns}
        roundRows={filteredRoundRows}
        hasMultipleSessions={hasMultipleSessions}
        selectedSession={effectiveSelectedSession}
        sessionGroups={sessionGroups}
        squadNames={squadNames}
        dragColKey={dragColKey}
        dragOverColKey={dragOverColKey}
        onColumnDragStart={handleColDragStart}
        onColumnDragOver={handleColDragOver}
        onColumnDrop={handleColDrop}
        onColumnDragEnd={handleColDragEnd}
        getLaneLabel={getLaneLabel}
        isDisciplineRemovable={isDisciplineRemovable}
        onRemoveDiscipline={handleRemoveUnlinkedColumn}
        onRemovePause={removePauseFromStored}
        savingCell={savingCell}
        conflictCells={conflictCells}
        getCellValue={getCellValue}
        onCellChange={handleCellChange}
      />

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
        {discColumnsCount > 1 && (
          <button
            onClick={handleRemoveLastColumn}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 bg-white hover:bg-red-50 transition-colors"
          >
            − {t('timePlanning.matrix.hideColumn')}
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {t('timePlanning.matrix.columnsInfo', { count: localColumns.length })}
        </span>
      </div>
    </div>
  );
}
