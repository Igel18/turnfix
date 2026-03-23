/**
 * CheckItem – renders a single analyzer check result:
 *   - Status icon + coloured left-border
 *   - Title + description text
 *   - Up to 5 sample detail items
 *   - "Go to" action button
 *   - Optional quick-action button (e.g. "Generate start numbers")
 */

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import type { AnalyzerCheck, AnalyzerStatus } from '../Analyzer.types'

interface CheckItemProps {
  check: AnalyzerCheck
  eventId: number
  quickActionLoading: string | null
  onQuickAction: (quickActionId: string, eventId: number) => void
}

const statusConfig: Record<AnalyzerStatus, {
  borderColor: string
  bgColor: string
  iconColor: string
  Icon: React.ComponentType<{ className?: string }>
  badgeColors: string
}> = {
  ok:      { borderColor: 'border-l-green-500',  bgColor: 'bg-green-50',  iconColor: 'text-green-600',  Icon: CheckCircleIcon,         badgeColors: 'bg-green-100 text-green-800' },
  warning: { borderColor: 'border-l-amber-500',  bgColor: 'bg-amber-50',  iconColor: 'text-amber-600',  Icon: ExclamationTriangleIcon, badgeColors: 'bg-amber-100 text-amber-800' },
  error:   { borderColor: 'border-l-red-500',    bgColor: 'bg-red-50',    iconColor: 'text-red-600',    Icon: ExclamationCircleIcon,   badgeColors: 'bg-red-100 text-red-800' },
  info:    { borderColor: 'border-l-blue-500',   bgColor: 'bg-blue-50',   iconColor: 'text-blue-600',   Icon: InformationCircleIcon,   badgeColors: 'bg-blue-100 text-blue-800' },
}

export function CheckItem({ check, eventId, quickActionLoading, onQuickAction }: CheckItemProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cfg = statusConfig[check.status]
  const StatusIcon = cfg.Icon

  const isOk = check.status === 'ok'

  const description = isOk
    ? t(`analyzer.checks.${check.id}.descriptionOk`, { count: check.affectedCount })
    : t(`analyzer.checks.${check.id}.description`, { count: check.affectedCount })

  const handleNavigate = () => {
    navigate(`${check.actionRoute}?eventId=${eventId}`)
  }

  const isQuickLoading = quickActionLoading === check.quickActionId

  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${cfg.borderColor} p-4`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${isOk ? 'bg-green-100' : cfg.bgColor}`}>
          <StatusIcon className={`h-5 w-5 ${cfg.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900">
              {t(`analyzer.checks.${check.id}.title`)}
            </h4>
            {!isOk && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.badgeColors}`}>
                {check.affectedCount}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-sm text-gray-600">{description}</p>

          {/* Sample details */}
          {check.details.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {check.details.map(d => (
                <li key={d.id} className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                  {d.label}
                </li>
              ))}
              {check.affectedCount > check.details.length && (
                <li className="text-xs text-gray-400 italic">
                  {t('analyzer.andMore', { count: check.affectedCount - check.details.length })}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Actions */}
        {!isOk && (
          <div className="flex flex-col gap-2 flex-shrink-0 ml-2">
            <button
              onClick={handleNavigate}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              {t(`analyzer.checks.${check.id}.action`)}
              <ArrowRightIcon className="h-3 w-3" />
            </button>

            {check.quickActionId && (
              <button
                onClick={() => onQuickAction(check.quickActionId!, eventId)}
                disabled={isQuickLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors disabled:opacity-50"
              >
                {isQuickLoading ? (
                  <span className="animate-spin h-3 w-3 border-2 border-amber-600 border-t-transparent rounded-full" />
                ) : (
                  <BoltIcon className="h-3 w-3" />
                )}
                {t(`analyzer.checks.${check.id}.quickAction`)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
