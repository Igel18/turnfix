/**
 * StatusBadge — Unified color-coded status pill component.
 *
 * Part of @turnfix/shared so it can be used in:
 *   - client (ScoreCaptureV2, SquadStatusManagement, …)
 *   - jury-portal (ScoringView particle sidebar, …)
 *
 * Props use `name` (not `label`) to align directly with StatusOption.name.
 */

import React from 'react';
import { getStatusColor, STATUS_TABLE_STYLES } from '../statusColorUtils';

export interface StatusBadgeProps {
  /** Status label text. Renders an em-dash if null or empty. */
  name: string | null;
  /** Database color code: {r,g,b}, rgb(), #hex, or r,g,b */
  colorCode: string | null;
  /** Optional extra Tailwind classes */
  className?: string;
  /** Optional tooltip */
  title?: string;
  /** Click handler for inline editing scenarios */
  onClick?: () => void;
}

/**
 * Renders a status pill badge using the database's stored color code.
 *
 * @example
 * <StatusBadge name={opt.name} colorCode={opt.colorCode} />
 */
export function StatusBadge({ name, colorCode, className = '', title, onClick }: StatusBadgeProps) {
  const { style, className: colorClass } = getStatusColor(colorCode);
  const displayLabel = name || '—';

  const baseClass = `${STATUS_TABLE_STYLES.badge} ${colorClass}${className ? ` ${className}` : ''}`;

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
    );
  }

  return (
    <span className={baseClass} style={style} title={title}>
      {displayLabel}
    </span>
  );
}
