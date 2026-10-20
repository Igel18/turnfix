import { LanguageIcon } from '@heroicons/react/24/outline'
import type { ConfigSection } from './Configuration.types'

export const createLocalizationSection = (response: any): ConfigSection => ({
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
        { value: 'es', label: 'Español (Spanish)' },
      ],
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
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
      ],
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
        { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
      ],
    },
  ],
})
