/**
 * usePagination Hook Tests
 * Pagination math: page calculations, slicing, boundary conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../../hooks/usePagination';

// ────────────────────────────────────────────────────────────
// usePagination Hook Tests
// ────────────────────────────────────────────────────────────
describe('usePagination Hook', () => {
  // --- Initialization ---
  describe('Initialization', () => {
    it('initializes with default itemsPerPage (50)', () => {
      const { result } = renderHook(() => usePagination());
      expect(result.current.itemsPerPage).toBe(50);
    });

    it('initializes with custom itemsPerPage', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 25 }));
      expect(result.current.itemsPerPage).toBe(25);
    });

    it('initializes currentPage to 1', () => {
      const { result } = renderHook(() => usePagination());
      expect(result.current.currentPage).toBe(1);
    });

    it('starts with default options', () => {
      const { result } = renderHook(() => usePagination({}));
      expect(result.current.currentPage).toBe(1);
      expect(result.current.itemsPerPage).toBe(50);
    });
  });

  // --- getPaginatedItems Calculations ---
  describe('getPaginatedItems calculations', () => {
    it('returns correct totalPages', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      const { totalPages, totalItems } = result.current.getPaginatedItems(items);

      expect(totalPages).toBe(3); // ceil(25 / 10)
      expect(totalItems).toBe(25);
    });

    it('returns correct paginatedItems for first page', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      const { paginatedItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('returns correct paginatedItems for middle page', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      act(() => {
        result.current.setCurrentPage(2);
      });

      const { paginatedItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });

    it('returns correct paginatedItems for last page (partial)', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      act(() => {
        result.current.setCurrentPage(3);
      });

      const { paginatedItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toEqual([21, 22, 23, 24, 25]);
      expect(paginatedItems.length).toBe(5);
    });

    it('returns correct startIndex', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 50 }, (_, i) => i + 1);

      act(() => {
        result.current.setCurrentPage(3);
      });

      const { startIndex } = result.current.getPaginatedItems(items);

      expect(startIndex).toBe(20); // (3 - 1) * 10
    });

    it('returns correct endIndex', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 50 }, (_, i) => i + 1);

      act(() => {
        result.current.setCurrentPage(2);
      });

      const { endIndex } = result.current.getPaginatedItems(items);

      expect(endIndex).toBe(20); // 10 + 10
    });
  });

  // --- Page Navigation ---
  describe('Page navigation', () => {
    it('allows setting current page', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));

      act(() => {
        result.current.setCurrentPage(5);
      });

      expect(result.current.currentPage).toBe(5);
    });

    it('can navigate from page 1 to last page', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 50 }, (_, i) => i + 1);

      act(() => {
        result.current.setCurrentPage(5);
      });

      const { paginatedItems } = result.current.getPaginatedItems(items);
      expect(paginatedItems).toEqual([41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);
    });

    it('allows navigating backwards', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 50 }, (_, i) => i + 1);

      act(() => {
        result.current.setCurrentPage(3);
      });

      act(() => {
        result.current.setCurrentPage(1);
      });

      const { paginatedItems } = result.current.getPaginatedItems(items);
      expect(paginatedItems[0]).toBe(1);
    });
  });

  // --- Edge Cases ---
  describe('Edge cases', () => {
    it('handles empty array', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items: number[] = [];

      const { paginatedItems, totalPages, totalItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toEqual([]);
      expect(totalPages).toBe(0); // ceil(0 / 10) = 0
      expect(totalItems).toBe(0);
    });

    it('handles single item', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = [1];

      const { paginatedItems, totalPages } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toEqual([1]);
      expect(totalPages).toBe(1);
    });

    it('handles itemsPerPage = 1', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 1 }));
      const items = [1, 2, 3];

      const { totalPages, paginatedItems } = result.current.getPaginatedItems(items);

      expect(totalPages).toBe(3);
      expect(paginatedItems.length).toBe(1);
      expect(paginatedItems[0]).toBe(1);
    });

    it('handles large itemsPerPage (more than total items)', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 1000 }));
      const items = Array.from({ length: 50 }, (_, i) => i + 1);

      const { paginatedItems, totalPages } = result.current.getPaginatedItems(items);

      expect(paginatedItems.length).toBe(50);
      expect(totalPages).toBe(1);
    });

    it('handles exactly divisible items', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 30 }, (_, i) => i + 1);

      const { totalPages } = result.current.getPaginatedItems(items);

      expect(totalPages).toBe(3);
    });

    it('handles non-divisible items', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 32 }, (_, i) => i + 1);

      const { totalPages } = result.current.getPaginatedItems(items);

      expect(totalPages).toBe(4); // ceil(32 / 10)
    });
  });

  // --- Type Handling ---
  describe('Type handling', () => {
    it('handles string items', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 2 }));
      const items = ['Alice', 'Bob', 'Charlie', 'Diana'];

      const { paginatedItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toEqual(['Alice', 'Bob']);
    });

    it('handles object items', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 2 }));
      const items = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ];

      const { paginatedItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toHaveLength(2);
      expect(paginatedItems[0].name).toBe('Alice');
    });

    it('handles mixed object items across pages', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 5 }));
      const items = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`
      }));

      act(() => {
        result.current.setCurrentPage(2);
      });

      const { paginatedItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toHaveLength(5);
      expect(paginatedItems[0].id).toBe(6);
      expect(paginatedItems[4].id).toBe(10);
    });

    it('handles last page with objects', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 5 }));
      const items = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`
      }));

      act(() => {
        result.current.setCurrentPage(3);
      });

      const { paginatedItems } = result.current.getPaginatedItems(items);

      expect(paginatedItems).toHaveLength(2);
      expect(paginatedItems[0].id).toBe(11);
      expect(paginatedItems[1].id).toBe(12);
    });
  });

  // --- Real-world Scenarios ---
  describe('Real-world scenarios', () => {
    it('handles typical participant list (50 items per page)', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 50 }));
      const participants = Array.from({ length: 342 }, (_, i) => ({
        id: i + 1,
        name: `Participant ${i + 1}`,
        email: `participant${i + 1}@example.com`
      }));

      // First page
      let paginated = result.current.getPaginatedItems(participants);
      expect(paginated.paginatedItems).toHaveLength(50);
      expect(paginated.totalPages).toBe(7); // ceil(342 / 50)

      // Last page
      act(() => {
        result.current.setCurrentPage(7);
      });

      paginated = result.current.getPaginatedItems(participants);
      expect(paginated.paginatedItems).toHaveLength(42); // 342 - (50 * 6)
      expect(paginated.paginatedItems[0].id).toBe(301);
      expect(paginated.paginatedItems[41].id).toBe(342);
    });

    it('handles page validation (doesn\'t break on invalid page)', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      // Try to set page beyond available
      act(() => {
        result.current.setCurrentPage(10); // Only 3 pages exist
      });

      // Should still return empty array or handle gracefully
      const { paginatedItems } = result.current.getPaginatedItems(items);
      expect(paginatedItems).toEqual([]); // No items for page 10
    });

    it('handles zero page (edge case - shouldn\'t normally happen)', () => {
      const { result } = renderHook(() => usePagination({ itemsPerPage: 10 }));
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      // Try to set page 0
      act(() => {
        result.current.setCurrentPage(0);
      });

      const { paginatedItems } = result.current.getPaginatedItems(items);
      expect(paginatedItems).toEqual([]); // (0 - 1) * 10 = -10, slice from -10
    });
  });

  // --- Reset Dependencies ---
  describe('Reset dependencies', () => {
    it('resets to page 1 when dependency changes', () => {
      const { result, rerender } = renderHook(
        ({ searchTerm }: { searchTerm: string }) =>
          usePagination({ itemsPerPage: 10, resetDependencies: [searchTerm] }),
        {
          initialProps: { searchTerm: 'initial' }
        }
      );

      // Navigate to page 3
      act(() => {
        result.current.setCurrentPage(3);
      });

      expect(result.current.currentPage).toBe(3);

      // Change search term (dependency)
      rerender({ searchTerm: 'updated' });

      expect(result.current.currentPage).toBe(1);
    });

    it('resets when one of multiple dependencies changes', () => {
      const { result, rerender } = renderHook(
        ({ search, filter }: { search: string; filter: string }) =>
          usePagination({
            itemsPerPage: 10,
            resetDependencies: [search, filter]
          }),
        {
          initialProps: { search: '', filter: 'all' }
        }
      );

      act(() => {
        result.current.setCurrentPage(5);
      });

      // Change filter
      rerender({ search: '', filter: 'active' });

      expect(result.current.currentPage).toBe(1);
    });

    it('does not reset when unrelated state changes', () => {
      const { result, rerender } = renderHook(
        ({ searchTerm, unrelated }: { searchTerm: string; unrelated: string }) =>
          usePagination({ itemsPerPage: 10, resetDependencies: [searchTerm] }),
        {
          initialProps: { searchTerm: 'test', unrelated: 'value1' }
        }
      );

      act(() => {
        result.current.setCurrentPage(3);
      });

      // Change unrelated prop
      rerender({ searchTerm: 'test', unrelated: 'value2' });

      expect(result.current.currentPage).toBe(3); // Should not reset
    });

    it('handles empty resetDependencies array', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) =>
          usePagination({ itemsPerPage: 10, resetDependencies: [] }),
        {
          initialProps: { value: 'initial' }
        }
      );

      act(() => {
        result.current.setCurrentPage(5);
      });

      rerender({ value: 'changed' });

      expect(result.current.currentPage).toBe(5); // Should not reset
    });
  });
});
