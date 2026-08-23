import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ClockIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import { useEvent } from '@/contexts/EventContext'
import { apiPost, apiPut, invalidateCache } from '@/utils/api'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import UnifiedModal from '@/components/UnifiedModal'

import {
  SessionsView,
  TimeSettingsModal,
  HelpPanels,
  EditCompetitionModal,
  TimePlanningWizard,
} from '@/pages/TimePlanning/components'
import SquadStartDeviceEditor from '@/pages/TimePlanning/components/SquadStartDeviceEditor'
import {
  useDragDrop,
  useTimeCalculation,
  useTimePlanningData,
  useCalculateDeviceSchedule,
  useExportTimeplan,
} from '@/pages/TimePlanning/hooks'
import type { TimeSettings, Competition, DeviceSchedule } from '@/pages/TimePlanning/TimePlanning.types'
import { DEFAULT_TIME_SETTINGS } from '@/pages/TimePlanning/TimePlanning.types'
import {
  loadTimeSettingsFromStorage,
  saveTimeSettingsToStorage,
} from '@/pages/TimePlanning/timePlanningSettingsStorage'

export default function TimePlanningRounds() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { selectedEvent } = useEvent()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || selectedEvent?.int_eventid?.toString()

  const [timeSettings, setTimeSettings] = useState<TimeSettings>(() =>
    eventId ? loadTimeSettingsFromStorage(eventId) : DEFAULT_TIME_SETTINGS
  )
  const [_deviceSchedule, setDeviceSchedule] = useState<DeviceSchedule[]>([])
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [showTimeSettings, setShowTimeSettings] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [editingStartDevices, setEditingStartDevices] = useState<{
    competitionId: number
    competitionName: string
    round: number
  } | null>(null)

  const { addMinutesToTime } = useTimeCalculation()

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
  } = useTimePlanningData({ eventId })

  const { calculateDeviceSchedule } = useCalculateDeviceSchedule({
    squadDisciplines,
    disciplineCache,
    timeSettings,
    addMinutesToTime,
  })

  const { exportTimeplan } = useExportTimeplan({
    selectedEvent,
    eventId,
    sessionGroups,
    squads,
    t,
  })

  const { handleDragStart, handleDragOver, handleDrop } = useDragDrop({
    onDrop: async (compId: number, newRound: number) => {
      await apiPut(`/time-planning/competition/${compId}/round`, { round: newRound })
      invalidateCache('/api/time-planning')
      refetch()
    },
  })

  const saveTimeSettings = () => {
    if (eventId) saveTimeSettingsToStorage(eventId, timeSettings)
    setShowTimeSettings(false)
  }

  const generateAutomaticSchedule = () => {
    sessionGroups.forEach(group => {
      if (group.startTime) {
        const schedule = calculateDeviceSchedule(group)
        setDeviceSchedule(prev => [...prev, ...schedule])
      }
    })
  }

  const handleAddRound = async () => {
    if (!eventId) return
    const resp = await apiPost('/time-planning/round', { eventId })
    if (resp && resp.round) {
      invalidateCache('/api/time-planning')
      const newExtraRounds = extraRounds.includes(resp.round)
        ? extraRounds
        : [...extraRounds, resp.round]
      setExtraRounds(newExtraRounds)
      groupCompetitionsBySessions(competitions, squads, newExtraRounds)
    }
  }

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition)
    setShowEditModal(true)
  }

  const handleSaveCompetitionTimes = async () => {
    if (!editingCompetition) return
    try {
      await apiPut(`/competitions/${editingCompetition.id}`, {
        startTime: editingCompetition.startTime,
        warmupTime: editingCompetition.warmupTime,
      })
      invalidateCache('/competitions')
      invalidateCache('/time-planning')
      await refetch()
      setShowEditModal(false)
      setEditingCompetition(null)
    } catch (error) {
      console.error('Failed to update competition times:', error)
    }
  }

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('timePlanning.noEventSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('timePlanning.selectEventToManageTime')}</p>
        </div>
      </div>
    )
  }

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
          <button
            onClick={handleAddRound}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <span className="text-xl mr-2">+</span>
            {t('timePlanning.addRound', 'Durchgang hinzufügen')}
          </button>
        </div>
      }
      customActions={[
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
          onClick={exportTimeplan}
          className="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          <DocumentChartBarIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.exportPDF')}
        </button>,
      ]}
    >
      {showHelp && <HelpPanels />}

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
          onOpenMatrix={() => navigate(`/time-planning/matrix?eventId=${eventId}`)}
        />
      )}

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

      <EditCompetitionModal
        isOpen={showEditModal}
        editingCompetition={editingCompetition}
        selectedEvent={selectedEvent}
        onClose={() => { setShowEditModal(false); setEditingCompetition(null) }}
        onSave={handleSaveCompetitionTimes}
        onChange={setEditingCompetition}
      />

      {showWizard && eventId && (
        <TimePlanningWizard
          isOpen={showWizard}
          onClose={() => { setShowWizard(false); refetch() }}
          eventId={eventId}
          competitions={competitions}
          timeSettings={timeSettings}
          setTimeSettings={(s) => {
            setTimeSettings(s)
            saveTimeSettingsToStorage(eventId, s)
          }}
          onRefetch={refetch}
          onViewMatrix={() => {
            navigate(`/time-planning/matrix?eventId=${eventId}`)
            setShowWizard(false)
          }}
        />
      )}

      {editingStartDevices && eventId && (
        <SquadStartDeviceEditor
          eventId={Number(eventId)}
          competitionId={editingStartDevices.competitionId}
          competitionName={editingStartDevices.competitionName}
          round={editingStartDevices.round}
          onClose={() => setEditingStartDevices(null)}
          onSave={() => {
            refetch()
            setDeviceSchedule([])
          }}
        />
      )}
    </EventManagementTemplate>
  )
}
