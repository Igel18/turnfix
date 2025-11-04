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
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

import type { SessionGroup, TimeSettings, Competition, DeviceSchedule } from '../TimePlanning.types';

interface SessionsViewProps {
  sessionGroups: SessionGroup[];
  selectedSession: number | null;
  setSelectedSession: (session: number | null) => void;
  timeSettings: TimeSettings;
  handleEditCompetition: (comp: Competition) => void;
  handleDragStart: (compId: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (session: number) => void;
  calculateDeviceSchedule: (group: SessionGroup) => DeviceSchedule[];
  setDeviceSchedule: (schedule: DeviceSchedule[]) => void;
  setViewMode: (mode: string) => void;
}

export function SessionsView({
  sessionGroups,
  selectedSession,
  setSelectedSession,
  timeSettings,
  handleEditCompetition,
  handleDragStart,
  handleDragOver,
  handleDrop,
  calculateDeviceSchedule,
  setDeviceSchedule,
  setViewMode
}: SessionsViewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {sessionGroups.map(group => (
        <div
          key={group.session}
          className="bg-white border rounded-lg overflow-hidden"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(group.session)}
        >
          <button 
            className="w-full bg-blue-50 px-6 py-4 border-b text-left hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setSelectedSession(selectedSession === group.session ? null : group.session)}
            type="button"
          >
            <div className="flex items-center justify-between pointer-events-none">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TrophyIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('timePlanning.session')} {group.session}
                  </h3>
                  <p className="text-sm text-gray-600">
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
              <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 rounded-lg">
                <span>{selectedSession === group.session ? t('common.collapse') : t('common.expand')}</span>
                {selectedSession === group.session ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </div>
            </div>
          </button>
          
          {selectedSession === group.session && (
            <div className="p-6 space-y-6">
              {/* Competitions in this session */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {t('timePlanning.competitions')} ({group.competitions.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.competitions.map(comp => (
                    <div
                      key={comp.id}
                      className="bg-gray-50 p-4 rounded-lg relative"
                      draggable
                      onDragStart={() => handleDragStart(comp.id)}
                    >
                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCompetition(comp);
                        }}
                        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      <div className="flex items-start justify-between pr-8">
                        <div>
                          <h5 className="font-medium text-gray-900">{comp.name}</h5>
                          <p className="text-sm text-gray-600">Nr. {comp.number}</p>
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
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{comp.disciplineCount} {t('timePlanning.devices')}</div>
                          <div className="text-sm text-gray-600">{comp.participantCount} {t('timePlanning.participants')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Squads participating (always visible, even if empty) */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {t('timePlanning.squads')} ({group.squads.length})
                </h4>
                {group.squads.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {group.squads.map(squad => {
                      const duration = squad.participantCount * timeSettings.exerciseDurationMinutes;
                      return (
                        <div key={squad.name} className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <UserGroupIcon className="h-5 w-5 text-green-600" />
                            <h5 className="font-medium text-gray-900">{squad.name}</h5>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {squad.participantCount} {t('timePlanning.participants')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const label = t('timePlanning.squadDuration', { duration });
                              return label === 'timePlanning.squadDuration'
                                ? `${duration} min total`
                                : label;
                            })()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">{t('timePlanning.noSquads', 'Keine Riegen in diesem Durchgang')}</div>
                )}
              </div>

              {/* Device schedule calculation */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">{t('timePlanning.deviceSchedule')}</h4>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {t('timePlanning.calculatedDuration', { 
                          duration: (() => {
                            // Calculate duration: devices * squad-participants * exercise-duration
                            let total = 0;
                            for (const comp of group.competitions) {
                              const devices = comp.disciplineCount;
                              // For each squad, count participants in this competition
                              let squadParticipants = 0;
                              for (const squad of group.squads) {
                                // If squad is assigned to this competition
                                if (squad.competitions && Array.isArray(squad.competitions)) {
                                  if (squad.competitions.includes(comp.name)) {
                                    squadParticipants += squad.participantCount;
                                  }
                                }
                              }
                              total += devices * squadParticipants * timeSettings.exerciseDurationMinutes;
                            }
                            return total;
                          })()
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('timePlanning.basedOnSettings', {
                          exercise: timeSettings.exerciseDurationMinutes,
                          rotation: timeSettings.rotationIntervalMinutes
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const schedule = calculateDeviceSchedule(group)
                        setDeviceSchedule(schedule)
                        setViewMode('timeline')
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                      {t('timePlanning.viewTimeline')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
