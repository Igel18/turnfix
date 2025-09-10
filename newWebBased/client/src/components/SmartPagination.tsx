import React from 'react';

interface SmartPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Smart Pagination Component
 * Features:
 * - Shows first page, last page, current page, and nearby pages
 * - Uses ellipsis (...) for gaps
 * - Previous/Next navigation
 * - Disabled states for edge cases
 * - Responsive design
 */
export const SmartPagination: React.FC<SmartPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  if (totalPages <= 1) {
    return null; // Don't show pagination for single page
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    // Always show first page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className={`px-3 py-2 border rounded-lg transition-colors ${
            1 === currentPage 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'hover:bg-gray-50 border-gray-300'
          }`}
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="start-ellipsis" className="px-2 py-2 text-gray-500">
            ...
          </span>
        );
      }
    }

    // Show pages around current
    for (let page = startPage; page <= endPage; page++) {
      pages.push(
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 border rounded-lg transition-colors ${
            page === currentPage 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'hover:bg-gray-50 border-gray-300'
          }`}
        >
          {page}
        </button>
      );
    }

    // Always show last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="end-ellipsis" className="px-2 py-2 text-gray-500">
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`px-3 py-2 border rounded-lg transition-colors ${
            totalPages === currentPage 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'hover:bg-gray-50 border-gray-300'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className={`flex justify-center mt-6 ${className}`}>
      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        
        {/* Page Numbers */}
        {renderPageNumbers()}
        
        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SmartPagination;
