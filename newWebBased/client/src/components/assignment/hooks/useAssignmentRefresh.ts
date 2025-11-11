/**
 * useAssignmentRefresh Hook
 * Reusable SoC pattern for forcing UnifiedAssignmentModal DetailPane re-renders
 * 
 * Problem: DetailPane doesn't re-render when nested data (like group.members) changes
 * Solution: Create a stable key that changes when assignments change
 * 
 * Usage:
 * ```tsx
 * const { modalKey, triggerRefresh } = useAssignmentRefresh({
 *   selectedId: selectedGroup?.id,
 *   assignmentIds: members.map(m => m.id)
 * });
 * 
 * // Use modalKey on UnifiedAssignmentModal
 * <UnifiedAssignmentModal key={modalKey} ... />
 * 
 * // Call triggerRefresh after CRUD operations
 * await addMember(id);
 * triggerRefresh();
 * ```
 */

import { useState, useMemo } from 'react';

interface UseAssignmentRefreshParams {
  /** ID of currently selected master item (e.g., group.id, squad.id) */
  selectedId?: number | string | null;
  /** IDs of assigned items (e.g., member IDs) */
  assignmentIds?: (number | string)[];
  /** Optional prefix for the key (defaults to 'assignment') */
  prefix?: string;
}

interface UseAssignmentRefreshResult {
  /** Stable key that changes when assignments change */
  modalKey: string;
  /** Call this to force a re-render (useful for manual refresh) */
  triggerRefresh: () => void;
}

/**
 * Creates a stable key for UnifiedAssignmentModal that forces DetailPane re-render
 * when assignment data changes
 */
export function useAssignmentRefresh({
  selectedId,
  assignmentIds = [],
  prefix = 'assignment'
}: UseAssignmentRefreshParams): UseAssignmentRefreshResult {
  
  // Manual refresh trigger (increment to force re-render)
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Create stable string from assignment IDs
  const assignmentIdsString = useMemo(
    () => assignmentIds.sort().join(','),
    [assignmentIds]
  );

  // Create modal key that changes when:
  // 1. Selected item changes
  // 2. Assignment IDs change (add/remove operations)
  // 3. Manual refresh is triggered
  const modalKey = useMemo(
    () => `${prefix}-${selectedId || 'none'}-${assignmentIdsString || 'empty'}-${refreshCounter}`,
    [prefix, selectedId, assignmentIdsString, refreshCounter]
  );

  const triggerRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  return {
    modalKey,
    triggerRefresh
  };
}
