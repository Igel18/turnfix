/**
 * DatabaseManagementSection
 * Collapsible grid of DB-management action tiles with live counts.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BuildingOfficeIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { getDatabaseManagementActions, type Statistics } from '../ManagementCenter.constants'
import { translateAction } from '../ManagementCenter.utils'

interface Props {
  statistics: Statistics
  isCollapsed: boolean
  onToggle: () => void
}

export function DatabaseManagementSection({ statistics, isCollapsed, onToggle }: Props) {
  const { t } = useTranslation()
  const actions = getDatabaseManagementActions(statistics)

  return (
    <div>
      <div
        className="flex items-center justify-between mb-6 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors border border-transparent hover:border-gray-200"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <div className="bg-gray-100 p-2 rounded-lg mr-3">
            <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('managementCenter.databaseManagement.title')}</h2>
            <p className="text-sm text-gray-600">{t('managementCenter.databaseManagement.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 rounded-lg">
          <span>{isCollapsed ? t('managementCenter.buttons.expand') : t('managementCenter.buttons.collapse')}</span>
          {isCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {actions.map((action) => {
            const Icon = action.icon
            const translated = translateAction(action, t)
            return (
              <Link
                key={action.name}
                to={action.href}
                className="group bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-105 transition-transform relative`}>
                    <Icon className="h-6 w-6" />
                    {!statistics.loading && action.count !== undefined && (
                      <div className="absolute -top-2 -right-2 bg-white text-gray-900 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-gray-100 shadow-sm">
                        {action.count > 99 ? '99+' : action.count}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                      {translated.name}
                    </h3>
                    {!statistics.loading && action.count !== undefined && (
                      <p className="text-xs font-semibold text-blue-600 mt-1">
                        {translated.countLabel}: {action.count}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">{translated.description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
