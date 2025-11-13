/**
 * useAssignmentFilters Hook
 * Generic reusable hook for managing assignment filter state
 * 
 * Used by Groups, Teams, Squads, and other M:N assignment interfaces
 * Provides consistent filter state management and callbacks
 */

import { useState, useCallback } from 'react';

export interface AssignmentFiltersState {
  hidePlanned: boolean;
  hideOtherClubs: boolean;
}

export interface UseAssignmentFiltersResult {
  filters: AssignmentFiltersState;
  setHidePlanned: (value: boolean) => void;
  setHideOtherClubs: (value: boolean) => void;
  resetFilters: () => void;
}

/**
 * Hook for managing assignment filter state
 * 
 * @returns {UseAssignmentFiltersResult} Filter state and setter functions
 * 
 * @example
 * ```tsx
 * const { filters, setHidePlanned, setHideOtherClubs, resetFilters } = useAssignmentFilters();
 * 
 * <AssignmentFilters
 *   filters={filters}
 *   onToggleHidePlanned={setHidePlanned}
 *   onToggleHideOtherClubs={setHideOtherClubs}
 *   onResetFilters={resetFilters}
 * />
 * ```
 */
export function useAssignmentFilters(): UseAssignmentFiltersResult {
  const [filters, setFilters] = useState<AssignmentFiltersState>({
    hidePlanned: false,
    hideOtherClubs: false
  });

  const setHidePlanned = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, hidePlanned: value }));
  }, []);

  const setHideOtherClubs = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, hideOtherClubs: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ hidePlanned: false, hideOtherClubs: false });
  }, []);

  return {
    filters,
    setHidePlanned,
    setHideOtherClubs,
    resetFilters
  };
}
