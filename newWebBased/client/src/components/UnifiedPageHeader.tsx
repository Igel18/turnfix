import { ReactNode, useEffect, useState } from 'react'
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
  XMarkIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { useOptionalEvent } from '../contexts/EventContext'
import LanguageSwitcher from './LanguageSwitcher'
// @ts-ignore - Import build info
import buildInfo from '../build-info.json'
import { apiGet } from '../utils/api'

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
  
  // Help panel functionality
  showHelpPanel?: boolean
  onToggleHelpPanel?: () => void
  hasHelpContent?: boolean
  helpContent?: ReactNode
  helpLabel?: string
  
  // Action buttons (right side)
  onPrint?: () => void
  onExportPDF?: () => void
  onExportCSV?: () => void
  showPrint?: boolean
  showExportPDF?: boolean
  showExportCSV?: boolean
  printLabel?: string
  exportPDFLabel?: string
  exportCSVLabel?: string
  
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
  onClearAllFilters,
  showHelpPanel = false,
  onToggleHelpPanel,
  hasHelpContent = false,
  helpContent,
  helpLabel = "Help & Documentation",
  onPrint,
  onExportPDF,
  onExportCSV,
  showPrint = false,
  showExportPDF = false,
  showExportCSV = false,
  printLabel = "Print",
  exportPDFLabel = "Export PDF",
  exportCSVLabel = "Export CSV",
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
  const eventContext = useOptionalEvent()
  const selectedEvent = eventContext?.selectedEvent ?? null
  const [serverVersion, setServerVersion] = useState<string | null>(null)

  // Fetch server version on mount
  useEffect(() => {
    const fetchServerVersion = async () => {
      try {
        const data = await apiGet('/system/version');
        setServerVersion(data.build?.gitHash || 'unknown');
      } catch (error) {
        console.error('Failed to fetch server version:', error);
        setServerVersion('error');
      }
    };
    fetchServerVersion();
  }, []);

  // Debug logging to track when the header re-renders with updated event data
  useEffect(() => {
    if (selectedEvent) {
      console.log('🏷️ UnifiedPageHeader: Event context updated:', selectedEvent.var_eventname);
    }
  }, [selectedEvent]);

  return (
    <div className="mb-6">
      {/* Main Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              to="/management"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              {t('navigation.managementCenter')}
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
          
          {hasHelpContent && (
            <button
              onClick={onToggleHelpPanel}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
              {helpLabel}
            </button>
          )}
          
          {showPrint && onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              {printLabel}
            </button>
          )}
          
          {showExportCSV && onExportCSV && (
            <button
              onClick={onExportCSV}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {exportCSVLabel}
            </button>
          )}
          
          {showExportPDF && onExportPDF && (
            <button
              onClick={onExportPDF}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {exportPDFLabel}
            </button>
          )}
          
          {customActions}
          
          {/* Version Display - Frontend + Backend */}
          <div className="flex items-center gap-1">
            <div className="flex items-center px-2 py-1.5 text-xs bg-blue-50 rounded-md border border-blue-200" title={`Frontend Build\nHash: ${buildInfo.gitHash}\nBranch: ${buildInfo.gitBranch}\nBuilt: ${buildInfo.buildDate}`}>
              <span className="text-blue-600 font-semibold mr-1">FE:</span>
              <span className="font-mono text-blue-800">{buildInfo.gitHash}</span>
            </div>
            <div className="flex items-center px-2 py-1.5 text-xs bg-green-50 rounded-md border border-green-200" title={serverVersion ? `Backend Build\nHash: ${serverVersion}` : 'Loading backend version...'}>
              <span className="text-green-600 font-semibold mr-1">BE:</span>
              <span className="font-mono text-green-800">{serverVersion || '...'}</span>
            </div>
          </div>
          
          {/* Language Switcher - Always visible */}
          <LanguageSwitcher />
        </div>
      </div>
      </div>

      {/* Action Buttons Row */}
      {(showAdd || showImport || showViewToggle || customBelowActions) && (
        <div className="max-w-7xl mx-auto">
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
        </div>
      )}

      {/* Event Context (only for event management UIs) */}
      {showEventContext && selectedEvent && (
        <div className="max-w-7xl mx-auto">
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Selected Event:</span> {selectedEvent.var_eventname}
          </p>
        </div>
        </div>
      )}

      {/* Filters Section - only render if there are actual filter options or search */}
      {showFilters && (filterOptions.length > 0 || onSearchChange) && (
        <div className="max-w-7xl mx-auto">
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('common.table.filters')}</h3>
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
                  {t('common.search')}
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
                  <option value="">{t('common.all')} {option.label}</option>
                  {option.options?.map((opt, optIndex) => (
                    <option key={`${index}-${opt.value}-${optIndex}`} value={opt.value}>
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
                  {t('common.table.clearAllFilters')}
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Help Panel Section */}
      {showHelpPanel && helpContent && (
        <div className="max-w-7xl mx-auto">
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-blue-900 flex items-center">
              <QuestionMarkCircleIcon className="h-5 w-5 mr-2" />
              {helpLabel}
            </h3>
            <button
              onClick={onToggleHelpPanel}
              className="text-blue-400 hover:text-blue-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="text-blue-800">
            {helpContent}
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
