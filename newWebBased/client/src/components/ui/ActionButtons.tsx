import React from 'react'
import { PlusIcon, SparklesIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'

/**
 * Standard page action buttons. Slot order in the header action row is fixed:
 * 1. Add (PlusIcon, blue)  2. Wizard (SparklesIcon, purple)  3. Import  4. page specific actions.
 */
interface ActionButtonProps {
  onClick: () => void
  label: string
  disabled?: boolean
  title?: string
}

const BASE =
  'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

export const AddButton: React.FC<ActionButtonProps> = ({ onClick, label, disabled, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title ?? label}
    data-testid="action-add"
    className={`${BASE} border border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
  >
    <PlusIcon className="h-4 w-4 mr-2" />
    {label}
  </button>
)

export const WizardButton: React.FC<ActionButtonProps> = ({ onClick, label, disabled, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title ?? label}
    data-testid="action-wizard"
    className={`${BASE} border border-transparent text-white bg-purple-600 hover:bg-purple-700 focus:ring-purple-500`}
  >
    <SparklesIcon className="h-4 w-4 mr-2" />
    {label}
  </button>
)

export const ImportButton: React.FC<ActionButtonProps> = ({ onClick, label, disabled, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title ?? label}
    data-testid="action-import"
    className={`${BASE} border border-gray-300 shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500`}
  >
    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
    {label}
  </button>
)
