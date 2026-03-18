/**
 * Tests for useSquadWizard hook
 *
 * Covers:
 * - filteredParticipants  — all five filter types
 * - allFilteredSelected   — computed value
 * - toggleParticipant     — add / remove from selection set
 * - toggleSelectAllFiltered — bulk select / deselect
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSquadWizard } from '@/pages/SquadManagement/hooks/useSquadWizard';
import type { Participant } from '@/pages/SquadManagement/SquadManagement.types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/utils/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ participants: [] }),
  apiPost: vi.fn().mockResolvedValue({ success: true }),
  apiDelete: vi.fn().mockResolvedValue({ success: true }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 1,
  firstname: 'Anna',
  lastname: 'Müller',
  club: 'Turnverein Muster',
  gender: 'female',
  age: 10,
  birthYear: 2014,
  competitions: [],
  squad_name: '',
  startNumber: null,
  startet_nicht: false,
  ...overrides,
});

const baseProps = {
  isOpen: false,
  mode: 'create' as const,
  squad: undefined,
  eventId: '42',
  onDone: vi.fn().mockResolvedValue(undefined),
  onClose: vi.fn(),
};

// ── filteredParticipants ──────────────────────────────────────────────────────

describe('useSquadWizard – filteredParticipants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all participants when no filters applied', async () => {
    const { apiGet } = await import('@/utils/api');
    const participants = [
      makeParticipant({ id: 1, firstname: 'Anna', club: 'TC', gender: 'female', birthYear: 2014 }),
      makeParticipant({ id: 2, firstname: 'Bob',  club: 'SV', gender: 'male',   birthYear: 2013 }),
    ];
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({ participants });

    const { result } = renderHook(() =>
      useSquadWizard({ ...baseProps, isOpen: true }),
    );
    // Advance to step 2 to trigger load
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    expect(result.current.filteredParticipants).toHaveLength(2);
  });

  it('filters by search term (name)', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [
        makeParticipant({ id: 1, firstname: 'Anna', lastname: 'Müller', club: 'TC' }),
        makeParticipant({ id: 2, firstname: 'Bob',  lastname: 'Huber',  club: 'TC' }),
      ],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => {
      result.current.setFilters((f) => ({ ...f, searchTerm: 'anna' }));
    });

    expect(result.current.filteredParticipants).toHaveLength(1);
    expect(result.current.filteredParticipants[0].firstname).toBe('Anna');
  });

  it('filters by club', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [
        makeParticipant({ id: 1, firstname: 'Anna', club: 'Turnverein' }),
        makeParticipant({ id: 2, firstname: 'Bob',  club: 'Sportclub' }),
      ],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => {
      result.current.setFilters((f) => ({ ...f, club: 'Sportclub' }));
    });

    expect(result.current.filteredParticipants).toHaveLength(1);
    expect(result.current.filteredParticipants[0].firstname).toBe('Bob');
  });

  it('filters by birth year', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [
        makeParticipant({ id: 1, firstname: 'Anna', birthYear: 2014 }),
        makeParticipant({ id: 2, firstname: 'Bob',  birthYear: 2013 }),
      ],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => {
      result.current.setFilters((f) => ({ ...f, birthYear: '2014' }));
    });

    expect(result.current.filteredParticipants).toHaveLength(1);
    expect(result.current.filteredParticipants[0].firstname).toBe('Anna');
  });

  it('filters by gender', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [
        makeParticipant({ id: 1, firstname: 'Anna', gender: 'female' }),
        makeParticipant({ id: 2, firstname: 'Bob',  gender: 'male' }),
      ],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => {
      result.current.setFilters((f) => ({ ...f, gender: 'male' }));
    });

    expect(result.current.filteredParticipants).toHaveLength(1);
    expect(result.current.filteredParticipants[0].firstname).toBe('Bob');
  });
});

// ── allFilteredSelected ───────────────────────────────────────────────────────

describe('useSquadWizard – allFilteredSelected', () => {
  it('is false when no participants are loaded', () => {
    const { result } = renderHook(() => useSquadWizard(baseProps));
    expect(result.current.allFilteredSelected).toBe(false);
  });

  it('is true when all filtered participants are selected', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [
        makeParticipant({ id: 1 }),
        makeParticipant({ id: 2 }),
      ],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => { result.current.toggleParticipant(1); });
    act(() => { result.current.toggleParticipant(2); });

    expect(result.current.allFilteredSelected).toBe(true);
  });

  it('is false when only some participants are selected', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [makeParticipant({ id: 1 }), makeParticipant({ id: 2 })],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => { result.current.toggleParticipant(1); });

    expect(result.current.allFilteredSelected).toBe(false);
  });
});

// ── toggleParticipant ─────────────────────────────────────────────────────────

describe('useSquadWizard – toggleParticipant', () => {
  it('adds id to selectedIds on first call', () => {
    const { result } = renderHook(() => useSquadWizard(baseProps));
    act(() => { result.current.toggleParticipant(7); });
    expect(result.current.selectedIds.has(7)).toBe(true);
  });

  it('removes id from selectedIds when already selected', () => {
    const { result } = renderHook(() => useSquadWizard(baseProps));
    act(() => { result.current.toggleParticipant(7); });
    act(() => { result.current.toggleParticipant(7); });
    expect(result.current.selectedIds.has(7)).toBe(false);
  });
});

// ── toggleSelectAllFiltered ───────────────────────────────────────────────────

describe('useSquadWizard – toggleSelectAllFiltered', () => {
  it('selects all filtered participants when none are selected', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [makeParticipant({ id: 1 }), makeParticipant({ id: 2 })],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => { result.current.toggleSelectAllFiltered(); });

    expect(result.current.selectedIds.has(1)).toBe(true);
    expect(result.current.selectedIds.has(2)).toBe(true);
  });

  it('deselects all filtered participants when all are selected', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [makeParticipant({ id: 1 }), makeParticipant({ id: 2 })],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    act(() => { result.current.toggleSelectAllFiltered(); }); // select all
    act(() => { result.current.toggleSelectAllFiltered(); }); // deselect all

    expect(result.current.selectedIds.has(1)).toBe(false);
    expect(result.current.selectedIds.has(2)).toBe(false);
  });

  it('only deselects participants currently visible (respects filter)', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [
        makeParticipant({ id: 1, club: 'TC' }),
        makeParticipant({ id: 2, club: 'SV' }),
      ],
    });

    const { result } = renderHook(() => useSquadWizard({ ...baseProps, isOpen: true }));
    await act(async () => { result.current.setStep('participants'); });
    await act(async () => {});

    // Select all (both)
    act(() => { result.current.toggleSelectAllFiltered(); });
    expect(result.current.selectedIds.has(1)).toBe(true);
    expect(result.current.selectedIds.has(2)).toBe(true);

    // Now filter to show only TC
    act(() => { result.current.setFilters((f) => ({ ...f, club: 'TC' })); });
    // Deselect only the visible (TC)
    act(() => { result.current.toggleSelectAllFiltered(); });

    expect(result.current.selectedIds.has(1)).toBe(false); // TC — deselected
    expect(result.current.selectedIds.has(2)).toBe(true);  // SV — still selected
  });
});
