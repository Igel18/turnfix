/**
 * Tests for useCompetitionWizard hook
 *
 * Covers:
 *  - Step navigation (forward / backward, 4 steps)
 *  - Per-step canGoNext validation
 *  - Reset on open (create vs edit mode)
 *  - handleSave: POST on create, PUT on edit, invalidateCache
 *  - handleSave: error handling
 *  - isFirstStep / isLastStep helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompetitionWizard } from '@/components/CompetitionFormWizard/useCompetitionWizard';
import type { Competition } from '@/pages/Competitions/Competitions.types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/utils/api', () => ({
  apiPost: vi.fn().mockResolvedValue({ id: 10 }),
  apiPut: vi.fn().mockResolvedValue({ id: 5 }),
  invalidateCache: vi.fn(),
}));

// Mock the disciplines hook – returns minimal compatible shape
vi.mock('@/components/useCompetitionFormDisciplines', () => ({
  useCompetitionFormDisciplines: vi.fn(() => ({
    disciplines: [],
    filteredDisciplines: [],
    disciplineGroups: [],
    searchTerm: '',
    setSearchTerm: vi.fn(),
    groupFilter: '',
    setGroupFilter: vi.fn(),
    toggleDiscipline: vi.fn(),
    setMaxScore: vi.fn(),
    bulkApplyMaxScore: vi.fn(),
    hasDisciplines: false,
    incompatibleCount: 0,
  })),
  getDisciplineGenderLabel: (_m: boolean, _f: boolean, labels: { both: string; male: string; female: string }) =>
    labels.both,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseProps = {
  isOpen: false,
  editingCompetition: null,
  eventId: '42',
  onSaved: vi.fn().mockResolvedValue(undefined),
  onClose: vi.fn(),
};

const makeCompetition = (overrides: Partial<Competition> = {}): Competition => ({
  id: 5,
  number: '1',
  name: 'AK 10',
  description: '',
  gender: 'gemischt',
  areaId: 3,
  ageFrom: 8,
  ageTo: 12,
  disciplines: [{ disciplineId: 1, maxScore: 10 }],
  round: 1,
  track: 1,
  competitionType: 0,
  startTime: '09:00',
  warmupTime: '08:30',
  qualifiers: 0,
  evaluations: 3,
  dropWorstScore: false,
  showAgeGroup: false,
  isOptionalCompetition: false,
  showInfo: false,
  useCompulsoryProgram: false,
  sortAscending: false,
  manualSort: false,
  useApparatusPoints: false,
  dropCount: 0,
  participantCount: 0,
  status: 'upcoming',
  ...overrides,
});

// ── Step navigation ───────────────────────────────────────────────────────────

describe('useCompetitionWizard – step navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts at "basicInfo" step', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.step).toBe('basicInfo');
  });

  it('goNext advances through all 4 steps', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    // Set name to pass basicInfo validation
    act(() => result.current.setFormData(d => ({ ...d, name: 'AK 10' })));
    act(() => result.current.goNext());
    expect(result.current.step).toBe('category');

    // Set areaId + valid age range to pass category validation
    act(() => result.current.setFormData(d => ({ ...d, areaId: 3, ageFrom: 8, ageTo: 12 })));
    act(() => result.current.goNext());
    expect(result.current.step).toBe('disciplines');

    // Set at least 1 discipline to pass disciplines validation
    act(() => result.current.setFormData(d => ({
      ...d,
      disciplines: [{ disciplineId: 1, maxScore: 10 }],
    })));
    act(() => result.current.goNext());
    expect(result.current.step).toBe('settings');
  });

  it('goBack retreats settings → disciplines → category → basicInfo', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.setStep('settings'));
    act(() => result.current.goBack());
    expect(result.current.step).toBe('disciplines');

    act(() => result.current.goBack());
    expect(result.current.step).toBe('category');

    act(() => result.current.goBack());
    expect(result.current.step).toBe('basicInfo');
  });

  it('goBack does nothing at first step', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.goBack());
    expect(result.current.step).toBe('basicInfo');
  });

  it('isFirstStep / isLastStep', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);

    act(() => result.current.setStep('settings'));
    expect(result.current.isFirstStep).toBe(false);
    expect(result.current.isLastStep).toBe(true);
  });
});

// ── canGoNext validation ──────────────────────────────────────────────────────

describe('useCompetitionWizard – canGoNext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('basicInfo: false when name is empty', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    // step is already 'basicInfo'
    act(() => result.current.setFormData(d => ({ ...d, name: '' })));
    expect(result.current.canGoNext).toBe(false);
  });

  it('basicInfo: true when name is filled', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.setFormData(d => ({ ...d, name: 'AK 10' })));
    expect(result.current.canGoNext).toBe(true);
  });

  it('category: false when areaId is null', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('category');
      result.current.setFormData(d => ({ ...d, areaId: null, ageFrom: 8, ageTo: 12 }));
    });
    expect(result.current.canGoNext).toBe(false);
  });

  it('category: false when ageTo < ageFrom', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('category');
      result.current.setFormData(d => ({ ...d, areaId: 1, ageFrom: 12, ageTo: 8 }));
    });
    expect(result.current.canGoNext).toBe(false);
  });

  it('category: true when areaId set and valid age range', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('category');
      result.current.setFormData(d => ({ ...d, areaId: 2, ageFrom: 8, ageTo: 18 }));
    });
    expect(result.current.canGoNext).toBe(true);
  });

  it('disciplines: false when disciplines array is empty', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('disciplines');
      result.current.setFormData(d => ({ ...d, disciplines: [] }));
    });
    expect(result.current.canGoNext).toBe(false);
  });

  it('disciplines: true when at least 1 discipline selected', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setStep('disciplines');
      result.current.setFormData(d => ({
        ...d,
        disciplines: [{ disciplineId: 5, maxScore: 10 }],
      }));
    });
    expect(result.current.canGoNext).toBe(true);
  });

  it('settings: always true', () => {
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.setStep('settings'));
    expect(result.current.canGoNext).toBe(true);
  });
});

// ── Reset on open ─────────────────────────────────────────────────────────────

describe('useCompetitionWizard – reset on open', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets to basicInfo and clears error on re-open', async () => {
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useCompetitionWizard({ ...baseProps, ...props }),
      { initialProps: { isOpen: false } },
    );
    act(() => result.current.setStep('settings'));
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.step).toBe('basicInfo');
    expect(result.current.error).toBeNull();
  });

  it('create mode: name is empty on open', async () => {
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useCompetitionWizard({ ...baseProps, editingCompetition: null, ...props }),
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.formData.name).toBe('');
  });

  it('edit mode: populates formData from editingCompetition', async () => {
    const competition = makeCompetition({ name: 'AK 12', areaId: 5 });
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useCompetitionWizard({ ...baseProps, editingCompetition: competition, ...props }),
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.formData.name).toBe('AK 12');
    expect(result.current.formData.areaId).toBe(5);
  });
});

// ── handleSave ────────────────────────────────────────────────────────────────

describe('useCompetitionWizard – handleSave', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls apiPost on create mode', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useCompetitionWizard({
        ...baseProps,
        isOpen: true,
        editingCompetition: null,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );
    act(() =>
      result.current.setFormData(d => ({
        ...d,
        name: 'AK 10',
        disciplines: [{ disciplineId: 1, maxScore: 10 }],
      })),
    );

    await act(async () => { await result.current.handleSave(); });

    expect(apiPost).toHaveBeenCalledWith('/competitions', expect.objectContaining({
      name: 'AK 10',
    }));
  });

  it('calls apiPut on edit mode', async () => {
    const { apiPut } = await import('@/utils/api');
    const competition = makeCompetition({ id: 5, name: 'AK 12' });
    const { result } = renderHook(() =>
      useCompetitionWizard({
        ...baseProps,
        isOpen: true,
        editingCompetition: competition,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );
    await act(async () => {});

    await act(async () => { await result.current.handleSave(); });

    expect(apiPut).toHaveBeenCalledWith('/competitions/5', expect.any(Object));
  });

  it('calls invalidateCache on success', async () => {
    const { invalidateCache } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useCompetitionWizard({
        ...baseProps,
        isOpen: true,
        editingCompetition: null,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );
    act(() =>
      result.current.setFormData(d => ({
        ...d,
        name: 'AK 10',
        disciplines: [{ disciplineId: 1, maxScore: 10 }],
      })),
    );

    await act(async () => { await result.current.handleSave(); });

    expect(invalidateCache).toHaveBeenCalledWith('/competitions');
  });

  it('does not call apiPost when disciplines is empty', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useCompetitionWizard({
        ...baseProps,
        isOpen: true,
        editingCompetition: null,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );
    act(() => result.current.setFormData(d => ({ ...d, name: 'AK 10', disciplines: [] })));

    await act(async () => { await result.current.handleSave(); });

    expect(apiPost).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('sets error when apiPut throws', async () => {
    const { apiPut } = await import('@/utils/api');
    (apiPut as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));

    const competition = makeCompetition({ id: 5 });
    const { result } = renderHook(() =>
      useCompetitionWizard({
        ...baseProps,
        isOpen: true,
        editingCompetition: competition,
        onSaved: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
      }),
    );
    await act(async () => {});

    await act(async () => { await result.current.handleSave(); });

    expect(result.current.error).toBe('Server error');
    expect(result.current.saving).toBe(false);
  });

  it('calls onSaved and onClose on success', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCompetitionWizard({ ...baseProps, isOpen: true, onSaved, onClose }),
    );
    act(() =>
      result.current.setFormData(d => ({
        ...d,
        name: 'AK 10',
        disciplines: [{ disciplineId: 1, maxScore: 10 }],
      })),
    );

    await act(async () => { await result.current.handleSave(); });

    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
