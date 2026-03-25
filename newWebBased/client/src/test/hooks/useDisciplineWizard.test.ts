/**
 * Tests for useDisciplineWizard hook
 *
 * Covers:
 *  - Step navigation (forward / backward)
 *  - Per-step canGoNext validation
 *  - Reset on open (create vs edit mode)
 *  - handleSave: POST on create, PUT on edit
 *  - handleSave: error handling
 *  - isFirstStep / isLastStep helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDisciplineWizard } from '@/components/DisciplineFormWizard/useDisciplineWizard';
import type { EditingDiscipline } from '@/components/DisciplineFormWizard/useDisciplineWizard';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/utils/api', () => ({
  apiPost: vi.fn().mockResolvedValue({ id: 99 }),
  apiPut: vi.fn().mockResolvedValue({ id: 1 }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseProps = {
  isOpen: false,
  editingDiscipline: null,
  onSaved: vi.fn().mockResolvedValue(undefined),
  onClose: vi.fn(),
};

const makeEditingDiscipline = (overrides: Partial<EditingDiscipline> = {}): EditingDiscipline => ({
  id: 7,
  name: 'Boden',
  short_name: 'BO',
  display_name: 'Bodenturnen',
  formula: 'a+b',
  input_mask: '',
  attempts: 1,
  icon: '',
  shortcut: 'B',
  calculation_type: 2,
  unit: '',
  lanes_division: false,
  male_allowed: true,
  female_allowed: true,
  sport_id: 3,
  formula_id: undefined,
  should_calculate: true,
  ...overrides,
});

// ── Step navigation ───────────────────────────────────────────────────────────

describe('useDisciplineWizard – step navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts at "basic" step', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.step).toBe('basic');
  });

  it('goNext advances basic → calculation → advanced', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    // Provide required basic-step fields first
    act(() => {
      result.current.setFormData(d => ({ ...d, name: 'Boden', shortName: 'BO' }));
    });
    act(() => result.current.goNext());
    expect(result.current.step).toBe('calculation');

    act(() => result.current.goNext());
    expect(result.current.step).toBe('advanced');
  });

  it('goBack retreats advanced → calculation → basic', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.setStep('advanced'));
    act(() => result.current.goBack());
    expect(result.current.step).toBe('calculation');

    act(() => result.current.goBack());
    expect(result.current.step).toBe('basic');
  });

  it('goBack does nothing at first step', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.goBack());
    expect(result.current.step).toBe('basic');
  });

  it('goNext does nothing at last step without advancing', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('advanced');
      result.current.setFormData(d => ({ ...d, sportId: 5 }));
    });
    act(() => result.current.goNext());
    expect(result.current.step).toBe('advanced');
  });

  it('isFirstStep is true at "basic", false otherwise', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.isFirstStep).toBe(true);
    act(() => result.current.setStep('calculation'));
    expect(result.current.isFirstStep).toBe(false);
  });

  it('isLastStep is true at "advanced", false otherwise', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.isLastStep).toBe(false);
    act(() => result.current.setStep('advanced'));
    expect(result.current.isLastStep).toBe(true);
  });
});

// ── canGoNext validation ──────────────────────────────────────────────────────

describe('useDisciplineWizard – canGoNext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('basic: false when name is empty', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    // step is already 'basic'
    act(() => result.current.setFormData(d => ({ ...d, name: '', shortName: 'BO' })));
    expect(result.current.canGoNext).toBe(false);
  });

  it('basic: false when shortName is empty', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.setFormData(d => ({ ...d, name: 'Boden', shortName: '' })));
    expect(result.current.canGoNext).toBe(false);
  });

  it('basic: true when both name and shortName are filled', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.setFormData(d => ({ ...d, name: 'Boden', shortName: 'BO' })));
    expect(result.current.canGoNext).toBe(true);
  });

  it('calculation: always true', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.setStep('calculation'));
    expect(result.current.canGoNext).toBe(true);
  });

  it('advanced: false when sportId === 0', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('advanced');
      result.current.setFormData(d => ({ ...d, sportId: 0 }));
    });
    expect(result.current.canGoNext).toBe(false);
  });

  it('advanced: true when sportId > 0', () => {
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('advanced');
      result.current.setFormData(d => ({ ...d, sportId: 3 }));
    });
    expect(result.current.canGoNext).toBe(true);
  });
});

// ── Reset on open ─────────────────────────────────────────────────────────────

describe('useDisciplineWizard – reset on open', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets to basic step and clears error on open', async () => {
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useDisciplineWizard({ ...baseProps, ...props }),
      { initialProps: { isOpen: false } },
    );
    // Navigate to another step
    act(() => result.current.setStep('advanced'));
    // Re-open
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.step).toBe('basic');
    expect(result.current.error).toBeNull();
  });

  it('create mode: clears form data to defaults', async () => {
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useDisciplineWizard({ ...baseProps, editingDiscipline: null, ...props }),
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.formData.name).toBe('');
    expect(result.current.formData.shortName).toBe('');
  });

  it('edit mode: populates form data from editingDiscipline', async () => {
    const editing = makeEditingDiscipline();
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useDisciplineWizard({ ...baseProps, editingDiscipline: editing, ...props }),
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.formData.name).toBe('Boden');
    expect(result.current.formData.shortName).toBe('BO');
    expect(result.current.formData.sportId).toBe(3);
  });
});

// ── handleSave ────────────────────────────────────────────────────────────────

describe('useDisciplineWizard – handleSave', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls apiPost on create mode', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useDisciplineWizard({
        ...baseProps,
        isOpen: true,
        editingDiscipline: null,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );

    act(() => result.current.setStep('advanced'));
    act(() =>
      result.current.setFormData(d => ({
        ...d,
        name: 'Boden',
        shortName: 'BO',
        sportId: 3,
      })),
    );

    await act(async () => { await result.current.handleSave(); });

    expect(apiPost).toHaveBeenCalledWith('/disciplines', expect.objectContaining({
      name: 'Boden',
      shortName: 'BO',
    }));
  });

  it('calls apiPut on edit mode', async () => {
    const { apiPut } = await import('@/utils/api');
    const editing = makeEditingDiscipline({ id: 7 });
    const { result } = renderHook(() =>
      useDisciplineWizard({
        ...baseProps,
        isOpen: true,
        editingDiscipline: editing,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );
    await act(async () => {});

    act(() => result.current.setStep('advanced'));

    await act(async () => { await result.current.handleSave(); });

    expect(apiPut).toHaveBeenCalledWith('/disciplines/7', expect.any(Object));
  });

  it('sets error when apiPost throws', async () => {
    const { apiPost } = await import('@/utils/api');
    (apiPost as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useDisciplineWizard({
        ...baseProps,
        isOpen: true,
        editingDiscipline: null,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );
    act(() => result.current.setStep('advanced'));
    act(() =>
      result.current.setFormData(d => ({
        ...d,
        name: 'Boden',
        shortName: 'BO',
        sportId: 3,
      })),
    );

    await act(async () => { await result.current.handleSave(); });

    expect(result.current.error).toBe('Network error');
    expect(result.current.saving).toBe(false);
  });

  it('calls onSaved and onClose on success', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDisciplineWizard({ ...baseProps, isOpen: true, onSaved, onClose }),
    );
    act(() => result.current.setStep('advanced'));
    act(() =>
      result.current.setFormData(d => ({
        ...d,
        name: 'Boden',
        shortName: 'BO',
        sportId: 3,
      })),
    );

    await act(async () => { await result.current.handleSave(); });

    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
