import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  HomeIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  Squares2X2Icon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useEvent } from '@/contexts/EventContext';

interface EventManagementTemplateProps {
  title: string;
  children?: React.ReactNode;
  onAdd?: () => void;
  onRefresh?: () => void;
  onExportCSV?: () => void;
  addButtonText?: string;
  showAddButton?: boolean;
  showRefreshButton?: boolean;
  showExportCSV?: boolean;
  description?: string;
  loading?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  filterSection?: React.ReactNode;
  itemCount?: number;
}

export const EventManagementTemplate: React.FC<EventManagementTemplateProps> = ({
  title,
  children,
  onAdd,
  onRefresh,
  onExportCSV,
  addButtonText = 'Create New',
  showAddButton = true,
  showRefreshButton = true,
  showExportCSV = true,
  description,
  loading = false,
  searchTerm,
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
  showFilters,
  onToggleFilters,
  filterSection,
  itemCount
}) => {
  const { t } = useTranslation();
  const { selectedEvent } = useEvent();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            {/* Main Header */}
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <Link 
                  to="/management"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <HomeIcon className="h-4 w-4 mr-2" />
                  {t('navigation.managementCenter')}
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  {description && <p className="text-gray-600 mt-1">{description}</p>}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Filter Toggle */}
                {onToggleFilters && (
                  <button
                    onClick={onToggleFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    {t('common.filter')}
                  </button>
                )}

                {/* CSV Export */}
                {showExportCSV && onExportCSV && (
                  <button
                    onClick={onExportCSV}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export CSV
                  </button>
                )}

                {/* Refresh Button */}
                {showRefreshButton && onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Refresh'
                    )}
                  </button>
                )}
                
                {/* Add Button */}
                {showAddButton && onAdd && (
                  <button
                    onClick={onAdd}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {addButtonText}
                  </button>
                )}
              </div>
            </div>

            {/* View Mode Toggle */}
            {onViewModeChange && (
              <div className="flex justify-between items-center pb-4">
                <div></div>
                <div className="bg-gray-100 rounded-lg p-1 flex">
                  <button
                    onClick={() => onViewModeChange('table')}
                    className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <TableCellsIcon className="h-4 w-4 mr-1.5" />
                    Table
                  </button>
                  <button
                    onClick={() => onViewModeChange('grid')}
                    className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4 mr-1.5" />
                    Grid
                  </button>
                </div>
              </div>
            )}

            {/* Event Context (Blue Section) */}
            {selectedEvent && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Selected Event:</span> {selectedEvent.var_eventname}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Filter Section (includes search) */}
        {showFilters && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
              <button
                onClick={onToggleFilters}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Bar - now inside filters */}
              {onSearchChange && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm || ''}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={`Search ${title.toLowerCase()}...`}
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => onSearchChange('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Additional filter content */}
              {filterSection}
            </div>
          </div>
        )}

        {/* Results Count */}
        {itemCount !== undefined && (
          <div className="mb-4 text-sm text-gray-600">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} found
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {children}
        </div>
      </div>
    </div>
  );
};

// Utility component for unified action buttons
interface UnifiedActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
  editTitle?: string;
  deleteTitle?: string;
}

export const UnifiedActionButtons: React.FC<UnifiedActionButtonsProps> = ({
  onEdit,
  onDelete,
  editTitle = "Edit",
  deleteTitle = "Delete"
}) => (
  <div className="flex space-x-1">
    <button
      onClick={onEdit}
      className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors"
      title={editTitle}
    >
      <PencilIcon className="h-4 w-4" />
    </button>
    <button
      onClick={onDelete}
      className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
      title={deleteTitle}
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  </div>
);
