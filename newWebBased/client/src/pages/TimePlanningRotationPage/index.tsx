import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ClockIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  InformationCircleIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import { useEvent } from '@/contexts/EventContext'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import UnifiedModal from '@/components/UnifiedModal'
import TimePlanningRotation, { TimePlanningRotationRef } from '@/pages/TimePlanningRotation'
import {
  HelpPanels,
  TimeSettingsModal,
  TimePlanningWizard,
} from '@/pages/TimePlanning/components'
import {
  useTimePlanningData,
  useExportTimeplan,
} from '@/pages/TimePlanning/hooks'
import type { TimeSettings } from '@/pages/TimePlanning/TimePlanning.types'
import { DEFAULT_TIME_SETTINGS } from '@/pages/TimePlanning/TimePlanning.types'
import {
  loadRotationRoundFromStorage,
  loadTimeSettingsFromStorage,
  saveRotationRoundToStorage,
  saveTimeSettingsToStorage,
} from '@/pages/TimePlanning/timePlanningSettingsStorage'

const HELP_BUTTON_ACTIVE_CLASS = 'bg-blue-600 text-white border-blue-600'
const HELP_BUTTON_DEFAULT_CLASS = 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
const MODAL_SIZE_2XL = '2xl'

export default function TimePlanningRotationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { selectedEvent } = useEvent()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || selectedEvent?.int_eventid?.toString()

  const [timeSettings, setTimeSettings] = useState<TimeSettings>(() =>
    eventId ? loadTimeSettingsFromStorage(eventId) : DEFAULT_TIME_SETTINGS
  )
  const [selectedRotationRound, setSelectedRotationRound] = useState<number>(1)
  const [showTimeSettings, setShowTimeSettings] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const rotationRef = useRef<TimePlanningRotationRef>(null)

  const {
    loading,
    competitions,
    squads,
    sessionGroups,
    squadDisciplines,
    disciplineCache,
    refetch,
  } = useTimePlanningData({ eventId })

  const { exportTimeplan } = useExportTimeplan({
    selectedEvent,
    eventId,
    sessionGroups,
    squads,
    t,
  })

  useEffect(() => {
    if (!eventId) return
    setSelectedRotationRound(loadRotationRoundFromStorage(eventId))
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    saveRotationRoundToStorage(eventId, selectedRotationRound)
  }, [eventId, selectedRotationRound])

  const saveTimeSettings = () => {
    if (eventId) saveTimeSettingsToStorage(eventId, timeSettings)
    setShowTimeSettings(false)
  }

  const timeSettingsTitle = t('timePlanning.timeSettings.title')
  const wizardStartLabel = t('timePlanning.wizard.startButton')
  const helpLabel = t('timePlanning.help')
  const addLaneLabel = t('timePlanning.addBahn')
  const lanePlanningWidgetTitle = t('timePlanning.lanePlanningWidgetTitle')
  const lanePlanningWidgetSubtitle = t('timePlanning.lanePlanningWidgetSubtitle')

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

  const mappedSquads = squads.map(s => {
    const mappedCompetitionIds: number[] = []

    if (Array.isArray((s as any).competitionIds) && (s as any).competitionIds.length > 0) {
      for (const id of (s as any).competitionIds) {
        if (Number.isFinite(id) && id > 0) {
          mappedCompetitionIds.push(id)
        }
      }
    } else if (Array.isArray(s.competitions) && s.competitions.length > 0) {
      for (const competitionName of s.competitions) {
        const compObj = competitions.find(c => c.name === competitionName)
        if (compObj) {
          mappedCompetitionIds.push(compObj.id)
        }
      }
    }

    const uniqueIds = Array.from(new Set(mappedCompetitionIds))
    return {
      name: s.name,
      participantCount: s.participantCount,
      competitionId: uniqueIds[0] ?? -1,
      competitionIds: uniqueIds,
    }
  })

  const mappedDevices = (() => {
    if (sessionGroups.length > 0 && sessionGroups[0].competitions.length > 0) {
      const comp = sessionGroups[0].competitions[0]
      const filtered = squadDisciplines.filter(sd => sd.tfx_disziplinen && sd.tfx_wettkaempfeid === comp.id)
      if (filtered.length > 0) return filtered.map(sd => ({ name: sd.tfx_disziplinen.var_name }))
      if (disciplineCache.current[comp.id]?.length > 0) {
        return disciplineCache.current[comp.id].map((d: any, idx: number) => ({
          name: d.var_name || d.var_disziplinname || d.name || `Device ${idx + 1}`,
        }))
      }
      if (comp.disciplineCount && comp.disciplineCount > 0) {
        return Array.from({ length: comp.disciplineCount }, (_, i) => ({ name: `Device ${i + 1}` }))
      }
    }
    return []
  })()

  return (
    <EventManagementTemplate
      title={t('timePlanning.pages.lanePlanning.title')}
      subtitle={t('timePlanning.pages.lanePlanning.subtitle')}
      icon={ClockIcon}
      showEventContext={true}
      showViewToggle={false}
      showAddButton={false}
      loading={loading}
      customBelowActions={
        <div className="flex space-x-2">
          <button
            onClick={() => rotationRef.current?.addBahn()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <span className="text-xl mr-2">+</span>
            {addLaneLabel}
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
          {wizardStartLabel}
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
          key="help"
          onClick={() => setShowHelp(!showHelp)}
          className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-lg ${
            showHelp
              ? HELP_BUTTON_ACTIVE_CLASS
              : HELP_BUTTON_DEFAULT_CLASS
          }`}
        >
          <InformationCircleIcon className="h-4 w-4 mr-2" />
          {helpLabel}
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
      ) : (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ArrowsRightLeftIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {lanePlanningWidgetTitle}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {lanePlanningWidgetSubtitle}
                </p>
              </div>
            </div>
            <TimePlanningRotation
              ref={rotationRef}
              eventId={eventId}
              onDataChange={refetch}
              selectedRound={selectedRotationRound}
              onSelectedRoundChange={setSelectedRotationRound}
              squads={mappedSquads}
              devices={mappedDevices}
              competitions={competitions}
            />
          </div>
        </div>
      )}

      <UnifiedModal
        isOpen={showTimeSettings}
        onClose={() => setShowTimeSettings(false)}
        title={timeSettingsTitle}
        size={MODAL_SIZE_2XL}
        showFooter={false}
      >
        <TimeSettingsModal
          timeSettings={timeSettings}
          setTimeSettings={setTimeSettings}
          setShowTimeSettings={setShowTimeSettings}
          saveTimeSettings={saveTimeSettings}
        />
      </UnifiedModal>

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
    </EventManagementTemplate>
  )
}
