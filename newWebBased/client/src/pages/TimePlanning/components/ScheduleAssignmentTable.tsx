import React from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import GroupedTableSection from '@/components/ui/GroupedTableSection'
import type { MatrixData, SessionGroup } from '../TimePlanning.types';
import { colKey, type AnyColumn, type DisciplineColumn } from '../matrixColumnHelpers';
import { getSessionSquads, getSessionVisibleColumns } from '../scheduleMatrixUtils';

const PAUSE_COLUMN_KIND = 'pause';
const UNASSIGNED_SESSION_KEY = 'unassigned';
const SESSION_GROUP_TEST_ID = 'schedule-session-group';
const pauseColumnDragClasses = {
  dragging: 'opacity-40 bg-gray-100',
  dragOver: 'bg-gray-200 border-l-2 border-gray-400',
  idle: 'cursor-grab hover:bg-gray-100',
};
const disciplineColumnDragClasses = {
  dragging: 'opacity-40 bg-blue-50',
  dragOver: 'bg-blue-100 border-l-2 border-blue-400',
  idle: 'cursor-grab hover:bg-gray-100',
};
const assignmentCellClasses = {
  saving: 'opacity-50 cursor-wait bg-gray-100 border-gray-300',
  conflict: 'bg-red-50 border-red-500 border-2 text-red-800 ring-1 ring-red-400',
  assigned: 'bg-blue-50 border-blue-300 text-blue-800',
  empty: 'bg-white border-gray-300 text-gray-500',
};

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

  const sessionGroupsForRows = roundRows.reduce<Array<{
    sessionInfo: ScheduleRoundRow['sessionInfo'];
    rows: ScheduleRoundRow[];
  }>>((groups, row) => {
    const previousGroup = groups[groups.length - 1];
    if (previousGroup && previousGroup.sessionInfo?.session === row.sessionInfo?.session) {
      previousGroup.rows.push(row);
    } else {
      groups.push({ sessionInfo: row.sessionInfo, rows: [row] });
    }
    return groups;
  }, []);

  const renderColumn = (column: AnyColumn, hidePause: boolean) => {
    const key = colKey(column);
    if (column.kind === PAUSE_COLUMN_KIND) {
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
            isDragging ? pauseColumnDragClasses.dragging : isDragOver ? pauseColumnDragClasses.dragOver : pauseColumnDragClasses.idle
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
          isDragging ? disciplineColumnDragClasses.dragging : isDragOver ? disciplineColumnDragClasses.dragOver : disciplineColumnDragClasses.idle
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
    <div className="space-y-6 p-6">
      {sessionGroupsForRows.map((group, groupIndex) => {
        const visibleColumns = selectedSession === null
          ? getSessionVisibleColumns(localColumns, matrixData.sessionDisciplineIds, group.sessionInfo?.session ?? null)
          : activeColumns;

        return (
          <GroupedTableSection
            key={`${group.sessionInfo?.session ?? UNASSIGNED_SESSION_KEY}-${groupIndex}`}
            title={group.sessionInfo
              ? `${t('timePlanning.round')} ${group.sessionInfo.session}`
              : undefined}
            description={group.sessionInfo
              ? `${t('timePlanning.startTime')}: ${group.sessionInfo.startTime}`
              : undefined}
            testId={SESSION_GROUP_TEST_ID}
          >
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      {t('timePlanning.matrix.time')}
                    </th>
                    {visibleColumns.map(column => renderColumn(column, group.sessionInfo !== null))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.rows.map(row => {
                    const sessionSquads = getSessionSquads(
                      selectedSession ?? row.sessionInfo?.session ?? null,
                      sessionGroups,
                      squadNames,
                    );
                    return (
                      <tr key={row.round} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900 bg-gray-50 text-center">
                          {row.roundTime}
                        </td>
                        {visibleColumns.map(column => {
                          if (column.kind === PAUSE_COLUMN_KIND) {
                            return <td key={colKey(column)} className="px-4 py-4 bg-gray-50 border-x border-gray-100" />;
                          }
                          const cellKey = `${column.id}_${row.round}`;
                          const isSaving = savingCell === cellKey;
                          const value = getCellValue(column.id, row.round);
                          const isConflict = conflictCells.has(cellKey);
                          return (
                            <td key={colKey(column)} className="px-4 py-4">
                              <select
                                value={value}
                                onChange={event => onCellChange(column.id, row.round, event.target.value)}
                                disabled={isSaving}
                                title={isConflict ? t('timePlanning.matrix.conflictTooltip') : undefined}
                                className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                  isSaving
                                    ? assignmentCellClasses.saving
                                    : isConflict
                                    ? assignmentCellClasses.conflict
                                    : value
                                    ? assignmentCellClasses.assigned
                                    : assignmentCellClasses.empty
                                }`}
                              >
                                <option value="">– {t('timePlanning.matrix.emptyCell')} –</option>
                                {sessionSquads.map(squad => <option key={squad} value={squad}>{squad}</option>)}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </GroupedTableSection>
        );
      })}
      {roundRows.length === 0 && (
        <div className="rounded-lg border bg-white px-4 py-6 text-center text-sm text-gray-500">
          {t('timePlanning.noData')}
        </div>
      )}
    </div>
  );
}