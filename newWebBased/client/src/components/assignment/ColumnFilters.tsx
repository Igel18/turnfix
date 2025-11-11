/**
 * ColumnFilters Component
 * Container for column-specific search bars in UnifiedAssignmentModal
 * 
 * Aligns search bars with their respective columns in the 3-column layout
 * 
 * Used in: Groups, Squads, Teams, EventParticipants, etc.
 */

import { ColumnSearchBar } from './ColumnSearchBar';

export interface ColumnFilterConfig {
  /** Placeholder text for the search bar */
  placeholder: string;
  /** Current filter value */
  value: string;
  /** Callback when filter value changes */
  onChange: (value: string) => void;
  /** Whether this column filter is disabled */
  disabled?: boolean;
  /** Whether this column is visible (hides search bar if false) */
  visible?: boolean;
}

export interface ColumnFiltersProps {
  /** Configuration for column 1 (Master items) */
  column1?: ColumnFilterConfig;
  /** Configuration for column 2 (Available items) */
  column2?: ColumnFilterConfig;
  /** Configuration for column 3 (Assigned items) */
  column3?: ColumnFilterConfig;
  /** CSS class for the container */
  className?: string;
}

export function ColumnFilters({
  column1,
  column2,
  column3,
  className = ''
}: ColumnFiltersProps) {
  // Don't render if no columns configured
  if (!column1 && !column2 && !column3) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4 ${className}`}>
      {/* Column 1 Search */}
      <div>
        {column1 && column1.visible !== false ? (
          <ColumnSearchBar
            value={column1.value}
            onChange={column1.onChange}
            placeholder={column1.placeholder}
            disabled={column1.disabled}
          />
        ) : (
          <div /> // Empty div to maintain grid alignment
        )}
      </div>

      {/* Column 2 Search */}
      <div>
        {column2 && column2.visible !== false ? (
          <ColumnSearchBar
            value={column2.value}
            onChange={column2.onChange}
            placeholder={column2.placeholder}
            disabled={column2.disabled}
          />
        ) : (
          <div /> // Empty div to maintain grid alignment
        )}
      </div>

      {/* Column 3 Search */}
      <div>
        {column3 && column3.visible !== false ? (
          <ColumnSearchBar
            value={column3.value}
            onChange={column3.onChange}
            placeholder={column3.placeholder}
            disabled={column3.disabled}
          />
        ) : (
          <div /> // Empty div to maintain grid alignment
        )}
      </div>
    </div>
  );
}
