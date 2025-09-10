import React, { ReactNode } from 'react';
import UnifiedPageHeader from './UnifiedPageHeader';
import { SmartPagination } from './SmartPagination';
import { usePagination } from '../hooks/usePagination';
import useViewToggle from '../hooks/useViewToggle';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  options?: { value: string; label: string }[];
  selectedValue?: string;
  onChange?: (value: string) => void;
}

interface DatabaseManagementTemplateProps {
  // Page identification
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  
  // Data and loading
  data: any[];
  isLoading: boolean;
  error?: string | null;
  
  // Search and filtering
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder?: string;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  filterOptions?: FilterOption[];
  onClearAllFilters?: () => void;
  
  // Pagination
  itemsPerPage?: number;
  
  // View toggle
  viewStorageKey: string; // Key for localStorage to persist view preference
  defaultView?: 'table' | 'cards';
  
  // Actions
  onAdd?: () => void;
  addLabel?: string;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  
  // Export functions
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  
  // Custom content rendering
  renderTableHeaders?: () => ReactNode;
  renderTableRow?: (item: any, index: number) => ReactNode;
  renderCard?: (item: any, index: number) => ReactNode;
  renderEmptyState?: () => ReactNode;
  
  // Additional content
  additionalContent?: ReactNode; // Any extra content below the header
  children?: ReactNode; // Custom content (overrides default table/cards if provided)
}

/**
 * Unified template for all Database Management pages
 * Provides consistent header, pagination, view toggle, and basic CRUD operations
 */
export const DatabaseManagementTemplate: React.FC<DatabaseManagementTemplateProps> = ({
  title,
  subtitle,
  icon,
  data,
  isLoading,
  error,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  showFilters = false,
  onToggleFilters,
  filterOptions = [],
  onClearAllFilters,
  itemsPerPage = 10,
  viewStorageKey,
  defaultView = 'table',
  onAdd,
  addLabel = "Add New",
  onEdit,
  onDelete,
  onView,
  onExportCSV,
  onExportPDF,
  renderTableHeaders,
  renderTableRow,
  renderCard,
  renderEmptyState,
  additionalContent,
  children
}) => {
  // View toggle with persistence
  const { viewType, handleViewTypeChange } = useViewToggle({ 
    key: viewStorageKey, 
    defaultView 
  });

  // Filter state management
  const [showFiltersState, setShowFiltersState] = React.useState(showFilters);
  const handleToggleFilters = () => {
    const newState = !showFiltersState;
    console.log('Filter toggle clicked:', newState);
    setShowFiltersState(newState);
    if (onToggleFilters) {
      onToggleFilters();
    }
  };

  // Pagination with smart logic
  const { currentPage, setCurrentPage, getPaginatedItems } = usePagination({
    itemsPerPage,
    resetDependencies: [searchTerm, showFiltersState]
  });

  // Get paginated data
  const {
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex
  } = getPaginatedItems(data);

  // Default empty state
  const defaultEmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400">
        {React.createElement(icon, { className: "h-12 w-12" })}
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No {title.toLowerCase()}</h3>
      <p className="mt-1 text-sm text-gray-500">
        Get started by creating a new {title.toLowerCase().slice(0, -1)}.
      </p>
      {onAdd && (
        <div className="mt-6">
          <button
            onClick={onAdd}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            {addLabel}
          </button>
        </div>
      )}
    </div>
  );

  // Default table structure
  const defaultTable = () => (
    <div className="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          {renderTableHeaders ? renderTableHeaders() : (
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          )}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedItems.map((item, index) => 
            renderTableRow ? (
              <React.Fragment key={item.id || item.int_sportid || item.int_disciplineid || index}>
                {renderTableRow(item, startIndex + index)}
              </React.Fragment>
            ) : (
              <tr key={item.id || item.int_sportid || item.int_disciplineid || index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.name || item.var_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    {onView && (
                      <button
                        onClick={() => onView(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );

  // Default cards structure
  const defaultCards = () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {paginatedItems.map((item, index) => 
        renderCard ? (
          <React.Fragment key={item.id || item.int_sportid || item.int_disciplineid || index}>
            {renderCard(item, startIndex + index)}
          </React.Fragment>
        ) : (
          <div key={item.id || item.int_sportid || item.int_disciplineid || index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {item.name || item.var_name || 'N/A'}
              </h3>
              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  {onView && (
                    <button
                      onClick={() => onView(item)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      View
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-yellow-600 hover:text-yellow-900 text-sm"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Unified Header */}
      <UnifiedPageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        showFilters={showFiltersState}
        onToggleFilters={handleToggleFilters}
        hasFilters={filterOptions.length > 0}
        filterOptions={filterOptions}
        onClearAllFilters={onClearAllFilters}
        showAdd={!!onAdd}
        addLabel={addLabel}
        onAdd={onAdd}
        showExportCSV={!!onExportCSV}
        onExportCSV={onExportCSV}
        showExportPDF={!!onExportPDF}
        onExportPDF={onExportPDF}
        showViewToggle={!children} // Only show view toggle if not using custom children
        viewMode={viewType === 'table' ? 'table' : 'grid'}
        onViewModeChange={(mode) => handleViewTypeChange(mode === 'table' ? 'table' : 'cards')}
        showEventContext={false} // Database management doesn't need event context
      />

      {/* Additional Content */}
      {additionalContent}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Custom Children or Default Content */}
            {children ? (
              children
            ) : totalItems === 0 ? (
              renderEmptyState ? renderEmptyState() : defaultEmptyState()
            ) : (
              <>
                {/* Results Summary */}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                  </p>
                </div>

                {/* Data Display */}
                {viewType === 'table' ? defaultTable() : defaultCards()}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <SmartPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DatabaseManagementTemplate;
