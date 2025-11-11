/**
 * useGroups Hook
 * Handles all data fetching and CRUD operations for groups
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useServerSyncedSelection } from '@/hooks';
import type { Group, Club, GroupFormData } from '../Groups.types';

export const useGroups = (eventId?: number, selectedGroup?: Group | null, onSelectedGroupUpdate?: (group: Group | null) => void) => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Use reusable server sync hook to keep selected group updated
   * (Same pattern as SquadManagement)
   */
  const updateSelectedGroup = useServerSyncedSelection<Group>({
    selectedItem: selectedGroup || null,
    onUpdate: onSelectedGroupUpdate,
    getId: (group) => group.id,
    getName: (group) => group.name
  });

  // Fetch groups from API
  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const url = eventId 
        ? `/api/groups?limit=5000&eventId=${eventId}`
        : '/api/groups?limit=5000';
      
      console.log('🏃 Fetching groups:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('🏃 Groups response:', data);
        console.log('🏃 Groups data array:', data.data);
        console.log('🏃 Groups count:', data.data?.length || 0);
        
        const newGroups = Array.isArray(data.data) ? data.data : [];
        setGroups(newGroups);
        
        // Update selected group with fresh data (like SquadManagement)
        updateSelectedGroup(newGroups);
      } else {
        console.error('🏃 Groups fetch failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch clubs from API
  const fetchClubs = async () => {
    try {
      const response = await fetch('/api/clubs?limit=5000');
      if (response.ok) {
        const data = await response.json();
        setClubs(Array.isArray(data.clubs) ? data.clubs : []);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setClubs([]);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchGroups();
    fetchClubs();
  }, [eventId]); // Only eventId dependency, NOT fetchGroups/fetchClubs!

  // Create or update group
  const saveGroup = async (formData: GroupFormData, editingGroup: Group | null): Promise<boolean> => {
    if (!formData.name || !formData.clubId) {
      alert(t('groups.validation.requiredFields'));
      return false;
    }

    try {
      const url = editingGroup 
        ? `/api/groups/${editingGroup.id}`
        : '/api/groups';
      
      const method = editingGroup ? 'PUT' : 'POST';

      console.log('💾 Saving group:', { url, method, formData });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          clubId: parseInt(formData.clubId)
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('💾 Group saved:', result);
        console.log('💾 Fetching groups after save...');
        await fetchGroups();
        console.log('💾 Groups after fetch:', groups.length);
        return true;
      } else {
        const error = await response.json();
        alert(error.error || t('groups.saveError'));
        return false;
      }
    } catch (error) {
      console.error('Error saving group:', error);
      alert(t('groups.saveError'));
      return false;
    }
  };

  // Delete group
  const deleteGroup = async (group: Group): Promise<boolean> => {
    if (!window.confirm(t('groups.confirmDelete', { name: group.name }))) {
      return false;
    }

    try {
      console.log('🗑️ Deleting group:', group.id);

      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('🗑️ Group deleted, fetching groups...');
        await fetchGroups();
        console.log('🗑️ Groups after fetch:', groups.length);
        return true;
      } else {
        const error = await response.json();
        alert(error.error || t('groups.deleteError'));
        return false;
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      alert(t('groups.deleteError'));
      return false;
    }
  };

  return {
    groups,
    clubs,
    isLoading,
    fetchGroups,
    saveGroup,
    deleteGroup
  };
};
