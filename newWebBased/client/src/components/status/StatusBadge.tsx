/**
 * StatusBadge — Unified color-coded status pill component.
 *
 * Used across CompetitionStatusManagement, SquadStatusManagement,
 * and ParticipantStatusManagement to render consistent status labels
 * with color coding sourced from the database.
 */

import { getStatusColor, STATUS_TABLE_STYLES } from './statusColorUtils'

interface StatusBadgeProps {
  /** Status label text to display. Renders an em-dash if null or empty. */
  label: string | null
  /** Database color code in any supported format: {r,g,b}, rgb(), #hex, or r,g,b */
  colorCode: string | null
  /** Optional extra Tailwind classes */
  className?: string
  /** Optional tooltip */
  title?: string
  /** Click handler for inline editing scenarios */
  onClick?: () => void
}

/**
 * Renders a status pill badge using the database's stored color code.
 *
 * @example
 * <StatusBadge label={item.status.name} colorCode={item.status.colorCode} />
 */
export function StatusBadge({ label, colorCode, className = '', title, onClick }: StatusBadgeProps) {
  const { style, className: colorClass } = getStatusColor(colorCode)
  const displayLabel = label || '—'

  const baseClass = `${STATUS_TABLE_STYLES.badge} ${colorClass}${className ? ` ${className}` : ''}`

  if (onClick) {
    return (
      <button
        type="button"
        className={`${baseClass} cursor-pointer`}
        style={style}
        title={title}
        onClick={onClick}
      >
        {displayLabel}
      </button>
    )
  }

  return (
    <span
      className={baseClass}
      style={style}
      title={title}
    >
      {displayLabel}
    </span>
  )
}
