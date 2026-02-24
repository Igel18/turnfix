/**
 * Type definitions for the DatabaseSetupWizard component.
 * Separated for better maintainability (SoC - Point 122).
 */

export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface Step {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  optional: boolean;
  output?: string[];
  error?: string;
}

export interface GymNetPresetStats {
  createdFormulas: number;
  totalFormulas: number;
  createdDevices: number;
  totalDevices: number;
  createdFields: number;
  totalFields: number;
}

export interface ProductionDisciplinesStats {
  createdSports: number;
  createdFormulas: number;
  totalFormulas: number;
  createdDisciplines: number;
  createdFields: number;
  skippedDisciplines: number;
  totalDisciplines: number;
}

export interface ProductionStatusesStats {
  createdStatuses: number;
  skippedStatuses: number;
  totalStatuses: number;
}

export interface SampleDataStats {
  createdCountries: number;
  createdAssociations: number;
  createdRegions: number;
  createdClubs: number;
  createdParticipants: number;
  createdVenues: number;
  createdLayouts: number;
  skipped: string[];
}

export interface DisciplineGroupsStats {
  createdGroups: number;
  createdAssignments: number;
  skippedGroups: number;
  missingDisciplines: string[];
  totalGroups: number;
}

export interface StandardCountriesStats {
  totalCountries: number;
  createdCountries: number;
  skippedCountries: number;
  existingCountries: string[];
}

export interface DatabaseSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDatabase: (dbName: string, dbConfig: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onTestConnection: (dbConfig: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onCreateSchema: (dbConfig?: any) => Promise<{ success: boolean; message?: string; details?: string; error?: string }>;
  onApplyGymNetPreset: (dbConfig?: any) => Promise<{
    success: boolean;
    message?: string;
    stats?: GymNetPresetStats;
    error?: string;
  }>;
  onImportProductionDisciplines: (dbConfig?: any) => Promise<{
    success: boolean;
    message?: string;
    stats?: ProductionDisciplinesStats;
    error?: string;
  }>;
  onImportProductionStatuses: (dbConfig?: any) => Promise<{
    success: boolean;
    message?: string;
    stats?: ProductionStatusesStats;
    error?: string;
  }>;
  onImportSampleData: (dbConfig?: any) => Promise<{
    success: boolean;
    message?: string;
    stats?: SampleDataStats;
    error?: string;
  }>;
  onImportDisciplineGroups: (dbConfig?: any) => Promise<{
    success: boolean;
    message?: string;
    stats?: DisciplineGroupsStats;
    error?: string;
  }>;
  onImportStandardCountries: (dbConfig?: any) => Promise<{
    success: boolean;
    message?: string;
    stats?: StandardCountriesStats;
    error?: string;
  }>;
  onUpdateDatabaseName: (newDbName: string) => Promise<void>;
  onSaveAndReconnect: () => Promise<{ success: boolean; error?: string }>;
  currentDbConfig: any;
}

export interface WizardStepItemProps {
  step: Step;
  index: number;
  canExecute: boolean;
  onExecute: (stepId: string) => void;
  onSkip: (stepId: string) => void;
  onRetry: (stepId: string) => void;
}
