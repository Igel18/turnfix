/**
 * Barrel export for shared status UI components.
 *
 * Import from this module in all status management pages:
 *   import { getStatusColor, STATUS_TABLE_STYLES, StatusBadge, ViewModeToggle } from '@/components/status'
 */

export { getStatusColor, STATUS_TABLE_STYLES } from './statusColorUtils'
export type { } from './statusColorUtils'

export { StatusBadge } from './StatusBadge'
export { ViewModeToggle } from './ViewModeToggle'
export type { ViewMode } from './ViewModeToggle'
