import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import useViewToggle from '@/hooks/useViewToggle';
import UnifiedPageHeader from '../UnifiedPageHeader';

interface EventManagementTemplateProps {
  title: string;
  subtitle?: string; // Optional subtitle
  icon?: React.ComponentType<{ className?: string }>; // Icon component
  children?: React.ReactNode | ((viewMode: 'table' | 'grid') => React.ReactNode);
  description?: string;
  loading?: boolean;
  
  // Search functionality
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filter functionality
  showFilters?: boolean;
  onToggleFilters?: () => void;
  filterSection?: React.ReactNode;
  
  // Help panel functionality
  showHelpPanel?: boolean;
  onToggleHelpPanel?: () => void;
  helpContent?: React.ReactNode;
  helpLabel?: string;
  
  // Action buttons (right side - exports & print)
  onPrint?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  showPrint?: boolean;
  showExportPDF?: boolean;
  showExportCSV?: boolean;
  printLabel?: string;
  exportPDFLabel?: string;
  exportCSVLabel?: string;
  
  // Action buttons (below header - add & import)
  onAdd?: () => void;
  onImport?: () => void;
  onRefresh?: () => void;
  addButtonText?: string;
  importLabel?: string;
  showAddButton?: boolean;
  showImportButton?: boolean;
  showRefreshButton?: boolean;
  
  // View mode - supports persistence
  viewMode?: 'table' | 'grid';  // DEPRECATED: Use viewStorageKey + defaultView instead
  onViewModeChange?: (mode: 'table' | 'grid') => void;  // DEPRECATED
  viewStorageKey?: string;  // Key for localStorage persistence
  defaultView?: 'table' | 'grid';  // Default view (defaults to 'table')
  showViewToggle?: boolean;  // NEW: Make view toggle optional (default true)
  
  // Event context
  showEventContext?: boolean;  // NEW: Make event badge optional (default true)
  
  // Custom actions
  customActions?: React.ReactNode;  // Custom buttons in top-right action area
  customBelowActions?: React.ReactNode;  // Custom buttons below header
  
  // Item count display
  itemCount?: number;
  totalCount?: number;  // Alternative to itemCount for consistency with UnifiedPageHeader
}

export const EventManagementTemplate: React.FC<EventManagementTemplateProps> = ({
  title,
  subtitle,
  icon: IconComponent,
  children,
  description,
  loading = false,
  
  // Search
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  
  // Filters
  showFilters,
  onToggleFilters,
  filterSection,
  
  // Help panel
  showHelpPanel,
  onToggleHelpPanel,
  helpContent,
  helpLabel,
  
  // Export & Print actions
  onPrint,
  onExportPDF,
  onExportCSV,
  showPrint = false,
  showExportPDF = false,
  showExportCSV = false,
  printLabel,
  exportPDFLabel,
  exportCSVLabel,
  
  // Add, Import, Refresh actions
  onAdd,
  onImport,
  onRefresh,
  addButtonText = 'Create New',
  importLabel,
  showAddButton = false,
  showImportButton = false,
  showRefreshButton = false,
  
  // View mode
  viewMode: legacyViewMode,
  onViewModeChange: legacyOnViewModeChange,
  viewStorageKey,
  defaultView = 'table',
  showViewToggle = true,
  
  // Event context
  showEventContext = true,
  
  // Custom actions
  customActions,
  customBelowActions,
  
  // Item count (support both names)
  itemCount,
  totalCount
}) => {
  const { t } = useTranslation();
  
  // Use totalCount if provided, otherwise itemCount
  const displayCount = totalCount !== undefined ? totalCount : itemCount;
  
  // View toggle with persistence (if viewStorageKey provided)
  const { viewType: persistedViewType, handleViewTypeChange: handlePersistedViewChange } = useViewToggle({
    key: viewStorageKey || 'event-management-view-fallback',
    defaultView: defaultView === 'grid' ? 'cards' : 'table'
  });
  
  // Determine which view system to use (new persistence or legacy controlled)
  const isUsingPersistence = !!viewStorageKey;
  const currentViewMode: 'table' | 'grid' = isUsingPersistence 
    ? (persistedViewType === 'table' ? 'table' : 'grid')
    : (legacyViewMode || 'grid');
  
  const handleViewChange = (mode: 'table' | 'grid') => {
    if (isUsingPersistence) {
      // Use new persistence system
      handlePersistedViewChange(mode === 'table' ? 'table' : 'cards');
    } else if (legacyOnViewModeChange) {
      // Use legacy controlled mode
      legacyOnViewModeChange(mode);
    }
  };

  return (
    <>
      {/* Use UnifiedPageHeader for all header functionality */}
      <UnifiedPageHeader
        title={title}
        subtitle={subtitle || description || ''}
        icon={IconComponent}
        
        // Search (only if no filterSection - otherwise search is inside filterSection)
        searchTerm={filterSection ? undefined : searchTerm}
        onSearchChange={filterSection ? undefined : onSearchChange}
        searchPlaceholder={filterSection ? undefined : searchPlaceholder}
        
        // Filters
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        hasFilters={!!filterSection}
        
        // Help
        showHelpPanel={showHelpPanel}
        onToggleHelpPanel={onToggleHelpPanel}
        hasHelpContent={!!helpContent}
        helpContent={helpContent}
        helpLabel={helpLabel}
        
        // Export & Print
        onPrint={onPrint}
        onExportPDF={onExportPDF}
        onExportCSV={onExportCSV}
        showPrint={showPrint}
        showExportPDF={showExportPDF}
        showExportCSV={showExportCSV}
        printLabel={printLabel}
        exportPDFLabel={exportPDFLabel}
        exportCSVLabel={exportCSVLabel}
        
        // Add & Import (below header)
        onAdd={onAdd}
        onImport={onImport}
        addLabel={addButtonText}
        importLabel={importLabel}
        showAdd={showAddButton}
        showImport={showImportButton}
        
        // View toggle
        viewMode={currentViewMode}
        onViewModeChange={handleViewChange}
        showViewToggle={showViewToggle && (isUsingPersistence || !!legacyOnViewModeChange)}
        
        // Event context
        showEventContext={showEventContext}
        
        // Custom actions
        customActions={
          <>
            {customActions}
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
                  t('common.refresh')
                )}
              </button>
            )}
          </>
        }
        customBelowActions={customBelowActions}
        
        // Total count
        totalCount={displayCount}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Custom Filter Section (if provided and visible) */}
        {showFilters && filterSection && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filter</h3>
              <button
                onClick={onToggleFilters}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {filterSection}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {typeof children === 'function' ? children(currentViewMode) : children}
        </div>
      </div>
    </>
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
