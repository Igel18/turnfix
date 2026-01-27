import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedDialog from '@/components/UnifiedDialog';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface DatabaseSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDatabase: () => Promise<{ success: boolean; message?: string; error?: string }>;
  onTestConnection: () => Promise<{ success: boolean; message?: string; error?: string }>;
  onCreateSchema: () => Promise<{ success: boolean; message?: string; details?: string; error?: string }>;
  onApplyGymNetPreset: () => Promise<{ 
    success: boolean; 
    message?: string; 
    stats?: { 
      createdFormulas: number; 
      totalFormulas: number;
      createdDevices: number;
      totalDevices: number;
      createdFields: number;
      totalFields: number;
    };
    error?: string;
  }>;
  onImportProductionDisciplines: () => Promise<{
    success: boolean;
    message?: string;
    stats?: {
      createdSports: number;
      createdFormulas: number;
      totalFormulas: number;
      createdDisciplines: number;
      createdFields: number;
      skippedDisciplines: number;
      totalDisciplines: number;
    };
    error?: string;
  }>;
  onImportProductionStatuses: () => Promise<{
    success: boolean;
    message?: string;
    stats?: {
      createdStatuses: number;
      skippedStatuses: number;
      totalStatuses: number;
    };
    error?: string;
  }>;
}

type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

interface Step {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  optional: boolean;
  output?: string[];
  error?: string;
}

export default function DatabaseSetupWizard({
  isOpen,
  onClose,
  onCreateDatabase,
  onTestConnection,
  onCreateSchema,
  onApplyGymNetPreset,
  onImportProductionDisciplines,
  onImportProductionStatuses
}: DatabaseSetupWizardProps) {
  const { t } = useTranslation();
  
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'create-db',
      title: t('configuration.wizard.createDatabase') || 'Datenbank erstellen',
      description: t('configuration.wizard.createDatabaseDesc') || 'Erstellt eine neue PostgreSQL-Datenbank',
      status: 'pending',
      optional: false,
      output: []
    },
    {
      id: 'test-connection',
      title: t('configuration.wizard.testConnection') || 'Verbindung testen',
      description: t('configuration.wizard.testConnectionDesc') || 'Prüft die Datenbankverbindung',
      status: 'pending',
      optional: false,
      output: []
    },
    {
      id: 'create-schema',
      title: t('configuration.wizard.createSchema') || 'Schema erstellen',
      description: t('configuration.wizard.createSchemaDesc') || 'Initialisiert alle Tabellen und Beziehungen',
      status: 'pending',
      optional: false,
      output: []
    },
    {
      id: 'production-statuses',
      title: 'Status Management importieren',
      description: 'Importiert 10 Status-Typen für Teilnehmer-Tracking (z.B. "Meldung erfasst", "Leistungen erfasst", "Urkunde gedruckt")',
      status: 'pending',
      optional: true,
      output: []
    },
    {
      id: 'production-disciplines',
      title: 'Produktions-Disziplinen importieren',
      description: 'Importiert alle 139 Disziplinen aus 12 Sportarten (Turnen, Leichtathletik, Schwimmen, etc.) - Empfohlen!',
      status: 'pending',
      optional: true,
      output: []
    },
    {
      id: 'gymnet-preset',
      title: t('configuration.wizard.gymnetPreset') || 'GymNet-Voreinstellungen',
      description: t('configuration.wizard.gymnetPresetDesc') || 'Befüllt DB mit zusätzlichen GymNet-spezifischen Geräten und Formeln (optional)',
      status: 'pending',
      optional: true,
      output: []
    }
  ]);

  // Check if database already exists when wizard opens
  useEffect(() => {
    if (isOpen) {
      checkDatabaseExists();
    }
  }, [isOpen]);

  const checkDatabaseExists = async () => {
    try {
      const result = await onTestConnection();
      if (result.success) {
        // Database exists and is accessible
        updateStepStatus('create-db', 'skipped', ['ℹ️ Datenbank existiert bereits - Schritt übersprungen']);
        addStepOutput('create-db', '✅ Datenbank ist bereits vorhanden');
      }
    } catch (error) {
      // Database doesn't exist or connection failed - keep step as pending
      console.log('Database check: DB not yet created or not accessible');
    }
  };

  const updateStepStatus = (stepId: string, status: StepStatus, output?: string[], error?: string) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, output: output || step.output, error }
          : step
      )
    );
  };

  const addStepOutput = (stepId: string, message: string) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, output: [...(step.output || []), message] }
          : step
      )
    );
  };

  const canExecuteStep = (stepIndex: number): boolean => {
    if (stepIndex === 0) return true;
    
    // Check if all previous non-optional steps are successful or skipped
    for (let i = 0; i < stepIndex; i++) {
      const prevStep = steps[i];
      if (!prevStep.optional && prevStep.status !== 'success' && prevStep.status !== 'skipped') {
        return false;
      }
    }
    
    // Special rule: Production disciplines (step 3) and GymNet preset (step 4) require schema (step 2) to be explicitly successful
    if (stepIndex === 3 || stepIndex === 4) {
      const schemaStep = steps[2];
      if (schemaStep.status !== 'success') {
        return false; // Schema must be successfully created, not skipped
      }
    }
    
    return true;
  };

  const executeStep = async (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1 || !canExecuteStep(stepIndex)) return;

    updateStepStatus(stepId, 'running');

    try {
      let result;
      
      switch (stepId) {
        case 'create-db':
          addStepOutput(stepId, '⏳ Datenbank wird erstellt...');
          result = await onCreateDatabase();
          if (result.success) {
            addStepOutput(stepId, '✅ Datenbank erfolgreich erstellt');
            updateStepStatus(stepId, 'success');
          } else if (result.error && result.error.includes('already exists')) {
            // Database already exists - treat as success
            addStepOutput(stepId, '⏳ Datenbank existiert bereits');
            addStepOutput(stepId, '✅ Das ist ok - Schritt abgeschlossen');
            updateStepStatus(stepId, 'success');
          } else {
            throw new Error(result.error || result.message || 'Fehler beim Erstellen der Datenbank');
          }
          break;

        case 'test-connection':
          addStepOutput(stepId, '⏳ Verbindung wird getestet...');
          result = await onTestConnection();
          if (result.success) {
            addStepOutput(stepId, '✅ Verbindung erfolgreich getestet');
            updateStepStatus(stepId, 'success');
          } else {
            const errorMsg = result.error || 'Verbindungstest fehlgeschlagen';
            throw new Error(errorMsg);
          }
          break;

        case 'create-schema':
          addStepOutput(stepId, '⏳ Datenbankschema wird erstellt...');
          result = await onCreateSchema();
          if (result.success) {
            addStepOutput(stepId, '✅ Schema erfolgreich erstellt');
            if (result.details) {
              // Parse Prisma output for table creation info
              const lines = result.details.split('\n').filter(line => line.trim());
              lines.forEach(line => {
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

        case 'production-statuses':
          addStepOutput(stepId, '⏳ Status Management wird importiert...');
          result = await onImportProductionStatuses();
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

        case 'production-disciplines':
          addStepOutput(stepId, '⏳ Produktions-Disziplinen werden importiert...');
          result = await onImportProductionDisciplines();
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

        case 'gymnet-preset':
          addStepOutput(stepId, '⏳ GymNet-Voreinstellungen werden angewendet...');
          result = await onApplyGymNetPreset();
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
    } catch (error: any) {
      console.error(`Error executing step ${stepId}:`, error);
      const errorMessage = error.message || String(error);
      addStepOutput(stepId, `❌ Fehler: ${errorMessage}`);
      updateStepStatus(stepId, 'error', undefined, errorMessage);
    }
  };

  const skipStep = (stepId: string) => {
    updateStepStatus(stepId, 'skipped', ['⏭️ Schritt übersprungen']);
  };

  const resetWizard = () => {
    setSteps(prevSteps => 
      prevSteps.map(step => ({
        ...step,
        status: 'pending',
        output: [],
        error: undefined
      }))
    );
  };

  const handleClose = () => {
    onClose();
    // Don't reset on close - user might want to review the results
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'running':
        return <ClockIcon className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'skipped':
        return <ChevronRightIcon className="h-6 w-6 text-gray-400" />;
      default:
        return <div className="h-6 w-6 rounded-full border-2 border-gray-300" />;
    }
  };

  const allRequiredStepsComplete = steps
    .filter(s => !s.optional)
    .every(s => s.status === 'success');

  return (
    <UnifiedDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t('configuration.wizard.title') || 'Datenbank-Setup-Assistent'}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                {t('configuration.wizard.info') || 'Dieser Assistent führt Sie durch die Datenbank-Einrichtung.'}
              </p>
              <p>
                {t('configuration.wizard.infoDetail') || 
                  'Die Schritte müssen in der angegebenen Reihenfolge ausgeführt werden. Der letzte Schritt (GymNet-Voreinstellungen) ist optional.'}
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`border rounded-lg p-4 ${
                step.status === 'success' ? 'border-green-300 bg-green-50' :
                step.status === 'error' ? 'border-red-300 bg-red-50' :
                step.status === 'running' ? 'border-blue-300 bg-blue-50' :
                step.status === 'skipped' ? 'border-gray-300 bg-gray-50' :
                'border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {index + 1}. {step.title}
                      </h3>
                      {step.optional && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {t('configuration.wizard.optional') || 'Optional'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    
                    {/* Output Log */}
                    {step.output && step.output.length > 0 && (
                      <div className="mt-3 bg-gray-900 rounded p-3 font-mono text-xs text-gray-100 max-h-40 overflow-y-auto">
                        {step.output.map((line, i) => (
                          <div key={i} className="whitespace-pre-wrap">{line}</div>
                        ))}
                      </div>
                    )}

                    {/* Error Details */}
                    {step.error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                        {step.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 ml-4">
                  {step.status === 'pending' && canExecuteStep(index) && (
                    <>
                      <button
                        onClick={() => executeStep(step.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {t('configuration.wizard.execute') || 'Ausführen'}
                      </button>
                      {step.optional && (
                        <button
                          onClick={() => skipStep(step.id)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                          {t('configuration.wizard.skip') || 'Überspringen'}
                        </button>
                      )}
                    </>
                  )}
                  {step.status === 'error' && (
                    <button
                      onClick={() => {
                        updateStepStatus(step.id, 'pending', []);
                        executeStep(step.id);
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {t('configuration.wizard.retry') || 'Wiederholen'}
                    </button>
                  )}
                  {step.status === 'running' && (
                    <div className="px-3 py-1.5 text-sm text-blue-600">
                      {t('configuration.wizard.running') || 'Wird ausgeführt...'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Success Message */}
        {allRequiredStepsComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">
                  {t('configuration.wizard.complete') || 'Datenbank-Setup erfolgreich abgeschlossen!'}
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
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('common.close') || 'Schließen'}
          </button>
        </div>
      </div>
    </UnifiedDialog>
  );
}
