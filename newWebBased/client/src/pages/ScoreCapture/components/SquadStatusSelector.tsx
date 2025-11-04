/**
 * SquadStatusSelector Component
 * Point 123: Separation of Concerns
 * 
 * Status selector for Squad + Discipline combination
 * - Displays current status with color indicator
 * - Allows changing status for entire squad+discipline
 */

import { useTranslation } from 'react-i18next'
import type { Status } from '@/types/ScoreCapture.types'

interface SquadStatusSelectorProps {
  activeSquad: string
  activeDiscipline: number | string | ''
  statuses: Status[]
  squadStatus: number | null
  onStatusChange: (statusId: string) => void
  getStatusColor: (statusId: number) => string
}

export const SquadStatusSelector = ({
  activeSquad,
  activeDiscipline,
  statuses,
  squadStatus,
  onStatusChange,
  getStatusColor
}: SquadStatusSelectorProps) => {
  const { t } = useTranslation()

  // Only show if both squad and discipline are selected
  if (!activeSquad || !activeDiscipline) {
    return null
  }

  const statusColor = squadStatus !== null ? getStatusColor(squadStatus) : 'gray'

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: statusColor }}
          />
          <label className="text-sm font-medium text-gray-700">
            {t('scoreCapture.status.label')} ({activeSquad} - {typeof activeDiscipline === 'number' ? `ID ${activeDiscipline}` : activeDiscipline}):
          </label>
        </div>
        
        <select
          value={squadStatus || ''}
          onChange={(e) => onStatusChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('scoreCapture.status.noStatus')}</option>
          {statuses.map((status) => (
            <option key={status.int_statusid} value={status.int_statusid}>
              {status.var_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
