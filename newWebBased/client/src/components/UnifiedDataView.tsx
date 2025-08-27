import { ReactNode } from 'react'
import { 
  ArrowLeftIcon,
  EyeIcon,
  TableCellsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'

interface ViewTab {
  id: string
  label: string
  icon: React.ComponentType<any>
  count?: number
}

interface DataItem {
  [key: string]: any
}

interface ActionButton {
  icon: React.ComponentType<any>
  onClick: (item: DataItem) => void
  className?: string
  title?: string
}

interface UnifiedDataViewProps {
  // Data and state
  items: DataItem[]
  selectedItem: DataItem | null
  isLoading: boolean
  
  // View configuration
  viewType: 'table' | 'cards'
  onViewTypeChange: (type: 'table' | 'cards') => void
  
  // Selection and navigation
  onSelectItem: (item: DataItem | null) => void
  
  // Card rendering
  renderCard?: (item: DataItem) => ReactNode
  
  // Table configuration
  tableHeaders?: string[]
  renderTableRow?: (item: DataItem) => ReactNode
  
  // Detail view configuration
  selectedItemTabs?: ViewTab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  renderTabContent?: (tabId: string, item: DataItem) => ReactNode
  
  // Detail view stats
  renderDetailStats?: (item: DataItem) => ReactNode
  
  // Actions
  actionButtons?: ActionButton[]
  
  // Pagination
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  
  // Loading states
  emptyStateIcon?: React.ComponentType<any>
  emptyStateTitle?: string
  emptyStateDescription?: string
}

export function UnifiedDataView({
  items,
  selectedItem,
  isLoading,
  viewType,
  onViewTypeChange,
  onSelectItem,
  renderCard,
  tableHeaders,
  renderTableRow,
  selectedItemTabs,
  activeTab,
  onTabChange,
  renderTabContent,
  renderDetailStats,
  actionButtons = [],
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  emptyStateIcon: EmptyIcon,
  emptyStateTitle = "No items found",
  emptyStateDescription = "Try adjusting your search or filter criteria"
}: UnifiedDataViewProps) {
  
  if (selectedItem) {
    // Detail View
    return (
      <div className="space-y-6">
        {/* Back button */}
        <div className="flex items-center">
          <button
            onClick={() => onSelectItem(null)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to List
          </button>
        </div>

        {/* Detail Stats */}
        {renderDetailStats && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {renderDetailStats(selectedItem)}
          </div>
        )}

        {/* Tab Navigation */}
        {selectedItemTabs && selectedItemTabs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="flex space-x-1 p-1">
              {selectedItemTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-4 w-4 inline mr-2" />
                  {tab.label}
                  {tab.count !== undefined && ` (${tab.count})`}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab && renderTabContent?.(activeTab, selectedItem)}
            </div>
          </div>
        )}
      </div>
    )
  }

  // List View
  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => onViewTypeChange('cards')}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewType === 'cards'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4 mr-1" />
            Cards
          </button>
          <button
            onClick={() => onViewTypeChange('table')}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewType === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TableCellsIcon className="h-4 w-4 mr-1" />
            Table
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            {EmptyIcon && <EmptyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
            <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyStateTitle}</h3>
            <p className="text-gray-600">{emptyStateDescription}</p>
          </div>
        ) : viewType === 'cards' ? (
          // Cards View
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg hover:shadow-md transition-shadow">
                  <div className="p-4">
                    {renderCard ? renderCard(item) : (
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.name || item.var_name || 'Unnamed Item'}
                            </h3>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => onSelectItem(item)}
                              className="text-green-600 hover:text-green-800"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {actionButtons.map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => action.onClick(item)}
                                className={action.className || "text-blue-600 hover:text-blue-800"}
                                title={action.title}
                              >
                                <action.icon className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Table View
          <div className="overflow-x-auto">
            <table className="w-full">
              {tableHeaders && (
                <thead className="bg-gray-50">
                  <tr>
                    {tableHeaders.map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {renderTableRow ? renderTableRow(item) : (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {item.name || item.var_name || 'Unnamed Item'}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onSelectItem(item)}
                          className="text-green-600 hover:text-green-800"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {actionButtons.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => action.onClick(item)}
                            className={action.className || "text-blue-600 hover:text-blue-800"}
                            title={action.title}
                          >
                            <action.icon className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Smart Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex justify-center mt-6">
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            {/* Smart Pagination: show first, last, current, and nearby pages with ellipsis */}
            {(() => {
              const pages = [];
              const startPage = Math.max(1, currentPage - 2);
              const endPage = Math.min(totalPages, currentPage + 2);

              // Always show first page
              if (startPage > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => onPageChange(1)}
                    className={`px-3 py-2 border rounded-lg ${1 === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    1
                  </button>
                );
                if (startPage > 2) {
                  pages.push(<span key="start-ellipsis" className="px-2">...</span>);
                }
              }

              // Show pages around current
              for (let page = startPage; page <= endPage; page++) {
                pages.push(
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-2 border rounded-lg ${page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                );
              }

              // Always show last page
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<span key="end-ellipsis" className="px-2">...</span>);
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => onPageChange(totalPages)}
                    className={`px-3 py-2 border rounded-lg ${totalPages === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    {totalPages}
                  </button>
                );
              }
              return pages;
            })()}
            
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnifiedDataView
