/**
 * useFilterPanel hook
 *
 * Centralises the standard filter-panel visibility behaviour used across
 * all pages that have a toggle-able filter section:
 *
 *  1. The panel is ALWAYS shown when at least one filter value is active.
 *     → If a user navigates to the page with a ?prefillSearch= param
 *       that pre-fills a filter the panel opens automatically.
 *
 *  2. Closing the panel (toggleFilters while visible) RESETS all filters.
 *     → This prevents hidden-but-active filters confusing users.
 *
 *  3. Opening the panel just makes it visible (no side effects).
 *
 * Usage
 * ─────
 * ```tsx
 * const isAnyFilterActive =
 *   searchTerm !== '' || genderFilter !== '' || clubFilter !== '';
 *
 * const { showFilters, toggleFilters } = useFilterPanel(
 *   isAnyFilterActive,
 *   resetFilters   // called automatically when panel is closed
 * );
 *
 * <EventManagementTemplate
 *   showFilters={showFilters}
 *   onToggleFilters={toggleFilters}
 *   ...
 * />
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseFilterPanelReturn {
  /** Whether the filter panel is currently visible */
  showFilters: boolean;
  /**
   * Toggle the panel.
   * - If OPEN: resets all filters then closes the panel.
   * - If CLOSED: opens the panel.
   */
  toggleFilters: () => void;
  /** Programmatically open the panel without resetting (used for prefill). */
  openFilters: () => void;
}

/**
 * @param isAnyFilterActive  True when at least one filter has a non-default value.
 * @param resetFilters        Callback to clear all filter fields (from page state).
 */
export function useFilterPanel(
  isAnyFilterActive: boolean,
  resetFilters: () => void
): UseFilterPanelReturn {
  const [showFilters, setShowFilters] = useState(false);

  // Rule 1: auto-show if a filter is active
  useEffect(() => {
    if (isAnyFilterActive) {
      setShowFilters(true);
    }
  }, [isAnyFilterActive]);

  // Rule 2 & 3: toggle
  const toggleFilters = useCallback(() => {
    if (showFilters) {
      // Closing: reset all filters first, then close.
      // Note: after resetFilters(), isAnyFilterActive → false, so the
      // useEffect above will NOT re-open the panel on the same interaction.
      resetFilters();
      setShowFilters(false);
    } else {
      setShowFilters(true);
    }
  }, [showFilters, resetFilters]);

  const openFilters = useCallback(() => {
    setShowFilters(true);
  }, []);

  return { showFilters, toggleFilters, openFilters };
}
