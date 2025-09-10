import { useState, useEffect } from 'react';

interface UsePaginationProps {
  itemsPerPage?: number;
  resetDependencies?: any[];
}

interface UsePaginationReturn {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  getPaginatedItems: <T>(items: T[]) => {
    paginatedItems: T[];
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
  };
}

/**
 * Custom hook for pagination logic
 * 
 * @param itemsPerPage Number of items per page (default: 50)
 * @param resetDependencies Array of dependencies that should reset page to 1 when changed
 * @returns Pagination state and utility functions
 */
export const usePagination = ({ 
  itemsPerPage = 50, 
  resetDependencies = [] 
}: UsePaginationProps = {}): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when dependencies change (e.g., filters, search)
  useEffect(() => {
    setCurrentPage(1);
  }, resetDependencies);

  const getPaginatedItems = <T,>(items: T[]) => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      paginatedItems,
      totalPages,
      totalItems,
      startIndex,
      endIndex
    };
  };

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    getPaginatedItems
  };
};

export default usePagination;
