import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';
import GroupFormModal from '../components/GroupFormModal';
import GroupMembersModal from '../components/GroupMembersModal';

interface Group {
  id: number;
  clubId: number;
  name: string;
  memberCount: number;
  clubName?: string;
  members?: GroupMember[];
}

interface GroupMember {
  id: number;
  firstName: string;
  lastName: string;
  clubId: number;
  clubName?: string;
}

interface Club {
  int_vereineid: number;
  var_name: string;
}

interface FormData {
  name: string;
  clubId: string;
}

const GroupsUnified: React.FC = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('name', 'asc');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    clubId: ''
  });

  // Fetch data
  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/groups?limit=5000');
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
  };

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

  useEffect(() => {
    fetchGroups();
    fetchClubs();
  }, []);

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
    if (!window.confirm(t('groups.confirmDelete', { name: group.name }))) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || t('groups.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      alert(t('groups.deleteError'));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.clubId) {
      alert(t('groups.validation.requiredFields'));
      return;
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
        setIsFormModalOpen(false);
        resetForm();
        await fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || t('groups.saveError'));
      }
    } catch (error) {
      console.error('Error saving group:', error);
      alert(t('groups.saveError'));
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

  // Filter options for the template
  const getFilterOptions = () => [
    {
      value: '',
      label: t('groups.filterByClub'),
      selectedValue: clubFilter,
      onChange: setClubFilter,
      options: [
        ...clubs.map(club => ({ 
          value: club.int_vereineid.toString(), 
          label: club.var_name 
        }))
      ]
    }
  ];

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

  return (
    <>
      <DatabaseManagementTemplate
        title={t('groups.title')}
        subtitle={t('groups.subtitle')}
        icon={UserGroupIcon}
        data={filteredGroups}
        isLoading={isLoading}
        searchTerm={searchFilter}
        onSearchChange={setSearchFilter}
        searchPlaceholder={t('groups.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={() => setClubFilter('')}
        viewStorageKey="groups-view"
        defaultView="table"
        onAdd={handleCreate}
        addLabel={t('groups.addGroup')}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
      />

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

export default GroupsUnified;
