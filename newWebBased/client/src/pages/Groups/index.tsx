/**
 * Groups Page - Main Component
 * Refactored with Separation of Concerns (SoC) + EventManagementTemplate
 * 
 * This component orchestrates group management functionality.
 * Uses EventManagementTemplate for consistent UI/UX.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

// Template & Components
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { SortableTableHeader, useTableSort } from '@/components/SortableTableHeader';

// Local Hooks & Types
import { useGroups } from './hooks';
import type { Group, GroupFormData } from './Groups.types';

// Modal Components
import { GroupFormModal, GroupMembersModal } from './components';

/**
 * Main Groups Component
 */
const Groups: React.FC = () => {
  const { t } = useTranslation();
  
  // Custom hook for data management
  const { groups, clubs, isLoading, fetchGroups, saveGroup, deleteGroup } = useGroups();
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('name', 'asc');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    clubId: ''
  });

  // Form handlers
  const resetForm = () => {
    setFormData({
      name: '',
      clubId: ''
    });
    setEditingGroup(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleEdit = (group: Group) => {
    setFormData({
      name: group.name,
      clubId: group.clubId.toString()
    });
    setEditingGroup(group);
    setIsFormModalOpen(true);
  };

  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group);
    setIsMembersModalOpen(true);
  };

  const handleDelete = async (group: Group) => {
    await deleteGroup(group);
  };

  const handleSubmit = async () => {
    const success = await saveGroup(formData, editingGroup);
    if (success) {
      setIsFormModalOpen(false);
      resetForm();
    }
  };

  // Sort data first
  const sortedGroups = sortData(groups, (group: Group) => {
    switch (sortKey) {
      case 'name': return group.name;
      case 'club': return group.clubName || '';
      case 'members': return group.memberCount;
      default: return group.name;
    }
  });

  // Then filter
  const filteredGroups = sortedGroups.filter(group => {
    const matchesSearch = searchFilter === '' || 
      group.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (group.clubName && group.clubName.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesClub = clubFilter === '' || 
      group.clubId.toString() === clubFilter;

    return matchesSearch && matchesClub;
  });

  // Render table headers
  const renderTableHeaders = () => (
    <tr>
      <SortableTableHeader
        label={t('groups.name')}
        sortKey="name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('groups.club')}
        sortKey="club"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('groups.memberCount')}
        sortKey="members"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('common.actions')}
      </th>
    </tr>
  );

  // Render table row
  const renderTableRow = (group: Group) => (
    <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {group.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900 dark:text-white">
            {group.clubName || '-'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900 dark:text-white">
            {group.memberCount}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
        <button
          onClick={() => handleManageMembers(group)}
          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          title={t('groups.manageMembers')}
        >
          <UsersIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleEdit(group)}
          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
          title={t('common.edit')}
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleDelete(group)}
          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          title={t('common.delete')}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchFilter('');
    setClubFilter('');
  };

  // Filter section component (matching EventParticipants style)
  const FilterSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('groups.searchPlaceholder')}
        </label>
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder={t('groups.searchPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Club Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('groups.filterByClub')}
        </label>
        <select
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('common.all')}</option>
          {clubs.map(club => (
            <option key={club.int_vereineid} value={club.int_vereineid.toString()}>
              {club.var_name}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      <div className="flex items-end">
        <button
          onClick={handleResetFilters}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {t('common.reset')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <EventManagementTemplate
        title={t('groups.title')}
        subtitle={t('groups.subtitle')}
        icon={UserGroupIcon}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filterSection={<FilterSection />}
        showAddButton={true}
        addButtonText={t('groups.addGroup')}
        onAdd={handleCreate}
        viewStorageKey="groups-view"
        showViewToggle={true}
      >
        {() => (
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('groups.loadingGroups')}</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('groups.noGroups')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {renderTableHeaders()}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGroups.map(renderTableRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </EventManagementTemplate>

      {isFormModalOpen && (
        <GroupFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            resetForm();
          }}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          clubs={clubs}
          isEditing={!!editingGroup}
        />
      )}

      {isMembersModalOpen && selectedGroup && (
        <GroupMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => {
            setIsMembersModalOpen(false);
            setSelectedGroup(null);
          }}
          group={selectedGroup}
          onMembersChanged={fetchGroups}
        />
      )}
    </>
  );
};

export default Groups;
