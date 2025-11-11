/**
 * ColumnSearchBar Component
 * Reusable search bar positioned above a column for targeted filtering
 * 
 * Features:
 * - Multi-field search (searches multiple fields of items)
 * - Clear button
 * - Placeholder shows searchable fields
 * - Visual alignment with column below
 * 
 * Used in: Groups, Squads, Teams, EventParticipants, etc.
 */

import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface ColumnSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

export function ColumnSearchBar({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = ''
}: ColumnSearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full pl-10 pr-10 py-2
            border border-gray-300 rounded-md
            focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            text-sm
          `}
        />

        {/* Clear Button */}
        {value && !disabled && (
          <button
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            type="button"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}
