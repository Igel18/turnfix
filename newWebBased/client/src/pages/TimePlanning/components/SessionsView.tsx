/**
 * SessionsView Component
 * Point 124: Separation of Concerns
 * 
 * Displays sessions with collapsible sections showing:
 * - Competitions in the session (draggable)
 * - Squads participating
 * - Device schedule calculations
 */

import { useTranslation } from 'react-i18next';
import {
  TrophyIcon,
  ClockIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

import type { SessionGroup, TimeSettings, Competition, DeviceSchedule } from '../TimePlanning.types';
import {
  getCompetitionParticipantCount,
  getCompetitionSquadNames,
  getEstimatedSessionDurationMinutes,
  getSessionDeviceCount,
  getSessionParticipantCount,
} from '../sessionsViewUtils';

interface SessionsViewProps {
  sessionGroups: SessionGroup[];
  selectedSession: number | null;
  setSelectedSession: (session: number | null) => void;
  timeSettings: TimeSettings;
  handleEditCompetition: (comp: Competition) => void;
  handleEditStartDevices: (comp: Competition) => void;
  handleDragStart: (compId: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (session: number) => void;
  calculateDeviceSchedule: (group: SessionGroup) => DeviceSchedule[];
  setDeviceSchedule: (schedule: DeviceSchedule[]) => void;
  onOpenMatrix: () => void;
  onEditSessionTimes: (session: number) => void;
}

export function SessionsView({
  sessionGroups,
  selectedSession,
  setSelectedSession,
  timeSettings,
  handleEditCompetition,
  handleEditStartDevices,
  handleDragStart,
  handleDragOver,
  handleDrop,
  calculateDeviceSchedule,
  setDeviceSchedule,
  onOpenMatrix,
  onEditSessionTimes,
}: SessionsViewProps) {
  const { t } = useTranslation();
  const flattenedCompetitions = sessionGroups.flatMap(group => group.competitions);
  const selectedGroup = sessionGroups.find(group => group.session === selectedSession) ?? sessionGroups[0] ?? null;
  const competitionsById = new Map(flattenedCompetitions.map(comp => [comp.id, comp]));

  const assignedCompetitionIds = new Set<number>();
  for (const group of sessionGroups) {
    for (const comp of group.competitions) {
      assignedCompetitionIds.add(comp.id);
    }
  }

  const unassignedCompetitions = flattenedCompetitions.filter(comp => {
    if (comp.round === null || comp.round === undefined || comp.round <= 0) {
      return true;
    }
    return !assignedCompetitionIds.has(comp.id);
  });

  const sessionSummary = selectedGroup
    ? {
        participants: getSessionParticipantCount(selectedGroup),
        devices: getSessionDeviceCount(selectedGroup),
        estimatedDuration: getEstimatedSessionDurationMinutes(selectedGroup, timeSettings.exerciseDurationMinutes),
      }
    : {
        participants: 0,
        devices: 0,
        estimatedDuration: 0,
      };

  const selectedCompetitions = selectedGroup?.competitions ?? [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[72vh] items-stretch">
      <div className="xl:col-span-1 flex flex-col min-h-[72vh]">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          {t('timePlanning.sessions')} ({sessionGroups.length})
        </h4>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {sessionGroups.map(group => (
            <div
              key={group.session}
              className={`w-full text-left border rounded-lg p-4 transition-colors ${
                selectedGroup?.session === group.session
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white hover:border-gray-300'
              }`}
              onClick={() => setSelectedSession(group.session)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedSession(group.session)
                }
              }}
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(group.session)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <TrophyIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">
                      {t('timePlanning.session')} {group.session}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">
                      {(group.startTime || group.startDate) && (
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {group.startDate && (
                            <span>
                              {new Date(group.startDate).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                              {group.startTime && ', '}
                            </span>
                          )}
                          {group.startTime && t('timePlanning.startsAt', { time: group.startTime })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditSessionTimes(group.session)
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title={t('timePlanning.editSessionTimes')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded px-2 py-2 text-gray-700">
                  <div className="text-[11px] text-gray-500">{t('timePlanning.competitions')}</div>
                  <div className="font-semibold text-gray-900">{group.competitions.length}</div>
                </div>
                <div className="bg-gray-50 rounded px-2 py-2 text-gray-700">
                  <div className="text-[11px] text-gray-500">{t('timePlanning.squads')}</div>
                  <div className="font-semibold text-gray-900">{group.squads.length}</div>
                </div>
                <div className="bg-gray-50 rounded px-2 py-2 text-gray-700">
                  <div className="text-[11px] text-gray-500">{t('timePlanning.participants')}</div>
                  <div className="font-semibold text-gray-900">{getSessionParticipantCount(group)}</div>
                </div>
                <div className="bg-gray-50 rounded px-2 py-2 text-gray-700">
                  <div className="text-[11px] text-gray-500">{t('timePlanning.estimatedDurationShort')}</div>
                  <div className="font-semibold text-gray-900">
                    {getEstimatedSessionDurationMinutes(group, timeSettings.exerciseDurationMinutes)} {t('timePlanning.minutes')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="xl:col-span-1 flex flex-col min-h-[72vh]">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          {t('timePlanning.unassignedCompetitions')} ({unassignedCompetitions.length})
        </h4>
        <div
          className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-[240px] border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(0)}
        >
          {unassignedCompetitions.length > 0 ? (
            unassignedCompetitions.map(comp => (
              <div
                key={comp.id}
                className="bg-white rounded-lg border p-4"
                draggable
                onDragStart={() => handleDragStart(comp.id)}
              >
                <h5 className="font-medium text-gray-900">{comp.name}</h5>
                <p className="text-sm text-gray-600">{t('timePlanning.number')}: {comp.number}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {comp.disciplineCount} {t('timePlanning.devices')}
                  </span>
                  <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {comp.participantCount} {t('timePlanning.participants')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 p-2">
              {t('timePlanning.noUnassignedCompetitions')}
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-1 flex flex-col min-h-[72vh]">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          {selectedGroup
            ? `${t('timePlanning.competitions')} (${t('timePlanning.session')} ${selectedGroup.session})`
            : t('timePlanning.competitions')}
        </h4>

        {selectedGroup ? (
          <>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {selectedCompetitions.map(comp => {
                const competitionSquads = getCompetitionSquadNames(selectedGroup, comp);
                const mappedComp = competitionsById.get(comp.id) ?? comp;
                const competitionParticipants = getCompetitionParticipantCount(selectedGroup, comp.id) || mappedComp.participantCount;
                return (
                  <div
                    key={comp.id}
                    className="bg-white rounded-lg border p-4 relative hover:border-gray-300 transition-colors"
                    draggable
                    onDragStart={() => handleDragStart(comp.id)}
                  >
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStartDevices(comp);
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors shadow-sm bg-white border border-gray-200"
                        title={t('timePlanning.editStartDevices')}
                      >
                        <PlayIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCompetition(comp);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm bg-white border border-gray-200"
                        title={t('common.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="pr-20">
                      <h5 className="font-medium text-gray-900">{comp.name}</h5>
                      <p className="text-sm text-gray-600">{t('timePlanning.number')}: {comp.number}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 rounded px-2 py-1 text-gray-700">
                        {comp.disciplineCount} {t('timePlanning.devices')}
                      </div>
                      <div className="bg-gray-50 rounded px-2 py-1 text-gray-700">
                        {competitionParticipants} {t('timePlanning.participants')}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      {comp.startTime && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PlayIcon className="h-4 w-4 mr-1" />
                          {t('timePlanning.startTime')}: {comp.startTime}
                        </div>
                      )}
                      {comp.warmupTime && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PauseIcon className="h-4 w-4 mr-1" />
                          {t('timePlanning.warmupTime')}: {comp.warmupTime}
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        {t('timePlanning.squads')}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {competitionSquads.length > 0 ? (
                          competitionSquads.map((squadName) => (
                            <span
                              key={`${comp.id}-${squadName}`}
                              className="inline-flex px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {squadName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">{t('timePlanning.noSquads')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <p className="text-sm text-gray-700">
                {t('timePlanning.calculatedDuration', {
                  duration: sessionSummary.estimatedDuration
                })}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('timePlanning.basedOnSettings', {
                  exercise: timeSettings.exerciseDurationMinutes,
                  rotation: timeSettings.rotationIntervalMinutes
                })}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white border rounded p-2 text-gray-700">
                  {selectedGroup.competitions.length} {t('timePlanning.competitions')}
                </div>
                <div className="bg-white border rounded p-2 text-gray-700">
                  {sessionSummary.devices} {t('timePlanning.devices')}
                </div>
                <div className="bg-white border rounded p-2 text-gray-700">
                  {sessionSummary.participants} {t('timePlanning.participants')}
                </div>
              </div>
              <button
                onClick={() => {
                  const schedule = calculateDeviceSchedule(selectedGroup)
                  setDeviceSchedule(schedule)
                  onOpenMatrix()
                }}
                className="w-full mt-3 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                {t('timePlanning.viewTimeline')}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-500">
            {t('timePlanning.noSessionSelected')}
          </div>
        )}
      </div>
    </div>
  );
}
