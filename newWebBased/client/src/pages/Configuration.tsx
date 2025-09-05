import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { 
  CogIcon,
  CircleStackIcon,
  LanguageIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import { apiGet, apiPost } from '../utils/api'

interface ConfigSection {
  id: string
  name: string
  icon: React.ComponentType<any>
  description: string
  settings: ConfigSetting[]
}

interface ConfigSetting {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea'
  value: any
  description?: string
  options?: { value: string; label: string }[]
  required?: boolean
  sensitive?: boolean
}

const Configuration: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { changeLanguage } = useLanguage()
  const [configSections, setConfigSections] = useState<ConfigSection[]>([])
  const [activeSection, setActiveSection] = useState<string>('database')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadConfiguration()
  }, [t]) // Reload when language changes

  const loadConfiguration = async () => {
    setLoading(true)
    try {
      const response = await apiGet('/configuration')
      
      // Initialize configuration sections with translations
      const defaultSections: ConfigSection[] = [
        {
          id: 'database',
          name: t('configuration.sections.database.title'),
          icon: CircleStackIcon,
          description: t('configuration.sections.database.description'),
          settings: [
            {
              key: 'db_host',
              label: t('configuration.sections.database.host.label'),
              type: 'text',
              value: response?.database?.host || 'localhost',
              description: t('configuration.sections.database.host.description'),
              required: true
            },
            {
              key: 'db_port',
              label: t('configuration.sections.database.port.label'),
              type: 'number',
              value: response?.database?.port || 5432,
              description: t('configuration.sections.database.port.description'),
              required: true
            },
            {
              key: 'db_name',
              label: t('configuration.sections.database.name.label'),
              type: 'text',
              value: response?.database?.name || 'turnfix',
              description: t('configuration.sections.database.name.description'),
              required: true
            },
            {
              key: 'db_user',
              label: t('configuration.sections.database.user.label'),
              type: 'text',
              value: response?.database?.user || 'postgres',
              description: t('configuration.sections.database.user.description'),
              required: true
            },
            {
              key: 'db_password',
              label: t('configuration.sections.database.password.label'),
              type: 'password',
              value: response?.database?.password || '',
              description: t('configuration.sections.database.password.description'),
              required: true,
              sensitive: true
            },
            {
              key: 'db_ssl',
              label: t('configuration.sections.database.ssl.label'),
              type: 'boolean',
              value: response?.database?.ssl || false,
              description: t('configuration.sections.database.ssl.description')
            }
          ]
        },
        {
          id: 'application',
          name: t('configuration.sections.application.title'),
          icon: CogIcon,
          description: t('configuration.sections.application.description'),
          settings: [
            {
              key: 'app_name',
              label: t('configuration.sections.application.name.label'),
              type: 'text',
              value: response?.application?.name || 'TurnFix',
              description: t('configuration.sections.application.name.description')
            },
            {
              key: 'app_version',
              label: t('configuration.sections.application.version.label'),
              type: 'text',
              value: response?.application?.version || '2.0.0',
              description: t('configuration.sections.application.version.description')
            },
            {
              key: 'debug_mode',
              label: t('configuration.sections.application.debug.label'),
              type: 'boolean',
              value: response?.application?.debug || false,
              description: t('configuration.sections.application.debug.description')
            },
            {
              key: 'server_port',
              label: t('configuration.sections.application.serverPort.label'),
              type: 'number',
              value: response?.application?.serverPort || 3001,
              description: t('configuration.sections.application.serverPort.description'),
              required: true
            },
            {
              key: 'client_port',
              label: t('configuration.sections.application.clientPort.label'),
              type: 'number',
              value: response?.application?.clientPort || 5173,
              description: 'Frontend development server port',
              required: true
            }
          ]
        },
        {
          id: 'localization',
          name: 'Language & Localization',
          icon: LanguageIcon,
          description: 'Language and regional settings',
          settings: [
            {
              key: 'default_language',
              label: 'Default Language',
              type: 'select',
              value: response?.localization?.language || 'de',
              description: 'Default language for the application',
              options: [
                { value: 'de', label: 'Deutsch (German)' },
                { value: 'en', label: 'English' },
                { value: 'fr', label: 'Français (French)' },
                { value: 'es', label: 'Español (Spanish)' }
              ]
            },
            {
              key: 'date_format',
              label: 'Date Format',
              type: 'select',
              value: response?.localization?.dateFormat || 'DD.MM.YYYY',
              description: 'Default date display format',
              options: [
                { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (German)' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' }
              ]
            },
            {
              key: 'timezone',
              label: 'Timezone',
              type: 'select',
              value: response?.localization?.timezone || 'Europe/Berlin',
              description: 'Default timezone for the application',
              options: [
                { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
                { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
                { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
                { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' }
              ]
            }
          ]
        },
        {
          id: 'security',
          name: 'Security Settings',
          icon: ShieldCheckIcon,
          description: 'Security and authentication configuration',
          settings: [
            {
              key: 'session_timeout',
              label: 'Session Timeout (minutes)',
              type: 'number',
              value: response?.security?.sessionTimeout || 480,
              description: 'Automatic logout after inactivity (in minutes)'
            },
            {
              key: 'password_min_length',
              label: 'Minimum Password Length',
              type: 'number',
              value: response?.security?.passwordMinLength || 8,
              description: 'Minimum required password length'
            },
            {
              key: 'max_login_attempts',
              label: 'Max Login Attempts',
              type: 'number',
              value: response?.security?.maxLoginAttempts || 5,
              description: 'Maximum failed login attempts before account lockout'
            },
            {
              key: 'require_https',
              label: 'Require HTTPS',
              type: 'boolean',
              value: response?.security?.requireHttps || false,
              description: 'Force HTTPS connections in production'
            }
          ]
        },
        {
          id: 'imports',
          name: 'Import & Export Settings',
          icon: DocumentArrowDownIcon,
          description: 'File import and export configuration',
          settings: [
            {
              key: 'max_file_size',
              label: 'Max File Size (MB)',
              type: 'number',
              value: response?.imports?.maxFileSize || 50,
              description: 'Maximum file size for imports (in megabytes)'
            },
            {
              key: 'allowed_file_types',
              label: 'Allowed File Types',
              type: 'textarea',
              value: response?.imports?.allowedTypes || 'xml,csv,xlsx,pdf',
              description: 'Comma-separated list of allowed file extensions'
            },
            {
              key: 'auto_backup',
              label: 'Automatic Backup',
              type: 'boolean',
              value: response?.imports?.autoBackup || true,
              description: 'Create automatic backups before imports'
            },
            {
              key: 'validate_imports',
              label: 'Validate Imports',
              type: 'boolean',
              value: response?.imports?.validateImports || true,
              description: 'Perform validation checks on imported data'
            }
          ]
        },
        {
          id: 'printing',
          name: 'Print & PDF Settings',
          icon: PrinterIcon,
          description: 'Printing and PDF generation configuration',
          settings: [
            {
              key: 'default_page_size',
              label: 'Default Page Size',
              type: 'select',
              value: response?.printing?.pageSize || 'A4',
              description: 'Default page size for PDF exports',
              options: [
                { value: 'A4', label: 'A4 (210 × 297 mm)' },
                { value: 'A3', label: 'A3 (297 × 420 mm)' },
                { value: 'Letter', label: 'Letter (8.5 × 11 in)' },
                { value: 'Legal', label: 'Legal (8.5 × 14 in)' }
              ]
            },
            {
              key: 'default_orientation',
              label: 'Default Orientation',
              type: 'select',
              value: response?.printing?.orientation || 'portrait',
              description: 'Default page orientation',
              options: [
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' }
              ]
            },
            {
              key: 'pdf_quality',
              label: 'PDF Quality',
              type: 'select',
              value: response?.printing?.quality || 'high',
              description: 'PDF generation quality setting',
              options: [
                { value: 'low', label: 'Low (smaller file size)' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High (better quality)' }
              ]
            },
            {
              key: 'include_watermark',
              label: 'Include Watermark',
              type: 'boolean',
              value: response?.printing?.watermark || false,
              description: 'Add TurnFix watermark to generated PDFs'
            }
          ]
        },
        {
          id: 'logging',
          name: 'Logging Configuration',
          icon: ClockIcon,
          description: 'Application logging and monitoring settings',
          settings: [
            {
              key: 'log_level',
              label: 'Log Level',
              type: 'select',
              value: response?.logging?.level || 'info',
              description: 'Minimum log level to record',
              options: [
                { value: 'error', label: 'Error (errors only)' },
                { value: 'warn', label: 'Warning (warnings and errors)' },
                { value: 'info', label: 'Info (general information)' },
                { value: 'debug', label: 'Debug (detailed debugging)' }
              ]
            },
            {
              key: 'log_retention',
              label: 'Log Retention (days)',
              type: 'number',
              value: response?.logging?.retention || 30,
              description: 'Number of days to keep log files'
            },
            {
              key: 'enable_audit_log',
              label: 'Enable Audit Logging',
              type: 'boolean',
              value: response?.logging?.auditLog || true,
              description: 'Track user actions and data changes'
            },
            {
              key: 'log_database_queries',
              label: 'Log Database Queries',
              type: 'boolean',
              value: response?.logging?.dbQueries || false,
              description: 'Log all database queries (debug mode only)'
            }
          ]
        }
      ]

      setConfigSections(defaultSections)
    } catch (error) {
      console.error('Error loading configuration:', error)
      setMessage({ type: 'error', text: 'Failed to load configuration settings' })
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      const configData = configSections.reduce((acc, section) => {
        acc[section.id] = section.settings.reduce((sectionAcc, setting) => {
          sectionAcc[setting.key] = setting.value
          return sectionAcc
        }, {} as any)
        return acc
      }, {} as any)

      await apiPost('/configuration/save', configData)
      setMessage({ type: 'success', text: 'Configuration saved successfully' })
    } catch (error) {
      console.error('Error saving configuration:', error)
      setMessage({ type: 'error', text: 'Failed to save configuration' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (sectionId: string, settingKey: string, value: any) => {
    setConfigSections(prev => prev.map(section => 
      section.id === sectionId 
        ? {
            ...section,
            settings: section.settings.map(setting =>
              setting.key === settingKey ? { ...setting, value } : setting
            )
          }
        : section
    ))
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    try {
      const dbSection = configSections.find(s => s.id === 'database')
      if (!dbSection) return

      const dbConfig = dbSection.settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as any)

      await apiPost('/configuration/test-database', dbConfig)
      setMessage({ type: 'success', text: 'Database connection successful' })
    } catch (error) {
      console.error('Database connection test failed:', error)
      setMessage({ type: 'error', text: 'Database connection failed' })
    } finally {
      setLoading(false)
    }
  }

  const filteredSections = configSections.filter(section =>
    section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.settings.some(setting => 
      setting.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const activeConfigSection = configSections.find(s => s.id === activeSection)

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedPageHeader
        title={t('configuration.title')}
        subtitle={t('configuration.subtitle')}
        icon={CogIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('configuration.searchPlaceholder')}
        showEventContext={false}
        customActions={
          <div className="flex space-x-3">
            {activeSection === 'database' && (
              <button
                onClick={testDatabaseConnection}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <CircleStackIcon className="h-4 w-4 mr-2" />
                {t('configuration.testConnection')}
              </button>
            )}
            <button
              onClick={saveConfiguration}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? t('configuration.saving') : t('configuration.saveConfiguration')}
            </button>
          </div>
        }
      />

      <div className="p-6">
        {/* Status Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Configuration Sections Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Configuration Sections</h3>
              </div>
              <nav className="space-y-1 p-2">
                {filteredSections.map((section) => {
                  const IconComponent = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100'
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

          {/* Configuration Settings */}
          <div className="lg:col-span-3">
            {activeConfigSection && (
              <div className="bg-white rounded-lg shadow border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center">
                    <activeConfigSection.icon className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {activeConfigSection.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {activeConfigSection.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    {activeConfigSection.settings.map((setting) => (
                      <div key={setting.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {setting.label}
                          {setting.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {setting.type === 'text' && (
                          <input
                            type="text"
                            value={setting.value}
                            onChange={(e) => updateSetting(activeConfigSection.id, setting.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          />
                        )}

                        {setting.type === 'password' && (
                          <input
                            type="password"
                            value={setting.value}
                            onChange={(e) => updateSetting(activeConfigSection.id, setting.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                            placeholder={setting.sensitive ? '••••••••' : ''}
                          />
                        )}

                        {setting.type === 'number' && (
                          <input
                            type="number"
                            value={setting.value}
                            onChange={(e) => updateSetting(activeConfigSection.id, setting.key, parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          />
                        )}

                        {setting.type === 'boolean' && (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={setting.value}
                              onChange={(e) => updateSetting(activeConfigSection.id, setting.key, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-600">Enable this setting</span>
                          </div>
                        )}

                        {setting.type === 'select' && setting.options && (
                          <select
                            value={setting.value}
                            onChange={(e) => updateSetting(activeConfigSection.id, setting.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          >
                            {setting.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {setting.type === 'textarea' && (
                          <textarea
                            value={setting.value}
                            onChange={(e) => updateSetting(activeConfigSection.id, setting.key, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={setting.required}
                          />
                        )}

                        {setting.description && (
                          <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Configuration
