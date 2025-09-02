import React from 'react'
import { Link } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import ViewToggle, { type ViewType } from './ViewToggle'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface StateInfo {
  value: string
  label: string
  count: number
  color: string
}

interface UnifiedHeaderProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  
  // State information
  stateInfo?: StateInfo[]
  selectedState?: string
  onStateChange?: (state: string) => void
  
  // Search and filters
  searchTerm: string
  onSearchChange: (term: string) => void
  searchPlaceholder?: string
  
  // Filter options
  filterOptions?: {
    label: string
    value: string
    options: FilterOption[]
    selectedValue: string
    onChange: (value: string) => void
  }[]
  
  // Actions
  onClearAllFilters: () => void
  onExportCSV: () => void
  
  // Additional actions
  primaryAction?: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
  }
  
  // Home button
  showHomeButton?: boolean
  homeUrl?: string
  
  // View toggle
  showViewToggle?: boolean
  viewType?: ViewType
  onViewTypeChange?: (viewType: ViewType) => void
  
  // Results info
  totalCount?: number
  filteredCount?: number
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  title,
  description,
  icon: Icon,
  stateInfo = [],
  selectedState = '',
  onStateChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  onClearAllFilters,
  onExportCSV,
  primaryAction,
  secondaryAction,
  showHomeButton = false,
  homeUrl = '/dashboard',
  showViewToggle = false,
  viewType = 'table',
  onViewTypeChange,
  totalCount,
  filteredCount
}) => {
  const hasActiveFilters = searchTerm || filterOptions.some(filter => filter.selectedValue) || selectedState

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Icon className="h-8 w-8 mr-3 text-blue-600" />
            {title}
          </h1>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {showHomeButton && (
            <Link
              to={homeUrl}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              <span>Home</span>
            </Link>
          )}
          {showViewToggle && onViewTypeChange && (
            <ViewToggle 
              viewType={viewType}
              onViewTypeChange={onViewTypeChange}
              size="md"
            />
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <secondaryAction.icon className="h-5 w-5" />
              <span>{secondaryAction.label}</span>
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <primaryAction.icon className="h-5 w-5" />
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* State Information */}
      {stateInfo.length > 0 && (
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => onStateChange?.('')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                !selectedState
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {stateInfo.map((state) => (
              <button
                key={state.value}
                onClick={() => onStateChange?.(state.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                  selectedState === state.value
                    ? `${state.color} border-opacity-30`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
                }`}
              >
                {state.label} ({state.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters & Search
          </h2>
          <div className="flex items-center space-x-3">
            {hasActiveFilters && (
              <button
                onClick={onClearAllFilters}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Clear All Filters</span>
              </button>
            )}
            <button
              onClick={onExportCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md flex items-center space-x-1 text-sm font-medium"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Dynamic filters */}
          {filterOptions.map((filter) => (
            <div key={filter.label}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {filter.label}
              </label>
              <select
                value={filter.selectedValue}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All {filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.count ? `(${option.count})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Results summary */}
        {(totalCount !== undefined || filteredCount !== undefined) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {filteredCount !== undefined && totalCount !== undefined ? (
                hasActiveFilters ? (
                  <>Showing {filteredCount} of {totalCount} results</>
                ) : (
                  <>Showing {totalCount} results</>
                )
              ) : (
                filteredCount !== undefined ? (
                  <>Showing {filteredCount} results</>
                ) : (
                  totalCount !== undefined && <>Total: {totalCount} results</>
                )
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UnifiedHeader
