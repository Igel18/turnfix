/**
 * useGroupMembers Hook
 * Handles member assignment and management for groups
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group, GroupMember } from '../Groups.types';

interface UseGroupMembersReturn {
  members: GroupMember[];
  availableParticipants: GroupMember[];
  isLoading: boolean;
  fetchMembers: () => Promise<void>;
  fetchAvailableParticipants: () => Promise<void>;
  addMember: (participantId: number) => Promise<boolean>;
  removeMember: (memberId: number) => Promise<boolean>;
}

export const useGroupMembers = (
  selectedGroup: Group | null,
  onMembersChanged?: () => void
): UseGroupMembersReturn => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use ref to store the selected group to avoid dependency issues
  const selectedGroupRef = useRef(selectedGroup);
  
  // Update ref when selectedGroup changes
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // Fetch current members of the group
  const fetchMembers = useCallback(async () => {
    const group = selectedGroupRef.current;
    if (!group) {
      setMembers([]);
      return;
    }

    setIsLoading(true);
    try {
      console.log('📥 Fetching members for group:', group.id);
      const response = await fetch(`/api/groups/${group.id}/members`);
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in { data: ... }
        const memberList = Array.isArray(data) ? data : [];
        console.log('📥 Members loaded:', memberList.length, 'for group:', group.id);
        console.log('📥 Member IDs:', memberList.map((m: any) => m.id));
        setMembers(memberList);
      } else {
        console.error('❌ Failed to fetch members:', response.status);
        setMembers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching members:', error);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies - uses ref

  // Fetch available participants (from same club, not already members)
  const fetchAvailableParticipants = useCallback(async () => {
    const group = selectedGroupRef.current;
    if (!group) {
      setAvailableParticipants([]);
      return;
    }

    try {
      console.log('📥 Fetching available participants for club:', group.clubId);
      const response = await fetch(`/api/participants?limit=5000&clubId=${group.clubId}`);
      if (response.ok) {
        const data = await response.json();
        // API returns { participants: [...], pagination: {...} }
        const participants = Array.isArray(data.participants) ? data.participants : [];
        
        // Convert to GroupMember format
        const formatted = participants.map((p: any) => ({
          id: p.int_teilnehmerid,
          firstName: p.var_vorname,
          lastName: p.var_nachname,
          clubId: p.int_vereineid,
          clubName: p.verein_name || p.clubName,
          age: p.age,
          birthdate: p.dat_geburtstag,
          gender: p.geschlecht_name, // 'male' | 'female' | 'unknown'
          // For AvailableList component (uses lowercase property names)
          firstname: p.var_vorname,
          lastname: p.var_nachname
        }));

        // Store all participants - filtering will be done in the component
        console.log('📥 Available participants fetched:', formatted.length);
        setAvailableParticipants(formatted);
      } else {
        console.error('❌ Failed to fetch participants:', response.status);
        setAvailableParticipants([]);
      }
    } catch (error) {
      console.error('❌ Error fetching participants:', error);
      setAvailableParticipants([]);
    }
  }, []); // No dependencies - uses ref

  // Add member to group
  const addMember = async (participantId: number): Promise<boolean> => {
    if (!selectedGroup) {
      console.error('❌ No group selected');
      return false;
    }

    try {
      console.log('➕ Adding member:', participantId, 'to group:', selectedGroup.id);
      const response = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId })
      });

      if (response.ok) {
        console.log('✅ Member added successfully');
        // First: refresh group list (updates memberCount) - WAIT for completion
        console.log('🔄 Calling onMembersChanged to refresh group list');
        await onMembersChanged?.();
        // Then: fetch fresh member data
        console.log('🔄 Fetching fresh members and available participants');
        await fetchMembers();
        await fetchAvailableParticipants();
        console.log('✅ All data refreshed after add');
        return true;
      } else {
        const error = await response.json();
        console.error('❌ Failed to add member:', error);
        alert(error.error || t('groups.members.addError'));
        return false;
      }
    } catch (error) {
      console.error('❌ Error adding member:', error);
      alert(t('groups.members.addError'));
      return false;
    }
  };

  // Remove member from group
  const removeMember = async (memberId: number): Promise<boolean> => {
    if (!selectedGroup) {
      console.error('❌ No group selected');
      return false;
    }

    if (!window.confirm(t('groups.members.confirmRemove'))) {
      return false;
    }

    try {
      console.log('➖ Removing member:', memberId, 'from group:', selectedGroup.id);
      const response = await fetch(`/api/groups/${selectedGroup.id}/members/${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('✅ Member removed successfully');
        // First: refresh group list (updates memberCount) - WAIT for completion
        console.log('🔄 Calling onMembersChanged to refresh group list');
        await onMembersChanged?.();
        // Then: fetch fresh member data
        console.log('🔄 Fetching fresh members and available participants');
        await fetchMembers();
        await fetchAvailableParticipants();
        console.log('✅ All data refreshed after remove');
        return true;
      } else {
        const error = await response.json();
        console.error('❌ Failed to remove member:', error);
        alert(error.error || t('groups.members.removeError'));
        return false;
      }
    } catch (error) {
      console.error('❌ Error removing member:', error);
      alert(t('groups.members.removeError'));
      return false;
    }
  };

  // Load data when group changes
  useEffect(() => {
    if (selectedGroup) {
      fetchMembers();
      fetchAvailableParticipants();
    } else {
      setMembers([]);
      setAvailableParticipants([]);
    }
  }, [selectedGroup, fetchMembers, fetchAvailableParticipants]);

  return {
    members,
    availableParticipants,
    isLoading,
    fetchMembers,
    fetchAvailableParticipants,
    addMember,
    removeMember
  };
};
