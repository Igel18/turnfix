import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

interface SortableTableHeaderProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string | null;
  currentSortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
  sortable?: boolean;
}

/**
 * Sortable Table Header Component
 * 
 * A reusable header cell component that provides click-to-sort functionality
 * with visual indicators for ascending/descending sort states.
 * 
 * @param label - The text to display in the header
 * @param sortKey - The key to use for sorting (if undefined, header is not sortable)
 * @param currentSortKey - The currently active sort key
 * @param currentSortDirection - The current sort direction ('asc' | 'desc')
 * @param onSort - Callback function when header is clicked
 * @param className - Additional CSS classes
 * @param sortable - Whether this header is sortable (default: true if sortKey is provided)
 */
export function SortableTableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className = '',
  sortable = true
}: SortableTableHeaderProps) {
  const isSortable = sortable && sortKey && onSort;
  const isActive = currentSortKey === sortKey;

  const handleClick = () => {
    if (isSortable && sortKey) {
      onSort(sortKey);
    }
  };

  const baseClasses = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const interactiveClasses = isSortable
    ? 'cursor-pointer hover:bg-gray-100 select-none transition-colors'
    : '';

  return (
    <th
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={handleClick}
      title={isSortable ? `Click to sort by ${label}` : undefined}
    >
      <div className="flex items-center justify-between group">
        <span>{label}</span>
        {isSortable && (
          <span className="ml-2 flex-shrink-0">
            {isActive ? (
              currentSortDirection === 'asc' ? (
                <ArrowUpIcon className="h-4 w-4 text-blue-600" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-blue-600" />
              )
            ) : (
              <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

/**
 * Hook for managing table sorting state
 * 
 * @param initialSortKey - The initial sort key
 * @param initialDirection - The initial sort direction
 * @returns Object with sortKey, sortDirection, and handleSort function
 */
export function useTableSort<T = any>(
  initialSortKey: string | null = null,
  initialDirection: 'asc' | 'desc' = 'asc'
) {
  const [sortKey, setSortKey] = React.useState<string | null>(initialSortKey);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(initialDirection);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Toggle direction if same key
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New key, default to ascending
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  /**
   * Sort an array of items based on current sort state
   */
  const sortData = (data: T[], getValueFn?: (item: T, key: string) => any): T[] => {
    if (!sortKey || !data) return data;

    return [...data].sort((a, b) => {
      const aValue = getValueFn ? getValueFn(a, sortKey) : (a as any)[sortKey];
      const bValue = getValueFn ? getValueFn(b, sortKey) : (b as any)[sortKey];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Handle strings (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Default: convert to string and compare
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  return {
    sortKey,
    sortDirection,
    handleSort,
    sortData
  };
}

export default SortableTableHeader;
