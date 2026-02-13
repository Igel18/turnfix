/**
 * DatabaseSetupWizard – Main component.
 *
 * Guides the user through database creation, schema setup,
 * and optional data imports (statuses, disciplines, GymNet presets).
 *
 * Refactored using SoC (Point 122):
 *  - Types         → DatabaseSetupWizard.types.ts
 *  - State / Logic → hooks/useDatabaseSetupWizard.ts
 *  - Step UI       → components/WizardStepItem.tsx
 */

import { useTranslation } from 'react-i18next';
import UnifiedDialog from '@/components/UnifiedDialog';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { DatabaseSetupWizardProps } from './DatabaseSetupWizard.types';
import { useDatabaseSetupWizard } from './hooks/useDatabaseSetupWizard';
import WizardStepItem from './components/WizardStepItem';

export default function DatabaseSetupWizard(props: DatabaseSetupWizardProps) {
  const { isOpen, onClose, currentDbConfig } = props;
  const { t } = useTranslation();

  const {
    steps,
    newDatabaseName,
    setNewDatabaseName,
    canExecuteStep,
    executeStep,
    skipStep,
    retryStep,
    resetWizard,
    allRequiredStepsComplete,
  } = useDatabaseSetupWizard({
    isOpen,
    currentDbConfig,
    onCreateDatabase: props.onCreateDatabase,
    onTestConnection: props.onTestConnection,
    onCreateSchema: props.onCreateSchema,
    onApplyGymNetPreset: props.onApplyGymNetPreset,
    onImportProductionDisciplines: props.onImportProductionDisciplines,
    onImportProductionStatuses: props.onImportProductionStatuses,
    onUpdateDatabaseName: props.onUpdateDatabaseName,
  });

  return (
    <UnifiedDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('configuration.wizard.title') || 'Datenbank-Setup-Assistent'}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Database Name Input */}
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neuer Datenbankname
          </label>
          <input
            type="text"
            value={newDatabaseName}
            onChange={(e) => setNewDatabaseName(e.target.value)}
            placeholder={currentDbConfig?.db_name || 'turnfix_new'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={steps[0].status === 'running' || steps[0].status === 'success'}
          />
          <p className="mt-1 text-xs text-gray-500">
            Aktuell:{' '}
            <span className="font-medium">{currentDbConfig?.db_name || 'keine'}</span>
            {newDatabaseName.trim() && newDatabaseName !== currentDbConfig?.db_name && (
              <span className="ml-2 text-blue-600">
                → Neu: <span className="font-medium">{newDatabaseName}</span>
              </span>
            )}
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                {t('configuration.wizard.info') ||
                  'Dieser Assistent führt Sie durch die Datenbank-Einrichtung.'}
              </p>
              <p>
                {t('configuration.wizard.infoDetail') ||
                  'Die Schritte müssen in der angegebenen Reihenfolge ausgeführt werden. Optional können Status-Typen, Disziplinen und GymNet-Presets importiert werden.'}
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <WizardStepItem
              key={step.id}
              step={step}
              index={index}
              canExecute={canExecuteStep(index)}
              onExecute={executeStep}
              onSkip={skipStep}
              onRetry={retryStep}
            />
          ))}
        </div>

        {/* Success Message */}
        {allRequiredStepsComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">
                  {t('configuration.wizard.complete') ||
                    'Datenbank-Setup erfolgreich abgeschlossen!'}
                </p>
                <p className="mt-1">
                  {t('configuration.wizard.completeDetail') ||
                    'Ihre Datenbank ist nun einsatzbereit. Sie können diesen Dialog schließen und mit der Konfiguration fortfahren.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={resetWizard}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('configuration.wizard.reset') || 'Zurücksetzen'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('common.close') || 'Schließen'}
          </button>
        </div>
      </div>
    </UnifiedDialog>
  );
}
