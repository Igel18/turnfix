/**
 * Custom hook for DatabaseSetupWizard state management.
 * Handles step execution, status tracking, and wizard lifecycle.
 * Separated for better maintainability (SoC - Point 122).
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Step, StepStatus, DatabaseSetupWizardProps } from '../DatabaseSetupWizard.types';

type WizardCallbacks = Pick<
  DatabaseSetupWizardProps,
  | 'onCreateDatabase'
  | 'onTestConnection'
  | 'onCreateSchema'
  | 'onApplyGymNetPreset'
  | 'onImportProductionDisciplines'
  | 'onImportProductionStatuses'
  | 'onImportSampleData'
  | 'onImportDisciplineGroups'
  | 'onImportStandardCountries'
  | 'onUpdateDatabaseName'
  | 'onSaveAndReconnect'
>;

interface UseDatabaseSetupWizardParams extends WizardCallbacks {
  isOpen: boolean;
  currentDbConfig: any;
}

export function useDatabaseSetupWizard({
  isOpen,
  currentDbConfig,
  onCreateDatabase,
  onTestConnection,
  onCreateSchema,
  onApplyGymNetPreset,
  onImportProductionDisciplines,
  onImportProductionStatuses,
  onImportSampleData,
  onImportDisciplineGroups,
  onImportStandardCountries,
  onUpdateDatabaseName,
  onSaveAndReconnect,
}: UseDatabaseSetupWizardParams) {
  const { t } = useTranslation();

  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [activeDbConfig, setActiveDbConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveCompleted, setSaveCompleted] = useState(false);

  const createInitialSteps = useCallback((): Step[] => [
    {
      id: 'create-db',
      title: t('configuration.wizard.createDatabase') || 'Datenbank erstellen',
      description: t('configuration.wizard.createDatabaseDesc') || 'Erstellt eine neue PostgreSQL-Datenbank',
      status: 'pending',
      optional: false,
      output: [],
    },
    {
      id: 'test-connection',
      title: t('configuration.wizard.testConnection') || 'Verbindung testen',
      description: t('configuration.wizard.testConnectionDesc') || 'Prüft die Datenbankverbindung',
      status: 'pending',
      optional: false,
      output: [],
    },
    {
      id: 'create-schema',
      title: t('configuration.wizard.createSchema') || 'Schema erstellen',
      description: t('configuration.wizard.createSchemaDesc') || 'Initialisiert alle Tabellen und Beziehungen',
      status: 'pending',
      optional: false,
      output: [],
    },
    {
      id: 'production-statuses',
      title: 'Status Management importieren',
      description: 'Importiert 10 Status-Typen für Teilnehmer-Tracking (z.B. "Meldung erfasst", "Leistungen erfasst", "Urkunde gedruckt")',
      status: 'pending',
      optional: true,
      output: [],
    },
    {
      id: 'standard-countries',
      title: t('configuration.wizard.standardCountries') || 'Standardländer importieren',
      description: t('configuration.wizard.standardCountriesDesc') || 'Importiert 34 Länder (DACH, Europa, FIG) für die Länderliste bei Verbänden',
      status: 'pending',
      optional: true,
      output: [],
    },
    {
      id: 'gymnet-preset',
      title: t('configuration.wizard.gymnetPreset') || 'GymNet-Voreinstellungen',
      description: t('configuration.wizard.gymnetPresetDesc') || 'Befüllt DB mit GymNet-Geräten, Formeln und Feldern mit festen IDs (empfohlen VOR Produktions-Disziplinen)',
      status: 'pending',
      optional: true,
      output: [],
    },
    {
      id: 'production-disciplines',
      title: 'Produktions-Disziplinen importieren',
      description: 'Importiert alle 139 Disziplinen aus 12 Sportarten (Turnen, Leichtathletik, Schwimmen, etc.) - Empfohlen!',
      status: 'pending',
      optional: true,
      output: [],
    },
    {
      id: 'discipline-groups',
      title: t('configuration.wizard.disciplineGroups') || 'Disziplin-Gruppen anlegen',
      description: t('configuration.wizard.disciplineGroupsDesc') || 'Erstellt Standard-Gruppen (4-Kampf, 6-Kampf) für P-Wettkampf und Leistungsklassen (optional)',
      status: 'pending',
      optional: true,
      output: [],
    },
    {
      id: 'sample-data',
      title: t('configuration.wizard.sampleData') || 'Muster-Daten anlegen',
      description: t('configuration.wizard.sampleDataDesc') || 'Legt je einen Beispiel-Datensatz für Land, Verband, Gau, Verein, Teilnehmer, Wettkampfort und Urkunden-Layout an (optional)',
      status: 'pending',
      optional: true,
      output: [],
    },
  ], [t]);

  const [steps, setSteps] = useState<Step[]>(createInitialSteps);

  // --- Step state helpers ---

  const updateStepStatus = useCallback(
    (stepId: string, status: StepStatus, output?: string[], error?: string) => {
      setSteps(prev =>
        prev.map(step =>
          step.id === stepId
            ? { ...step, status, output: output || step.output, error }
            : step,
        ),
      );
    },
    [],
  );

  const addStepOutput = useCallback((stepId: string, message: string) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId
          ? { ...step, output: [...(step.output || []), message] }
          : step,
      ),
    );
  }, []);

  // --- Reset wizard to clean state when opened ---

  useEffect(() => {
    if (isOpen) {
      setNewDatabaseName('');
      setActiveDbConfig(null);
      setIsSaving(false);
      setSaveCompleted(false);
      setSteps(prev =>
        prev.map(step => ({
          ...step,
          status: 'pending' as StepStatus,
          output: [],
          error: undefined,
        })),
      );
      // No automatic DB check – wizard always starts fully reset
    }
  }, [isOpen]);

  // --- Step execution logic ---

  const canExecuteStep = useCallback(
    (stepIndex: number): boolean => {
      if (stepIndex === 0) return true;

      for (let i = 0; i < stepIndex; i++) {
        const prevStep = steps[i];
        if (!prevStep.optional && prevStep.status !== 'success' && prevStep.status !== 'skipped') {
          return false;
        }
      }

      // Production statuses, standard countries, GymNet preset, disciplines, groups, and sample data require schema
      if (stepIndex >= 3 && stepIndex <= 8) {
        const schemaStep = steps[2];
        if (schemaStep.status !== 'success') {
          return false;
        }
      }

      // Discipline groups additionally require production disciplines to be imported
      if (stepIndex === 7) {
        const disciplinesStep = steps[6]; // production-disciplines
        if (disciplinesStep.status !== 'success') {
          return false;
        }
      }

      return true;
    },
    [steps],
  );

  const executeStep = useCallback(
    async (stepId: string) => {
      const stepIndex = steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1 || !canExecuteStep(stepIndex)) return;

      updateStepStatus(stepId, 'running');

      try {
        let result;

        switch (stepId) {
          case 'create-db': {
            if (!newDatabaseName.trim()) {
              throw new Error('Bitte geben Sie einen Datenbanknamen ein');
            }
            addStepOutput(stepId, `⏳ Datenbank "${newDatabaseName}" wird erstellt...`);
            const dbConfigWithNewName = { ...currentDbConfig, db_name: newDatabaseName };
            result = await onCreateDatabase(newDatabaseName, dbConfigWithNewName);
            if (result.success) {
              addStepOutput(stepId, '✅ Datenbank erfolgreich erstellt');
              addStepOutput(stepId, '⏳ Konfiguration wird aktualisiert...');
              await onUpdateDatabaseName(newDatabaseName);
              addStepOutput(stepId, '✅ Konfiguration aktualisiert');
              updateStepStatus(stepId, 'success');
            } else if (result.error && result.error.includes('already exists')) {
              addStepOutput(stepId, '⏳ Datenbank existiert bereits');
              addStepOutput(stepId, '✅ Das ist ok - Schritt abgeschlossen');
              await onUpdateDatabaseName(newDatabaseName);
              addStepOutput(stepId, '✅ Konfiguration aktualisiert');
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Erstellen der Datenbank');
            }
            break;
          }

          case 'test-connection': {
            addStepOutput(stepId, '⏳ Verbindung wird getestet...');
            const testDbConfig = newDatabaseName.trim()
              ? { ...currentDbConfig, db_name: newDatabaseName }
              : currentDbConfig;
            result = await onTestConnection(testDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ Verbindung erfolgreich getestet');
              setActiveDbConfig(testDbConfig);
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || 'Verbindungstest fehlgeschlagen');
            }
            break;
          }

          case 'create-schema': {
            addStepOutput(stepId, '⏳ Datenbankschema wird erstellt...');
            result = await onCreateSchema(activeDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ Schema erfolgreich erstellt');
              if (result.details) {
                const lines = result.details.split('\n').filter((line: string) => line.trim());
                lines.forEach((line: string) => {
                  if (line.includes('table') || line.includes('migration') || line.includes('applied')) {
                    addStepOutput(stepId, `  ℹ️ ${line.trim()}`);
                  }
                });
              }
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Erstellen des Schemas');
            }
            break;
          }

          case 'production-statuses': {
            addStepOutput(stepId, '⏳ Status Management wird importiert...');
            result = await onImportProductionStatuses(activeDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ Status Management erfolgreich importiert');
              if (result.stats) {
                addStepOutput(stepId, `  📊 ${result.stats.createdStatuses}/${result.stats.totalStatuses} Status-Typen angelegt`);
                if (result.stats.skippedStatuses > 0) {
                  addStepOutput(stepId, `  ℹ️ ${result.stats.skippedStatuses} Status-Typen übersprungen (bereits vorhanden)`);
                }
              }
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Importieren der Status-Typen');
            }
            break;
          }

          case 'standard-countries': {
            addStepOutput(stepId, '⏳ Standardländer werden importiert...');
            result = await onImportStandardCountries(activeDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ Standardländer erfolgreich importiert');
              if (result.stats) {
                addStepOutput(stepId, `  📊 ${result.stats.createdCountries}/${result.stats.totalCountries} Länder angelegt`);
                if (result.stats.skippedCountries > 0) {
                  addStepOutput(stepId, `  ℹ️ ${result.stats.skippedCountries} Länder übersprungen (bereits vorhanden)`);
                }
              }
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Importieren der Standardländer');
            }
            break;
          }

          case 'production-disciplines': {
            addStepOutput(stepId, '⏳ Produktions-Disziplinen werden importiert...');
            result = await onImportProductionDisciplines(activeDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ Produktions-Disziplinen erfolgreich importiert');
              if (result.stats) {
                addStepOutput(stepId, `  📊 ${result.stats.createdSports} neue Sportarten angelegt`);
                addStepOutput(stepId, `  📊 ${result.stats.createdFormulas}/${result.stats.totalFormulas} Formeln angelegt`);
                addStepOutput(stepId, `  📊 ${result.stats.createdDisciplines}/${result.stats.totalDisciplines} Disziplinen importiert`);
                addStepOutput(stepId, `  📊 ${result.stats.createdFields} Felder angelegt`);
                if (result.stats.skippedDisciplines > 0) {
                  addStepOutput(stepId, `  ℹ️ ${result.stats.skippedDisciplines} Disziplinen übersprungen (bereits vorhanden)`);
                }
              }
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Importieren der Produktions-Disziplinen');
            }
            break;
          }

          case 'gymnet-preset': {
            addStepOutput(stepId, '⏳ GymNet-Voreinstellungen werden angewendet...');
            result = await onApplyGymNetPreset(activeDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ GymNet-Voreinstellungen erfolgreich angewendet');
              if (result.stats) {
                addStepOutput(stepId, `  📊 ${result.stats.createdFormulas}/${result.stats.totalFormulas} Formeln angelegt`);
                addStepOutput(stepId, `  📊 ${result.stats.createdDevices}/${result.stats.totalDevices} Geräte angelegt`);
                addStepOutput(stepId, `  📊 ${result.stats.createdFields}/${result.stats.totalFields} Felder angelegt`);
              }
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Anwenden der GymNet-Voreinstellungen');
            }
            break;
          }

          case 'discipline-groups': {
            addStepOutput(stepId, '⏳ Disziplin-Gruppen werden angelegt...');
            result = await onImportDisciplineGroups(activeDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ Disziplin-Gruppen erfolgreich angelegt');
              if (result.stats) {
                addStepOutput(stepId, `  📊 ${result.stats.createdGroups}/${result.stats.totalGroups} Gruppen angelegt`);
                addStepOutput(stepId, `  📊 ${result.stats.createdAssignments} Disziplin-Zuordnungen erstellt`);
                if (result.stats.skippedGroups > 0) {
                  addStepOutput(stepId, `  ℹ️ ${result.stats.skippedGroups} Gruppen übersprungen (bereits vorhanden)`);
                }
                if (result.stats.missingDisciplines.length > 0) {
                  addStepOutput(stepId, `  ⚠️ ${result.stats.missingDisciplines.length} Disziplinen nicht gefunden:`);
                  result.stats.missingDisciplines.forEach((d: string) => {
                    addStepOutput(stepId, `     - ${d}`);
                  });
                }
              }
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Anlegen der Disziplin-Gruppen');
            }
            break;
          }

          case 'sample-data': {
            addStepOutput(stepId, '⏳ Muster-Daten werden angelegt...');
            result = await onImportSampleData(activeDbConfig);
            if (result.success) {
              addStepOutput(stepId, '✅ Muster-Daten erfolgreich angelegt');
              if (result.stats) {
                const created: string[] = [];
                if (result.stats.createdCountries > 0) created.push(`${result.stats.createdCountries} Land`);
                if (result.stats.createdAssociations > 0) created.push(`${result.stats.createdAssociations} Verband`);
                if (result.stats.createdRegions > 0) created.push(`${result.stats.createdRegions} Gau`);
                if (result.stats.createdClubs > 0) created.push(`${result.stats.createdClubs} Verein`);
                if (result.stats.createdParticipants > 0) created.push(`${result.stats.createdParticipants} Teilnehmer`);
                if (result.stats.createdVenues > 0) created.push(`${result.stats.createdVenues} Wettkampfort`);
                if (result.stats.createdLayouts > 0) created.push(`${result.stats.createdLayouts} Urkunden-Layout`);
                if (created.length > 0) {
                  addStepOutput(stepId, `  📊 Angelegt: ${created.join(', ')}`);
                }
                if (result.stats.skipped.length > 0) {
                  addStepOutput(stepId, `  ℹ️ Übersprungen (bereits vorhanden): ${result.stats.skipped.join(', ')}`);
                }
              }
              updateStepStatus(stepId, 'success');
            } else {
              throw new Error(result.error || result.message || 'Fehler beim Anlegen der Muster-Daten');
            }
            break;
          }

          default:
            console.warn(`Unknown step: ${stepId}`);
            break;
        }
      } catch (error: any) {
        console.error(`Error executing step ${stepId}:`, error);
        const errorMessage = error.message || String(error);
        addStepOutput(stepId, `❌ Fehler: ${errorMessage}`);
        updateStepStatus(stepId, 'error', undefined, errorMessage);
      }
    },
    [
      steps, canExecuteStep, newDatabaseName, currentDbConfig, activeDbConfig,
      onCreateDatabase, onTestConnection, onCreateSchema,
      onApplyGymNetPreset, onImportProductionDisciplines, onImportProductionStatuses,
      onImportSampleData, onImportDisciplineGroups, onImportStandardCountries, onUpdateDatabaseName, updateStepStatus, addStepOutput,
    ],
  );

  const skipStep = useCallback(
    (stepId: string) => {
      updateStepStatus(stepId, 'skipped', ['⏭️ Schritt übersprungen']);
    },
    [updateStepStatus],
  );

  const retryStep = useCallback(
    (stepId: string) => {
      updateStepStatus(stepId, 'pending', []);
      // Use setTimeout to ensure state update completes before executing
      setTimeout(() => executeStep(stepId), 0);
    },
    [updateStepStatus, executeStep],
  );

  const resetWizard = useCallback(() => {
    setNewDatabaseName('');
    setActiveDbConfig(null);
    setIsSaving(false);
    setSaveCompleted(false);
    setSteps(prev =>
      prev.map(step => ({
        ...step,
        status: 'pending' as StepStatus,
        output: [],
        error: undefined,
      })),
    );
  }, []);

  // Save configuration and reconnect to the new database
  const handleSaveAndReconnect = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await onSaveAndReconnect();
      if (result.success) {
        setSaveCompleted(true);
      } else {
        console.error('Save and reconnect failed:', result.error);
      }
    } catch (error) {
      console.error('Save and reconnect error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveAndReconnect]);

  const allRequiredStepsComplete = steps
    .filter(s => !s.optional)
    .every(s => s.status === 'success');

  return {
    steps,
    newDatabaseName,
    setNewDatabaseName,
    canExecuteStep,
    executeStep,
    skipStep,
    retryStep,
    resetWizard,
    allRequiredStepsComplete,
    isSaving,
    saveCompleted,
    handleSaveAndReconnect,
  };
}
