import { useTranslation } from 'react-i18next'
import {
  ArrowPathIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import FirewallManagement from '@/components/FirewallManagement'
import WifiSettings from '@/components/WifiSettings'
import type { ConfigSection } from './Configuration.types'

const DATABASE_NAMES_LIST_ID = 'configuration-database-name-options'
const DATABASE_NAME_SETTING_KEY = 'db_name'
const SPINNING_ICON_CLASS = 'animate-spin'
const STATUS_ROLE = 'status'
const ACTIVE_NAV_CLASS = 'bg-blue-100 text-blue-700 border border-blue-200'
const INACTIVE_NAV_CLASS = 'text-gray-700 hover:bg-gray-100'
const CONNECTED_STATUS_CLASS = 'bg-green-50 border-green-200'
const DISCONNECTED_STATUS_CLASS = 'bg-yellow-50 border-yellow-200'
const CONNECTED_ICON_CLASS = 'text-green-600'
const DISCONNECTED_ICON_CLASS = 'text-yellow-600'
const CONNECTED_LABEL_CLASS = 'text-green-800'
const DISCONNECTED_LABEL_CLASS = 'text-yellow-800'
const SECTION_IDS = { database: 'database', firewall: 'firewall', wifi: 'wifi', scoreCapture: 'scoreCapture' } as const
const SETTING_TYPES = { boolean: 'boolean', select: 'select', textarea: 'textarea' } as const

interface ConfigurationLayoutProps {
  sections: ConfigSection[]
  activeSection: string
  activeConfigSection?: ConfigSection
  connectedDb: string | null
  availableDatabases: string[]
  loadingDatabases: boolean
  databaseListError: boolean
  databaseHost: unknown
  databaseUser: unknown
  onActiveSectionChange: (sectionId: string) => void
  onRefreshConnectedDatabase: () => void
  onLoadAvailableDatabases: () => void
  onSettingChange: (sectionId: string, settingKey: string, value: any) => void
}

const ConfigurationLayout = ({
  sections,
  activeSection,
  activeConfigSection,
  connectedDb,
  availableDatabases,
  loadingDatabases,
  databaseListError,
  databaseHost,
  databaseUser,
  onActiveSectionChange,
  onRefreshConnectedDatabase,
  onLoadAvailableDatabases,
  onSettingChange,
}: ConfigurationLayoutProps) => {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{t('configuration.sectionsHeading')}</h3>
          </div>
          <nav className="space-y-1 p-2">
            {sections.map(section => {
              const IconComponent = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => onActiveSectionChange(section.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === section.id
                      ? ACTIVE_NAV_CLASS
                      : INACTIVE_NAV_CLASS
                  }`}
                >
                  <IconComponent className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="truncate">{section.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="lg:col-span-3">
        {activeConfigSection && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <activeConfigSection.icon className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{activeConfigSection.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{activeConfigSection.description}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {activeConfigSection.id === SECTION_IDS.firewall ? (
                <FirewallManagement />
              ) : activeConfigSection.id === SECTION_IDS.wifi ? (
                <WifiSettings />
              ) : (
                <>
                  {activeConfigSection.id === SECTION_IDS.database && (
                    <div className="mb-6 space-y-4">
                      <div className={`border rounded-lg p-4 ${
                        connectedDb ? CONNECTED_STATUS_CLASS : DISCONNECTED_STATUS_CLASS
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CircleStackIcon className={`h-5 w-5 mr-2 ${connectedDb ? CONNECTED_ICON_CLASS : DISCONNECTED_ICON_CLASS}`} />
                            <span className="text-sm font-medium text-gray-700">
                              {t('configuration.sections.database.connectedTo')}
                            </span>
                            <span className={`ml-2 text-sm font-bold ${connectedDb ? CONNECTED_LABEL_CLASS : DISCONNECTED_LABEL_CLASS}`}>
                              {connectedDb || t('configuration.sections.database.notConnected')}
                            </span>
                          </div>
                          <button
                            onClick={onRefreshConnectedDatabase}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                            title={t('configuration.sections.database.refresh')}
                          >
                            {t('configuration.sections.database.refresh')}
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              {t('configuration.sections.database.infoTitle')}
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>{t('configuration.sections.database.infoText')}</p>
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>{t('configuration.sections.database.infoSteps.testConnection')}</li>
                                <li>{t('configuration.sections.database.infoSteps.createDatabase')}</li>
                                <li>{t('configuration.sections.database.infoSteps.createSchema')}</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeConfigSection.id === SECTION_IDS.scoreCapture && (
                    <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-orange-800">
                            {t('configuration.sections.scoreCapture.warningTitle')}
                          </h3>
                          <div className="mt-2 text-sm text-orange-700">
                            <p className="font-semibold">{t('configuration.sections.scoreCapture.warningText')}</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>{t('configuration.sections.scoreCapture.warningPoint1')}</li>
                              <li>{t('configuration.sections.scoreCapture.warningPoint2')}</li>
                              <li>{t('configuration.sections.scoreCapture.warningPoint3')}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {activeConfigSection.settings.map(setting => (
                      <div key={setting.key}>
                        <label
                          htmlFor={`configuration-${activeConfigSection.id}-${setting.key}`}
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          {setting.label}
                          {setting.required && <span className="text-red-500 ml-1">*</span>}
                        </label>

                        {setting.type === 'text' && activeConfigSection.id === SECTION_IDS.database && setting.key === DATABASE_NAME_SETTING_KEY && (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                id={`configuration-${activeConfigSection.id}-${setting.key}`}
                                type="text"
                                list={DATABASE_NAMES_LIST_ID}
                                value={setting.value}
                                onChange={event => onSettingChange(activeConfigSection.id, setting.key, event.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required={setting.required}
                              />
                              <button
                                type="button"
                                onClick={() => void onLoadAvailableDatabases()}
                                disabled={loadingDatabases || !databaseHost || !databaseUser}
                                className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('configuration.sections.database.name.refreshDatabaseList')}
                                aria-label={t('configuration.sections.database.name.refreshDatabaseList')}
                              >
                                <ArrowPathIcon className={`h-5 w-5 ${loadingDatabases ? SPINNING_ICON_CLASS : ''}`} />
                              </button>
                            </div>
                            <datalist id={DATABASE_NAMES_LIST_ID}>
                              {availableDatabases.map(databaseName => <option key={databaseName} value={databaseName} />)}
                            </datalist>
                            <p className="mt-1 text-sm text-gray-500" role={databaseListError ? STATUS_ROLE : undefined}>
                              {databaseListError
                                ? t('configuration.sections.database.databaseListError')
                                : loadingDatabases
                                  ? t('configuration.sections.database.databaseListLoading')
                                  : t('configuration.sections.database.databaseListHint', { count: availableDatabases.length })}
                            </p>
                          </>
                        )}

                        {setting.type === 'text' && !(activeConfigSection.id === SECTION_IDS.database && setting.key === DATABASE_NAME_SETTING_KEY) && (
                          <input
                            id={`configuration-${activeConfigSection.id}-${setting.key}`}
                            type="text"
                            value={setting.value}
                            onChange={event => onSettingChange(activeConfigSection.id, setting.key, event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          />
                        )}

                        {setting.type === 'password' && (
                          <input
                            id={`configuration-${activeConfigSection.id}-${setting.key}`}
                            type="password"
                            value={setting.value}
                            onChange={event => onSettingChange(activeConfigSection.id, setting.key, event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                            placeholder={setting.sensitive ? '••••••••' : ''}
                          />
                        )}

                        {setting.type === 'number' && (
                          <input
                            id={`configuration-${activeConfigSection.id}-${setting.key}`}
                            type="number"
                            value={setting.value}
                            onChange={event => onSettingChange(activeConfigSection.id, setting.key, parseInt(event.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          />
                        )}

                        {setting.type === SETTING_TYPES.boolean && (
                          <div className="flex items-center">
                            <input
                              id={`configuration-${activeConfigSection.id}-${setting.key}`}
                              type="checkbox"
                              checked={setting.value}
                              onChange={event => onSettingChange(activeConfigSection.id, setting.key, event.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-600">{t('configuration.enableSetting')}</span>
                          </div>
                        )}

                        {setting.type === SETTING_TYPES.select && setting.options && (
                          <select
                            id={`configuration-${activeConfigSection.id}-${setting.key}`}
                            value={setting.value}
                            onChange={event => onSettingChange(activeConfigSection.id, setting.key, event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          >
                            {setting.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        )}

                        {setting.type === SETTING_TYPES.textarea && (
                          <textarea
                            id={`configuration-${activeConfigSection.id}-${setting.key}`}
                            value={setting.value}
                            onChange={event => onSettingChange(activeConfigSection.id, setting.key, event.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          />
                        )}

                        {setting.description && <p className="text-sm text-gray-500 mt-1">{setting.description}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfigurationLayout