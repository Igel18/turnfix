/**
 * useServerSyncedSelection Hook
 * Reusable SoC pattern for keeping selected item in sync with server data
 * 
 * Problem: When data refreshes from server, the selected item reference becomes stale.
 * Solution: Automatically update selected item with fresh data after every server fetch.
 * 
 * Used by:
 * - Groups (selectedGroup synced with groups from server)
 * - Squads (selectedSquad synced with squads from server)
 */

import { debugLog } from '../utils/debug';
 * - Any M:N assignment pattern
 * 
 * Usage:
 * ```tsx
 * const updateSelectedItem = useServerSyncedSelection({
 *   selectedItem: selectedGroup,
 *   onUpdate: setSelectedGroup
 * });
 * 
 * // In your fetch function:
 * const newGroups = await fetchFromServer();
 * setGroups(newGroups);
 * updateSelectedItem(newGroups); // Auto-syncs selected group
 * ```
 */

interface UseServerSyncedSelectionParams<T> {
  /** Currently selected item (can be null) */
  selectedItem: T | null;
  /** Callback to update the selected item */
  onUpdate?: (item: T | null) => void;
  /** Optional ID extractor (defaults to item.id) */
  getId?: (item: T) => number | string;
  /** Optional name extractor for logging (defaults to item.name) */
  getName?: (item: T) => string;
}

/**
 * Creates a sync function that updates selected item with fresh data from server
 * 
 * @returns Function to call after fetching fresh data: updateSelectedItem(newItems)
 */
export function useServerSyncedSelection<T>({
  selectedItem,
  onUpdate,
  getId = (item: any) => item.id,
  getName = (item: any) => item.name || 'unknown'
}: UseServerSyncedSelectionParams<T>) {
  
  /**
   * Update selected item with fresh data from server
   * Call this after fetching new data from the server
   */
  const updateSelectedItem = (newItems: T[]) => {
    if (!selectedItem || !onUpdate) {
      return;
    }

    const selectedId = getId(selectedItem);
    const updatedItem = newItems.find(item => getId(item) === selectedId);
    
    if (updatedItem) {
      debugLog(`📝 Updating selected ${getName(selectedItem)} with fresh data from server`);
      onUpdate(updatedItem);
    } else {
      debugLog(`❌ Selected ${getName(selectedItem)} no longer exists, clearing selection`);
      onUpdate(null);
    }
  };

  return updateSelectedItem;
}
