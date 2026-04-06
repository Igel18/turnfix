/**
 * StatusDropdown — Unified status <select> component.
 *
 * Part of @turnfix/shared so it can be used in:
 *   - client (ScoringPanel in ScoreCaptureV2)
 *   - jury-portal (ScoringView score input panel)
 *
 * Accepts StatusOption[] (the canonical server response shape {id, name, colorCode})
 * and emits the selected id (or null for "no status").
 */

import React from 'react';
import type { StatusOption } from '../statusColorUtils';

export interface StatusDropdownProps {
  /** The available status options from /api/participant-status/statuses */
  statuses: StatusOption[];
  /** Currently selected status id, or null for none */
  value: number | null;
  /** Called with the newly selected status id, or null when placeholder selected */
  onChange: (id: number | null) => void;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Text shown for the "no status" option. Defaults to "—" */
  placeholder?: string;
  /** Optional extra Tailwind classes for the <select> element */
  className?: string;
}

/**
 * A simple <select> that renders StatusOption[] and calls onChange with a numeric id.
 *
 * @example
 * <StatusDropdown
 *   statuses={statuses}
 *   value={currentStatusId}
 *   onChange={(id) => handleStatusChange(wertungenId, id)}
 * />
 */
export function StatusDropdown({
  statuses,
  value,
  onChange,
  disabled = false,
  placeholder = '—',
  className = '',
}: StatusDropdownProps) {
  const baseClass =
    'block w-full rounded-md border-gray-300 shadow-sm ' +
    'focus:border-blue-500 focus:ring-blue-500 text-sm ' +
    'disabled:bg-gray-100 disabled:cursor-not-allowed';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    onChange(raw === '' ? null : parseInt(raw, 10));
  }

  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      className={`${baseClass}${className ? ` ${className}` : ''}`}
    >
      <option value="">{placeholder}</option>
      {statuses.map(s => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
