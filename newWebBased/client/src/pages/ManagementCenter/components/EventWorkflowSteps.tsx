/**
 * EventWorkflowSteps
 * Renders the 3-step event workflow (Event Setup, Competition Day, Results & Awards).
 * Each step is a collapsible card with a grid of navigation links.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDaysIcon, ChevronDownIcon, ChevronUpIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import {
  eventSetupActions, competitionDayActions, resultsAwardsActions,
  type ActionItem,
} from '../ManagementCenter.constants'
import { translateAction } from '../ManagementCenter.utils'
import EventSelector from '@/components/EventSelector'

// ── Reusable action tile ──────────────────────────────────────────────────────

function ActionTile({ action, eventId }: { action: ActionItem; eventId: number }) {
  const { t } = useTranslation()
  const Icon = action.icon
  const translated = translateAction(action, t)
  const href = action.external ? action.href : `${action.href}?eventId=${eventId}`

  const inner = (
    <div className="flex flex-col items-center text-center space-y-3">
      <div className={`${action.color} p-2 rounded-lg text-white group-hover:scale-105 transition-transform relative`}>
        <Icon className="h-5 w-5" />
        {action.external && (
          <ArrowTopRightOnSquareIcon className="h-3 w-3 absolute -top-1 -right-1 bg-white text-gray-600 rounded-sm" />
        )}
      </div>
      <div>
        <div className="flex items-center justify-center gap-2">
          <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
            {translated.name}
            {action.external && <ArrowTopRightOnSquareIcon className="h-3 w-3 inline ml-1 text-gray-400" />}
          </h4>
          {action.badge && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {action.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1">{translated.description}</p>
      </div>
    </div>
  )

  if (action.external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="group bg-gray-50 p-4 rounded-lg border hover:shadow-md hover:bg-white transition-all">
        {inner}
      </a>
    )
  }

  return (
    <Link to={href} className="group bg-gray-50 p-4 rounded-lg border hover:shadow-md hover:bg-white transition-all">
      {inner}
    </Link>
  )
}

// ── Collapsible workflow step card ────────────────────────────────────────────

interface StepCardProps {
  stepNumber: number
  stepColor: string   // e.g. 'bg-blue-100' / 'text-blue-600'
  titleKey: string
  subtitleKey: string
  isCollapsed: boolean
  onToggle: () => void
  actions: ActionItem[]
  gridCols: string   // e.g. 'lg:grid-cols-4'
  eventId: number
}

function WorkflowStepCard({
  stepNumber, stepColor, titleKey, subtitleKey,
  isCollapsed, onToggle, actions, gridCols, eventId,
}: StepCardProps) {
  const { t } = useTranslation()
  const [bg, text] = stepColor.split('/')

  return (
    <div className="bg-white border rounded-lg">
      <div
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <div className={`${bg} p-2 rounded-lg`}>
            <span className={`text-sm font-bold ${text}`}>{stepNumber}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t(titleKey)}</h3>
            <p className="text-sm text-gray-600">{t(subtitleKey)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 rounded-lg">
          <span>{isCollapsed ? t('managementCenter.buttons.expand') : t('managementCenter.buttons.collapse')}</span>
          {isCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4">
          <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4`}>
            {actions.map(action => (
              <ActionTile key={action.name} action={action} eventId={eventId} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  selectedEvent: { int_eventid: number } | null
  isEventSetupCollapsed: boolean
  isCompetitionDayCollapsed: boolean
  isResultsAwardsCollapsed: boolean
  onToggleEventSetup: () => void
  onToggleCompetitionDay: () => void
  onToggleResultsAwards: () => void
}

export function EventWorkflowSteps({
  selectedEvent,
  isEventSetupCollapsed,
  isCompetitionDayCollapsed,
  isResultsAwardsCollapsed,
  onToggleEventSetup,
  onToggleCompetitionDay,
  onToggleResultsAwards,
}: Props) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex items-center mb-6">
        <div className="bg-blue-100 p-2 rounded-lg mr-3">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('managementCenter.eventManagement.title')}</h2>
          <p className="text-sm text-gray-600">{t('managementCenter.eventManagement.subtitle')}</p>
        </div>
      </div>

      <div className="mb-6">
        <EventSelector />
      </div>

      {selectedEvent ? (
        <div className="space-y-6">
          <WorkflowStepCard
            stepNumber={1}
            stepColor="bg-blue-100/text-blue-600"
            titleKey="managementCenter.eventManagement.eventSetup.title"
            subtitleKey="managementCenter.eventManagement.eventSetup.subtitle"
            isCollapsed={isEventSetupCollapsed}
            onToggle={onToggleEventSetup}
            actions={eventSetupActions}
            gridCols="lg:grid-cols-4"
            eventId={selectedEvent.int_eventid}
          />
          <WorkflowStepCard
            stepNumber={2}
            stepColor="bg-orange-100/text-orange-600"
            titleKey="managementCenter.eventManagement.competitionDay.title"
            subtitleKey="managementCenter.eventManagement.competitionDay.subtitle"
            isCollapsed={isCompetitionDayCollapsed}
            onToggle={onToggleCompetitionDay}
            actions={competitionDayActions}
            gridCols="lg:grid-cols-3"
            eventId={selectedEvent.int_eventid}
          />
          <WorkflowStepCard
            stepNumber={3}
            stepColor="bg-green-100/text-green-600"
            titleKey="managementCenter.eventManagement.resultsAwards.title"
            subtitleKey="managementCenter.eventManagement.resultsAwards.subtitle"
            isCollapsed={isResultsAwardsCollapsed}
            onToggle={onToggleResultsAwards}
            actions={resultsAwardsActions}
            gridCols="lg:grid-cols-2"
            eventId={selectedEvent.int_eventid}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('managementCenter.eventManagement.selectEvent.title')}
          </h3>
          <p className="text-sm">{t('managementCenter.eventManagement.selectEvent.description')}</p>
        </div>
      )}
    </div>
  )
}
