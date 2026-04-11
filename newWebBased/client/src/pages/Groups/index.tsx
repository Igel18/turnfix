/**
 * Groups Page - Unified Version with UnifiedAssignmentModal
 * Migrated from table view to generic M:N assignment pattern
 * 
 * Uses existing infrastructure:
 * - useGroups hook (with saveGroup, mapped fields)
 * - useGroupMembers hook (for member CRUD)
 * - Existing GroupFormModal component
 * - camelCase field mapping (id, name, clubId)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { useFilterPanel } from '@/hooks';

// Context
import { useEvent } from '@/contexts/EventContext';

// Template & Components
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { UnifiedAssignmentModal, useAssignmentRefresh } from '@/components/assignment';
import { UnifiedConfirmModal } from '@/components/UnifiedModal';

// Local Hooks & Types
import { useGroups, useGroupMembers } from './hooks';
import type { Group, GroupFormData, GroupMember } from './Groups.types';

// Modal Components
import { GroupFormModal, GroupsHelpPanel } from './components';

// Utils
import { createGroupConfig } from './groupAssignmentConfig';

/**
 * Groups Component - Using UnifiedAssignmentModal
 */
export function Groups() {
  const { t } = useTranslation();
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid;

  // State: UI & Selection
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<number | string | null>(null);
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<number | null>(null);

  // Form Data (for existing GroupFormModal)
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    clubId: ''
  });

  // Page-level filters (for the left participant column)
  const [searchFilter, setSearchFilter] = useState('');
  const [clubFilter, setClubFilter] = useState<string>('');

  // useFilterPanel: auto-show when active, reset on close
  const isAnyFilterActive = searchFilter !== '' || clubFilter !== '';
  const resetPageFilters = () => { setSearchFilter(''); setClubFilter(''); };
  const { showFilters, toggleFilters } = useFilterPanel(isAnyFilterActive, resetPageFilters);

  // Data Hooks
  const {
    groups,
    clubs,
    isLoading: isLoadingGroups,
    saveGroup,
    deleteGroup,
    fetchGroups,
  } = useGroups(
    eventId,
    selectedGroup,
    (updatedGroup) => {
      // Callback to update selectedGroup with fresh data from server
      console.log('🔄 useGroups callback: updating selectedGroup');
      setSelectedGroup(updatedGroup);
    }
  );

  // Member Management Hook - now connected with external selection control
  const {
    members,
    availableParticipants,
    filters,
    isLoading: isLoadingMembers,
    fetchMembers,
    fetchAvailableParticipants,
    addMember,
    removeMember,
    setHidePlanned,
    setHideOtherClubs,
    resetFilters
  } = useGroupMembers(
    selectedGroup,
    eventId, // Pass eventId for event-filtered participants
    async () => {
      // Refresh groups list when members change
      console.log('🔄 onMembersChanged called - refreshing groups');
      await fetchGroups();
      // Trigger refresh handled by useAssignmentRefresh hook
      triggerRefresh();
    }
  );

  // Assignment refresh hook (SoC pattern for DetailPane re-rendering)
  const { modalKey, triggerRefresh } = useAssignmentRefresh({
    selectedId: selectedGroup?.id,
    assignmentIds: members.map(m => m.id),
    prefix: 'group'
  });

  // Combined loading state
  const isLoading = isLoadingGroups || isLoadingMembers;

  // Auto-load members when group is selected
  useEffect(() => {
    if (selectedGroup?.id) {
      fetchMembers();
      fetchAvailableParticipants();
    }
  }, [selectedGroup?.id, fetchMembers, fetchAvailableParticipants]);

  // Debug logging
  if (selectedGroup) {
    console.log('🔍 Selected group:', selectedGroup.id, 'name:', selectedGroup.name);
    console.log('🔍 Members from hook:', members.length, 'IDs:', members.map(m => m.id));
    console.log('🔍 Members in selected group:', selectedGroup.members?.length);
  }

  // Filter available participants: exclude current members
  const memberIds = new Set(members.map(m => m.id));
  const filteredAvailableParticipants = availableParticipants
    .filter((p) => !memberIds.has(p.id)); // Exclude current members (search handled in config)

  // Debug logging
  console.log('🔍 Groups Debug:', {
    selectedGroup,
    availableParticipantsCount: availableParticipants.length,
    filteredAvailableCount: filteredAvailableParticipants.length,
    membersCount: members.length,
    memberIds: Array.from(memberIds),
    modalKey // Debug: Check key changes
  });

  // Handler: Create Group
  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormData({ name: '', clubId: '' });
    setShowFormModal(true);
  };

  // Handler: Form Submit (uses existing saveGroup)
  const handleFormSubmit = async () => {
    const success = await saveGroup(formData, editingGroup);
    if (success) {
      setShowFormModal(false);
      setEditingGroup(null);
      setFormData({ name: '', clubId: '' });
    }
  };

  // Handler: Assign Participant (receives full object from UnifiedAssignmentModal)
  const handleAssign = async (participant: GroupMember, _masterId: number | string) => {
    if (!selectedGroup) {
      console.warn('No group selected for assignment');
      return;
    }
    await addMember(participant.id);
  };

  // Handler: Delete Group (receives ID from UnifiedAssignmentModal)
  const handleDeleteGroup = async (groupId: number | string) => {
    setPendingDeleteGroupId(groupId);
  };

  const executeDeleteGroup = async (groupId: number | string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    await deleteGroup(group);
    // Clear selection if deleted group was selected
    if (selectedGroup?.id === groupId) {
      setSelectedGroup(null);
    }
  };

  // Handler: Select Group (controlled by UnifiedAssignmentModal)
  const handleSelectGroup = (group: Group | null) => {
    console.log('👆 Group selected:', group?.name || 'none');
    setSelectedGroup(group);
    // Members will be loaded by useEffect when selectedGroup changes
  };

  // Handler: Edit Group (now enabled when group is selected)
  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      clubId: group.clubId.toString()
    });
    setShowFormModal(true);
  };

  // Create modal configuration (only needs t and onRemoveMember)
  // NOTE: Like SquadManagement, we create config on every render (no useMemo)
  // This ensures callbacks always have fresh closure over current state
  const config = createGroupConfig({
    t,
    onRemoveMember: (memberId: number) => setPendingRemoveMemberId(memberId),
    // Filter props
    filters,
    onToggleHidePlanned: setHidePlanned,
    onToggleHideOtherClubs: setHideOtherClubs,
    onResetFilters: resetFilters
  });

  // Override config callbacks that UnifiedAssignmentModal doesn't handle
  const enhancedConfig = {
    ...config,
    onAssign: handleAssign,
    onEditMaster: handleEditGroup,
    onDeleteMaster: handleDeleteGroup,
  };

  return (
    <>
    <EventManagementTemplate
      title={t('groups.title')}
      subtitle={t('groups.subtitle')}
      icon={UserGroupIcon}
      showEventContext={true}
      showFilters={showFilters}
      onToggleFilters={toggleFilters}
      showHelpPanel={showHelpPanel}
      onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
      helpContent={<GroupsHelpPanel />}
      onAdd={handleCreateGroup}
      showAddButton={true}
      addButtonText={t('groups.actions.create')}
      filterSection={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('groups.filters.search')}
              </label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t('groups.filters.searchPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Club Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('groups.filters.club')}
              </label>
              <select
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('groups.filters.all')}</option>
                {clubs.map((club) => (
                  <option key={club.int_vereineid} value={club.int_vereineid.toString()}>
                    {club.var_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchFilter('');
                  setClubFilter('');
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.resetFilters')}
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* UnifiedAssignmentModal with 3-column layout */}
        {/* Key includes member IDs to force re-render when members change */}
        <UnifiedAssignmentModal
          key={modalKey}
          config={enhancedConfig}
          masterItems={groups}
          availableItems={filteredAvailableParticipants}
          assignments={[]} // Not needed for Groups (members stored in group object)
          isLoading={isLoading}
          selectedMaster={selectedGroup}
          onSelectMaster={handleSelectGroup}
          columnSearchPlaceholders={{
            master: t('groups.columnSearch.master'), // e.g., "Search groups, members, clubs..."
            available: t('groups.columnSearch.available') // e.g., "Search participants, clubs, start numbers..."
          }}
        />

        {/* Form Modal */}
        {showFormModal && (
          <GroupFormModal
            isOpen={showFormModal}
            onClose={() => {
              setShowFormModal(false);
              setEditingGroup(null);
              setFormData({ name: '', clubId: '' });
            }}
            onSubmit={handleFormSubmit}
            formData={formData}
            setFormData={setFormData}
            clubs={clubs}
            isEditing={!!editingGroup}
          />
        )}
      </div>
    </EventManagementTemplate>

    <UnifiedConfirmModal
      isOpen={pendingDeleteGroupId !== null}
      onClose={() => setPendingDeleteGroupId(null)}
      onConfirm={() => {
        const id = pendingDeleteGroupId!;
        setPendingDeleteGroupId(null);
        executeDeleteGroup(id);
      }}
      title={t('common.confirmDeleteTitle')}
      message={t('groups.confirmDelete', { name: groups.find(g => g.id === pendingDeleteGroupId)?.name || '' })}
      confirmLabel={t('common.delete')}
      confirmStyle="danger"
    />

    <UnifiedConfirmModal
      isOpen={pendingRemoveMemberId !== null}
      onClose={() => setPendingRemoveMemberId(null)}
      onConfirm={() => {
        const id = pendingRemoveMemberId!;
        setPendingRemoveMemberId(null);
        removeMember(id);
      }}
      title={t('common.confirmDeleteTitle')}
      message={t('groups.members.confirmRemove')}
      confirmLabel={t('common.delete')}
      confirmStyle="danger"
    />
  </>
  );
}

export default Groups;
