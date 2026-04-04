/**
 * ViewModeToggle — Shared Matrix / Table / Grid view toggle button group.
 *
 * Used in CompetitionStatusManagement and SquadStatusManagement.
 * Replaces the identical inline button group JSX that was duplicated in both pages.
 */

import { TableCellsIcon, ListBulletIcon, Squares2X2Icon } from '@heroicons/react/24/outline'

export type ViewMode = 'matrix' | 'table' | 'grid'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onChange: (mode: ViewMode) => void
}

const ACTIVE = 'bg-blue-600 text-white border-blue-600'
const INACTIVE = 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'

/**
 * Renders a three-button toggle group for switching between matrix, table, and grid views.
 *
 * @example
 * <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
 */
export function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <button
        type="button"
        aria-label="Matrix"
        onClick={() => onChange('matrix')}
        className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
          viewMode === 'matrix' ? ACTIVE : INACTIVE
        }`}
        title="Matrix-Ansicht"
      >
        <TableCellsIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label="Tabelle"
        onClick={() => onChange('table')}
        className={`px-3 py-2 text-sm font-medium border-t border-b ${
          viewMode === 'table' ? ACTIVE : INACTIVE
        }`}
        title="Tabellenansicht"
      >
        <ListBulletIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label="Kacheln"
        onClick={() => onChange('grid')}
        className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
          viewMode === 'grid' ? ACTIVE : INACTIVE
        }`}
        title="Kachelansicht"
      >
        <Squares2X2Icon className="h-4 w-4" />
      </button>
    </div>
  )
}
