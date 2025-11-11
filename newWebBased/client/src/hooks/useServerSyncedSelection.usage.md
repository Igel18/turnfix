/**
 * useServerSyncedSelection Hook - Usage Guide
 * 
 * Problem Solved:
 * When data is fetched from the server, the selected item's reference becomes stale.
 * Even though the data is fresh, React doesn't re-render because the reference hasn't changed.
 * 
 * This hook provides a reusable solution to keep selected items in sync with server data.
 * 
 * Real-World Example:
 * 
 * Before (Groups - with bug):
 * ```tsx
 * const [groups, setGroups] = useState<Group[]>([]);
 * const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
 * 
 * const fetchGroups = async () => {
 *   const newGroups = await fetch('/api/groups').then(r => r.json());
 *   setGroups(newGroups);
 *   // ❌ selectedGroup still points to OLD object!
 *   // User adds member, but UI doesn't update because selectedGroup is stale
 * };
 * ```
 * 
 * After (Groups - with hook):
 * ```tsx
 * const [groups, setGroups] = useState<Group[]>([]);
 * const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
 * 
 * const updateSelectedGroup = useServerSyncedSelection<Group>({
 *   selectedItem: selectedGroup,
 *   onUpdate: setSelectedGroup
 * });
 * 
 * const fetchGroups = async () => {
 *   const newGroups = await fetch('/api/groups').then(r => r.json());
 *   setGroups(newGroups);
 *   updateSelectedGroup(newGroups); // ✅ Auto-syncs selected group with fresh data!
 * };
 * ```
 * 
 * Usage in useGroups Hook:
 * ```tsx
 * import { useServerSyncedSelection } from '@/hooks';
 * 
 * export const useGroups = (
 *   eventId?: number,
 *   selectedGroup?: Group | null,
 *   onSelectedGroupUpdate?: (group: Group | null) => void
 * ) => {
 *   const [groups, setGroups] = useState<Group[]>([]);
 * 
 *   // Create sync function
 *   const updateSelectedGroup = useServerSyncedSelection<Group>({
 *     selectedItem: selectedGroup || null,
 *     onUpdate: onSelectedGroupUpdate,
 *     getId: (group) => group.id,      // Optional: defaults to item.id
 *     getName: (group) => group.name   // Optional: for logging
 *   });
 * 
 *   const fetchGroups = async () => {
 *     const response = await fetch('/api/groups');
 *     const data = await response.json();
 *     const newGroups = data.data;
 * 
 *     setGroups(newGroups);
 *     updateSelectedGroup(newGroups); // ✅ Sync!
 *   };
 * 
 *   return { groups, fetchGroups };
 * };
 * ```
 * 
 * Usage in Page Component:
 * ```tsx
 * export function Groups() {
 *   const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
 * 
 *   const { groups, fetchGroups } = useGroups(
 *     eventId,
 *     selectedGroup,
 *     (updatedGroup) => setSelectedGroup(updatedGroup) // Callback
 *   );
 * 
 *   // When member is added:
 *   const addMember = async (participantId: number) => {
 *     await fetch(`/api/groups/${selectedGroup.id}/members`, {
 *       method: 'POST',
 *       body: JSON.stringify({ participantId })
 *     });
 *     
 *     await fetchGroups(); // ✅ Fetches fresh data + auto-syncs selectedGroup!
 *   };
 * }
 * ```
 * 
 * How It Works:
 * 
 * 1. User selects a group → `selectedGroup` is set
 * 2. User adds/removes member → API call succeeds
 * 3. `fetchGroups()` is called → fetches fresh data from server
 * 4. `updateSelectedGroup(newGroups)` finds the selected group in new data
 * 5. `onUpdate(updatedGroup)` is called → `setSelectedGroup` with FRESH object
 * 6. React sees new reference → Re-renders DetailPane with updated members!
 * 
 * Parameters:
 * 
 * @param selectedItem - Currently selected item (Group, Squad, Team, etc.)
 * @param onUpdate - Callback to update the selected item (e.g., setSelectedGroup)
 * @param getId - Optional: Extract ID from item (defaults to item.id)
 * @param getName - Optional: Extract name for logging (defaults to item.name)
 * 
 * Returns:
 * 
 * @returns updateSelectedItem - Function to call after fetching: updateSelectedItem(newItems)
 * 
 * When to Use:
 * 
 * ✅ Use when:
 * - You have a list of items from server
 * - User can select one item
 * - Selected item's data can change on server (via CRUD operations)
 * - You need UI to reflect fresh data immediately
 * 
 * ❌ Don't use when:
 * - Selected item never changes (read-only)
 * - You don't fetch from server (local state only)
 * - Simple scenarios where reference equality is not an issue
 * 
 * Real-World Applications:
 * 
 * 1. **Groups** (✅ Implemented):
 *    - selectedGroup synced with groups from server
 *    - After adding/removing members, fresh group data loaded
 * 
 * 2. **Squads** (Can be refactored):
 *    - Currently uses manual updateSelectedSquad function
 *    - Can use this hook instead for consistency
 * 
 * 3. **Teams** (Future):
 *    - selectedTeam synced with teams from server
 * 
 * 4. **Event Participants** (Future):
 *    - selectedEvent synced with events from server
 * 
 * Benefits of SoC (Separation of Concerns):
 * 
 * ✅ Reusable across all M:N assignment pages
 * ✅ Consistent behavior (no copy-paste bugs)
 * ✅ Easy to test (single implementation)
 * ✅ Type-safe (generic TypeScript)
 * ✅ Self-documenting (clear purpose)
 * ✅ Maintainable (fix once, applies everywhere)
 * 
 * Performance Notes:
 * 
 * - Hook creates a new function on every render (normal function, not useCallback)
 * - This is intentional! Ensures fresh closure over selectedItem and onUpdate
 * - Negligible performance impact (function creation is cheap)
 * - Alternative (useCallback) causes infinite loops due to dependency chains
 * 
 * Debugging:
 * 
 * The hook logs when it updates or clears selection:
 * 
 * ```
 * 📝 Updating selected GroupName with fresh data from server
 * ❌ Selected GroupName no longer exists, clearing selection
 * ```
 * 
 * Common Pitfalls:
 * 
 * ❌ Forgetting to call updateSelectedItem after fetch:
 *    ```tsx
 *    const fetchGroups = async () => {
 *      const newGroups = await ...;
 *      setGroups(newGroups);
 *      // Missing: updateSelectedGroup(newGroups)
 *    };
 *    ```
 * 
 * ❌ Calling updateSelectedItem with wrong data:
 *    ```tsx
 *    updateSelectedGroup(groups); // ❌ OLD data
 *    updateSelectedGroup(newGroups); // ✅ FRESH data
 *    ```
 * 
 * ❌ Not providing onUpdate callback:
 *    ```tsx
 *    const { groups } = useGroups(eventId, selectedGroup); // ❌ Missing callback
 *    const { groups } = useGroups(eventId, selectedGroup, setSelectedGroup); // ✅
 *    ```
 * 
 * Testing:
 * 
 * ```tsx
 * it('should update selected item with fresh data', () => {
 *   const onUpdate = jest.fn();
 *   const updateSelectedItem = useServerSyncedSelection({
 *     selectedItem: { id: 1, name: 'Group 1', members: [] },
 *     onUpdate
 *   });
 * 
 *   const freshData = [
 *     { id: 1, name: 'Group 1', members: [{ id: 100 }] }, // Updated!
 *     { id: 2, name: 'Group 2', members: [] }
 *   ];
 * 
 *   updateSelectedItem(freshData);
 * 
 *   expect(onUpdate).toHaveBeenCalledWith(freshData[0]); // Fresh data!
 * });
 * ```
 */

export {};
