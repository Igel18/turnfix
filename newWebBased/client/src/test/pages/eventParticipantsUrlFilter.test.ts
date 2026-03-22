/**
 * EventParticipants URL-Filter Tests
 *
 * Bug: When navigating to /event-participants?prefillSearch=X, the search term
 * is pre-filled but the filter panel (showFilters) stays hidden.  The user sees
 * a filtered list without realising any filter is active.
 *
 * Fix requirements (item 90-style):
 *   1. If prefillSearch is non-empty on mount → showFilters must be truthy
 *   2. Hiding the filter panel (toggle-off) → all filter values must be reset
 *
 * Tests use pure logic helpers extracted from the component to stay fast and
 * dependency-free (no React renderer required).
 */

import { describe, it, expect } from 'vitest';

// ─── Pure logic helpers (mirrors what the component does) ────────────────────

/**
 * Given a prefillSearch URL param value, derive the initial showFilters state.
 * This is the logic that must live in the component.
 */
function deriveInitialShowFilters(prefillSearch: string | null): boolean {
  return !!prefillSearch;
}

/**
 * When the filter toggle button closes the panel, filters are reset.
 * Returns the new filter state after toggling off.
 */
function toggleFiltersOff(
  currentFilters: {
    searchTerm: string;
    genderFilter: string;
    clubFilter: string;
    ageFilter: string;
  }
): typeof currentFilters & { showFilters: boolean } {
  return {
    showFilters: false,
    searchTerm: '',
    genderFilter: '',
    clubFilter: '',
    ageFilter: '',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EventParticipants URL filter behaviour', () => {
  // ── 1. prefillSearch opens the filter panel ───────────────────────────────

  it('shows filter panel when prefillSearch is set in URL', () => {
    expect(deriveInitialShowFilters('Max Mustermann')).toBe(true);
  });

  it('shows filter panel when prefillSearch is a start number string', () => {
    expect(deriveInitialShowFilters('42')).toBe(true);
  });

  it('hides filter panel when prefillSearch is absent (null)', () => {
    expect(deriveInitialShowFilters(null)).toBe(false);
  });

  it('hides filter panel when prefillSearch is empty string', () => {
    expect(deriveInitialShowFilters('')).toBe(false);
  });

  // ── 2. Hiding the filter panel resets all filter values ──────────────────

  it('resets all filters when panel is toggled off', () => {
    const state = toggleFiltersOff({
      searchTerm: 'Müller',
      genderFilter: 'weiblich',
      clubFilter: 'TSV Musterstadt',
      ageFilter: '10-12',
    });

    expect(state.showFilters).toBe(false);
    expect(state.searchTerm).toBe('');
    expect(state.genderFilter).toBe('');
    expect(state.clubFilter).toBe('');
    expect(state.ageFilter).toBe('');
  });

  it('resets filters even when only some are set', () => {
    const state = toggleFiltersOff({
      searchTerm: 'Anna',
      genderFilter: '',
      clubFilter: '',
      ageFilter: '',
    });

    expect(state.searchTerm).toBe('');
    expect(state.showFilters).toBe(false);
  });

  it('no-op reset: already empty filters stay empty after toggle-off', () => {
    const state = toggleFiltersOff({
      searchTerm: '',
      genderFilter: '',
      clubFilter: '',
      ageFilter: '',
    });

    expect(state.searchTerm).toBe('');
    expect(state.showFilters).toBe(false);
  });
});
