/**
 * Tests for the DatabaseSetupWizard component and its sub-modules.
 * Tests the hook (useDatabaseSetupWizard), step rendering (WizardStepItem),
 * and the main wizard component integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import type { ReactNode } from 'react';
import type { DatabaseSetupWizardProps, Step, WizardStepItemProps } from '../../pages/Configuration/DatabaseSetupWizard.types';
import { useDatabaseSetupWizard } from '../../pages/Configuration/hooks/useDatabaseSetupWizard';
import WizardStepItem from '../../pages/Configuration/components/WizardStepItem';
import DatabaseSetupWizard from '../../pages/Configuration/DatabaseSetupWizard';

// ── helpers ──────────────────────────────────────────────────────────

const i18nWrapper = ({ children }: { children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

function createMockCallbacks() {
  return {
    onCreateDatabase: vi.fn().mockResolvedValue({ success: true, message: 'Created' }),
    onTestConnection: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
    onCreateSchema: vi.fn().mockResolvedValue({ success: true, message: 'Schema done' }),
    onApplyGymNetPreset: vi.fn().mockResolvedValue({
      success: true,
      stats: { createdFormulas: 3, totalFormulas: 3, createdDevices: 5, totalDevices: 5, createdFields: 10, totalFields: 10 },
    }),
    onImportProductionDisciplines: vi.fn().mockResolvedValue({
      success: true,
      stats: { createdSports: 2, createdFormulas: 4, totalFormulas: 4, createdDisciplines: 10, createdFields: 20, skippedDisciplines: 0, totalDisciplines: 10 },
    }),
    onImportProductionStatuses: vi.fn().mockResolvedValue({
      success: true,
      stats: { createdStatuses: 10, skippedStatuses: 0, totalStatuses: 10 },
    }),
    onUpdateDatabaseName: vi.fn().mockResolvedValue(undefined),
    onSaveAndReconnect: vi.fn().mockResolvedValue({ success: true }),
    onImportSampleData: vi.fn().mockResolvedValue({ success: true, stats: { created: 7, skipped: 0 } }),
    onImportDisciplineGroups: vi.fn().mockResolvedValue({ success: true, stats: { created: 2, skipped: 0 } }),
    onImportStandardCountries: vi.fn().mockResolvedValue({ success: true, stats: { created: 34, skipped: 0 } }),
    onClose: vi.fn(),
  };
}

const defaultDbConfig = {
  db_host: 'localhost',
  db_port: 5432,
  db_name: 'turnfix_test',
  db_user: 'postgres',
  db_password: 'pw',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1) Hook: useDatabaseSetupWizard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('useDatabaseSetupWizard', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    cbs = createMockCallbacks();
    // By default, test-connection fails (DB doesn't exist yet)
    cbs.onTestConnection.mockRejectedValue(new Error('Connection failed'));
  });

  const hookParams = (overrides: Record<string, any> = {}) => ({
    isOpen: true,
    currentDbConfig: defaultDbConfig,
    ...cbs,
    ...overrides,
  });

  it('initialises 9 steps, all pending', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    expect(result.current.steps).toHaveLength(9);
    expect(result.current.steps.every(s => s.status === 'pending')).toBe(true);
  });

  it('marks first 3 steps as non-optional and last 6 as optional', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    expect(result.current.steps[0].optional).toBe(false);
    expect(result.current.steps[1].optional).toBe(false);
    expect(result.current.steps[2].optional).toBe(false);
    expect(result.current.steps[3].optional).toBe(true);
    expect(result.current.steps[4].optional).toBe(true);
    expect(result.current.steps[5].optional).toBe(true);
    expect(result.current.steps[6].optional).toBe(true);
    expect(result.current.steps[7].optional).toBe(true);
    expect(result.current.steps[8].optional).toBe(true);
  });

  it('canExecuteStep allows step 0 always', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    expect(result.current.canExecuteStep(0)).toBe(true);
  });

  it('canExecuteStep blocks step 1 when step 0 is not done', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    expect(result.current.canExecuteStep(1)).toBe(false);
  });

  it('resets state when isOpen becomes true', async () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDatabaseSetupWizard(hookParams({ isOpen })),
      { wrapper: i18nWrapper, initialProps: { isOpen: false } },
    );

    // Set a name manually
    act(() => { result.current.setNewDatabaseName('mydb'); });
    expect(result.current.newDatabaseName).toBe('mydb');

    // Open wizard → should reset
    rerender({ isOpen: true });
    await waitFor(() => {
      expect(result.current.newDatabaseName).toBe('');
    });
  });

  it('opens with all steps pending even when DB already exists', async () => {
    cbs.onTestConnection.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: true })), {
      wrapper: i18nWrapper,
    });
    // Wizard should NOT auto-skip step 1 – always starts fully reset
    expect(result.current.steps[0].status).toBe('pending');
    expect(result.current.steps.every(s => s.status === 'pending')).toBe(true);
  });

  it('resetWizard sets all steps back to pending', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    // Manually change some states
    act(() => {
      result.current.skipStep('create-db');
      result.current.setNewDatabaseName('test_db');
    });
    expect(result.current.steps[0].status).toBe('skipped');
    expect(result.current.newDatabaseName).toBe('test_db');

    // Reset
    act(() => { result.current.resetWizard(); });
    expect(result.current.steps.every(s => s.status === 'pending')).toBe(true);
    expect(result.current.newDatabaseName).toBe('');
  });

  it('skipStep marks a step as skipped', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    act(() => { result.current.skipStep('gymnet-preset'); });
    const gymnet = result.current.steps.find(s => s.id === 'gymnet-preset');
    expect(gymnet?.status).toBe('skipped');
  });

  it('allRequiredStepsComplete is false initially', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    expect(result.current.allRequiredStepsComplete).toBe(false);
  });

  it('executeStep requires database name for create-db', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    // Don't set name, try to execute
    await act(async () => {
      await result.current.executeStep('create-db');
    });
    // Should fail with error about missing name
    expect(result.current.steps[0].status).toBe('error');
    expect(result.current.steps[0].error).toContain('Datenbanknamen');
  });

  it('executeStep create-db succeeds with valid name', async () => {
    cbs.onCreateDatabase.mockResolvedValue({ success: true, message: 'Created' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    act(() => { result.current.setNewDatabaseName('new_db'); });
    await act(async () => {
      await result.current.executeStep('create-db');
    });
    expect(result.current.steps[0].status).toBe('success');
    expect(cbs.onCreateDatabase).toHaveBeenCalledWith('new_db', expect.objectContaining({ db_name: 'new_db' }));
    expect(cbs.onUpdateDatabaseName).toHaveBeenCalledWith('new_db');
  });

  it('executeStep create-db treats "already exists" as success', async () => {
    cbs.onCreateDatabase.mockResolvedValue({ success: false, error: 'database already exists' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    act(() => { result.current.setNewDatabaseName('existing_db'); });
    await act(async () => {
      await result.current.executeStep('create-db');
    });
    expect(result.current.steps[0].status).toBe('success');
  });

  it('executeStep test-connection succeeds', async () => {
    // First complete create-db
    cbs.onCreateDatabase.mockResolvedValue({ success: true });
    cbs.onTestConnection.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    act(() => { result.current.setNewDatabaseName('test_db'); });
    await act(async () => { await result.current.executeStep('create-db'); });

    // Now test connection
    await act(async () => { await result.current.executeStep('test-connection'); });
    expect(result.current.steps[1].status).toBe('success');
  });

  it('executeStep test-connection handles failure', async () => {
    cbs.onTestConnection.mockResolvedValue({ success: false, error: 'timeout' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    // Skip create-db to allow test-connection
    act(() => { result.current.skipStep('create-db'); });
    // Can't execute because create-db is optional: false and only skipped
    // Actually, canExecuteStep checks non-optional status
    // create-db is non-optional, status is 'skipped' which is allowed
    await act(async () => { await result.current.executeStep('test-connection'); });
    expect(result.current.steps[1].status).toBe('error');
    expect(result.current.steps[1].error).toBe('timeout');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  2) Component: WizardStepItem
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('WizardStepItem', () => {
  const baseStep: Step = {
    id: 'test-step',
    title: 'Test Step',
    description: 'A test step description',
    status: 'pending',
    optional: false,
    output: [],
  };

  const baseProps: WizardStepItemProps = {
    step: baseStep,
    index: 0,
    canExecute: true,
    onExecute: vi.fn(),
    onSkip: vi.fn(),
    onRetry: vi.fn(),
  };

  it('renders step title with index', () => {
    render(<WizardStepItem {...baseProps} />, { wrapper: i18nWrapper });
    expect(screen.getByText(/1\.\s*Test Step/)).toBeInTheDocument();
  });

  it('renders step description', () => {
    render(<WizardStepItem {...baseProps} />, { wrapper: i18nWrapper });
    expect(screen.getByText('A test step description')).toBeInTheDocument();
  });

  it('shows Execute button when pending and canExecute', () => {
    render(<WizardStepItem {...baseProps} />, { wrapper: i18nWrapper });
    // Look for button text - may be translated or fallback
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Skip button for optional step when pending', () => {
    const optionalStep = { ...baseStep, optional: true };
    render(<WizardStepItem {...baseProps} step={optionalStep} />, { wrapper: i18nWrapper });
    const buttons = screen.getAllByRole('button');
    // Should have both Execute and Skip
    expect(buttons.length).toBe(2);
  });

  it('does NOT show Skip button for non-optional step', () => {
    render(<WizardStepItem {...baseProps} />, { wrapper: i18nWrapper });
    const buttons = screen.getAllByRole('button');
    // Should have only Execute
    expect(buttons.length).toBe(1);
  });

  it('shows no action buttons when not canExecute', () => {
    render(<WizardStepItem {...baseProps} canExecute={false} />, { wrapper: i18nWrapper });
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  it('shows Retry button when step has error', () => {
    const errorStep: Step = { ...baseStep, status: 'error', error: 'Something failed' };
    render(<WizardStepItem {...baseProps} step={errorStep} />, { wrapper: i18nWrapper });
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(1);
  });

  it('shows error message when step has error', () => {
    const errorStep: Step = { ...baseStep, status: 'error', error: 'Something went wrong' };
    render(<WizardStepItem {...baseProps} step={errorStep} />, { wrapper: i18nWrapper });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows output log when step has output', () => {
    const stepWithOutput: Step = { ...baseStep, output: ['Line 1', 'Line 2'] };
    render(<WizardStepItem {...baseProps} step={stepWithOutput} />, { wrapper: i18nWrapper });
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });

  it('shows "Optional" badge for optional steps', () => {
    const optionalStep = { ...baseStep, optional: true };
    render(<WizardStepItem {...baseProps} step={optionalStep} />, { wrapper: i18nWrapper });
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('does not show "Optional" badge for non-optional steps', () => {
    render(<WizardStepItem {...baseProps} />, { wrapper: i18nWrapper });
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('shows running indicator when step is running', () => {
    const runningStep: Step = { ...baseStep, status: 'running' };
    render(<WizardStepItem {...baseProps} step={runningStep} />, { wrapper: i18nWrapper });
    // No action buttons, but running text
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  it('calls onExecute when Execute button is clicked', async () => {
    const user = userEvent.setup();
    const onExecute = vi.fn();
    render(<WizardStepItem {...baseProps} onExecute={onExecute} />, { wrapper: i18nWrapper });
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(onExecute).toHaveBeenCalledWith('test-step');
  });

  it('calls onSkip when Skip button is clicked for optional step', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const optionalStep = { ...baseStep, optional: true };
    render(<WizardStepItem {...baseProps} step={optionalStep} onSkip={onSkip} />, {
      wrapper: i18nWrapper,
    });
    const buttons = screen.getAllByRole('button');
    // Second button is Skip
    await user.click(buttons[1]);
    expect(onSkip).toHaveBeenCalledWith('test-step');
  });

  it('calls onRetry when Retry button is clicked on error step', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const errorStep: Step = { ...baseStep, status: 'error', error: 'fail' };
    render(<WizardStepItem {...baseProps} step={errorStep} onRetry={onRetry} />, {
      wrapper: i18nWrapper,
    });
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(onRetry).toHaveBeenCalledWith('test-step');
  });

  it('applies success styles when step status is success', () => {
    const successStep: Step = { ...baseStep, status: 'success' };
    const { container } = render(<WizardStepItem {...baseProps} step={successStep} />, {
      wrapper: i18nWrapper,
    });
    const stepDiv = container.firstChild as HTMLElement;
    expect(stepDiv.className).toContain('border-green-300');
    expect(stepDiv.className).toContain('bg-green-50');
  });

  it('applies error styles when step status is error', () => {
    const errorStep: Step = { ...baseStep, status: 'error', error: 'fail' };
    const { container } = render(<WizardStepItem {...baseProps} step={errorStep} />, {
      wrapper: i18nWrapper,
    });
    const stepDiv = container.firstChild as HTMLElement;
    expect(stepDiv.className).toContain('border-red-300');
    expect(stepDiv.className).toContain('bg-red-50');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  3) Integration: DatabaseSetupWizard component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('DatabaseSetupWizard (integration)', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    cbs = createMockCallbacks();
    // Default: DB doesn't exist
    cbs.onTestConnection.mockRejectedValue(new Error('Connection failed'));
  });

  const defaultProps = (): DatabaseSetupWizardProps => ({
    isOpen: true,
    onClose: cbs.onClose,
    onCreateDatabase: cbs.onCreateDatabase,
    onTestConnection: cbs.onTestConnection,
    onCreateSchema: cbs.onCreateSchema,
    onApplyGymNetPreset: cbs.onApplyGymNetPreset,
    onImportProductionDisciplines: cbs.onImportProductionDisciplines,
    onImportProductionStatuses: cbs.onImportProductionStatuses,
    onImportSampleData: cbs.onImportSampleData,
    onImportDisciplineGroups: cbs.onImportDisciplineGroups,
    onImportStandardCountries: cbs.onImportStandardCountries,
    onUpdateDatabaseName: cbs.onUpdateDatabaseName,
    onSaveAndReconnect: cbs.onSaveAndReconnect,
    currentDbConfig: defaultDbConfig,
  });

  it('renders nothing when closed', () => {
    const props = defaultProps();
    props.isOpen = false;
    const { container } = render(<DatabaseSetupWizard {...props} />, { wrapper: i18nWrapper });
    // UnifiedDialog should not render content when closed
    expect(screen.queryByText('Neuer Datenbankname')).not.toBeInTheDocument();
  });

  it('renders database name input when open', () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    expect(screen.getByText('Neuer Datenbankname')).toBeInTheDocument();
  });

  it('shows current database name', () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    expect(screen.getByText('turnfix_test', { exact: false })).toBeInTheDocument();
  });

  it('renders all 9 wizard steps', async () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    // Wait for render
    await waitFor(() => {
      // Look for step numbers
      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText(/2\./)).toBeInTheDocument();
      expect(screen.getByText(/3\./)).toBeInTheDocument();
      expect(screen.getByText(/4\./)).toBeInTheDocument();
      expect(screen.getByText(/5\./)).toBeInTheDocument();
      expect(screen.getByText(/6\./)).toBeInTheDocument();
      expect(screen.getByText(/7\./)).toBeInTheDocument();
      expect(screen.getByText(/8\./)).toBeInTheDocument();
      expect(screen.getByText(/9\./)).toBeInTheDocument();
    });
  });

  it('shows 6 "Optional" badges', async () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    await waitFor(() => {
      const optionalBadges = screen.getAllByText('Optional');
      expect(optionalBadges.length).toBe(6);
    });
  });

  it('shows reset and close buttons in footer', () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    // Footer buttons
    const buttons = screen.getAllByRole('button');
    const resetBtn = buttons.find(b => b.textContent?.includes('Reset') || b.textContent?.includes('Zurücksetzen'));
    const closeBtn = buttons.find(b => b.textContent?.includes('Close') || b.textContent?.includes('Schließen'));
    expect(resetBtn).toBeDefined();
    expect(closeBtn).toBeDefined();
  });

  it('allows typing a new database name', async () => {
    const user = userEvent.setup();
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    const input = screen.getByPlaceholderText('turnfix_test');
    await user.clear(input);
    await user.type(input, 'my_new_db');
    expect(input).toHaveValue('my_new_db');
  });

  it('shows new name indicator when different from current', async () => {
    const user = userEvent.setup();
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    const input = screen.getByPlaceholderText('turnfix_test');
    await user.type(input, 'different_db');
    expect(screen.getByText('different_db')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find(b => b.textContent?.includes('Close') || b.textContent?.includes('Schließen'));
    expect(closeBtn).toBeDefined();
    await user.click(closeBtn!);
    expect(cbs.onClose).toHaveBeenCalled();
  });

  it('resets all steps when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });

    // All steps should start as pending (no auto-skip)
    await waitFor(() => {
      expect(screen.queryByText(/Datenbank existiert bereits/i)).not.toBeInTheDocument();
    });

    // Click reset (should work even when already all pending)
    const buttons = screen.getAllByRole('button');
    const resetBtn = buttons.find(b => b.textContent?.includes('Reset') || b.textContent?.includes('Zurücksetzen'));
    expect(resetBtn).toBeDefined();
    await user.click(resetBtn!);

    // Everything should remain pending
    expect(screen.queryByText('Datenbank ist bereits vorhanden')).not.toBeInTheDocument();
  });

  it('does not show success message when required steps are not complete', () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    expect(screen.queryByText(/erfolgreich abgeschlossen/i)).not.toBeInTheDocument();
  });

  it('does not show "Neue DB verwenden" button when required steps are incomplete', () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    const saveBtn = screen.queryByText(/Neue DB verwenden/i);
    expect(saveBtn).not.toBeInTheDocument();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  4) Item 8: Save & Reconnect after wizard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('useDatabaseSetupWizard - Save & Reconnect (Item 8)', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    cbs = createMockCallbacks();
  });

  const hookParams = (overrides: Record<string, any> = {}) => ({
    isOpen: true,
    currentDbConfig: defaultDbConfig,
    ...cbs,
    ...overrides,
  });

  it('exposes isSaving and saveCompleted state', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), {
      wrapper: i18nWrapper,
    });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveCompleted).toBe(false);
  });

  it('handleSaveAndReconnect calls onSaveAndReconnect', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), {
      wrapper: i18nWrapper,
    });
    await act(async () => {
      await result.current.handleSaveAndReconnect();
    });
    expect(cbs.onSaveAndReconnect).toHaveBeenCalledTimes(1);
  });

  it('handleSaveAndReconnect sets saveCompleted on success', async () => {
    cbs.onSaveAndReconnect.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), {
      wrapper: i18nWrapper,
    });
    await act(async () => {
      await result.current.handleSaveAndReconnect();
    });
    expect(result.current.saveCompleted).toBe(true);
    expect(result.current.isSaving).toBe(false);
  });

  it('handleSaveAndReconnect does NOT set saveCompleted on failure', async () => {
    cbs.onSaveAndReconnect.mockResolvedValue({ success: false, error: 'Failed' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), {
      wrapper: i18nWrapper,
    });
    await act(async () => {
      await result.current.handleSaveAndReconnect();
    });
    expect(result.current.saveCompleted).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it('resetWizard clears saveCompleted and isSaving', async () => {
    cbs.onSaveAndReconnect.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), {
      wrapper: i18nWrapper,
    });
    await act(async () => {
      await result.current.handleSaveAndReconnect();
    });
    expect(result.current.saveCompleted).toBe(true);

    act(() => { result.current.resetWizard(); });
    expect(result.current.saveCompleted).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it('opening wizard resets saveCompleted', async () => {
    cbs.onSaveAndReconnect.mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDatabaseSetupWizard(hookParams({ isOpen })),
      { wrapper: i18nWrapper, initialProps: { isOpen: true } },
    );
    await act(async () => {
      await result.current.handleSaveAndReconnect();
    });
    expect(result.current.saveCompleted).toBe(true);

    // Close and reopen
    rerender({ isOpen: false });
    rerender({ isOpen: true });
    await waitFor(() => {
      expect(result.current.saveCompleted).toBe(false);
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  5) executeStep — All 9 step IDs comprehensive
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('useDatabaseSetupWizard — executeStep all steps', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    cbs = createMockCallbacks();
  });

  const hookParams = (overrides: Record<string, any> = {}) => ({
    isOpen: false,
    currentDbConfig: defaultDbConfig,
    ...cbs,
    ...overrides,
  });

  /**
   * Helper: bring the wizard to a state where steps 3–8 are executable.
   * This means: create-db → success, test-connection → success, create-schema → success.
   */
  async function completeRequiredSteps(result: any) {
    cbs.onCreateDatabase.mockResolvedValue({ success: true, message: 'Created' });
    cbs.onTestConnection.mockResolvedValue({ success: true, message: 'OK' });
    cbs.onCreateSchema.mockResolvedValue({ success: true, message: 'Schema done' });

    act(() => { result.current.setNewDatabaseName('test_db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    expect(result.current.steps[0].status).toBe('success');
    expect(result.current.steps[1].status).toBe('success');
    expect(result.current.steps[2].status).toBe('success');
  }

  // ── create-db (additional cases) ──────────────────────────────

  it('create-db failure with generic error', async () => {
    cbs.onCreateDatabase.mockResolvedValue({ success: false, error: 'Disk full' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('new_db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    expect(result.current.steps[0].status).toBe('error');
    expect(result.current.steps[0].error).toContain('Disk full');
  });

  it('create-db exception from callback', async () => {
    cbs.onCreateDatabase.mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('new_db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    expect(result.current.steps[0].status).toBe('error');
    expect(result.current.steps[0].error).toContain('Network down');
  });

  // ── test-connection (exception path) ──────────────────────────

  it('test-connection handles exception from callback', async () => {
    cbs.onCreateDatabase.mockResolvedValue({ success: true });
    cbs.onTestConnection.mockRejectedValue(new Error('timeout'));
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    expect(result.current.steps[1].status).toBe('error');
    expect(result.current.steps[1].error).toContain('timeout');
  });

  // ── create-schema ─────────────────────────────────────────────

  it('create-schema succeeds', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    // Already completed inside helper
    expect(result.current.steps[2].status).toBe('success');
    expect(cbs.onCreateSchema).toHaveBeenCalled();
  });

  it('create-schema succeeds with details output', async () => {
    cbs.onCreateSchema.mockResolvedValue({
      success: true,
      message: 'Schema done',
      details: 'table created\nmigration applied\nsome noise',
    });
    cbs.onCreateDatabase.mockResolvedValue({ success: true });
    cbs.onTestConnection.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    expect(result.current.steps[2].status).toBe('success');
    const output = result.current.steps[2].output || [];
    expect(output.some(l => l.includes('table'))).toBe(true);
  });

  it('create-schema failure', async () => {
    cbs.onCreateDatabase.mockResolvedValue({ success: true });
    cbs.onTestConnection.mockResolvedValue({ success: true });
    cbs.onCreateSchema.mockResolvedValue({ success: false, error: 'Prisma error' });

    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    expect(result.current.steps[2].status).toBe('error');
    expect(result.current.steps[2].error).toContain('Prisma error');
  });

  // ── production-statuses ───────────────────────────────────────

  it('production-statuses succeeds with stats', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-statuses'); });
    expect(result.current.steps[3].status).toBe('success');
    expect(cbs.onImportProductionStatuses).toHaveBeenCalled();
    const output = result.current.steps[3].output || [];
    expect(output.some(l => l.includes('10/10'))).toBe(true);
  });

  it('production-statuses shows skipped count', async () => {
    cbs.onImportProductionStatuses.mockResolvedValue({
      success: true,
      stats: { createdStatuses: 7, skippedStatuses: 3, totalStatuses: 10 },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-statuses'); });
    expect(result.current.steps[3].status).toBe('success');
    const output = result.current.steps[3].output || [];
    expect(output.some(l => l.includes('3'))).toBe(true);
  });

  it('production-statuses failure', async () => {
    cbs.onImportProductionStatuses.mockResolvedValue({ success: false, error: 'Import failed' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-statuses'); });
    expect(result.current.steps[3].status).toBe('error');
  });

  // ── standard-countries ────────────────────────────────────────

  it('standard-countries succeeds with stats', async () => {
    cbs.onImportStandardCountries.mockResolvedValue({
      success: true,
      stats: { createdCountries: 34, skippedCountries: 0, totalCountries: 34 },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('standard-countries'); });
    expect(result.current.steps[4].status).toBe('success');
    expect(cbs.onImportStandardCountries).toHaveBeenCalled();
  });

  it('standard-countries shows skipped', async () => {
    cbs.onImportStandardCountries.mockResolvedValue({
      success: true,
      stats: { createdCountries: 20, skippedCountries: 14, totalCountries: 34 },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('standard-countries'); });
    expect(result.current.steps[4].status).toBe('success');
    const output = result.current.steps[4].output || [];
    expect(output.some(l => l.includes('14'))).toBe(true);
  });

  it('standard-countries failure', async () => {
    cbs.onImportStandardCountries.mockResolvedValue({ success: false, error: 'fail' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('standard-countries'); });
    expect(result.current.steps[4].status).toBe('error');
  });

  // ── gymnet-preset ─────────────────────────────────────────────

  it('gymnet-preset succeeds with stats', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('gymnet-preset'); });
    expect(result.current.steps[5].status).toBe('success');
    expect(cbs.onApplyGymNetPreset).toHaveBeenCalled();
    const output = result.current.steps[5].output || [];
    expect(output.some(l => l.includes('Formeln'))).toBe(true);
  });

  it('gymnet-preset failure', async () => {
    cbs.onApplyGymNetPreset.mockResolvedValue({ success: false, error: 'Preset fail' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('gymnet-preset'); });
    expect(result.current.steps[5].status).toBe('error');
  });

  // ── production-disciplines ────────────────────────────────────

  it('production-disciplines succeeds with stats', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    expect(result.current.steps[6].status).toBe('success');
    expect(cbs.onImportProductionDisciplines).toHaveBeenCalled();
    const output = result.current.steps[6].output || [];
    expect(output.some(l => l.includes('Disziplinen'))).toBe(true);
  });

  it('production-disciplines shows skipped disciplines', async () => {
    cbs.onImportProductionDisciplines.mockResolvedValue({
      success: true,
      stats: {
        createdSports: 2, createdFormulas: 4, totalFormulas: 4,
        createdDisciplines: 8, createdFields: 20, skippedDisciplines: 2, totalDisciplines: 10,
      },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    const output = result.current.steps[6].output || [];
    expect(output.some(l => l.includes('2') && l.includes('übersprungen'))).toBe(true);
  });

  it('production-disciplines failure', async () => {
    cbs.onImportProductionDisciplines.mockResolvedValue({ success: false, error: 'Import failed' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    expect(result.current.steps[6].status).toBe('error');
  });

  // ── discipline-groups ─────────────────────────────────────────

  it('discipline-groups succeeds with stats', async () => {
    cbs.onImportDisciplineGroups.mockResolvedValue({
      success: true,
      stats: { createdGroups: 2, totalGroups: 2, createdAssignments: 8, skippedGroups: 0, missingDisciplines: [] },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    // discipline-groups requires production-disciplines to succeed first
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    await act(async () => { await result.current.executeStep('discipline-groups'); });
    expect(result.current.steps[7].status).toBe('success');
    expect(cbs.onImportDisciplineGroups).toHaveBeenCalled();
  });

  it('discipline-groups shows missing disciplines warning', async () => {
    cbs.onImportDisciplineGroups.mockResolvedValue({
      success: true,
      stats: {
        createdGroups: 1, totalGroups: 2, createdAssignments: 4,
        skippedGroups: 1, missingDisciplines: ['Sprung', 'Reck'],
      },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    await act(async () => { await result.current.executeStep('discipline-groups'); });
    const output = result.current.steps[7].output || [];
    expect(output.some(l => l.includes('Sprung'))).toBe(true);
    expect(output.some(l => l.includes('Reck'))).toBe(true);
  });

  it('discipline-groups blocked when production-disciplines not done', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    // Don't execute production-disciplines
    expect(result.current.canExecuteStep(7)).toBe(false);
  });

  it('discipline-groups failure', async () => {
    cbs.onImportDisciplineGroups.mockResolvedValue({ success: false, error: 'Groups fail' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    await act(async () => { await result.current.executeStep('discipline-groups'); });
    expect(result.current.steps[7].status).toBe('error');
  });

  // ── sample-data ───────────────────────────────────────────────

  it('sample-data succeeds with detailed stats', async () => {
    cbs.onImportSampleData.mockResolvedValue({
      success: true,
      stats: {
        createdCountries: 1, createdAssociations: 1, createdRegions: 1,
        createdClubs: 1, createdParticipants: 1, createdVenues: 1, createdLayouts: 1,
        skipped: [],
      },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('sample-data'); });
    expect(result.current.steps[8].status).toBe('success');
    const output = result.current.steps[8].output || [];
    expect(output.some(l => l.includes('Angelegt'))).toBe(true);
  });

  it('sample-data shows skipped items', async () => {
    cbs.onImportSampleData.mockResolvedValue({
      success: true,
      stats: {
        createdCountries: 0, createdAssociations: 0, createdRegions: 0,
        createdClubs: 0, createdParticipants: 0, createdVenues: 0, createdLayouts: 0,
        skipped: ['Land', 'Verband', 'Verein'],
      },
    });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('sample-data'); });
    expect(result.current.steps[8].status).toBe('success');
    const output = result.current.steps[8].output || [];
    expect(output.some(l => l.includes('Übersprungen'))).toBe(true);
  });

  it('sample-data failure', async () => {
    cbs.onImportSampleData.mockResolvedValue({ success: false, error: 'Sample fail' });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await completeRequiredSteps(result);
    await act(async () => { await result.current.executeStep('sample-data'); });
    expect(result.current.steps[8].status).toBe('error');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  6) canExecuteStep — Dependency rules
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('useDatabaseSetupWizard — canExecuteStep logic', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    cbs = createMockCallbacks();
    cbs.onCreateDatabase.mockResolvedValue({ success: true });
    cbs.onTestConnection.mockResolvedValue({ success: true });
    cbs.onCreateSchema.mockResolvedValue({ success: true });
  });

  const hookParams = (overrides: Record<string, any> = {}) => ({
    isOpen: false,
    currentDbConfig: defaultDbConfig,
    ...cbs,
    ...overrides,
  });

  it('step 0 (create-db) always executable', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    expect(result.current.canExecuteStep(0)).toBe(true);
  });

  it('step 1 blocked when step 0 not done', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    expect(result.current.canExecuteStep(1)).toBe(false);
  });

  it('step 1 allowed when step 0 is success', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    expect(result.current.canExecuteStep(1)).toBe(true);
  });

  it('step 1 allowed when step 0 is skipped', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.skipStep('create-db'); });
    expect(result.current.canExecuteStep(1)).toBe(true);
  });

  it('steps 3–8 require schema (step 2) to be success', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    // Complete steps 0 and 1 but NOT 2
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });

    // Steps 3–8 should all be blocked
    for (let i = 3; i <= 8; i++) {
      expect(result.current.canExecuteStep(i)).toBe(false);
    }
  });

  it('steps 3–8 allowed after schema succeeds', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    // Steps 3–6, 8 should be executable (step 7 has additional requirement)
    expect(result.current.canExecuteStep(3)).toBe(true);
    expect(result.current.canExecuteStep(4)).toBe(true);
    expect(result.current.canExecuteStep(5)).toBe(true);
    expect(result.current.canExecuteStep(6)).toBe(true);
    expect(result.current.canExecuteStep(8)).toBe(true);
  });

  it('step 7 (discipline-groups) requires step 6 (production-disciplines) success', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    // Step 7 should NOT be executable yet
    expect(result.current.canExecuteStep(7)).toBe(false);

    // Complete production-disciplines
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    expect(result.current.canExecuteStep(7)).toBe(true);
  });

  it('executeStep does nothing when canExecuteStep returns false', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    // Step 1 is blocked because step 0 hasn't completed
    await act(async () => { await result.current.executeStep('test-connection'); });
    // Status should remain pending (not running or error)
    expect(result.current.steps[1].status).toBe('pending');
    expect(cbs.onTestConnection).not.toHaveBeenCalled();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  7) retryStep, skippedCriticalSteps, allRequiredStepsComplete
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('useDatabaseSetupWizard — retryStep, computed props', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cbs = createMockCallbacks();
    cbs.onCreateDatabase.mockResolvedValue({ success: true });
    cbs.onTestConnection.mockResolvedValue({ success: true });
    cbs.onCreateSchema.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const hookParams = (overrides: Record<string, any> = {}) => ({
    isOpen: false,
    currentDbConfig: defaultDbConfig,
    ...cbs,
    ...overrides,
  });

  it('allRequiredStepsComplete becomes true when all 3 required steps succeed', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    expect(result.current.allRequiredStepsComplete).toBe(false);

    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    expect(result.current.allRequiredStepsComplete).toBe(true);
  });

  it('skippedCriticalSteps lists skipped critical optional steps', () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });

    // Skip gymnet-preset and production-statuses (both critical optional)
    act(() => {
      result.current.skipStep('gymnet-preset');
      result.current.skipStep('production-statuses');
    });

    const ids = result.current.skippedCriticalSteps.map(s => s.id);
    expect(ids).toContain('gymnet-preset');
    expect(ids).toContain('production-statuses');
    expect(ids).not.toContain('sample-data'); // not critical
  });

  it('skippedCriticalSteps includes production-disciplines when skipped', () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.skipStep('production-disciplines'); });
    const ids = result.current.skippedCriticalSteps.map(s => s.id);
    expect(ids).toContain('production-disciplines');
  });

  it('skippedCriticalSteps is empty when nothing is skipped', () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    expect(result.current.skippedCriticalSteps).toHaveLength(0);
  });

  it('retryStep resets step to pending then re-executes', async () => {
    vi.useRealTimers();
    // First: make create-db fail, then retry with success
    cbs.onCreateDatabase
      .mockResolvedValueOnce({ success: false, error: 'Temp fail' })
      .mockResolvedValueOnce({ success: true, message: 'OK' });

    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('retry_db'); });

    // First attempt → error
    await act(async () => { await result.current.executeStep('create-db'); });
    expect(result.current.steps[0].status).toBe('error');

    // Retry
    await act(async () => {
      result.current.retryStep('create-db');
      // retryStep uses setTimeout, wait for it
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await waitFor(() => {
      expect(result.current.steps[0].status).toBe('success');
    });
  });

  it('handleSaveAndReconnect handles exception from callback', async () => {
    vi.useRealTimers();
    cbs.onSaveAndReconnect.mockRejectedValue(new Error('Reconnect crash'));
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    await act(async () => { await result.current.handleSaveAndReconnect(); });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveCompleted).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  8) Step output messages verification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('useDatabaseSetupWizard — step output messages', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    cbs = createMockCallbacks();
    cbs.onCreateDatabase.mockResolvedValue({ success: true });
    cbs.onTestConnection.mockResolvedValue({ success: true });
    cbs.onCreateSchema.mockResolvedValue({ success: true });
  });

  const hookParams = (overrides: Record<string, any> = {}) => ({
    isOpen: false,
    currentDbConfig: defaultDbConfig,
    ...cbs,
    ...overrides,
  });

  it('create-db success output includes loading and success emojis', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('my_db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    const output = result.current.steps[0].output || [];
    expect(output.some(l => l.includes('⏳'))).toBe(true);
    expect(output.some(l => l.includes('✅'))).toBe(true);
    expect(output.some(l => l.includes('my_db'))).toBe(true);
  });

  it('test-connection success output includes status messages', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    const output = result.current.steps[1].output || [];
    expect(output.some(l => l.includes('Verbindung'))).toBe(true);
  });

  it('error step output includes error emoji', async () => {
    cbs.onCreateDatabase.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.setNewDatabaseName('db'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    const output = result.current.steps[0].output || [];
    expect(output.some(l => l.includes('❌'))).toBe(true);
  });

  it('skip step output includes skip emoji', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });
    act(() => { result.current.skipStep('gymnet-preset'); });
    const output = result.current.steps[5].output || [];
    expect(output.some(l => l.includes('⏭️'))).toBe(true);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  9) Integration: Full happy-path wizard flow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('useDatabaseSetupWizard — Full happy path', () => {
  let cbs: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    cbs = createMockCallbacks();
    cbs.onImportStandardCountries.mockResolvedValue({
      success: true,
      stats: { createdCountries: 34, skippedCountries: 0, totalCountries: 34 },
    });
    cbs.onImportDisciplineGroups.mockResolvedValue({
      success: true,
      stats: { createdGroups: 2, totalGroups: 2, createdAssignments: 8, skippedGroups: 0, missingDisciplines: [] },
    });
    cbs.onImportSampleData.mockResolvedValue({
      success: true,
      stats: {
        createdCountries: 1, createdAssociations: 1, createdRegions: 1,
        createdClubs: 1, createdParticipants: 1, createdVenues: 1, createdLayouts: 1,
        skipped: [],
      },
    });
  });

  const hookParams = (overrides: Record<string, any> = {}) => ({
    isOpen: false,
    currentDbConfig: defaultDbConfig,
    ...cbs,
    ...overrides,
  });

  it('executes all 9 steps in order and reaches allRequiredStepsComplete', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });

    // Step 0: create-db
    act(() => { result.current.setNewDatabaseName('turnfix_full'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    expect(result.current.steps[0].status).toBe('success');

    // Step 1: test-connection
    await act(async () => { await result.current.executeStep('test-connection'); });
    expect(result.current.steps[1].status).toBe('success');

    // Step 2: create-schema
    await act(async () => { await result.current.executeStep('create-schema'); });
    expect(result.current.steps[2].status).toBe('success');
    expect(result.current.allRequiredStepsComplete).toBe(true);

    // Step 3: production-statuses
    await act(async () => { await result.current.executeStep('production-statuses'); });
    expect(result.current.steps[3].status).toBe('success');

    // Step 4: standard-countries
    await act(async () => { await result.current.executeStep('standard-countries'); });
    expect(result.current.steps[4].status).toBe('success');

    // Step 5: gymnet-preset
    await act(async () => { await result.current.executeStep('gymnet-preset'); });
    expect(result.current.steps[5].status).toBe('success');

    // Step 6: production-disciplines
    await act(async () => { await result.current.executeStep('production-disciplines'); });
    expect(result.current.steps[6].status).toBe('success');

    // Step 7: discipline-groups (now allowed because step 6 done)
    expect(result.current.canExecuteStep(7)).toBe(true);
    await act(async () => { await result.current.executeStep('discipline-groups'); });
    expect(result.current.steps[7].status).toBe('success');

    // Step 8: sample-data
    await act(async () => { await result.current.executeStep('sample-data'); });
    expect(result.current.steps[8].status).toBe('success');

    // All done
    expect(result.current.steps.every(s => s.status === 'success')).toBe(true);
    expect(result.current.allRequiredStepsComplete).toBe(true);
    expect(result.current.skippedCriticalSteps).toHaveLength(0);
  });

  it('completes required steps and skips all optional ones', async () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });

    act(() => { result.current.setNewDatabaseName('turnfix_minimal'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    // Skip all optional
    act(() => {
      result.current.skipStep('production-statuses');
      result.current.skipStep('standard-countries');
      result.current.skipStep('gymnet-preset');
      result.current.skipStep('production-disciplines');
      result.current.skipStep('discipline-groups');
      result.current.skipStep('sample-data');
    });

    expect(result.current.allRequiredStepsComplete).toBe(true);
    const skippedIds = result.current.steps.filter(s => s.status === 'skipped').map(s => s.id);
    expect(skippedIds).toHaveLength(6);

    // Critical skipped
    expect(result.current.skippedCriticalSteps.length).toBe(3);
  });

  it('save and reconnect after all required steps completes wizard', async () => {
    cbs.onSaveAndReconnect.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams()), { wrapper: i18nWrapper });

    act(() => { result.current.setNewDatabaseName('turnfix_save'); });
    await act(async () => { await result.current.executeStep('create-db'); });
    await act(async () => { await result.current.executeStep('test-connection'); });
    await act(async () => { await result.current.executeStep('create-schema'); });

    expect(result.current.allRequiredStepsComplete).toBe(true);

    await act(async () => { await result.current.handleSaveAndReconnect(); });
    expect(result.current.saveCompleted).toBe(true);
    expect(result.current.isSaving).toBe(false);
  });
});
