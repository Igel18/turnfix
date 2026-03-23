/**
 * Analyzer Page – Event Configuration Health Check.
 *
 * Runs all configured checks for the selected event and displays the results
 * grouped by category. Each check shows status, affected count, sample details,
 * and action/quick-action buttons to navigate directly to the relevant UI.
 *
 * Route: /analyzer?eventId=<id>
 */

import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { useEvent } from '@/contexts/EventContext'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import { BlueInfoBox } from '@/components/InfoBoxes'
import { useAnalyzer } from './hooks/useAnalyzer'
import { CheckItem } from './components/CheckItem'
import type { AnalyzerCategory, AnalyzerCheck } from './Analyzer.types'

// ─────────────────────────────────────────────────────────────────────────────
// Category order + metadata
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: AnalyzerCategory[] = ['setup', 'capture', 'squads', 'results']

// ─────────────────────────────────────────────────────────────────────────────
// Summary card
// ─────────────────────────────────────────────────────────────────────────────

interface SummaryCardProps {
  count: number
  label: string
  colorBg: string
  colorText: string
  Icon: React.ComponentType<{ className?: string }>
}

function SummaryCard({ count, label, colorBg, colorText, Icon }: SummaryCardProps) {
  return (
    <div className={`rounded-lg p-4 ${colorBg} flex items-center gap-3`}>
      <Icon className={`h-8 w-8 flex-shrink-0 ${colorText}`} />
      <div>
        <p className={`text-2xl font-bold ${colorText}`}>{count}</p>
        <p className={`text-sm font-medium ${colorText} opacity-80`}>{label}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Analyzer() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { selectedEvent } = useEvent()

  const urlEventId = searchParams.get('eventId')
  const eventId = urlEventId ? parseInt(urlEventId) : selectedEvent?.int_eventid ?? null

  const { data, loading, error, refresh, triggerQuickAction, quickActionLoading } = useAnalyzer({ eventId })

  // Group checks by category
  const checksByCategory = data
    ? CATEGORY_ORDER.reduce<Record<AnalyzerCategory, AnalyzerCheck[]>>((acc, cat) => {
        acc[cat] = data.checks.filter(c => c.category === cat)
        return acc
      }, { setup: [], capture: [], squads: [], results: [] })
    : null

  const allOk = data?.summary
    ? data.summary.errors === 0 && data.summary.warnings === 0 && data.summary.infos === 0
    : false

  return (
    <div className="max-w-7xl mx-auto p-6">
      <UnifiedPageHeader
        title={t('analyzer.title')}
        subtitle={t('analyzer.subtitle')}
        icon={ClipboardDocumentCheckIcon}
        customActions={
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('analyzer.refresh')}
          </button>
        }
      />

      {/* No event selected */}
      {!eventId && (
        <BlueInfoBox title={t('analyzer.noEvent')} className="mt-6">
          {t('analyzer.noEventDescription')}
        </BlueInfoBox>
      )}

      {/* Error state */}
      {error && eventId && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && eventId && (
        <div className="mt-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              count={data.summary.errors}
              label={t('analyzer.summary.errors')}
              colorBg="bg-red-50"
              colorText="text-red-700"
              Icon={ExclamationCircleIcon}
            />
            <SummaryCard
              count={data.summary.warnings}
              label={t('analyzer.summary.warnings')}
              colorBg="bg-amber-50"
              colorText="text-amber-700"
              Icon={ExclamationTriangleIcon}
            />
            <SummaryCard
              count={data.summary.infos}
              label={t('analyzer.summary.infos')}
              colorBg="bg-blue-50"
              colorText="text-blue-700"
              Icon={InformationCircleIcon}
            />
            <SummaryCard
              count={data.summary.ok}
              label={t('analyzer.summary.ok')}
              colorBg="bg-green-50"
              colorText="text-green-700"
              Icon={CheckCircleIcon}
            />
          </div>

          {/* All-OK banner */}
          {allOk && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">{t('analyzer.allOk')}</p>
                <p className="text-sm text-green-700">{t('analyzer.allOkDescription')}</p>
              </div>
            </div>
          )}

          {/* Category sections */}
          {!allOk && checksByCategory && (
            <div className="mt-8 space-y-8">
              {CATEGORY_ORDER.map(cat => {
                const checks = checksByCategory[cat]
                if (!checks.length) return null
                return (
                  <section key={cat}>
                    <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-gray-400 inline-block" />
                      {t(`analyzer.categories.${cat}`)}
                    </h3>
                    <div className="space-y-3">
                      {checks.map(check => (
                        <CheckItem
                          key={check.id}
                          check={check}
                          eventId={eventId!}
                          quickActionLoading={quickActionLoading}
                          onQuickAction={triggerQuickAction}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {/* Show OK checks at a glance when there are issues */}
          {!allOk && data.summary.ok > 0 && (
            <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                {t('analyzer.okChecksNote', { count: data.summary.ok })}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
