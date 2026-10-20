import type { Dispatch, SetStateAction } from 'react'
import { apiPost } from '@/utils/api'
import type { ConfigSection } from '../Configuration.types'
import { buildConfigurationPayload } from '../configurationPayload'

type ConfigurationMessage = { type: 'success' | 'error'; text: string } | null

interface UseConfigurationWizardActionsProps {
  configSections: ConfigSection[]
  setConfigSections: Dispatch<SetStateAction<ConfigSection[]>>
  setMessage: Dispatch<SetStateAction<ConfigurationMessage>>
  t: (key: string) => string
}

export const useConfigurationWizardActions = ({
  configSections,
  setConfigSections,
  setMessage,
  t,
}: UseConfigurationWizardActionsProps) => {
  const createDatabase = async (newDbName: string, dbConfig: any) => {
    try {
      const response = await apiPost('/configuration/create-database', { ...dbConfig, db_name: newDbName })
      if (response?.success) return { success: true, message: response.message }
      return { success: false, error: response?.error || 'Unknown error' }
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || error.message }
    }
  }

  const testConnection = async (dbConfig: any) => {
    try {
      const response = await apiPost('/configuration/test-database', dbConfig)
      if (response?.success) return { success: true, message: 'Connection successful' }
      return { success: false, error: response?.error || 'Connection failed' }
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || error?.message || 'Connection failed' }
    }
  }

  const updateDatabaseName = async (newDbName: string) => {
    setConfigSections(previous => previous.map(section => section.id === 'database'
      ? {
          ...section,
          settings: section.settings.map(setting => setting.key === 'db_name'
            ? { ...setting, value: newDbName }
            : setting),
        }
      : section))
  }

  const runImport = async (
    endpoint: string,
    dbConfig: any,
    options: { successMessage: string; resultKey: 'stats' | 'result'; failureMessage: string },
  ) => {
    try {
      const response = await apiPost(endpoint, { dbConfig })
      const result = response?.[options.resultKey]
      if (response?.success && result) {
        return { success: true, message: options.successMessage, [options.resultKey]: result }
      }
      return { success: false, error: response?.error || options.failureMessage }
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.details || error?.response?.data?.error || error.message,
      }
    }
  }

  const createSchema = async (dbConfig?: any) => {
    try {
      const response = await apiPost('/configuration/create-schema', { dbConfig })
      if (response?.success) return { success: true, message: response.message, details: response.details }
      return { success: false, error: response?.error || 'Schema creation failed' }
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.details || error?.response?.data?.error || error.message }
    }
  }

  const applyGymNetPreset = (dbConfig?: any) => runImport('/configuration/gymnet-preset', dbConfig, {
    successMessage: 'GymNet presets applied', resultKey: 'result', failureMessage: 'Preset application failed',
  })
  const importProductionDisciplines = (dbConfig?: any) => runImport('/configuration/production-disciplines', dbConfig, {
    successMessage: 'Production disciplines imported', resultKey: 'stats', failureMessage: 'Production disciplines import failed',
  })
  const importProductionStatuses = (dbConfig?: any) => runImport('/configuration/production-statuses', dbConfig, {
    successMessage: 'Production statuses imported', resultKey: 'stats', failureMessage: 'Production statuses import failed',
  })
  const importSampleData = (dbConfig?: any) => runImport('/configuration/sample-data', dbConfig, {
    successMessage: 'Sample data imported', resultKey: 'stats', failureMessage: 'Sample data import failed',
  })
  const importDisciplineGroups = (dbConfig?: any) => runImport('/configuration/discipline-groups', dbConfig, {
    successMessage: 'Discipline groups imported', resultKey: 'stats', failureMessage: 'Discipline groups import failed',
  })
  const importStandardCountries = (dbConfig?: any) => runImport('/configuration/standard-countries', dbConfig, {
    successMessage: 'Standard countries imported', resultKey: 'stats', failureMessage: 'Standard countries import failed',
  })

  const saveAndReconnect = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const configData = buildConfigurationPayload(configSections)
      if (configData.scoreCapture) {
        await fetch('/api/app-settings/scoreCapture', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configData.scoreCapture),
        })
        delete configData.scoreCapture
      }

      const response = await apiPost('/configuration/save', configData)
      const connectedDb = response?.connectedDatabase
      const expectedDb = configData.database?.db_name
      if (connectedDb && expectedDb && connectedDb !== expectedDb) {
        console.warn(`⚠️ Database mismatch: expected "${expectedDb}", connected to "${connectedDb}"`)
      }

      setMessage({ type: 'success', text: t('configuration.wizard.savedAndReconnected') || 'Konfiguration gespeichert & Server wird neu verbunden!' })
      setTimeout(() => window.location.reload(), 2000)
      return { success: true }
    } catch (error: any) {
      console.error('Error saving configuration from wizard:', error)
      setMessage({ type: 'error', text: t('configuration.messages.saveFailed') })
      return { success: false, error: error?.message || 'Save failed' }
    }
  }

  return {
    createDatabase,
    testConnection,
    createSchema,
    applyGymNetPreset,
    importProductionDisciplines,
    importProductionStatuses,
    importSampleData,
    importDisciplineGroups,
    importStandardCountries,
    updateDatabaseName,
    saveAndReconnect,
  }
}