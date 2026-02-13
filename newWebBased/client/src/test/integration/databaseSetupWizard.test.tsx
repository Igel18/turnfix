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

  it('initialises 6 steps, all pending', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    expect(result.current.steps).toHaveLength(6);
    expect(result.current.steps.every(s => s.status === 'pending')).toBe(true);
  });

  it('marks first 3 steps as non-optional and last 3 as optional', () => {
    const { result } = renderHook(() => useDatabaseSetupWizard(hookParams({ isOpen: false })), {
      wrapper: i18nWrapper,
    });
    expect(result.current.steps[0].optional).toBe(false);
    expect(result.current.steps[1].optional).toBe(false);
    expect(result.current.steps[2].optional).toBe(false);
    expect(result.current.steps[3].optional).toBe(true);
    expect(result.current.steps[4].optional).toBe(true);
    expect(result.current.steps[5].optional).toBe(true);
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

  it('renders all 6 wizard steps', async () => {
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
    });
  });

  it('shows 3 "Optional" badges', async () => {
    render(<DatabaseSetupWizard {...defaultProps()} />, { wrapper: i18nWrapper });
    await waitFor(() => {
      const optionalBadges = screen.getAllByText('Optional');
      expect(optionalBadges.length).toBe(3);
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
