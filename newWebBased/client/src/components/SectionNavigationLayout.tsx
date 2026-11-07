import { useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useEvent } from '@/contexts/EventContext'
import type { ActionItem } from '@/pages/ManagementCenter/ManagementCenter.constants'
import { translateAction } from '@/pages/ManagementCenter/ManagementCenter.utils'

interface SectionNavigationLayoutProps {
  actions: ActionItem[]
  titleKey: string
}

export default function SectionNavigationLayout({ actions, titleKey }: SectionNavigationLayoutProps) {
  const { t } = useTranslation()
  const { selectedEvent } = useEvent()
  const location = useLocation()
  const mobileNavigationRef = useRef<HTMLDetailsElement>(null)
  const eventId = selectedEvent?.int_eventid ?? new URLSearchParams(location.search).get('eventId')

  const links = actions.map(action => {
        const Icon = action.icon
        const translated = translateAction(action, t)
        const active = location.pathname === action.href
        const search = new URLSearchParams()
        if (eventId) search.set('eventId', String(eventId))
        const href = `${action.href}${search.size ? `?${search}` : ''}`
        const currentPage = active ? 'page' : undefined
        const tileStyle = active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-blue-300'

        return (
          <Link
            key={action.href}
            to={href}
            onClick={() => {
              if (mobileNavigationRef.current) mobileNavigationRef.current.open = false
            }}
            aria-current={currentPage}
            className={`group flex items-center gap-3 rounded-lg border p-2 text-left transition-colors ${tileStyle}`}
          >
            <span className={`${action.color} shrink-0 rounded-lg p-2 text-white`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">{translated.name}</span>
              {action.badge && <span className="text-xs font-medium text-blue-700">{action.badge}</span>}
            </span>
          </Link>
        )
  })
  const navigation = <nav aria-label={t(titleKey)} className="space-y-2">{links}</nav>

  return (
    <div className="mx-auto max-w-[1600px] lg:flex lg:items-start">
      <aside className="hidden w-56 shrink-0 px-3 pt-6 lg:sticky lg:top-0 lg:block lg:max-h-screen lg:overflow-y-auto">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">{t(titleKey)}</h2>
        {navigation}
      </aside>
      <div className="min-w-0 flex-1">
        <details ref={mobileNavigationRef} className="border-b border-gray-200 px-4 py-2 lg:hidden">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-700">
            {t(titleKey)}
            <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
          </summary>
          <div className="py-3">{navigation}</div>
        </details>
        <Outlet />
      </div>
    </div>
  )
}