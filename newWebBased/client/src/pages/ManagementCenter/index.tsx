/**
 * ManagementCenter – Main Component (~130 lines)
 * Orchestrates the DB management section, event workflow steps, and configuration link.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CogIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { useEvent } from '@/contexts/EventContext'
import { useManagementStatistics } from './hooks/useManagementStatistics'
import { useCollapsibleSections } from './hooks/useCollapsibleSections'
import { DatabaseManagementSection } from './components/DatabaseManagementSection'
import { EventWorkflowSteps } from './components/EventWorkflowSteps'
import { AnalyzerBanner } from '@/pages/Analyzer/components/AnalyzerBanner'

export function ManagementCenter() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { selectedEvent } = useEvent()
  const statistics = useManagementStatistics()
  const {
    isDatabaseManagementCollapsed, setIsDatabaseManagementCollapsed,
    isEventSetupCollapsed,         setIsEventSetupCollapsed,
    isTimePlanningCollapsed,       setIsTimePlanningCollapsed,
    isCompetitionDayCollapsed,     setIsCompetitionDayCollapsed,
    isResultsAwardsCollapsed,      setIsResultsAwardsCollapsed,
  } = useCollapsibleSections()

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('managementCenter.welcome', { username: user?.username || 'User' })}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('managementCenter.subtitle')}
        </p>
      </div>

      {selectedEvent && <AnalyzerBanner eventId={selectedEvent.int_eventid} />}

      <div className="space-y-8">
        <DatabaseManagementSection
          statistics={statistics}
          isCollapsed={isDatabaseManagementCollapsed}
          onToggle={() => setIsDatabaseManagementCollapsed(v => !v)}
        />

        <EventWorkflowSteps
          selectedEvent={selectedEvent}
          isEventSetupCollapsed={isEventSetupCollapsed}
          isTimePlanningCollapsed={isTimePlanningCollapsed}
          isCompetitionDayCollapsed={isCompetitionDayCollapsed}
          isResultsAwardsCollapsed={isResultsAwardsCollapsed}
          onToggleEventSetup={() => setIsEventSetupCollapsed(v => !v)}
          onToggleTimePlanning={() => setIsTimePlanningCollapsed(v => !v)}
          onToggleCompetitionDay={() => setIsCompetitionDayCollapsed(v => !v)}
          onToggleResultsAwards={() => setIsResultsAwardsCollapsed(v => !v)}
        />

        {/* Configuration */}
        <div>
          <div className="flex items-center mb-6">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <CogIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('managementCenter.configuration.title')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('managementCenter.configuration.subtitle')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              to="/configuration"
              className="group bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-blue-500 p-3 rounded-lg text-white group-hover:scale-105 transition-transform">
                  <CogIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {t('managementCenter.configuration.applicationSettings.title')}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('managementCenter.configuration.applicationSettings.description')}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagementCenter
