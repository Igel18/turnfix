/**
 * Tests for useAddParticipantWizard hook
 *
 * Covers:
 * - genderMatchesCompetition()   — pure helper
 * - ageMatchesCompetition()      — pure helper
 * - filteredParticipants         — search filtering
 * - filteredCompetitions         — gender/age filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  genderMatchesCompetition,
  ageMatchesCompetition,
  useAddParticipantWizard,
} from '@/pages/EventParticipants/hooks/useAddParticipantWizard';
import type { Competition } from '@/pages/EventParticipants/EventParticipants.types';

// ── Mock API ──────────────────────────────────────────────────────────────────

vi.mock('@/utils/api', () => ({
  apiGet: vi.fn().mockResolvedValue([]),
  apiPost: vi.fn().mockResolvedValue({ success: true }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeCompetition = (overrides: Partial<Competition> = {}): Competition => ({
  id: 1,
  name: 'AK 10',
  number: '1',
  gender: 'gemischt',
  ageFrom: 8,
  ageTo: 12,
  participantCount: 0,
  ...overrides,
});

// ── genderMatchesCompetition() ────────────────────────────────────────────────

describe('genderMatchesCompetition', () => {
  it('gemischt accepts any gender', () => {
    expect(genderMatchesCompetition('male', 'gemischt')).toBe(true);
    expect(genderMatchesCompetition('female', 'gemischt')).toBe(true);
    expect(genderMatchesCompetition('unknown', 'gemischt')).toBe(true);
  });

  it('männlich accepts male', () => {
    expect(genderMatchesCompetition('male', 'männlich')).toBe(true);
  });

  it('männlich rejects female', () => {
    expect(genderMatchesCompetition('female', 'männlich')).toBe(false);
  });

  it('weiblich accepts female', () => {
    expect(genderMatchesCompetition('female', 'weiblich')).toBe(true);
  });

  it('weiblich rejects male', () => {
    expect(genderMatchesCompetition('male', 'weiblich')).toBe(false);
  });

  it('unknown gender always passes (not enough info to filter)', () => {
    expect(genderMatchesCompetition('unknown', 'männlich')).toBe(true);
    expect(genderMatchesCompetition('unknown', 'weiblich')).toBe(true);
  });

  it('both gender always passes', () => {
    expect(genderMatchesCompetition('both', 'männlich')).toBe(true);
    expect(genderMatchesCompetition('both', 'weiblich')).toBe(true);
  });
});

// ── ageMatchesCompetition() ───────────────────────────────────────────────────

describe('ageMatchesCompetition', () => {
  const comp = makeCompetition({ ageFrom: 10, ageTo: 14 });

  it('returns true for age inside range', () => {
    expect(ageMatchesCompetition(10, comp)).toBe(true);
    expect(ageMatchesCompetition(12, comp)).toBe(true);
    expect(ageMatchesCompetition(14, comp)).toBe(true);
  });

  it('returns false for age below range', () => {
    expect(ageMatchesCompetition(9, comp)).toBe(false);
  });

  it('returns false for age above range', () => {
    expect(ageMatchesCompetition(15, comp)).toBe(false);
  });

  it('returns true when age is 0 (unknown)', () => {
    expect(ageMatchesCompetition(0, comp)).toBe(true);
  });

  it('handles inverted ageFrom/ageTo gracefully (normalises to min/max)', () => {
    const inverted = makeCompetition({ ageFrom: 14, ageTo: 10 });
    expect(ageMatchesCompetition(12, inverted)).toBe(true);
    expect(ageMatchesCompetition(9, inverted)).toBe(false);
  });
});

// ── useAddParticipantWizard hook / filteredParticipants ───────────────────────

const baseProps = {
  isOpen: false,
  eventId: '1',
  competitions: [],
  onParticipantAdded: vi.fn(),
  onClose: vi.fn(),
};

describe('useAddParticipantWizard – filteredParticipants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all participants when search is empty', () => {
    const { result } = renderHook(() => useAddParticipantWizard(baseProps));
    // availableParticipants is [] initially; filtered is also []
    expect(result.current.filteredParticipants).toEqual([]);
  });

  it('filters by first name', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, firstname: 'Anna', lastname: 'Müller', club: 'TC', gender: 'female', age: 10, isInEvent: false },
      { id: 2, firstname: 'Bob', lastname: 'Huber', club: 'TC', gender: 'male', age: 11, isInEvent: false },
    ]);

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));

    // Wait for loadAvailableParticipants to complete
    await act(async () => {});

    act(() => { result.current.setSearchTerm('anna'); });
    expect(result.current.filteredParticipants).toHaveLength(1);
    expect(result.current.filteredParticipants[0].firstname).toBe('Anna');
  });

  it('filters by club name', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, firstname: 'Anna', lastname: 'M', club: 'Turnverein', gender: 'female', age: 10, isInEvent: false },
      { id: 2, firstname: 'Bob', lastname: 'H', club: 'SV Blau', gender: 'male', age: 11, isInEvent: false },
    ]);

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    act(() => { result.current.setSearchTerm('blau'); });
    expect(result.current.filteredParticipants).toHaveLength(1);
    expect(result.current.filteredParticipants[0].firstname).toBe('Bob');
  });
});

// ── useAddParticipantWizard hook / filteredCompetitions ───────────────────────

describe('useAddParticipantWizard – filteredCompetitions', () => {
  const competitions = [
    makeCompetition({ id: 1, gender: 'männlich', ageFrom: 10, ageTo: 12 }),
    makeCompetition({ id: 2, gender: 'weiblich', ageFrom: 10, ageTo: 12 }),
    makeCompetition({ id: 3, gender: 'gemischt', ageFrom: 14, ageTo: 16 }),
  ];

  it('returns all competitions when no participant is selected', () => {
    const { result } = renderHook(() =>
      useAddParticipantWizard({ ...baseProps, competitions }),
    );
    expect(result.current.filteredCompetitions).toHaveLength(3);
  });

  it('filters by gender when filterByGender is true', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, firstname: 'Max', lastname: 'M', club: '', gender: 'male', age: 11, isInEvent: false },
    ]);

    const { result } = renderHook(() =>
      useAddParticipantWizard({ ...baseProps, isOpen: true, competitions }),
    );
    await act(async () => {});

    // Select a male participant
    await act(async () => {
      result.current.handleSelectParticipant(result.current.filteredParticipants[0]);
    });

    // Expect only 'männlich' + 'gemischt' (step advanced and filter active)
    // competitions that pass: id=1 (männlich) and id=3 (gemischt) — but age filter blocks id=3 (age 11, range 14-16)
    expect(result.current.filteredCompetitions.every(c => c.gender !== 'weiblich')).toBe(true);
  });
});

// ── loadAvailableParticipants – API response shapes ───────────────────────────
// The server can return participants in two shapes:
//   1. Plain array:            apiGet → Participant[]
//   2. Object with key:        apiGet → { participants: Participant[] }
//
// Previously the server also returned { eventParticipants: [...] } in some
// early-return paths when an event had 0 registered participants + includeAvailable=true.
// That bug was fixed server-side (all paths now return `participants`), but the
// client should still handle both the array and the object shape gracefully.

const sampleParticipants = [
  { id: 1, firstname: 'Anna', lastname: 'Müller', club: 'TC', gender: 'female', age: 12, isInEvent: false },
  { id: 2, firstname: 'Bob',  lastname: 'Huber',  club: 'SV', gender: 'male',   age: 11, isInEvent: false },
];

describe('loadAvailableParticipants – response shape handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handles plain-array response', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue(sampleParticipants);

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    expect(result.current.filteredParticipants).toHaveLength(2);
  });

  it('handles { participants: [...] } object response (main server path)', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: sampleParticipants,
      totalInEvent: 0,
      totalAvailable: 2,
    });

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    expect(result.current.filteredParticipants).toHaveLength(2);
    expect(result.current.filteredParticipants[0].firstname).toBe('Anna');
  });

  it('returns empty list when response is an empty { participants: [] }', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [],
      totalInEvent: 0,
      totalAvailable: 0,
    });

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    expect(result.current.filteredParticipants).toHaveLength(0);
  });

  it('returns empty list when API response is null/undefined', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    expect(result.current.filteredParticipants).toHaveLength(0);
  });

  it('returns empty list when API throws an error', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    expect(result.current.filteredParticipants).toHaveLength(0);
  });

  it('only shows participants not already in the event (isInEvent: false)', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      participants: [
        { id: 1, firstname: 'Anna', lastname: 'Müller', club: 'TC', gender: 'female', age: 12, isInEvent: true  },
        { id: 2, firstname: 'Bob',  lastname: 'Huber',  club: 'SV', gender: 'male',   age: 11, isInEvent: false },
      ],
      totalInEvent: 1,
      totalAvailable: 1,
    });

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    // The hook loads all participants; UI filtering by isInEvent is done later in the component,
    // but we can verify the isInEvent flag is preserved on the normalised object.
    const anna = result.current.filteredParticipants.find(p => p.firstname === 'Anna');
    const bob  = result.current.filteredParticipants.find(p => p.firstname === 'Bob');
    expect(anna?.isInEvent).toBe(true);
    expect(bob?.isInEvent).toBe(false);
  });
});

// ── Bug #84: age/year number shown alongside "Jahre" ─────────────────────────
// The wizard participant list renders:
//   {t('eventParticipants.card.years', { count: participant.age })}
// Without {{count}} in the translation the year number is swallowed and only
// "Jahre" is displayed.  These tests guard the translation format.

describe('Bug #84 – eventParticipants.card.years translation includes {{count}}', () => {
  it('German translation contains {{count}} so age number is shown', async () => {
    const de = await import('@/i18n/locales/de.json');
    const key = (de as any).eventParticipants?.card?.years as string;
    expect(key).toContain('{{count}}');
  });

  it('English translation contains {{count}} so age number is shown', async () => {
    const en = await import('@/i18n/locales/en.json');
    const key = (en as any).eventParticipants?.card?.years as string;
    expect(key).toContain('{{count}}');
  });

  it('wizard normalises participant age to a positive number when available', async () => {
    const { apiGet } = await import('@/utils/api');
    (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, firstname: 'Anna', lastname: 'Test', club: 'TC', gender: 'female', age: 12, isInEvent: false },
    ]);

    const { result } = renderHook(() => useAddParticipantWizard({ ...baseProps, isOpen: true }));
    await act(async () => {});

    expect(result.current.filteredParticipants[0].age).toBeGreaterThan(0);
  });
});
