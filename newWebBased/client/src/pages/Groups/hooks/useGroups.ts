/**
 * useGroups Hook
 * Handles all data fetching and CRUD operations for groups
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group, Club, GroupFormData } from '../Groups.types';

export const useGroups = (eventId?: number) => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch groups from API
  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = eventId 
        ? `/api/groups?limit=5000&eventId=${eventId}`
        : '/api/groups?limit=5000';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setGroups(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Fetch clubs from API
  const fetchClubs = useCallback(async () => {
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
  }, []);

  // Initial data load
  useEffect(() => {
    fetchGroups();
    fetchClubs();
  }, [fetchGroups, fetchClubs]);

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
        await fetchGroups();
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
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchGroups();
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
