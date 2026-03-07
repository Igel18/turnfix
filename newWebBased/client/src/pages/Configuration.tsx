import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  CogIcon,
  CircleStackIcon,
  LanguageIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  ClipboardDocumentListIcon,
  WifiIcon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import { apiGet, apiPost } from '../utils/api'
import FirewallManagement from '@/components/FirewallManagement'
import WifiSettings from '@/components/WifiSettings'
import DatabaseSetupWizard from './Configuration/DatabaseSetupWizard'

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
    const [showWizard, setShowWizard] = useState(false);

    // Wizard wrapper functions
    const wizardCreateDatabase = async (newDbName: string, dbConfig: any) => {
      try {
        // Use the new DB name provided from wizard
        const configWithNewDb = { ...dbConfig, db_name: newDbName };
        const response = await apiPost('/configuration/create-database', configWithNewDb);
        if (response?.success) {
          return { success: true, message: response.message };
        }
        return { success: false, error: response?.error || 'Unknown error' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.error || error.message };
      }
    };

    const wizardTestConnection = async (dbConfig: any) => {
      try {
        const response = await apiPost('/configuration/test-database', dbConfig);
        if (response?.success) {
          return { success: true, message: 'Connection successful' };
        }
        return { success: false, error: response?.error || 'Connection failed' };
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error || error?.message || 'Connection failed';
        return { success: false, error: errorMsg };
      }
    };

    const wizardUpdateDatabaseName = async (newDbName: string) => {
      // Update the database name in the configuration state
      setConfigSections(prev => prev.map(section => {
        if (section.id === 'database') {
          return {
            ...section,
            settings: section.settings.map(setting =>
              setting.key === 'db_name' 
                ? { ...setting, value: newDbName }
                : setting
            )
          };
        }
        return section;
      }));
    };

    const wizardCreateSchema = async (dbConfig?: any) => {
      try {
        const response = await apiPost('/configuration/create-schema', { dbConfig });
        if (response?.success) {
          return { success: true, message: response.message, details: response.details };
        }
        return { success: false, error: response?.error || 'Schema creation failed' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message };
      }
    };

    const wizardApplyGymNetPreset = async (dbConfig?: any) => {
      try {
        const response = await apiPost('/configuration/gymnet-preset', { dbConfig });
        if (response?.success && response?.result) {
          return { 
            success: true, 
            message: 'GymNet presets applied',
            stats: response.result
          };
        }
        return { success: false, error: response?.error || 'Preset application failed' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message };
      }
    };

    const wizardImportProductionDisciplines = async (dbConfig?: any) => {
      try {
        const response = await apiPost('/configuration/production-disciplines', { dbConfig });
        if (response?.success && response?.stats) {
          return { 
            success: true, 
            message: 'Production disciplines imported',
            stats: response.stats
          };
        }
        return { success: false, error: response?.error || 'Production disciplines import failed' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message };
      }
    };

    const wizardImportProductionStatuses = async (dbConfig?: any) => {
      try {
        const response = await apiPost('/configuration/production-statuses', { dbConfig });
        if (response?.success && response?.stats) {
          return { 
            success: true, 
            message: 'Production statuses imported',
            stats: response.stats
          };
        }
        return { success: false, error: response?.error || 'Production statuses import failed' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message };
      }
    };

    const wizardImportSampleData = async (dbConfig?: any) => {
      try {
        const response = await apiPost('/configuration/sample-data', { dbConfig });
        if (response?.success && response?.stats) {
          return { 
            success: true, 
            message: 'Sample data imported',
            stats: response.stats
          };
        }
        return { success: false, error: response?.error || 'Sample data import failed' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message };
      }
    };

    const wizardImportDisciplineGroups = async (dbConfig?: any) => {
      try {
        const response = await apiPost('/configuration/discipline-groups', { dbConfig });
        if (response?.success && response?.stats) {
          return {
            success: true,
            message: 'Discipline groups imported',
            stats: response.stats
          };
        }
        return { success: false, error: response?.error || 'Discipline groups import failed' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message };
      }
    };

    const wizardImportStandardCountries = async (dbConfig?: any) => {
      try {
        const response = await apiPost('/configuration/standard-countries', { dbConfig });
        if (response?.success && response?.stats) {
          return {
            success: true,
            message: 'Standard countries imported',
            stats: response.stats
          };
        }
        return { success: false, error: response?.error || 'Standard countries import failed' };
      } catch (error: any) {
        return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message };
      }
    };

    // Save config and trigger server reconnect after wizard completes
    const wizardSaveAndReconnect = async (): Promise<{ success: boolean; error?: string }> => {
      try {
        // Build config data from current configSections state (which already has the updated db_name)
        const configData = configSections.reduce((acc, section) => {
          if (section.id === 'participant-labels') {
            if (!acc['printing']) acc['printing'] = {};
            section.settings.forEach(setting => {
              acc['printing'][setting.key] = setting.value;
            });
          } else if (section.id === 'scoreCapture') {
            acc['scoreCapture'] = section.settings.reduce((sectionAcc, setting) => {
              sectionAcc[setting.key] = setting.value;
              return sectionAcc;
            }, {} as any);
          } else {
            acc[section.id] = section.settings.reduce((sectionAcc, setting) => {
              sectionAcc[setting.key] = setting.value;
              return sectionAcc;
            }, {} as any);
          }
          return acc;
        }, {} as any);

        // Save scoreCapture settings separately
        if (configData.scoreCapture) {
          await fetch('/api/app-settings/scoreCapture', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData.scoreCapture)
          });
          delete configData.scoreCapture;
        }

        const response = await apiPost('/configuration/save', configData);
        const connectedDb = response?.connectedDatabase;
        const expectedDb = configData.database?.db_name;
        
        if (connectedDb && expectedDb && connectedDb !== expectedDb) {
          console.warn(`⚠️ Database mismatch: expected "${expectedDb}", connected to "${connectedDb}"`);
        }
        
        setMessage({ type: 'success', text: t('configuration.wizard.savedAndReconnected') || 'Konfiguration gespeichert & Server wird neu verbunden!' });
        
        // Force a full page reload after a short delay to clear ALL cached data
        // This ensures React Query cache, component state, and any other caches
        // are flushed and fresh data is loaded from the new database
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
        return { success: true };
      } catch (error: any) {
        console.error('Error saving configuration from wizard:', error);
        setMessage({ type: 'error', text: t('configuration.messages.saveFailed') });
        return { success: false, error: error?.message || 'Save failed' };
      }
    };

  const { t } = useTranslation()
  const [configSections, setConfigSections] = useState<ConfigSection[]>([])
  const [activeSection, setActiveSection] = useState<string>('database')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [connectedDb, setConnectedDb] = useState<string | null>(null)

  // Fetch which database the server is actually connected to
  const fetchConnectedDatabase = async () => {
    try {
      const response = await apiGet('/configuration/connected-database')
      setConnectedDb(response?.connectedDatabase || null)
    } catch {
      setConnectedDb(null)
    }
  }

  useEffect(() => {
    loadConfiguration()
    fetchConnectedDatabase()
  }, [t]) // Reload when language changes

  const loadConfiguration = async () => {
    try {
      const response = await apiGet('/configuration')
      
      // Load app settings from separate API
      let appSettings = {}
      try {
        const appSettingsResponse = await fetch('/api/app-settings')
        appSettings = await appSettingsResponse.json()
      } catch (error) {
        console.error('Error loading app settings:', error)
      }
      
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
              value: response?.database?.db_host || 'localhost',
              description: t('configuration.sections.database.host.description'),
              required: true
            },
            {
              key: 'db_port',
              label: t('configuration.sections.database.port.label'),
              type: 'number',
              value: response?.database?.db_port || 5432,
              description: t('configuration.sections.database.port.description'),
              required: true
            },
            {
              key: 'db_name',
              label: t('configuration.sections.database.name.label'),
              type: 'text',
              value: response?.database?.db_name || 'turnfix',
              description: t('configuration.sections.database.name.description'),
              required: true
            },
            {
              key: 'db_user',
              label: t('configuration.sections.database.user.label'),
              type: 'text',
              value: response?.database?.db_user || 'postgres',
              description: t('configuration.sections.database.user.description'),
              required: true
            },
            {
              key: 'db_password',
              label: t('configuration.sections.database.password.label'),
              type: 'password',
              value: response?.database?.db_password || '',
              description: t('configuration.sections.database.password.description'),
              required: true,
              sensitive: true
            },
            {
              key: 'db_ssl',
              label: t('configuration.sections.database.ssl.label'),
              type: 'boolean',
              value: response?.database?.db_ssl || false,
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
              value: response?.application?.app_name || 'TurnFix',
              description: t('configuration.sections.application.name.description')
            },
            {
              key: 'app_version',
              label: t('configuration.sections.application.version.label'),
              type: 'text',
              value: response?.application?.app_version || '2.0.0',
              description: t('configuration.sections.application.version.description')
            },
            {
              key: 'debug_mode',
              label: t('configuration.sections.application.debug.label'),
              type: 'boolean',
              value: response?.application?.debug_mode || false,
              description: t('configuration.sections.application.debug.description')
            },
            {
              key: 'server_port',
              label: t('configuration.sections.application.serverPort.label'),
              type: 'number',
              value: response?.application?.server_port || 3001,
              description: t('configuration.sections.application.serverPort.description'),
              required: true
            },
            {
              key: 'client_port',
              label: t('configuration.sections.application.clientPort.label'),
              type: 'number',
              value: response?.application?.client_port || (import.meta.env.MODE === 'production' ? 3001 : 5173),
              description: t('configuration.sections.application.clientPort.description'),
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
              value: response?.localization?.default_language || 'de',
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
              value: response?.localization?.date_format || 'DD.MM.YYYY',
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
          name: t('configuration.sections.security.title'),
          icon: ShieldCheckIcon,
          description: t('configuration.sections.security.description'),
          settings: [
            {
              key: 'session_timeout',
              label: t('configuration.sections.security.sessionTimeout.label'),
              type: 'number',
              value: response?.security?.sessionTimeout || 480,
              description: t('configuration.sections.security.sessionTimeout.description')
            },
            {
              key: 'password_min_length',
              label: t('configuration.sections.security.passwordMinLength.label'),
              type: 'number',
              value: response?.security?.passwordMinLength || 8,
              description: t('configuration.sections.security.passwordMinLength.description')
            },
            {
              key: 'max_login_attempts',
              label: t('configuration.sections.security.maxLoginAttempts.label'),
              type: 'number',
              value: response?.security?.maxLoginAttempts || 5,
              description: t('configuration.sections.security.maxLoginAttempts.description')
            },
            {
              key: 'require_https',
              label: t('configuration.sections.security.requireHttps.label'),
              type: 'boolean',
              value: response?.security?.requireHttps || false,
              description: t('configuration.sections.security.requireHttps.description')
            }
          ]
        },
        {
          id: 'imports',
          name: t('configuration.sections.imports.title'),
          icon: DocumentArrowDownIcon,
          description: t('configuration.sections.imports.description'),
          settings: [
            {
              key: 'max_file_size',
              label: t('configuration.sections.imports.maxFileSize.label'),
              type: 'number',
              value: response?.imports?.maxFileSize || 50,
              description: t('configuration.sections.imports.maxFileSize.description')
            },
            {
              key: 'allowed_file_types',
              label: t('configuration.sections.imports.allowedTypes.label'),
              type: 'textarea',
              value: response?.imports?.allowedTypes || 'xml,csv,xlsx,pdf',
              description: t('configuration.sections.imports.allowedTypes.description')
            },
            {
              key: 'auto_backup',
              label: t('configuration.sections.imports.autoBackup.label'),
              type: 'boolean',
              value: response?.imports?.autoBackup || true,
              description: t('configuration.sections.imports.autoBackup.description')
            },
            {
              key: 'validate_imports',
              label: t('configuration.sections.imports.validateImports.label'),
              type: 'boolean',
              value: response?.imports?.validateImports || true,
              description: t('configuration.sections.imports.validateImports.description')
            }
          ]
        },
        {
          id: 'printing',
          name: t('configuration.sections.printing.title'),
          icon: PrinterIcon,
          description: t('configuration.sections.printing.description'),
          settings: [
            {
              key: 'default_page_size',
              label: t('configuration.sections.printing.pageSize.label'),
              type: 'select',
              value: response?.printing?.pageSize || 'A4',
              description: t('configuration.sections.printing.pageSize.description'),
              options: [
                { value: 'A4', label: t('configuration.sections.printing.pageSize.options.A4') },
                { value: 'A3', label: t('configuration.sections.printing.pageSize.options.A3') },
                { value: 'Letter', label: t('configuration.sections.printing.pageSize.options.Letter') },
                { value: 'Legal', label: t('configuration.sections.printing.pageSize.options.Legal') }
              ]
            },
            {
              key: 'default_orientation',
              label: t('configuration.sections.printing.orientation.label'),
              type: 'select',
              value: response?.printing?.orientation || 'portrait',
              description: t('configuration.sections.printing.orientation.description'),
              options: [
                { value: 'portrait', label: t('configuration.sections.printing.orientation.options.portrait') },
                { value: 'landscape', label: t('configuration.sections.printing.orientation.options.landscape') }
              ]
            },
            {
              key: 'pdf_quality',
              label: t('configuration.sections.printing.quality.label'),
              type: 'select',
              value: response?.printing?.quality || 'high',
              description: t('configuration.sections.printing.quality.description'),
              options: [
                { value: 'low', label: t('configuration.sections.printing.quality.options.low') },
                { value: 'medium', label: t('configuration.sections.printing.quality.options.medium') },
                { value: 'high', label: t('configuration.sections.printing.quality.options.high') }
              ]
            },
            {
              key: 'include_watermark',
              label: t('configuration.sections.printing.watermark.label'),
              type: 'boolean',
              value: response?.printing?.watermark || false,
              description: t('configuration.sections.printing.watermark.description')
            }
          ]
        },
        {
          id: 'participant-labels',
          name: t('configuration.sections.participantLabels.title'),
          icon: PrinterIcon,
          description: t('configuration.sections.participantLabels.description'),
          settings: [
            {
              key: 'label_rows',
              label: t('configuration.sections.participantLabels.rows.label'),
              type: 'number',
              value: response?.printing?.label_rows ?? 16,
              description: t('configuration.sections.participantLabels.rows.description')
            },
            {
              key: 'label_columns',
              label: t('configuration.sections.participantLabels.columns.label'),
              type: 'number',
              value: response?.printing?.label_columns ?? 4,
              description: t('configuration.sections.participantLabels.columns.description')
            },
            {
              key: 'label_width',
              label: t('configuration.sections.participantLabels.width.label'),
              type: 'number',
              value: response?.printing?.label_width ?? 48.5,
              description: t('configuration.sections.participantLabels.width.description')
            },
            {
              key: 'label_height',
              label: t('configuration.sections.participantLabels.height.label'),
              type: 'number',
              value: response?.printing?.label_height ?? 16.9,
              description: t('configuration.sections.participantLabels.height.description')
            },
            {
              key: 'label_margin_top',
              label: t('configuration.sections.participantLabels.marginTop.label'),
              type: 'number',
              value: response?.printing?.label_margin_top ?? 13,
              description: t('configuration.sections.participantLabels.marginTop.description')
            },
            {
              key: 'label_margin_bottom',
              label: t('configuration.sections.participantLabels.marginBottom.label'),
              type: 'number',
              value: response?.printing?.label_margin_bottom ?? 13,
              description: t('configuration.sections.participantLabels.marginBottom.description')
            },
            {
              key: 'label_margin_left',
              label: t('configuration.sections.participantLabels.marginLeft.label'),
              type: 'number',
              value: response?.printing?.label_margin_left ?? 8,
              description: t('configuration.sections.participantLabels.marginLeft.description')
            },
            {
              key: 'label_margin_right',
              label: t('configuration.sections.participantLabels.marginRight.label'),
              type: 'number',
              value: response?.printing?.label_margin_right ?? 8,
              description: t('configuration.sections.participantLabels.marginRight.description')
            },
            {
              key: 'label_show_borders',
              label: t('configuration.sections.participantLabels.showBorders.label'),
              type: 'boolean',
              value: response?.printing?.label_show_borders ?? true,
              description: t('configuration.sections.participantLabels.showBorders.description')
            }
          ]
        },
        {
          id: 'logging',
          name: t('configuration.sections.logging.title'),
          icon: ClockIcon,
          description: t('configuration.sections.logging.description'),
          settings: [
            {
              key: 'log_level',
              label: t('configuration.sections.logging.level.label'),
              type: 'select',
              value: response?.logging?.level || 'info',
              description: t('configuration.sections.logging.level.description'),
              options: [
                { value: 'error', label: t('configuration.sections.logging.level.options.error') },
                { value: 'warn', label: t('configuration.sections.logging.level.options.warn') },
                { value: 'info', label: t('configuration.sections.logging.level.options.info') },
                { value: 'debug', label: t('configuration.sections.logging.level.options.debug') }
              ]
            },
            {
              key: 'log_retention',
              label: t('configuration.sections.logging.retention.label'),
              type: 'number',
              value: response?.logging?.retention || 30,
              description: t('configuration.sections.logging.retention.description')
            },
            {
              key: 'enable_audit_log',
              label: t('configuration.sections.logging.auditLog.label'),
              type: 'boolean',
              value: response?.logging?.auditLog || true,
              description: t('configuration.sections.logging.auditLog.description')
            },
            {
              key: 'log_database_queries',
              label: t('configuration.sections.logging.dbQueries.label'),
              type: 'boolean',
              value: response?.logging?.dbQueries || false,
              description: t('configuration.sections.logging.dbQueries.description')
            }
          ]
        },
        {
          id: 'scoreCapture',
          name: t('configuration.sections.scoreCapture.title'),
          icon: ClipboardDocumentListIcon,
          description: t('configuration.sections.scoreCapture.description'),
          settings: [
            {
              key: 'useJuryResults',
              label: t('configuration.sections.scoreCapture.useJuryResults.label'),
              type: 'boolean',
              value: (appSettings as any)?.scoreCapture?.useJuryResults !== false, // Default: true
              description: t('configuration.sections.scoreCapture.useJuryResults.description')
            }
          ]
        },
        {
          id: 'firewall',
          name: t('configuration.firewall.title'),
          icon: GlobeAltIcon,
          description: t('configuration.firewall.description'),
          settings: [] // Firewall uses custom component, no standard settings
        },
        {
          id: 'wifi',
          name: t('configuration.sections.wifi.title'),
          icon: WifiIcon,
          description: t('configuration.sections.wifi.description'),
          settings: [] // WiFi uses custom WifiSettings component
        }
      ]

      setConfigSections(defaultSections)
    } catch (error) {
      console.error('Error loading configuration:', error)
      setMessage({ type: 'error', text: t('configuration.messages.loadFailed') })
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      const configData = configSections.reduce((acc, section) => {
        // Map participant-labels section settings to printing section for backend compatibility
        if (section.id === 'participant-labels') {
          if (!acc['printing']) {
            acc['printing'] = {}
          }
          section.settings.forEach(setting => {
            acc['printing'][setting.key] = setting.value
          })
        } else if (section.id === 'scoreCapture') {
          // Save scoreCapture settings to app-settings API
          acc['scoreCapture'] = section.settings.reduce((sectionAcc, setting) => {
            sectionAcc[setting.key] = setting.value
            return sectionAcc
          }, {} as any)
        } else {
          acc[section.id] = section.settings.reduce((sectionAcc, setting) => {
            sectionAcc[setting.key] = setting.value
            return sectionAcc
          }, {} as any)
        }
        return acc
      }, {} as any)

      // Save scoreCapture settings to app-settings API
      if (configData.scoreCapture) {
        await fetch('/api/app-settings/scoreCapture', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configData.scoreCapture)
        })
        delete configData.scoreCapture // Don't send to main configuration API
      }

      const response = await apiPost('/configuration/save', configData)
      setMessage({ type: 'success', text: t('configuration.messages.saveSuccess') })

      // Update the connected database indicator immediately
      if (response?.connectedDatabase) {
        setConnectedDb(response.connectedDatabase)
      }

      // If database config changed, force a full page reload to clear all cached data
      // (React Query staleTime is 5 min — stale data from the old DB would persist otherwise)
      if (configData.database) {
        const connDb = response?.connectedDatabase
        const expectedDb = configData.database.db_name
        if (connDb && expectedDb && connDb !== expectedDb) {
          console.warn(`⚠️ Database mismatch after save: expected "${expectedDb}", connected to "${connDb}"`)
        }
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      setMessage({ type: 'error', text: t('configuration.messages.saveFailed') })
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

  // Database operations are now handled by the Setup Wizard
  // testDatabaseConnection and createDatabase functions removed

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
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center px-4 py-2 border-2 border-blue-600 shadow-sm text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={t('configuration.wizard.openButton') || 'Datenbank-Setup-Assistent öffnen'}
              >
                <CogIcon className="h-4 w-4 mr-2" />
                {t('configuration.wizard.openButton') || 'Setup-Assistent'}
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
                  {/* Firewall Section - Custom Component */}
                  {activeConfigSection.id === 'firewall' ? (
                    <FirewallManagement />
                  ) : activeConfigSection.id === 'wifi' ? (
                    <WifiSettings />
                  ) : (
                    <>
                      {/* Database Section Info Box */}
                      {activeConfigSection.id === 'database' && (
                        <div className="mb-6 space-y-4">
                          {/* Connected Database Status */}
                          <div className={`border rounded-lg p-4 ${
                            connectedDb ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <CircleStackIcon className={`h-5 w-5 mr-2 ${connectedDb ? 'text-green-600' : 'text-yellow-600'}`} />
                                <span className="text-sm font-medium text-gray-700">
                                  {t('configuration.sections.database.connectedTo') || 'Verbundene Datenbank:'}
                                </span>
                                <span className={`ml-2 text-sm font-bold ${connectedDb ? 'text-green-800' : 'text-yellow-800'}`}>
                                  {connectedDb || t('configuration.sections.database.notConnected') || 'Nicht verbunden'}
                                </span>
                              </div>
                              <button
                                onClick={fetchConnectedDatabase}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                                title={t('configuration.sections.database.refresh') || 'Aktualisieren'}
                              >
                                {t('configuration.sections.database.refresh') || 'Aktualisieren'}
                              </button>
                            </div>
                          </div>

                          {/* Database Info */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                  {t('configuration.sections.database.infoTitle') || 'Database Configuration'}
                              </h3>
                              <div className="mt-2 text-sm text-blue-700">
                                <p>{t('configuration.sections.database.infoText') || 'Configure your PostgreSQL database connection. Use the "Create Database" button if you need to create a new database. Make sure the database user has CREATE DATABASE privileges.'}</p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Test Connection: Verify that the database is accessible</li>
                                  <li>Create Database: Create a new database if it doesn\'t exist yet</li>
                                  <li>After creating the database, run migrations to set up the schema</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          </div>
                        </div>
                      )}

                      {/* Score Capture Section Warning Box */}
                      {activeConfigSection.id === 'scoreCapture' && (
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
                                <span className="ml-2 text-sm text-gray-600">{t('configuration.enableSetting')}</span>
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
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Database Setup Wizard */}
      <DatabaseSetupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreateDatabase={wizardCreateDatabase}
        onTestConnection={wizardTestConnection}
        onCreateSchema={wizardCreateSchema}
        onApplyGymNetPreset={wizardApplyGymNetPreset}
        onImportProductionDisciplines={wizardImportProductionDisciplines}
        onImportProductionStatuses={wizardImportProductionStatuses}
        onImportSampleData={wizardImportSampleData}
        onImportDisciplineGroups={wizardImportDisciplineGroups}
        onImportStandardCountries={wizardImportStandardCountries}
        onUpdateDatabaseName={wizardUpdateDatabaseName}
        onSaveAndReconnect={wizardSaveAndReconnect}
        currentDbConfig={configSections.find(s => s.id === 'database')?.settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as any) || {}}
      />
    </div>
  )
}

export default Configuration
