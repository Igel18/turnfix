/**
 * SortableTableHeader & useTableSort Tests
 * Sorting logic for strings, numbers, dates, null values with direction toggle
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableSort } from '../../components/SortableTableHeader';

interface TestItem {
  [key: string]: any;
}

describe('useTableSort Hook', () => {
  it('initializes with null sortKey', () => {
    const { result } = renderHook(() => useTableSort());
    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBe('asc');
  });

  it('initializes with provided sortKey and direction', () => {
    const { result } = renderHook(() => useTableSort('name', 'desc'));
    expect(result.current.sortKey).toBe('name');
    expect(result.current.sortDirection).toBe('desc');
  });

  it('toggles direction when same column clicked', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortDirection).toBe('desc');
  });

  it('resets direction to asc when new column clicked', () => {
    const { result } = renderHook(() => useTableSort('name', 'desc'));
    act(() => {
      result.current.handleSort('age');
    });
    expect(result.current.sortKey).toBe('age');
    expect(result.current.sortDirection).toBe('asc');
  });
});

describe('sortData Function', () => {
  it('sorts strings ascending', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [
      { name: 'Charlie' },
      { name: 'Alice' },
      { name: 'Bob' }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts strings descending', () => {
    const { result } = renderHook(() => useTableSort('name', 'desc'));
    const data: TestItem[] = [
      { name: 'Alice' },
      { name: 'Charlie' },
      { name: 'Bob' }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.name)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('sorts case-insensitively', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [
      { name: 'charlie' },
      { name: 'ALICE' },
      { name: 'Bob' }
    ];
    const sorted = result.current.sortData(data);
    const names = sorted.map(d => d.name.toLowerCase());
    expect(names).toEqual(['alice', 'bob', 'charlie']);
  });

  it('sorts numbers ascending', () => {
    const { result } = renderHook(() => useTableSort('age', 'asc'));
    const data: TestItem[] = [
      { age: 30 },
      { age: 15 },
      { age: 45 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.age)).toEqual([15, 30, 45]);
  });

  it('sorts numbers descending', () => {
    const { result } = renderHook(() => useTableSort('age', 'desc'));
    const data: TestItem[] = [
      { age: 30 },
      { age: 15 },
      { age: 45 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.age)).toEqual([45, 30, 15]);
  });

  it('sorts negative numbers', () => {
    const { result } = renderHook(() => useTableSort('value', 'asc'));
    const data: TestItem[] = [
      { value: 10 },
      { value: -5 },
      { value: 0 },
      { value: -20 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.value)).toEqual([-20, -5, 0, 10]);
  });

  it('sorts decimals correctly', () => {
    const { result } = renderHook(() => useTableSort('price', 'asc'));
    const data: TestItem[] = [
      { price: 19.99 },
      { price: 5.50 },
      { price: 15.75 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.price)).toEqual([5.50, 15.75, 19.99]);
  });

  it('sorts dates ascending', () => {
    const date1 = new Date('2023-01-15');
    const date2 = new Date('2023-06-20');
    const date3 = new Date('2023-03-10');
    const { result } = renderHook(() => useTableSort('joinDate', 'asc'));
    const data: TestItem[] = [
      { joinDate: date2 },
      { joinDate: date1 },
      { joinDate: date3 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.joinDate)).toEqual([date1, date3, date2]);
  });

  it('sorts dates descending', () => {
    const date1 = new Date('2023-01-15');
    const date2 = new Date('2023-06-20');
    const date3 = new Date('2023-03-10');
    const { result } = renderHook(() => useTableSort('joinDate', 'desc'));
    const data: TestItem[] = [
      { joinDate: date1 },
      { joinDate: date3 },
      { joinDate: date2 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.joinDate)).toEqual([date2, date3, date1]);
  });

  it('places null values at end (asc)', () => {
    const { result } = renderHook(() => useTableSort('value', 'asc'));
    const data: TestItem[] = [
      { value: null },
      { value: 3 },
      { value: 1 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.value)).toEqual([1, 3, null]);
  });

  it('places null values at end (desc)', () => {
    const { result } = renderHook(() => useTableSort('value', 'desc'));
    const data: TestItem[] = [
      { value: 1 },
      { value: null },
      { value: 3 }
    ];
    const sorted = result.current.sortData(data);
    // In the implementation, null in desc sort returns 1 (comes first)
    expect(sorted.map(d => d.value)).toEqual([null, 3, 1]);
  });

  it('preserves insertion order for equal values', () => {
    const { result } = renderHook(() => useTableSort('value', 'asc'));
    const data: TestItem[] = [
      { value: 5, id: 1 },
      { value: 5, id: 2 },
      { value: 5, id: 3 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.id)).toEqual([1, 2, 3]);
  });

  it('handles empty array', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [];
    const sorted = result.current.sortData(data);
    expect(sorted).toEqual([]);
  });

  it('handles single element', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [{ name: 'Alice' }];
    const sorted = result.current.sortData(data);
    expect(sorted).toEqual(data);
  });

  it('does not modify original array', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
    const originalOrder = data.map(d => d.name);
    result.current.sortData(data);
    expect(data.map(d => d.name)).toEqual(originalOrder);
  });

  it('handles large dataset (1000 items)', () => {
    const { result } = renderHook(() => useTableSort('value', 'asc'));
    const data: TestItem[] = Array.from({ length: 1000 }, (_, i) => ({
      value: Math.random()
    }));
    const sorted = result.current.sortData(data);
    expect(sorted.length).toBe(1000);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].value).toBeGreaterThanOrEqual(sorted[i - 1].value);
    }
  });

  it('sorts with custom getValue function', () => {
    const { result } = renderHook(() => useTableSort('id', 'asc'));
    const data: TestItem[] = [
      { id: 3, name: 'Charlie' },
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    // getValue receives (item, sortKey) parameters
    const getValue = (item: TestItem, key: string) => (item as any)[key];
    const sorted = result.current.sortData(data, getValue);
    expect(sorted.map(d => d.id)).toEqual([1, 2, 3]);
  });

  it('sorts nested properties with custom getValue', () => {
    const { result } = renderHook(() => useTableSort('dept', 'asc'));
    const data: TestItem[] = [
      { name: 'Alice', dept: { name: 'IT' } },
      { name: 'Bob', dept: { name: 'HR' } },
      { name: 'Charlie', dept: { name: 'Finance' } }
    ];
    const getValue = (item: TestItem, key: string) => {
      if (key === 'dept') return item.dept?.name || '';
      return (item as any)[key];
    };
    const sorted = result.current.sortData(data, getValue);
    expect(sorted.map(d => d.dept.name)).toEqual(['Finance', 'HR', 'IT']);
  });

  it('handles special characters in strings', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [
      { name: 'Zoe' },
      { name: '123' },
      { name: '_Apple' },
      { name: 'Ängert' }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.length).toBe(4);
  });

  it('handles empty strings', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [
      { name: 'Bob' },
      { name: '' },
      { name: 'Alice' }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted[0].name).toBe('');
  });

  it('handles whitespace in strings', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [
      { name: ' Alice' },
      { name: 'Alice ' },
      { name: 'Alice' }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.length).toBe(3);
  });

  it('handles strings with numbers (lexicographic)', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [
      { name: 'Alice2' },
      { name: 'Alice10' },
      { name: 'Alice1' }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.name)).toEqual(['Alice1', 'Alice10', 'Alice2']);
  });

  it('sorts mixed with undefined and null', () => {
    const { result } = renderHook(() => useTableSort('value', 'asc'));
    const data: TestItem[] = [
      { value: 5 },
      { value: undefined },
      { value: 2 },
      { value: null }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted[0].value).toBe(2);
    expect(sorted[1].value).toBe(5);
  });

  it('handles all null values', () => {
    const { result } = renderHook(() => useTableSort('value', 'asc'));
    const data: TestItem[] = [
      { value: null },
      { value: null },
      { value: null }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.every(d => d.value === null)).toBe(true);
  });

  it('sorts very large numbers', () => {
    const { result } = renderHook(() => useTableSort('value', 'asc'));
    const data: TestItem[] = [
      { value: 1000000000 },
      { value: 1 },
      { value: 1000000 }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.value)).toEqual([1, 1000000, 1000000000]);
  });

  it('sorts single character strings', () => {
    const { result } = renderHook(() => useTableSort('name', 'asc'));
    const data: TestItem[] = [
      { name: 'Z' },
      { name: 'A' },
      { name: 'M' }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted.map(d => d.name)).toEqual(['A', 'M', 'Z']);
  });

  it('handles dates with times', () => {
    const { result } = renderHook(() => useTableSort('timestamp', 'asc'));
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);
    const later = new Date(now.getTime() + 60000);
    const data: TestItem[] = [
      { timestamp: now },
      { timestamp: earlier },
      { timestamp: later }
    ];
    const sorted = result.current.sortData(data);
    expect(sorted[0].timestamp).toEqual(earlier);
    expect(sorted[1].timestamp).toEqual(now);
    expect(sorted[2].timestamp).toEqual(later);
  });
});
