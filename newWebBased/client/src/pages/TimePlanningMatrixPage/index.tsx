import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ClockIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import { useEvent } from '@/contexts/EventContext'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import UnifiedModal from '@/components/UnifiedModal'
import {
  HelpPanels,
  TimeSettingsModal,
  TimePlanningWizard,
} from '@/pages/TimePlanning/components'
import { ScheduleMatrixView } from '@/pages/TimePlanning/components/ScheduleMatrixView'
import { useTimePlanningData } from '@/pages/TimePlanning/hooks'
import type { TimeSettings } from '@/pages/TimePlanning/TimePlanning.types'
import { DEFAULT_TIME_SETTINGS } from '@/pages/TimePlanning/TimePlanning.types'
import {
  loadTimeSettingsFromStorage,
  saveTimeSettingsToStorage,
} from '@/pages/TimePlanning/timePlanningSettingsStorage'

export default function TimePlanningMatrixPage() {
  const { t } = useTranslation()
  const { selectedEvent } = useEvent()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || selectedEvent?.int_eventid?.toString()

  const [timeSettings, setTimeSettings] = useState<TimeSettings>(() =>
    eventId ? loadTimeSettingsFromStorage(eventId) : DEFAULT_TIME_SETTINGS
  )
  const [showTimeSettings, setShowTimeSettings] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const matrixPrintFnRef = useRef<(() => Promise<void>) | null>(null)

  const {
    loading,
    competitions,
    sessionGroups,
    refetch,
  } = useTimePlanningData({ eventId })

  const saveTimeSettings = () => {
    if (eventId) saveTimeSettingsToStorage(eventId, timeSettings)
    setShowTimeSettings(false)
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
      title={t('timePlanning.pages.matrix.title')}
      subtitle={t('timePlanning.pages.matrix.subtitle')}
      icon={ClockIcon}
      showEventContext={true}
      showViewToggle={false}
      showAddButton={false}
      loading={loading}
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
          onClick={() => matrixPrintFnRef.current?.()}
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
          onRegisterPrint={fn => { matrixPrintFnRef.current = fn }}
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
            setShowWizard(false)
            refetch()
          }}
        />
      )}
    </EventManagementTemplate>
  )
}
