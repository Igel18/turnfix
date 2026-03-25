/**
 * TimePlanning Page
 * Point 124: Separation of Concerns - Modular Architecture
 *
 * Orchestration component — all heavy logic lives in hooks and components:
 *   Hooks:      useTimePlanningData, useCalculateDeviceSchedule, useExportTimeplan,
 *               useDragDrop, useTimeCalculation
 *   Components: SessionsView, TimeSettingsModal, HelpPanels, SquadStartDeviceEditor,
 *               ScheduleMatrixView, EditCompetitionModal
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  ClockIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import { useEvent } from '@/contexts/EventContext';
import { apiPost, apiPut, invalidateCache } from '@/utils/api';

import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import UnifiedModal from '@/components/UnifiedModal';
import TimePlanningRotation, { TimePlanningRotationRef } from '../TimePlanningRotation';

import {
  SessionsView,
  TimeSettingsModal,
  HelpPanels,
  EditCompetitionModal,
  TimePlanningWizard,
} from './components';
import SquadStartDeviceEditor from './components/SquadStartDeviceEditor';
import { ScheduleMatrixView } from './components/ScheduleMatrixView';
import {
  useDragDrop,
  useTimeCalculation,
  useTimePlanningData,
  useCalculateDeviceSchedule,
  useExportTimeplan,
} from './hooks';
import type { TimeSettings, Competition, DeviceSchedule } from './TimePlanning.types';
import { DEFAULT_TIME_SETTINGS } from './TimePlanning.types';

// ====== Time-settings localStorage helpers ======
const TIME_SETTINGS_KEY = (id: string) => `time-planning-settings-${id}`;

function loadTimeSettingsFromStorage(id: string): TimeSettings {
  try {
    const raw = localStorage.getItem(TIME_SETTINGS_KEY(id));
    if (raw) return { ...DEFAULT_TIME_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_TIME_SETTINGS;
}

function saveTimeSettingsToStorage(id: string, settings: TimeSettings) {
  try {
    localStorage.setItem(TIME_SETTINGS_KEY(id), JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ====== Component ======

export default function TimePlanning() {
  const { t } = useTranslation();
  const { selectedEvent } = useEvent();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId') || selectedEvent?.int_eventid?.toString();

  // ====== UI State ======
  const [timeSettings, setTimeSettings] = useState<TimeSettings>(() =>
    eventId ? loadTimeSettingsFromStorage(eventId) : DEFAULT_TIME_SETTINGS
  );
  const [_deviceSchedule, setDeviceSchedule] = useState<DeviceSchedule[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'sessions' | 'rotation' | 'matrix'>('sessions');
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingStartDevices, setEditingStartDevices] = useState<{
    competitionId: number;
    competitionName: string;
    round: number;
  } | null>(null);

  const rotationRef = useRef<TimePlanningRotationRef>(null);
  const matrixPrintFnRef = useRef<(() => Promise<void>) | null>(null);

  // ====== Hooks ======
  const { addMinutesToTime } = useTimeCalculation();

  const {
    loading,
    competitions,
    squads,
    squadDisciplines,
    sessionGroups,
    extraRounds,
    setExtraRounds,
    disciplineCache,
    groupCompetitionsBySessions,
    refetch,
  } = useTimePlanningData({ eventId });

  const { calculateDeviceSchedule } = useCalculateDeviceSchedule({
    squadDisciplines,
    disciplineCache,
    timeSettings,
    addMinutesToTime,
  });

  const { exportTimeplan } = useExportTimeplan({
    selectedEvent,
    eventId,
    sessionGroups,
    squads,
    t,
  });

  const { handleDragStart, handleDragOver, handleDrop } = useDragDrop({
    onDrop: async (compId: number, newRound: number) => {
      await apiPut(`/time-planning/competition/${compId}/round`, { round: newRound });
      invalidateCache('/api/time-planning');
      refetch();
    },
  });

  // ====== Handlers ======

  const saveTimeSettings = () => {
    if (eventId) saveTimeSettingsToStorage(eventId, timeSettings);
    setShowTimeSettings(false);
  };

  const generateAutomaticSchedule = () => {
    sessionGroups.forEach(group => {
      if (group.startTime) {
        const schedule = calculateDeviceSchedule(group);
        setDeviceSchedule(prev => [...prev, ...schedule]);
      }
    });
  };

  const handleAddRound = async () => {
    if (!eventId) return;
    const resp = await apiPost('/time-planning/round', { eventId });
    if (resp && resp.round) {
      invalidateCache('/api/time-planning');
      const newExtraRounds = extraRounds.includes(resp.round)
        ? extraRounds
        : [...extraRounds, resp.round];
      setExtraRounds(newExtraRounds);
      groupCompetitionsBySessions(competitions, squads, newExtraRounds);
    }
  };

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition);
    setShowEditModal(true);
  };

  const handleSaveCompetitionTimes = async () => {
    if (!editingCompetition) return;
    try {
      await apiPut(`/competitions/${editingCompetition.id}`, {
        startTime: editingCompetition.startTime,
        warmupTime: editingCompetition.warmupTime,
      });
      invalidateCache('/competitions');
      invalidateCache('/time-planning');
      await refetch();
      setShowEditModal(false);
      setEditingCompetition(null);
    } catch (error) {
      console.error('Failed to update competition times:', error);
    }
  };

  // ====== Early Returns ======

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('timePlanning.noEventSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('timePlanning.selectEventToManageTime')}</p>
        </div>
      </div>
    );
  }

  // ====== Render ======

  return (
    <EventManagementTemplate
      title={t('timePlanning.title')}
      subtitle={t('timePlanning.subtitle')}
      icon={ClockIcon}
      showEventContext={true}
      showViewToggle={false}
      showAddButton={false}
      loading={loading}
      customBelowActions={
        <div className="flex space-x-2">
          {viewMode !== 'matrix' && (
            <button
              onClick={handleAddRound}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <span className="text-xl mr-2">+</span>
              {t('timePlanning.addRound', 'Durchgang hinzufügen')}
            </button>
          )}

          {viewMode === 'rotation' && (
            <button
              onClick={() => rotationRef.current?.addBahn()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <span className="text-xl mr-2">+</span>
              {t('timePlanning.addBahn', 'Neue Bahn')}
            </button>
          )}
        </div>
      }
      customActions={[
        // View Mode Toggle
        <div key="view-toggle" className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setViewMode('sessions')}
            className={`px-3 py-2 text-sm font-medium border ${
              viewMode === 'sessions'
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } rounded-l-md`}
          >
            {t('timePlanning.viewMode.sessions')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('rotation')}
            className={`px-3 py-2 text-sm font-medium border-t border-b -ml-px ${
              viewMode === 'rotation'
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t('timePlanning.viewMode.rotation') || 'Rotation'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-2 text-sm font-medium border -ml-px rounded-r-md ${
              viewMode === 'matrix'
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t('timePlanning.viewMode.matrix')}
          </button>
        </div>,

        <button
          key="wizard"
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700"
        >
          <SparklesIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.wizard.startButton', 'Assistent')}
        </button>,

        <button
          key="settings"
          onClick={() => setShowTimeSettings(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
        >
          <Cog6ToothIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.settings')}
        </button>,

        <button
          key="generate"
          onClick={generateAutomaticSchedule}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.generateSchedule')}
        </button>,

        <button
          key="help"
          onClick={() => setShowHelp(!showHelp)}
          className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-lg ${
            showHelp
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <InformationCircleIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.help', 'Hilfe')}
        </button>,

        <button
          key="export"
          onClick={viewMode === 'matrix' ? () => matrixPrintFnRef.current?.() : exportTimeplan}
          className="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          <DocumentChartBarIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.exportPDF')}
        </button>,
      ]}
    >
      {/* Help Panels */}
      {showHelp && <HelpPanels />}

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">{t('timePlanning.loading')}</p>
        </div>
      ) : competitions.length === 0 && squads.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('timePlanning.noData')}</h3>
          <p className="text-sm text-gray-600">{t('timePlanning.noDataDescription')}</p>
        </div>
      ) : (
        <>
          {viewMode === 'sessions' && (
            <SessionsView
              sessionGroups={sessionGroups}
              selectedSession={selectedSession}
              setSelectedSession={setSelectedSession}
              timeSettings={timeSettings}
              handleEditCompetition={handleEditCompetition}
              handleEditStartDevices={comp =>
                setEditingStartDevices({
                  competitionId: comp.id,
                  competitionName: comp.name,
                  round: comp.round,
                })
              }
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              calculateDeviceSchedule={calculateDeviceSchedule}
              setDeviceSchedule={setDeviceSchedule}
              setViewMode={(mode: string) => setViewMode(mode as 'sessions' | 'rotation' | 'matrix')}
            />
          )}

          {viewMode === 'rotation' && (
            <div className="bg-white border rounded-lg p-6">
              <TimePlanningRotation
                ref={rotationRef}
                eventId={eventId}
                onDataChange={refetch}
                squads={squads.map(s => {
                  let competitionId = -1;
                  if (Array.isArray((s as any).competitionIds) && (s as any).competitionIds.length > 0) {
                    competitionId = (s as any).competitionIds[0];
                    console.log('✅ Squad mapped via competitionIds:', s.name, '→', competitionId);
                  } else if (Array.isArray(s.competitions) && s.competitions.length > 0) {
                    const compObj = competitions.find(c => c.name === s.competitions[0]);
                    if (compObj) {
                      competitionId = compObj.id;
                      console.log('✅ Squad mapped via name:', s.name, '→', competitionId);
                    } else {
                      console.warn('⚠️ Competition not found for squad:', s.name, 'competition name:', s.competitions[0]);
                    }
                  } else {
                    console.warn('⚠️ Squad has no competitions:', s.name);
                  }
                  return { name: s.name, participantCount: s.participantCount, competitionId };
                })}
                devices={(() => {
                  if (sessionGroups.length > 0 && sessionGroups[0].competitions.length > 0) {
                    const comp = sessionGroups[0].competitions[0];
                    const filtered = squadDisciplines.filter(sd => sd.tfx_disziplinen && sd.tfx_wettkaempfeid === comp.id);
                    if (filtered.length > 0) return filtered.map(sd => ({ name: sd.tfx_disziplinen.var_name }));
                    if (disciplineCache.current[comp.id]?.length > 0) {
                      return disciplineCache.current[comp.id].map((d: any, idx: number) => ({
                        name: d.var_name || d.var_disziplinname || d.name || `Device ${idx + 1}`,
                      }));
                    }
                    if (comp.disciplineCount && comp.disciplineCount > 0) {
                      return Array.from({ length: comp.disciplineCount }, (_, i) => ({ name: `Device ${i + 1}` }));
                    }
                  }
                  return [];
                })()}
                competitions={competitions}
              />
            </div>
          )}

          {viewMode === 'matrix' && (
            <ScheduleMatrixView
              eventId={eventId}
              timeSettings={timeSettings}
              selectedEvent={selectedEvent}
              baseStartTime={
                sessionGroups.length > 0 && sessionGroups[0].startTime
                  ? sessionGroups[0].startTime
                  : null
              }
              sessionGroups={sessionGroups}
              onRegisterPrint={fn => { matrixPrintFnRef.current = fn; }}
            />
          )}
        </>
      )}

      {/* Time Settings Modal */}
      <UnifiedModal
        isOpen={showTimeSettings}
        onClose={() => setShowTimeSettings(false)}
        title="Time Settings"
        size="2xl"
        showFooter={false}
      >
        <TimeSettingsModal
          timeSettings={timeSettings}
          setTimeSettings={setTimeSettings}
          setShowTimeSettings={setShowTimeSettings}
          saveTimeSettings={saveTimeSettings}
        />
      </UnifiedModal>

      {/* Edit Competition Times Modal */}
      <EditCompetitionModal
        isOpen={showEditModal}
        editingCompetition={editingCompetition}
        selectedEvent={selectedEvent}
        onClose={() => { setShowEditModal(false); setEditingCompetition(null); }}
        onSave={handleSaveCompetitionTimes}
        onChange={setEditingCompetition}
      />

      {/* Time Planning Wizard */}
      {showWizard && eventId && (
        <TimePlanningWizard
          isOpen={showWizard}
          onClose={() => { setShowWizard(false); refetch(); }}
          eventId={eventId}
          competitions={competitions}
          timeSettings={timeSettings}
          setTimeSettings={(s) => {
            setTimeSettings(s);
            saveTimeSettingsToStorage(eventId, s);
          }}
          onRefetch={refetch}
          onViewMatrix={() => {
            setViewMode('matrix');
            setShowWizard(false);
            refetch();
          }}
        />
      )}

      {/* Squad Start Device Editor */}
      {editingStartDevices && eventId && (
        <SquadStartDeviceEditor
          eventId={Number(eventId)}
          competitionId={editingStartDevices.competitionId}
          competitionName={editingStartDevices.competitionName}
          round={editingStartDevices.round}
          onClose={() => setEditingStartDevices(null)}
          onSave={() => {
            refetch();
            setDeviceSchedule([]);
          }}
        />
      )}
    </EventManagementTemplate>
  );
}
