import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import DatabaseSetupWizard from './Configuration/DatabaseSetupWizard'
import ConfigurationLayout from './Configuration/ConfigurationLayout'
import { useConfigurationWizardActions } from './Configuration/hooks/useConfigurationWizardActions'
import { useConfigurationSettings } from './Configuration/hooks/useConfigurationSettings'

const Configuration: React.FC = () => {
    const [showWizard, setShowWizard] = useState(false);

  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<string>('database')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
    const {
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
    } = useConfigurationSettings({ activeSection, t })
  const wizardActions = useConfigurationWizardActions({
    configSections,
    setConfigSections,
    setMessage,
    t,
  })

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
        hasFilters
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(previous => !previous)}
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

        <ConfigurationLayout
          sections={filteredSections}
          activeSection={activeSection}
          activeConfigSection={activeConfigSection}
          connectedDb={connectedDb}
          availableDatabases={availableDatabases}
          loadingDatabases={loadingDatabases}
          databaseListError={databaseListError}
          databaseHost={databaseHost}
          databaseUser={databaseUser}
          onActiveSectionChange={setActiveSection}
          onRefreshConnectedDatabase={fetchConnectedDatabase}
          onLoadAvailableDatabases={() => loadAvailableDatabases()}
          onSettingChange={updateSetting}
        />
      </div>

      {/* Database Setup Wizard */}
      <DatabaseSetupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreateDatabase={wizardActions.createDatabase}
        onTestConnection={wizardActions.testConnection}
        onCreateSchema={wizardActions.createSchema}
        onApplyGymNetPreset={wizardActions.applyGymNetPreset}
        onImportProductionDisciplines={wizardActions.importProductionDisciplines}
        onImportProductionStatuses={wizardActions.importProductionStatuses}
        onImportSampleData={wizardActions.importSampleData}
        onImportDisciplineGroups={wizardActions.importDisciplineGroups}
        onImportStandardCountries={wizardActions.importStandardCountries}
        onUpdateDatabaseName={wizardActions.updateDatabaseName}
        onSaveAndReconnect={wizardActions.saveAndReconnect}
        currentDbConfig={configSections.find(s => s.id === 'database')?.settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as any) || {}}
      />
    </div>
  )
}

export default Configuration
