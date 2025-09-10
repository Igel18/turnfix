import React from 'react'
import { TableCellsIcon, Squares2X2Icon } from '@heroicons/react/24/outline'

export type ViewType = 'table' | 'cards'

interface ViewToggleProps {
  viewType: ViewType
  onViewTypeChange: (viewType: ViewType) => void
  size?: 'sm' | 'md'
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ 
  viewType, 
  onViewTypeChange, 
  size = 'md' 
}) => {
  const buttonClass = size === 'sm' 
    ? 'px-2.5 py-1.5 text-xs' 
    : 'px-3 py-2 text-sm'

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      <button
        onClick={() => onViewTypeChange('cards')}
        className={`flex items-center ${buttonClass} rounded-md font-medium transition-colors ${
          viewType === 'cards'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        title="Card View"
      >
        <Squares2X2Icon className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1`} />
        Cards
      </button>
      <button
        onClick={() => onViewTypeChange('table')}
        className={`flex items-center ${buttonClass} rounded-md font-medium transition-colors ${
          viewType === 'table'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        title="Table View"
      >
        <TableCellsIcon className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1`} />
        Table
      </button>
    </div>
  )
}

export default ViewToggle
