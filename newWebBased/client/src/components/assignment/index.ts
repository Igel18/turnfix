/**
 * Unified Assignment Components
 * Generic M:N assignment UI components
 * 
 * Export all components and types for easy importing
 */

export { UnifiedAssignmentModal } from './UnifiedAssignmentModal';
export { MasterList } from './MasterList';
export { AvailableList } from './AvailableList';
export { DetailPane } from './DetailPane';

// Hooks
export { useAssignmentRefresh } from './hooks';

export type {
  BaseMasterItem,
  BaseAvailableItem,
  BaseAssignment,
  AssignmentConfig,
  FilterConfig,
  FilterField,
  FilterState,
  UnifiedAssignmentModalProps,
  MasterListProps,
  AvailableListProps,
  DetailPaneProps
} from './UnifiedAssignmentModal.types';
