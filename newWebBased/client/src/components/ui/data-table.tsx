import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, FunnelIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import Pagination, { CompactPagination } from './pagination';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    totalItems?: number;
  };
  onSearch?: (query: string) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  sortable = true,
  pagination,
  onSearch,
  onSort,
  actions,
  emptyMessage = 'No data available',
  className = '',
  compact = false
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSort = (key: keyof T) => {
    if (!sortable) return;
    
    const direction = 
      sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    
    setSortConfig({ key, direction });
    
    if (onSort) {
      onSort(key, direction);
    }
  };

  const getSortIcon = (columnKey: keyof T) => {
    if (sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUpIcon className="h-4 w-4" />
    ) : (
      <ArrowDownIcon className="h-4 w-4" />
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with Search and Filters */}
      {searchable && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.table.search')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              <FunnelIcon className="h-5 w-5" />
              {t('common.table.filters')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false && sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && sortable && handleSort(column.key)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    {column.sortable !== false && sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              {actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  className={`${compact ? 'hover:bg-gray-50' : 'hover:bg-blue-50'} transition-colors`}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-6 ${compact ? 'py-2' : 'py-4'} whitespace-nowrap text-sm text-gray-900`}
                    >
                      {column.render ? 
                        column.render(item[column.key], item) : 
                        String(item[column.key] || '-')
                      }
                    </td>
                  ))}
                  {actions && (
                    <td className={`px-6 ${compact ? 'py-2' : 'py-4'} whitespace-nowrap text-right text-sm font-medium`}>
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {pagination.pageSize && pagination.totalItems && (
                <span>
                  {t('common.pagination.showing', {
                    start: Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalItems),
                    end: Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems),
                    total: pagination.totalItems
                  })}
                </span>
              )}
            </div>
            <div>
              {compact ? (
                <CompactPagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={pagination.onPageChange}
                  showPageInfo={false}
                />
              ) : (
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={pagination.onPageChange}
                  className="justify-end"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced status badge component for tables
export function StatusBadge({ 
  status, 
  variant = 'default' 
}: { 
  status: string; 
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' 
}) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`${baseClasses} ${variants[variant]}`}>
      {status}
    </span>
  );
}

// Action button group for table rows
export function ActionButtons({ 
  onEdit, 
  onDelete, 
  onView,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  viewLabel = 'View'
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  viewLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {onView && (
        <button
          onClick={onView}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          {viewLabel}
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          {editLabel}
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900 text-sm font-medium"
        >
          {deleteLabel}
        </button>
      )}
    </div>
  );
}
