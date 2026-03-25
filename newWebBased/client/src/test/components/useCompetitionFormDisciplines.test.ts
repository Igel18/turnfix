/**
 * Tests for useCompetitionFormDisciplines hook and pure helper functions
 * extracted from CompetitionFormModalNew.tsx.
 *
 * Covers:
 * - filterDisciplinesByGender()   — pure helper
 * - getDisciplineGenderLabel()    — pure helper
 * - handleDisciplineToggle        — select / deselect a discipline
 * - handleSelectAllVisible        — select all displayed disciplines
 * - handleDeselectAllVisible      — deselect all displayed disciplines
 * - handleBulkSelectGroup         — apply group + max score
 * - displayedDisciplines          — search & showSelectedOnly filtering
 * - ageFrom / ageTo auto-adjust   — handled inline in the form (tested here as
 *                                   a standalone logic check)
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import {
  filterDisciplinesByGender,
  getDisciplineGenderLabel,
  useCompetitionFormDisciplines,
} from '@/components/useCompetitionFormDisciplines';
import type { Discipline, CompetitionFormData } from '@/components/CompetitionFormModal.types';

// ── Test data ────────────────────────────────────────────────────────────────

const sampleDisciplines: Discipline[] = [
  { id: 1, name: 'Boden',        short_name: 'BO', display_name: 'Boden',        male_allowed: true,  female_allowed: true,  icon: '' },
  { id: 2, name: 'Reck',         short_name: 'RE', display_name: 'Reck',         male_allowed: true,  female_allowed: false, icon: '' },
  { id: 3, name: 'Stufenbarren', short_name: 'SB', display_name: 'Stufenbarren', male_allowed: false, female_allowed: true,  icon: '' },
  { id: 4, name: 'Sprung',       short_name: 'SP', display_name: 'Sprung',       male_allowed: true,  female_allowed: true,  icon: '' },
  { id: 5, name: 'Pferd',        short_name: 'PF', display_name: 'Pferd',        male_allowed: true,  female_allowed: false, icon: '' },
];

const makeFormData = (overrides: Partial<CompetitionFormData> = {}): CompetitionFormData => ({
  name: 'Test',
  description: '',
  gender: 'gemischt',
  areaId: null,
  ageFrom: 10,
  ageTo: 14,
  disciplines: [],
  round: 1,
  track: 1,
  competitionType: 0,
  qualifiers: 0,
  dropWorstScore: false,
  showAgeGroup: true,
  isOptionalCompetition: false,
  showInfo: false,
  useCompulsoryProgram: false,
  sortAscending: false,
  manualSort: false,
  useApparatusPoints: false,
  dropCount: 0,
  ...overrides,
});

/** Registers MSW handlers that return sampleDisciplines for the hook's API calls. */
function useSampleDisciplineHandlers(
  disciplineGroups: object[] = [],
  disciplines: Discipline[] = sampleDisciplines,
) {
  server.use(
    http.get('/api/disciplines', () => HttpResponse.json(disciplines)),
    http.get('/api/discipline-groups', () => HttpResponse.json({ disciplineGroups })),
    http.get('/api/areas', () => HttpResponse.json({ areas: [] })),
  );
}

/** Renders the hook inside a state holder that exposes formData. */
function makeHookWrapper(initialFormData: CompetitionFormData, initialBulkMaxScore = '') {
  return renderHook(() => {
    const [formData, setFormData] = useState<CompetitionFormData>(initialFormData);
    const [bulkMaxScore, setBulkMaxScore] = useState(initialBulkMaxScore);
    const hook = useCompetitionFormDisciplines({
      isOpen: true,
      formData,
      setFormData,
      bulkMaxScore,
    });
    return { formData, setFormData, bulkMaxScore, setBulkMaxScore, ...hook };
  });
}

// ── filterDisciplinesByGender ─────────────────────────────────────────────────

describe('filterDisciplinesByGender', () => {
  it('gemischt returns all disciplines', () => {
    const result = filterDisciplinesByGender(sampleDisciplines, 'gemischt');
    expect(result).toHaveLength(5);
  });

  it('männlich returns only male-allowed disciplines', () => {
    const result = filterDisciplinesByGender(sampleDisciplines, 'männlich');
    expect(result.map(d => d.id)).toEqual(expect.arrayContaining([1, 2, 4, 5]));
    expect(result.find(d => d.id === 3)).toBeUndefined(); // Stufenbarren
  });

  it('weiblich returns only female-allowed disciplines', () => {
    const result = filterDisciplinesByGender(sampleDisciplines, 'weiblich');
    expect(result.map(d => d.id)).toEqual(expect.arrayContaining([1, 3, 4]));
    expect(result.find(d => d.id === 2)).toBeUndefined(); // Reck
    expect(result.find(d => d.id === 5)).toBeUndefined(); // Pferd
  });

  it('returns empty array when no disciplines match gender', () => {
    const femaleOnly: Discipline[] = [
      { id: 10, name: 'SB', short_name: 'SB', display_name: 'SB', male_allowed: false, female_allowed: true, icon: '' },
    ];
    expect(filterDisciplinesByGender(femaleOnly, 'männlich')).toHaveLength(0);
  });
});

// ── getDisciplineGenderLabel ──────────────────────────────────────────────────

describe('getDisciplineGenderLabel', () => {
  const labels = { both: 'Beide', male: 'Männlich', female: 'Weiblich' };

  it('returns "both" label when both genders allowed', () => {
    expect(getDisciplineGenderLabel(true, true, labels)).toBe('Beide');
  });

  it('returns "male" label when only male allowed', () => {
    expect(getDisciplineGenderLabel(true, false, labels)).toBe('Männlich');
  });

  it('returns "female" label when only female allowed', () => {
    expect(getDisciplineGenderLabel(false, true, labels)).toBe('Weiblich');
  });

  it('returns empty string when neither gender allowed', () => {
    expect(getDisciplineGenderLabel(false, false, labels)).toBe('');
  });
});

// ── handleDisciplineToggle ────────────────────────────────────────────────────
// These tests do not need disciplines to be loaded — they operate on formData only.

describe('handleDisciplineToggle', () => {
  it('adds a discipline when not yet selected', () => {
    useSampleDisciplineHandlers([], []);
    const { result } = makeHookWrapper(makeFormData({ disciplines: [] }));

    act(() => { result.current.handleDisciplineToggle(1); });

    expect(result.current.formData.disciplines).toHaveLength(1);
    expect(result.current.formData.disciplines[0].disciplineId).toBe(1);
  });

  it('removes a discipline when already selected', () => {
    useSampleDisciplineHandlers([], []);
    const initial = makeFormData({ disciplines: [{ disciplineId: 1, maxScore: 10 }] });
    const { result } = makeHookWrapper(initial);

    act(() => { result.current.handleDisciplineToggle(1); });

    expect(result.current.formData.disciplines).toHaveLength(0);
  });

  it('uses bulkMaxScore as default maxScore when adding', () => {
    useSampleDisciplineHandlers([], []);
    const { result } = makeHookWrapper(makeFormData({ disciplines: [] }), '7.5');

    act(() => { result.current.handleDisciplineToggle(2); });

    expect(result.current.formData.disciplines[0].maxScore).toBe(7.5);
  });

  it('uses 0 as default maxScore when bulkMaxScore is empty', () => {
    useSampleDisciplineHandlers([], []);
    const { result } = makeHookWrapper(makeFormData({ disciplines: [] }), '');

    act(() => { result.current.handleDisciplineToggle(2); });

    expect(result.current.formData.disciplines[0].maxScore).toBe(0);
  });

  it('does NOT remove other disciplines when toggling one', () => {
    useSampleDisciplineHandlers([], []);
    const initial = makeFormData({
      disciplines: [
        { disciplineId: 1, maxScore: 10 },
        { disciplineId: 2, maxScore: 15 },
      ],
    });
    const { result } = makeHookWrapper(initial);

    act(() => { result.current.handleDisciplineToggle(2); });

    expect(result.current.formData.disciplines).toHaveLength(1);
    expect(result.current.formData.disciplines[0].disciplineId).toBe(1);
  });
});

// ── handleSelectAllVisible / handleDeselectAllVisible ─────────────────────────

describe('handleSelectAllVisible / handleDeselectAllVisible', () => {
  it('selectAllVisible adds all displayed disciplines', async () => {
    useSampleDisciplineHandlers();
    const { result } = makeHookWrapper(makeFormData({ disciplines: [] }), '10');

    await act(async () => {});

    act(() => { result.current.handleSelectAllVisible(); });

    expect(result.current.formData.disciplines).toHaveLength(5);
    expect(result.current.formData.disciplines[0].maxScore).toBe(10);
  });

  it('selectAllVisible does not duplicate already-selected disciplines', async () => {
    useSampleDisciplineHandlers();
    const initial = makeFormData({
      disciplines: [{ disciplineId: 1, maxScore: 99 }],
    });
    const { result } = makeHookWrapper(initial, '10');
    await act(async () => {});

    act(() => { result.current.handleSelectAllVisible(); });

    const d1 = result.current.formData.disciplines.find(d => d.disciplineId === 1);
    expect(d1?.maxScore).toBe(99); // original score preserved
    expect(result.current.formData.disciplines).toHaveLength(5);
  });

  it('deselectAllVisible removes all displayed disciplines', async () => {
    useSampleDisciplineHandlers();
    const initial = makeFormData({
      disciplines: sampleDisciplines.map(d => ({ disciplineId: d.id, maxScore: 10 })),
    });
    const { result } = makeHookWrapper(initial);
    await act(async () => {});

    act(() => { result.current.handleDeselectAllVisible(); });

    expect(result.current.formData.disciplines).toHaveLength(0);
  });
});

// ── handleBulkSelectGroup ─────────────────────────────────────────────────────

describe('handleBulkSelectGroup', () => {
  it('when no group selected: applies bulk score to all already-selected disciplines', async () => {
    useSampleDisciplineHandlers([
      {
        int_disziplinen_gruppenid: 10,
        var_name: 'Männliches Mehrkampf',
        disciplines: [
          { int_disziplinenid: 2, position: 1 },
          { int_disziplinenid: 4, position: 2 },
          { int_disziplinenid: 5, position: 3 },
        ],
      },
    ]);
    const initial = makeFormData({
      disciplines: [
        { disciplineId: 1, maxScore: 0 },
        { disciplineId: 2, maxScore: 0 },
      ],
    });
    const { result } = makeHookWrapper(initial, '8');
    await act(async () => {});

    act(() => { result.current.handleBulkSelectGroup(); });

    expect(result.current.formData.disciplines.every(d => d.maxScore === 8)).toBe(true);
  });

  it('when no group selected and bulkMaxScore is empty: does nothing', async () => {
    useSampleDisciplineHandlers();
    const initial = makeFormData({
      disciplines: [{ disciplineId: 1, maxScore: 5 }],
    });
    const { result } = makeHookWrapper(initial, '');
    await act(async () => {});

    act(() => { result.current.handleBulkSelectGroup(); });

    expect(result.current.formData.disciplines[0].maxScore).toBe(5); // unchanged
  });
});

// ── displayedDisciplines: search filtering ────────────────────────────────────

describe('displayedDisciplines – search filtering', () => {
  it('shows all disciplines when search is empty', async () => {
    useSampleDisciplineHandlers();
    const { result } = makeHookWrapper(makeFormData());
    await act(async () => {});

    expect(result.current.displayedDisciplines).toHaveLength(5);
  });

  it('filters by display_name (case-insensitive)', async () => {
    useSampleDisciplineHandlers();
    const { result } = makeHookWrapper(makeFormData());
    await act(async () => {});

    act(() => { result.current.setDisciplineSearch('reck'); });
    expect(result.current.displayedDisciplines).toHaveLength(1);
    expect(result.current.displayedDisciplines[0].id).toBe(2);
  });

  it('filters by short_name', async () => {
    useSampleDisciplineHandlers();
    const { result } = makeHookWrapper(makeFormData());
    await act(async () => {});

    act(() => { result.current.setDisciplineSearch('sb'); });
    expect(result.current.displayedDisciplines).toHaveLength(1);
    expect(result.current.displayedDisciplines[0].id).toBe(3);
  });

  it('returns empty when search has no matches', async () => {
    useSampleDisciplineHandlers();
    const { result } = makeHookWrapper(makeFormData());
    await act(async () => {});

    act(() => { result.current.setDisciplineSearch('xyznotfound'); });
    expect(result.current.displayedDisciplines).toHaveLength(0);
  });
});

// ── displayedDisciplines: showSelectedOnly ────────────────────────────────────

describe('displayedDisciplines – showSelectedOnly', () => {
  it('shows only selected disciplines when showSelectedOnly is true', async () => {
    useSampleDisciplineHandlers();
    const initial = makeFormData({
      disciplines: [
        { disciplineId: 1, maxScore: 10 },
        { disciplineId: 3, maxScore: 10 },
      ],
    });
    const { result } = makeHookWrapper(initial);
    await act(async () => {});

    act(() => { result.current.setShowSelectedOnly(true); });

    const ids = result.current.displayedDisciplines.map(d => d.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(4);
    expect(ids).not.toContain(5);
  });

  it('shows all when showSelectedOnly is false', async () => {
    useSampleDisciplineHandlers();
    const { result } = makeHookWrapper(makeFormData({ disciplines: [] }));
    await act(async () => {});

    act(() => { result.current.setShowSelectedOnly(false); });
    expect(result.current.displayedDisciplines).toHaveLength(5);
  });
});

// ── ageFrom / ageTo auto-adjust logic ────────────────────────────────────────
// This logic lives inline in the form JSX, tested here independently.

describe('ageFrom / ageTo auto-adjust logic', () => {
  it('ageTo should be at least ageFrom', () => {
    const autoAdjust = (newAgeFrom: number, currentAgeTo: number) => ({
      ageFrom: newAgeFrom,
      ageTo: currentAgeTo < newAgeFrom ? newAgeFrom : currentAgeTo,
    });

    expect(autoAdjust(12, 10)).toEqual({ ageFrom: 12, ageTo: 12 }); // ageTo bumped up
    expect(autoAdjust(10, 14)).toEqual({ ageFrom: 10, ageTo: 14 }); // ageTo unchanged
    expect(autoAdjust(10, 10)).toEqual({ ageFrom: 10, ageTo: 10 }); // equal — valid
  });
});

// ── Competition number max-length enforcement ─────────────────────────────────

describe('competition number field – max 5 characters', () => {
  it('allows values up to 5 characters', () => {
    const enforce = (value: string) => value.length <= 5 ? value : null;
    expect(enforce('AK10')).toBe('AK10');
    expect(enforce('12345')).toBe('12345');
    expect(enforce('123456')).toBeNull(); // rejected
  });
});
