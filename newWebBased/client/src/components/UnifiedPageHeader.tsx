import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  HomeIcon,
  FunnelIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  Squares2X2Icon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useEvent } from '../contexts/EventContext'
import LanguageSwitcher from './LanguageSwitcher'

interface FilterOption {
  value: string
  label: string
  count?: number
  options?: { value: string; label: string }[]
  selectedValue?: string
  onChange?: (value: string) => void
}

interface UnifiedPageHeaderProps {
  title: string
  subtitle: string
  icon?: React.ComponentType<{ className?: string }> // Icon component to display next to title
  
  // Search functionality
  searchTerm?: string
  onSearchChange?: (term: string) => void
  searchPlaceholder?: string
  
  // Filter functionality
  showFilters?: boolean
  onToggleFilters?: () => void
  hasFilters?: boolean
  filterOptions?: FilterOption[]
  selectedFilters?: string[]
  onFilterChange?: (filterType: string, value: string) => void
  onClearAllFilters?: () => void
  
  // Action buttons (right side)
  onPrint?: () => void
  onExportPDF?: () => void
  onExportCSV?: () => void
  showPrint?: boolean
  showExportPDF?: boolean
  showExportCSV?: boolean
  
  // Action buttons (below main header)
  onAdd?: () => void
  onImport?: () => void
  addLabel?: string
  importLabel?: string
  showAdd?: boolean
  showImport?: boolean
  
  // View toggle
  viewMode?: 'table' | 'grid'
  onViewModeChange?: (mode: 'table' | 'grid') => void
  showViewToggle?: boolean
  
  // Event context
  showEventContext?: boolean
  
  // Custom actions
  customActions?: ReactNode
  customBelowActions?: ReactNode
  
  // Total count for display
  totalCount?: number
}

export default function UnifiedPageHeader({
  title,
  subtitle,
  icon: IconComponent,
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showFilters = false,
  onToggleFilters,
  hasFilters = false,
  filterOptions = [],
  selectedFilters = [],
  onFilterChange,
  onClearAllFilters,
  onPrint,
  onExportPDF,
  onExportCSV,
  showPrint = false,
  showExportPDF = false,
  showExportCSV = false,
  onAdd,
  onImport,
  addLabel = "Add New",
  importLabel = "Import",
  showAdd = false,
  showImport = false,
  viewMode = 'table',
  onViewModeChange,
  showViewToggle = false,
  showEventContext = false,
  customActions,
  customBelowActions
}: UnifiedPageHeaderProps) {
  const { t } = useTranslation()
  const { selectedEvent } = useEvent()

  return (
    <div className="mb-6">
      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/dashboard"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            {t('navigation.dashboard')}
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              {IconComponent && (
                <div className="flex-shrink-0">
                  <IconComponent className="h-8 w-8 text-gray-600" />
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            </div>
            <p className="text-gray-600 mt-1">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasFilters && (
            <button
              onClick={onToggleFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              {t('common.filter')}
            </button>
          )}
          
          {showPrint && onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
          )}
          
          {showExportCSV && onExportCSV && (
            <button
              onClick={onExportCSV}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          )}
          
          {showExportPDF && onExportPDF && (
            <button
              onClick={onExportPDF}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          )}
          
          {customActions}
          
          {/* Language Switcher - Always visible */}
          <LanguageSwitcher />
        </div>
      </div>

      {/* Action Buttons Row */}
      {(showAdd || showImport || showViewToggle || customBelowActions) && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {showAdd && onAdd && (
              <button
                onClick={onAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {addLabel}
              </button>
            )}
            
            {showImport && onImport && (
              <button
                onClick={onImport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                {importLabel}
              </button>
            )}
            
            {customBelowActions}
          </div>
          
          {showViewToggle && onViewModeChange && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
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
          )}
        </div>
      )}

      {/* Event Context (only for event management UIs) */}
      {showEventContext && selectedEvent && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Selected Event:</span> {selectedEvent.var_eventname}
          </p>
        </div>
      )}

      {/* Filters Section */}
      {showFilters && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
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
            {/* Search Bar */}
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
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
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
            
            {filterOptions.map((option, index) => (
              <div key={option.value || option.label || index}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {option.label}
                </label>
                <select
                  value={option.selectedValue || ''}
                  onChange={(e) => option.onChange && option.onChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All {option.label}</option>
                  {option.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            
            <div className="flex items-end">
              {onClearAllFilters && (
                <button
                  onClick={onClearAllFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
