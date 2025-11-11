/**
 * useAssignmentRefresh Hook - Usage Guide
 * 
 * Problem:
 * UnifiedAssignmentModal's DetailPane doesn't re-render when nested data changes
 * (e.g., when group.members array is modified via add/remove operations)
 * 
 * Root Cause:
 * React compares prop references. When a master item's nested array changes,
 * the parent object reference stays the same, so React doesn't detect the change.
 * 
 * Solution:
 * Force component re-mount by changing the `key` prop when assignments change.
 * This hook creates a stable key that updates automatically.
 * 
 * Usage Example:
 * ```tsx
 * import { useAssignmentRefresh } from '@/components/assignment';
 * 
 * export function MyAssignmentPage() {
 *   const [selectedItem, setSelectedItem] = useState<Item | null>(null);
 *   const { members, addMember, removeMember } = useMembers(
 *     selectedItem,
 *     async () => {
 *       await fetchItems(); // Refresh parent data
 *       triggerRefresh();   // Force re-render
 *     }
 *   );
 * 
 *   // Create the refresh hook
 *   const { modalKey, triggerRefresh } = useAssignmentRefresh({
 *     selectedId: selectedItem?.id,
 *     assignmentIds: members.map(m => m.id),
 *     prefix: 'mypage'
 *   });
 * 
 *   return (
 *     <UnifiedAssignmentModal
 *       key={modalKey}  // This forces re-render when members change
 *       selectedMaster={selectedItem}
 *       onSelectMaster={setSelectedItem}
 *       // ... other props
 *     />
 *   );
 * }
 * ```
 * 
 * Real-World Examples:
 * 
 * 1. Groups Page:
 *    - Master: Groups
 *    - Assignments: Group Members (Participants)
 *    - Key changes when: group.members array is modified
 * 
 * 2. Squad Management:
 *    - Master: Squads
 *    - Assignments: Squad Members (Participants)
 *    - Key changes when: squad.participants array is modified
 * 
 * 3. Event Participants:
 *    - Master: Events
 *    - Assignments: Event Participants (Athletes)
 *    - Key changes when: event.participants array is modified
 * 
 * Parameters:
 * 
 * @param selectedId - ID of currently selected master item
 *   Example: selectedGroup?.id, selectedSquad?.id
 * 
 * @param assignmentIds - Array of assigned item IDs
 *   Example: members.map(m => m.id), participants.map(p => p.id)
 *   This is automatically sorted to ensure stability
 * 
 * @param prefix - Optional prefix for the key (defaults to 'assignment')
 *   Example: 'group', 'squad', 'event'
 *   Helps with debugging React DevTools
 * 
 * Returns:
 * 
 * @returns modalKey - Stable key string for UnifiedAssignmentModal
 *   Format: `{prefix}-{selectedId}-{sortedIds}-{refreshCounter}`
 *   Example: "group-5-1336,1641-0"
 * 
 * @returns triggerRefresh - Function to manually force a refresh
 *   Call this after CRUD operations to ensure UI updates
 * 
 * Performance Notes:
 * 
 * - The hook uses useMemo to avoid unnecessary recalculations
 * - Assignment IDs are sorted to ensure stable keys (order doesn't matter)
 * - Manual refresh increments a counter (no array comparisons)
 * 
 * Integration with Callbacks:
 * 
 * ```tsx
 * const { members, addMember } = useMembers(
 *   selectedGroup,
 *   async () => {
 *     await fetchGroups();  // 1. Refresh server data
 *     triggerRefresh();     // 2. Force UI re-render
 *   }
 * );
 * ```
 * 
 * This ensures:
 * 1. Backend data is always fresh
 * 2. UI reflects latest changes immediately
 * 3. No race conditions between data fetch and render
 * 
 * Debugging Tips:
 * 
 * 1. Add modalKey to console.log to see when it changes:
 *    ```tsx
 *    console.log('🔑 Modal Key:', modalKey);
 *    ```
 * 
 * 2. Check assignment IDs in debug output:
 *    ```tsx
 *    console.log('📦 Assignment IDs:', members.map(m => m.id));
 *    ```
 * 
 * 3. Verify triggerRefresh is called:
 *    ```tsx
 *    const triggerWithLog = () => {
 *      console.log('🔄 Manual refresh triggered');
 *      triggerRefresh();
 *    };
 *    ```
 * 
 * Common Pitfalls:
 * 
 * ❌ Calling hook before members are defined:
 *    const { modalKey } = useAssignmentRefresh({
 *      assignmentIds: members.map(m => m.id) // ERROR: members not defined yet
 *    });
 *    const { members } = useMembers(...);
 * 
 * ✅ Call hook after data hooks:
 *    const { members } = useMembers(...);
 *    const { modalKey } = useAssignmentRefresh({
 *      assignmentIds: members.map(m => m.id) // OK: members is defined
 *    });
 * 
 * ❌ Forgetting to call triggerRefresh in callback:
 *    const { members } = useMembers(
 *      selectedGroup,
 *      async () => {
 *        await fetchGroups(); // Data refreshed but UI doesn't update
 *      }
 *    );
 * 
 * ✅ Always call triggerRefresh after data changes:
 *    const { members } = useMembers(
 *      selectedGroup,
 *      async () => {
 *        await fetchGroups();
 *        triggerRefresh(); // Forces UI update
 *      }
 *    );
 * 
 * Related Patterns:
 * 
 * - SquadManagement: Uses this pattern for squad/participant assignment
 * - Groups: Uses this pattern for group/member assignment
 * - EventParticipants: Can use this pattern for event/athlete assignment
 * 
 * Separation of Concerns (SoC):
 * 
 * This hook follows SoC principles:
 * - ✅ Reusable across all assignment UIs
 * - ✅ Encapsulates re-render logic
 * - ✅ No business logic (pure UI concern)
 * - ✅ Consistent API across pages
 * - ✅ Easy to test and maintain
 */

export {};
