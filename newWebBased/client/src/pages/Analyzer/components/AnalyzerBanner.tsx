/**
 * AnalyzerBanner – compact health bar shown in ManagementCenter above the
 * workflow steps. Shows a coloured strip with the issue count and a link to
 * the full Analyzer page.
 *
 * - Green  → all checks OK
 * - Amber  → warnings present (no errors)
 * - Red    → errors present
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import type { AnalyzerSummary } from '../Analyzer.types'

interface AnalyzerBannerProps {
  eventId: number
}

export function AnalyzerBanner({ eventId }: AnalyzerBannerProps) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<AnalyzerSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    fetch(`/api/analyzer/event/${eventId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.summary) setSummary(data.summary) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading || !summary) return null

  const issueCount = summary.errors + summary.warnings
  const hasErrors = summary.errors > 0
  const hasWarnings = summary.warnings > 0

  const colorClasses = hasErrors
    ? { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: 'text-red-500', btn: 'bg-red-100 hover:bg-red-200 text-red-800' }
    : hasWarnings
      ? { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: 'text-amber-500', btn: 'bg-amber-100 hover:bg-amber-200 text-amber-800' }
      : { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: 'text-green-500', btn: 'bg-green-100 hover:bg-green-200 text-green-800' }

  const StatusIcon = hasErrors
    ? ExclamationCircleIcon
    : hasWarnings
      ? ExclamationTriangleIcon
      : CheckCircleIcon

  const statusText = issueCount === 0
    ? t('analyzer.banner.allOk')
    : t('analyzer.banner.issues', { count: issueCount })

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 mb-6 ${colorClasses.bg}`}>
      <div className="flex items-center gap-3 min-w-0">
        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${colorClasses.icon}`} />
        <div className="min-w-0">
          <span className={`font-semibold text-sm ${colorClasses.text}`}>
            {t('analyzer.banner.title')}
          </span>
          <span className={`ml-2 text-sm ${colorClasses.text}`}>{statusText}</span>
        </div>
      </div>

      <Link
        to={`/analyzer?eventId=${eventId}`}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium flex-shrink-0 transition-colors ${colorClasses.btn}`}
      >
        {t('analyzer.banner.openDetails')}
        <ArrowRightIcon className="h-3 w-3" />
      </Link>
    </div>
  )
}
