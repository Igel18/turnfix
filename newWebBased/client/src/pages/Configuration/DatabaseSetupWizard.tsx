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
import { WizardModal, type WizardStepDef } from '@/components/WizardModal';
import {
  CircleStackIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { DatabaseSetupWizardProps } from './DatabaseSetupWizard.types';
import { useDatabaseSetupWizard } from './hooks/useDatabaseSetupWizard';
import WizardStepItem from './components/WizardStepItem';

/** High-level phase indicator steps shown at the top of the wizard. */
const WIZARD_PHASES: WizardStepDef[] = [
  { key: 'database', label: 'Datenbank', icon: CircleStackIcon },
  { key: 'import',   label: 'Daten importieren', icon: ArrowDownTrayIcon },
  { key: 'complete', label: 'Fertig', icon: CheckBadgeIcon },
];

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
    skippedCriticalSteps,
    isSaving,
    saveCompleted,
    handleSaveAndReconnect,
  } = useDatabaseSetupWizard({
    isOpen,
    currentDbConfig,
    onCreateDatabase: props.onCreateDatabase,
    onTestConnection: props.onTestConnection,
    onCreateSchema: props.onCreateSchema,
    onApplyGymNetPreset: props.onApplyGymNetPreset,
    onImportProductionDisciplines: props.onImportProductionDisciplines,
    onImportProductionStatuses: props.onImportProductionStatuses,
    onImportStandardCountries: props.onImportStandardCountries,
    onImportSampleData: props.onImportSampleData,
    onImportDisciplineGroups: props.onImportDisciplineGroups,
    onUpdateDatabaseName: props.onUpdateDatabaseName,
    onSaveAndReconnect: props.onSaveAndReconnect,
  });

  // Derive the current high-level phase for the step indicator.
  // Required steps: indices 0 (create-db), 1 (test-connection), 2 (create-schema).
  const requiredDone = steps.slice(0, 3).every(
    (s) => s.status === 'success' || s.status === 'skipped',
  );
  const currentPhase = saveCompleted
    ? 'complete'
    : requiredDone
      ? 'import'
      : 'database';

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('configuration.wizard.title') || 'Datenbank-Setup-Assistent'}
      size="4xl"
      fullHeight
      steps={WIZARD_PHASES}
      currentStep={currentPhase}
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

        {/* Warning: Only for new databases */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">
                {t('configuration.wizard.newDbOnly') ||
                  'Nur für neue, leere Datenbanken'}
              </p>
              <p>
                {t('configuration.wizard.newDbOnlyDetail') ||
                  'Dieser Assistent ist ausschließlich für die Ersteinrichtung neuer Datenbanken vorgesehen. Bestehende Datenbanken mit Daten werden nicht unterstützt. Disziplinen, Status-Typen und Disziplingruppen werden nur in leere Tabellen importiert.'}
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

        {/* Warning: Skipped critical steps */}
        {skippedCriticalSteps.length > 0 && allRequiredStepsComplete && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-2">
                  {t('configuration.wizard.skippedWarningTitle') ||
                    'Wichtiger Hinweis: Optionale Schritte wurden übersprungen'}
                </p>
                <p className="mb-2">
                  {t('configuration.wizard.skippedWarningIntro') ||
                    'Ohne die übersprungenen Schritte kann es zu folgenden Einschränkungen kommen:'}
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>
                    {t('configuration.wizard.skippedWarning1') ||
                      'Der GymNet-Import kann das Mapping der Geräte nicht korrekt durchführen (fehlende Geräte-IDs und Formeln)'}
                  </li>
                  <li>
                    {t('configuration.wizard.skippedWarning2') ||
                      'Geschlechter können als „unbekannt" gekennzeichnet sein (fehlende Bereiche/Gender-Zuordnungen)'}
                  </li>
                  <li>
                    {t('configuration.wizard.skippedWarning3') ||
                      'Einige Funktionen arbeiten möglicherweise nicht korrekt: Statistiken, Gerätezuweisungen, automatische Riegeneinteilung, Disziplingruppen-Filter'}
                  </li>
                </ul>
                <p className="mt-2 text-xs text-red-600">
                  {t('configuration.wizard.skippedWarningHint') ||
                    'Empfehlung: Setzen Sie den Assistenten zurück und führen Sie alle Schritte aus, um volle Funktionalität zu gewährleisten.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {allRequiredStepsComplete && !saveCompleted && (
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
                    'Ihre Datenbank ist nun einsatzbereit. Klicken Sie auf "Neue DB verwenden & Speichern" um die Konfiguration zu übernehmen und den Server neu zu verbinden.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save completed message */}
        {saveCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">
                  {t('configuration.wizard.savedAndReconnected') ||
                    'Konfiguration gespeichert & Server wird neu verbunden!'}
                </p>
                <p className="mt-1">
                  {t('configuration.wizard.savedAndReconnectedDetail') ||
                    'Die neue Datenbank wird jetzt verwendet. Der Server startet neu – bitte warten Sie einen Moment und laden Sie die Seite dann neu.'}
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
            disabled={isSaving}
          >
            {t('configuration.wizard.reset') || 'Zurücksetzen'}
          </button>
          <div className="flex gap-2">
            {allRequiredStepsComplete && !saveCompleted && (
              <button
                onClick={handleSaveAndReconnect}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    {t('configuration.wizard.saving') || 'Speichern...'}
                  </>
                ) : (
                  t('configuration.wizard.saveAndReconnect') || 'Neue DB verwenden & Speichern'
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('common.close') || 'Schließen'}
            </button>
          </div>
        </div>
      </div>
    </WizardModal>
  );
}
