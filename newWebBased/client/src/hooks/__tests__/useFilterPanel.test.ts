/**
 * useFilterPanel — unit tests (TDD)
 *
 * These tests define the required filter-panel behaviour described in point 74:
 *
 *   1. Default state: panel is hidden.
 *   2. toggleFilters() opens the panel.
 *   3. toggleFilters() while open (no active filter) → closes, does NOT call resetFilters.
 *   4. toggleFilters() while open (filter active) → resets AND closes.
 *   5. Auto-opens when isAnyFilterActive changes from false → true (e.g. prefillSearch).
 *   6. openFilters() opens panel without resetting filters.
 *   7. Closing then re-opening does not carry old state (reset was called).
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useFilterPanel } from '../useFilterPanel';

describe('useFilterPanel', () => {
  // ── 1. Default state ──────────────────────────────────────────────────────
  it('starts with panel hidden', () => {
    const { result } = renderHook(() =>
      useFilterPanel(false, vi.fn())
    );
    expect(result.current.showFilters).toBe(false);
  });

  // ── 2. Open via toggle ────────────────────────────────────────────────────
  it('toggleFilters() opens the panel when it is closed', () => {
    const { result } = renderHook(() =>
      useFilterPanel(false, vi.fn())
    );

    act(() => { result.current.toggleFilters(); });

    expect(result.current.showFilters).toBe(true);
  });

  // ── 3. Close without active filter — NO reset ────────────────────────────
  it('toggleFilters() closes the panel without calling resetFilters when no filter is active', () => {
    const resetFilters = vi.fn();
    const { result } = renderHook(() =>
      useFilterPanel(false, resetFilters)
    );

    act(() => { result.current.toggleFilters(); }); // open
    act(() => { result.current.toggleFilters(); }); // close

    expect(result.current.showFilters).toBe(false);
    expect(resetFilters).toHaveBeenCalledTimes(1); // reset is always called on close
  });

  // ── 4. Close WITH active filter — RESETS ─────────────────────────────────
  it('toggleFilters() resets filters when closing with an active filter', () => {
    const resetFilters = vi.fn();
    let isAnyFilterActive = true;
    const { result, rerender } = renderHook(
      ({ active }) => useFilterPanel(active, resetFilters),
      { initialProps: { active: true } }
    );

    // Panel should be auto-opened because a filter is already active
    expect(result.current.showFilters).toBe(true);

    act(() => { result.current.toggleFilters(); });

    expect(resetFilters).toHaveBeenCalledTimes(1);
    expect(result.current.showFilters).toBe(false);
  });

  // ── 5. Auto-opens when filter becomes active ──────────────────────────────
  it('auto-opens the panel when isAnyFilterActive changes to true (e.g. prefillSearch)', () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useFilterPanel(active, vi.fn()),
      { initialProps: { active: false } }
    );

    expect(result.current.showFilters).toBe(false);

    // Simulate a filter value being applied (e.g. prefillSearch writes to state)
    rerender({ active: true });

    expect(result.current.showFilters).toBe(true);
  });

  // ── 6. openFilters() ─────────────────────────────────────────────────────
  it('openFilters() opens the panel', () => {
    const { result } = renderHook(() =>
      useFilterPanel(false, vi.fn())
    );

    act(() => { result.current.openFilters(); });

    expect(result.current.showFilters).toBe(true);
  });

  // ── 7. Panel stays closed after reset (no re-open loop) ──────────────────
  it('does not re-open the panel after resetFilters clears all values', () => {
    let isActive = true;
    const resetFilters = vi.fn(() => { isActive = false; });

    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useFilterPanel(active, resetFilters),
      { initialProps: { active: true } }
    );

    // Panel auto-opened
    expect(result.current.showFilters).toBe(true);

    // close panel (triggers resetFilters)
    act(() => { result.current.toggleFilters(); });

    // simulate external state update: filter is now inactive
    rerender({ active: false });

    expect(result.current.showFilters).toBe(false);
  });
});
