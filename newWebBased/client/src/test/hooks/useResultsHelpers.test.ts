/**
 * Tests for useResultsHelpers Hook
 * Covers: formatScore, getMedalColor, getMedalEmoji
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResultsHelpers } from '@/pages/Results/hooks/useResultsHelpers';

// Mock scoreFormatter
vi.mock('@/utils/scoreFormatter', () => ({
  formatScore: vi.fn((score: number, _calcType?: number) => {
    if (score === 0) return '0.000';
    return score.toFixed(3);
  }),
}));

describe('useResultsHelpers', () => {
  // ─── formatScore ──────────────────────────────────────────

  describe('formatScore', () => {
    it('formats a score value', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.formatScore(9.5)).toBe('9.500');
    });

    it('formats zero score', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.formatScore(0)).toBe('0.000');
    });

    it('passes disciplineCalculationType to underlying formatter', async () => {
      const scoreFormatter = await import('@/utils/scoreFormatter');
      const { result } = renderHook(() => useResultsHelpers());
      result.current.formatScore(8.123, 3);
      expect(vi.mocked(scoreFormatter.formatScore)).toHaveBeenCalledWith(8.123, 3);
    });
  });

  // ─── getMedalColor ────────────────────────────────────────

  describe('getMedalColor', () => {
    it('returns gold style for rank 1', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalColor(1)).toBe('bg-yellow-400 text-yellow-900');
    });

    it('returns silver style for rank 2', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalColor(2)).toBe('bg-gray-300 text-gray-900');
    });

    it('returns bronze style for rank 3', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalColor(3)).toBe('bg-amber-600 text-amber-100');
    });

    it('returns default style for rank > 3', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalColor(4)).toBe('bg-gray-100 text-gray-900');
      expect(result.current.getMedalColor(10)).toBe('bg-gray-100 text-gray-900');
      expect(result.current.getMedalColor(100)).toBe('bg-gray-100 text-gray-900');
    });
  });

  // ─── getMedalEmoji ────────────────────────────────────────

  describe('getMedalEmoji', () => {
    it('returns gold medal for rank 1', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalEmoji(1)).toBe('🥇');
    });

    it('returns silver medal for rank 2', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalEmoji(2)).toBe('🥈');
    });

    it('returns bronze medal for rank 3', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalEmoji(3)).toBe('🥉');
    });

    it('returns numeric string for rank > 3', () => {
      const { result } = renderHook(() => useResultsHelpers());
      expect(result.current.getMedalEmoji(4)).toBe('4');
      expect(result.current.getMedalEmoji(42)).toBe('42');
    });
  });
});
