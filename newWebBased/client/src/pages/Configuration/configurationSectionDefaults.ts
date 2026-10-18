import {
  CircleStackIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CogIcon,
  DocumentArrowDownIcon,
  GlobeAltIcon,
  PrinterIcon,
  ShieldCheckIcon,
  WifiIcon,
} from '@heroicons/react/24/outline'
import type { ConfigSection } from './Configuration.types'
import { createLocalizationSection } from './configurationLocalizationSection'

type Translator = (key: string) => string

export const createDefaultConfigurationSections = (
  t: Translator,
  response: any,
  appSettings: any,
): ConfigSection[] => [
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
        createLocalizationSection(response),
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
