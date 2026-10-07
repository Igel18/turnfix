import { useTranslation } from 'react-i18next';
import type { MatrixDiscipline, Squad } from '../TimePlanning.types';

const scheduleColumns = ['plannedStart', 'plannedEnd', 'switchTime', 'actualStart', 'actualEnd'] as const;
const actualStartField = 'actualStart';
const actualEndField = 'actualEnd';

export interface SquadCellActualTimes {
  actualStart: string;
  actualEnd: string;
}

export interface PlannedScheduleRow {
  round: number;
  plannedStart: string;
  plannedEnd: string;
  switchTime: string;
}

interface ScheduleRoundPlanTableProps {
  squads: Squad[];
  plannedRows: PlannedScheduleRow[];
  disciplineOptions: Record<string, MatrixDiscipline[]>;
  disciplines: MatrixDiscipline[];
  squadCellSaving: string | null;
  getSquadRoundDiscipline: (squadName: string, round: number) => number | null;
  onSquadRoundCellChange: (squadName: string, round: number, disciplineId: number | null) => void;
  actualTimesByRound: Record<number, SquadCellActualTimes>;
  onActualTimeChange: (round: number, field: keyof SquadCellActualTimes, value: string) => void;
  averageMinutesPerParticipant: number;
  onAverageMinutesPerParticipantChange: (value: number) => void;
  scheduleStartTime: string;
  onScheduleStartTimeChange: (value: string) => void;
  maxParticipants: number;
  slotDurationMinutes: number;
  plannedCompetitionEnd: string;
}

export function ScheduleRoundPlanTable({
  squads,
  plannedRows,
  disciplineOptions,
  disciplines,
  squadCellSaving,
  getSquadRoundDiscipline,
  onSquadRoundCellChange,
  actualTimesByRound,
  onActualTimeChange,
  averageMinutesPerParticipant,
  onAverageMinutesPerParticipantChange,
  scheduleStartTime,
  onScheduleStartTimeChange,
  maxParticipants,
  slotDurationMinutes,
  plannedCompetitionEnd,
}: ScheduleRoundPlanTableProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-4 border-b bg-white">
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('timePlanning.matrix.squadRoundPlan.averageTimePerParticipant')}
          </label>
          <input
            type="number"
            min={1}
            step={0.5}
            value={averageMinutesPerParticipant}
            onChange={event => onAverageMinutesPerParticipantChange(Number(event.target.value) || 1)}
            className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('timePlanning.matrix.squadRoundPlan.scheduleStartTime')}
          </label>
          <input
            type="time"
            value={scheduleStartTime}
            onChange={event => onScheduleStartTimeChange(event.target.value)}
            className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>
        <div className="text-sm text-gray-600">
          <div>{t('timePlanning.matrix.squadRoundPlan.maxParticipants', { count: maxParticipants })}</div>
          <div className="font-semibold text-gray-900">
            {t('timePlanning.matrix.squadRoundPlan.slotDuration', { minutes: slotDurationMinutes })}
          </div>
        </div>
        <div className="text-sm text-gray-600 ml-auto">
          <div>{t('timePlanning.matrix.squadRoundPlan.competitionEnd')}</div>
          <div className="font-semibold text-gray-900">{plannedCompetitionEnd}</div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                {t('timePlanning.round')}
              </th>
              {squads.map(squad => (
                <th key={squad.name} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  {squad.name}
                </th>
              ))}
              {scheduleColumns.map(column => (
                <th key={column} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t(`timePlanning.matrix.squadRoundPlan.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plannedRows.map(row => (
              <tr key={`squad-round-${row.round}`}>
                <td className="px-3 py-2 text-sm font-medium text-blue-700">
                  {t('timePlanning.round')} {row.round}
                </td>
                {squads.map(squad => {
                  const options = disciplineOptions[squad.name] ?? [];
                  const currentDisciplineId = getSquadRoundDiscipline(squad.name, row.round);
                  const rowKey = `${squad.name}_${row.round}`;
                  const hasCurrentValueInOptions = currentDisciplineId !== null
                    && options.some(option => option.id === currentDisciplineId);
                  const fallbackDiscipline = !hasCurrentValueInOptions && currentDisciplineId !== null
                    ? disciplines.find(discipline => discipline.id === currentDisciplineId)
                    : null;

                  return (
                    <td key={rowKey} className="px-3 py-2">
                      <select
                        value={currentDisciplineId ?? ''}
                        disabled={squadCellSaving === rowKey}
                        onChange={event => onSquadRoundCellChange(
                          squad.name,
                          row.round,
                          event.target.value ? Number(event.target.value) : null,
                        )}
                        className="w-full px-2 py-1.5 text-sm border rounded-md border-gray-300"
                      >
                        <option value="">{t('timePlanning.matrix.squadRoundPlan.emptyOption')}</option>
                        {fallbackDiscipline && (
                          <option value={fallbackDiscipline.id}>
                            {fallbackDiscipline.shortName || fallbackDiscipline.name}
                          </option>
                        )}
                        {options.map(option => (
                          <option key={`${squad.name}_${option.id}`} value={option.id}>
                            {option.shortName || option.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-sm font-mono text-gray-700">{row.plannedStart}</td>
                <td className="px-3 py-2 text-sm font-mono text-gray-700">{row.plannedEnd}</td>
                <td className="px-3 py-2 text-sm font-mono text-gray-700">{row.switchTime}</td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    value={actualTimesByRound[row.round]?.actualStart || ''}
                    onChange={event => onActualTimeChange(row.round, actualStartField, event.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded-md border-gray-300"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    value={actualTimesByRound[row.round]?.actualEnd || ''}
                    onChange={event => onActualTimeChange(row.round, actualEndField, event.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded-md border-gray-300"
                  />
                </td>
              </tr>
            ))}
            {plannedRows.length === 0 && (
              <tr>
                <td colSpan={Math.max(squads.length + 6, 2)} className="px-4 py-6 text-center text-sm text-gray-500">
                  {t('timePlanning.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}