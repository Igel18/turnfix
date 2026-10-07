import React from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import type { MatrixData, SessionGroup } from '../TimePlanning.types';
import { colKey, type AnyColumn, type DisciplineColumn } from '../matrixColumnHelpers';
import { getSessionSquads, getSessionVisibleColumns } from '../scheduleMatrixUtils';

interface ScheduleRoundRow {
  round: number;
  roundTime: string;
  sessionInfo: { session: number; startTime: string } | null;
}

interface ScheduleAssignmentTableProps {
  matrixData: MatrixData;
  localColumns: AnyColumn[];
  activeColumns: AnyColumn[];
  roundRows: ScheduleRoundRow[];
  hasMultipleSessions: boolean;
  selectedSession: number | null;
  sessionGroups?: SessionGroup[];
  squadNames: string[];
  dragColKey: string | null;
  dragOverColKey: string | null;
  onColumnDragStart: (event: React.DragEvent, key: string) => void;
  onColumnDragOver: (event: React.DragEvent, key: string) => void;
  onColumnDrop: (event: React.DragEvent, key: string) => void;
  onColumnDragEnd: () => void;
  getLaneLabel: (disciplineId: number) => string | null;
  isDisciplineRemovable: (column: DisciplineColumn) => boolean;
  onRemoveDiscipline: (disciplineId: number) => void;
  onRemovePause: (pauseId: string) => void;
  savingCell: string | null;
  conflictCells: Set<string>;
  getCellValue: (disciplineId: number, round: number) => string;
  onCellChange: (disciplineId: number, round: number, squadName: string) => void;
}

export function ScheduleAssignmentTable({
  matrixData,
  localColumns,
  activeColumns,
  roundRows,
  hasMultipleSessions,
  selectedSession,
  sessionGroups,
  squadNames,
  dragColKey,
  dragOverColKey,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
  getLaneLabel,
  isDisciplineRemovable,
  onRemoveDiscipline,
  onRemovePause,
  savingCell,
  conflictCells,
  getCellValue,
  onCellChange,
}: ScheduleAssignmentTableProps) {
  const { t } = useTranslation();

  const renderColumn = (column: AnyColumn, hidePause: boolean) => {
    const key = colKey(column);
    if (column.kind === 'pause') {
      if (hidePause) return null;
      const isDragging = dragColKey === key;
      const isDragOver = dragOverColKey === key;
      return (
        <th
          key={key}
          draggable
          onDragStart={event => onColumnDragStart(event, key)}
          onDragOver={event => onColumnDragOver(event, key)}
          onDrop={event => onColumnDrop(event, key)}
          onDragEnd={onColumnDragEnd}
          className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[80px] select-none transition-colors ${
            isDragging ? 'opacity-40 bg-gray-100' : isDragOver ? 'bg-gray-200 border-l-2 border-gray-400' : 'cursor-grab hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-1">
            <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <span className="text-gray-400 italic flex-1 normal-case font-normal">{column.label}</span>
            <button
              onClick={event => { event.stopPropagation(); onRemovePause(column.id); }}
              className="text-gray-300 hover:text-red-500 transition-colors ml-1 flex-shrink-0 leading-none"
              title={t('timePlanning.matrix.removeUnlinked')}
            >
              ✕
            </button>
          </div>
        </th>
      );
    }

    const isDragging = dragColKey === key;
    const isDragOver = dragOverColKey === key;
    return (
      <th
        key={key}
        draggable
        onDragStart={event => onColumnDragStart(event, key)}
        onDragOver={event => onColumnDragOver(event, key)}
        onDrop={event => onColumnDrop(event, key)}
        onDragEnd={onColumnDragEnd}
        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] select-none transition-colors ${
          isDragging ? 'opacity-40 bg-blue-50' : isDragOver ? 'bg-blue-100 border-l-2 border-blue-400' : 'cursor-grab hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-1">
          <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {getLaneLabel(column.id) && (
              <div className="text-[10px] uppercase tracking-wide text-blue-600 font-semibold normal-case">
                {getLaneLabel(column.id)}
              </div>
            )}
            <div className="font-semibold text-gray-800">{column.shortName || column.name}</div>
            {column.shortName && column.name !== column.shortName && (
              <div className="text-gray-400 font-normal normal-case text-xs mt-0.5">{column.name}</div>
            )}
          </div>
          {isDisciplineRemovable(column) && (
            <button
              onClick={event => { event.stopPropagation(); onRemoveDiscipline(column.id); }}
              className="text-gray-300 hover:text-red-500 transition-colors ml-1 flex-shrink-0 leading-none"
              title={t('timePlanning.matrix.removeUnlinked')}
            >
              ✕
            </button>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        {(!hasMultipleSessions || selectedSession !== null) && (
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                {t('timePlanning.matrix.time')}
              </th>
              {activeColumns.map(column => renderColumn(column, false))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white divide-y divide-gray-200">
          {roundRows.map((row, index) => {
            const previousSession = index > 0 ? roundRows[index - 1].sessionInfo : null;
            const isNewSession = selectedSession === null
              && row.sessionInfo !== null
              && row.sessionInfo.session !== previousSession?.session;
            const visibleColumns = selectedSession === null
              ? getSessionVisibleColumns(localColumns, matrixData.sessionDisciplineIds, row.sessionInfo?.session ?? null)
              : activeColumns;
            const sessionSquads = getSessionSquads(
              selectedSession ?? row.sessionInfo?.session ?? null,
              sessionGroups,
              squadNames,
            );

            return (
              <React.Fragment key={row.round}>
                {isNewSession && (
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <td colSpan={visibleColumns.length + 1} className="px-4 py-3">
                      <div className="text-base font-bold text-white">
                        {t('timePlanning.round', 'Durchgang')} {row.sessionInfo!.session}
                      </div>
                      <div className="text-blue-100 text-xs">
                        {t('timePlanning.startTime', 'Startzeit')}: {row.sessionInfo!.startTime}
                      </div>
                    </td>
                  </tr>
                )}
                {hasMultipleSessions && selectedSession === null && isNewSession && (
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      {t('timePlanning.matrix.time')}
                    </th>
                    {visibleColumns.map(column => renderColumn(column, true))}
                  </tr>
                )}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900 bg-gray-50">
                    {row.roundTime}
                  </td>
                  {visibleColumns.map(column => {
                    if (column.kind === 'pause') {
                      return <td key={colKey(column)} className="px-3 py-2 bg-gray-50 border-x border-gray-100" />;
                    }
                    const cellKey = `${column.id}_${row.round}`;
                    const isSaving = savingCell === cellKey;
                    const value = getCellValue(column.id, row.round);
                    const isConflict = conflictCells.has(cellKey);
                    return (
                      <td key={colKey(column)} className="px-3 py-2">
                        <select
                          value={value}
                          onChange={event => onCellChange(column.id, row.round, event.target.value)}
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
                          {sessionSquads.map(squad => <option key={squad} value={squad}>{squad}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            );
          })}
          {roundRows.length === 0 && (
            <tr>
              <td colSpan={Math.max(activeColumns.length + 1, 2)} className="px-4 py-6 text-center text-sm text-gray-500">
                {t('timePlanning.noData')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}