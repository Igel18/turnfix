import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '@/utils/api'
import type { ConfigSection } from '../Configuration.types'
import { createDefaultConfigurationSections } from '../configurationSectionDefaults'
import { buildConfigurationPayload } from '../configurationPayload'

type ConfigurationMessage = { type: 'success' | 'error'; text: string } | null

interface UseConfigurationSettingsProps {
  activeSection: string
  t: (key: string) => string
}

export const useConfigurationSettings = ({ activeSection, t }: UseConfigurationSettingsProps) => {
  const [configSections, setConfigSections] = useState<ConfigSection[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<ConfigurationMessage>(null)
  const [connectedDb, setConnectedDb] = useState<string | null>(null)
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([])
  const [loadingDatabases, setLoadingDatabases] = useState(false)
  const [databaseListError, setDatabaseListError] = useState(false)
  const databaseListRequestId = useRef(0)

  const databaseSettings = configSections.find(section => section.id === 'database')?.settings ?? []
  const getDatabaseSetting = (key: string) => databaseSettings.find(setting => setting.key === key)?.value
  const databaseHost = getDatabaseSetting('db_host')
  const databasePort = getDatabaseSetting('db_port')
  const databaseUser = getDatabaseSetting('db_user')
  const databasePassword = getDatabaseSetting('db_password')
  const databaseSsl = getDatabaseSetting('db_ssl')

  const loadAvailableDatabases = useCallback(async () => {
    if (!databaseHost || !databasePort || !databaseUser) return
    const requestId = ++databaseListRequestId.current
    setLoadingDatabases(true)
    setDatabaseListError(false)
    try {
      const response = await apiPost('/configuration/list-databases', {
        db_host: databaseHost,
        db_port: databasePort,
        db_user: databaseUser,
        db_password: databasePassword ?? '',
        db_ssl: Boolean(databaseSsl),
      })
      if (databaseListRequestId.current === requestId) {
        setAvailableDatabases(Array.isArray(response?.databases) ? response.databases : [])
      }
    } catch {
      if (databaseListRequestId.current === requestId) {
        setAvailableDatabases([])
        setDatabaseListError(true)
      }
    } finally {
      if (databaseListRequestId.current === requestId) setLoadingDatabases(false)
    }
  }, [databaseHost, databasePort, databaseUser, databasePassword, databaseSsl])

  useEffect(() => {
    if (activeSection !== 'database' || !databaseHost || !databasePort || !databaseUser) return
    const debounceTimer = window.setTimeout(() => void loadAvailableDatabases(), 400)
    return () => window.clearTimeout(debounceTimer)
  }, [activeSection, databaseHost, databasePort, databaseUser, loadAvailableDatabases])

  const fetchConnectedDatabase = async () => {
    try {
      const response = await apiGet('/configuration/connected-database')
      setConnectedDb(response?.connectedDatabase || null)
    } catch {
      setConnectedDb(null)
    }
  }

  const loadConfiguration = async () => {
    try {
      const response = await apiGet('/configuration')
      let appSettings = {}
      try {
        const appSettingsResponse = await fetch('/api/app-settings')
        appSettings = await appSettingsResponse.json()
      } catch (error) {
        console.error('Error loading app settings:', error)
      }
      setConfigSections(createDefaultConfigurationSections(t, response, appSettings))
    } catch (error) {
      console.error('Error loading configuration:', error)
      setMessage({ type: 'error', text: t('configuration.messages.loadFailed') })
    }
  }

  useEffect(() => {
    void loadConfiguration()
    void fetchConnectedDatabase()
  }, [t])

  const saveConfiguration = async () => {
    setSaving(true)
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
      setMessage({ type: 'success', text: t('configuration.messages.saveSuccess') })
      if (response?.connectedDatabase) setConnectedDb(response.connectedDatabase)

      if (configData.database) {
        const connectedDatabase = response?.connectedDatabase
        const expectedDatabase = configData.database.db_name
        if (connectedDatabase && expectedDatabase && connectedDatabase !== expectedDatabase) {
          console.warn(`⚠️ Database mismatch after save: expected "${expectedDatabase}", connected to "${connectedDatabase}"`)
        }
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      setMessage({ type: 'error', text: t('configuration.messages.saveFailed') })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (sectionId: string, settingKey: string, value: any) => {
    setConfigSections(previous => previous.map(section => section.id === sectionId
      ? {
          ...section,
          settings: section.settings.map(setting => setting.key === settingKey
            ? { ...setting, value }
            : setting),
        }
      : section))
  }

  return {
    configSections,
    setConfigSections,
    saving,
    message,
    setMessage,
    connectedDb,
    availableDatabases,
    loadingDatabases,
    databaseListError,
    databaseHost,
    databaseUser,
    loadAvailableDatabases,
    fetchConnectedDatabase,
    saveConfiguration,
    updateSetting,
  }
}
