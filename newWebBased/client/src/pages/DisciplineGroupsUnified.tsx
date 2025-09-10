import React, { useState, useEffect } from 'react';
import { TagIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import DatabaseManagementTemplate from '@/components/DatabaseManagementTemplate';
import DisciplineGroupFormModal from '@/components/DisciplineGroupFormModal';

interface DisciplineGroup {
  int_disziplinen_gruppenid: number;
  var_name: string;
  txt_comment?: string;
  discipline_count: number;
  disciplines?: Array<{
    int_disziplinenid: number;
    var_name: string;
    position?: number;
  }>;
}

interface DisciplineGroupsResponse {
  disciplineGroups: DisciplineGroup[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

const DisciplineGroupsUnified: React.FC = () => {
  const [disciplineGroups, setDisciplineGroups] = useState<DisciplineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DisciplineGroup | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Search and filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [hasCommentFilter, setHasCommentFilter] = useState<string>('all');
  const [disciplineCountFilter, setDisciplineCountFilter] = useState<string>('all');

  const fetchDisciplineGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/discipline-groups?limit=5000');
      if (!response.ok) {
        throw new Error('Failed to fetch discipline groups');
      }

      const data: DisciplineGroupsResponse = await response.json();
      setDisciplineGroups(data.disciplineGroups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDisciplineGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisciplineGroups();
  }, []);

  const handleCreate = () => {
    setEditingGroup(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (group: DisciplineGroup) => {
    setEditingGroup(group);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      const url = modalMode === 'edit' && editingGroup 
        ? `/api/discipline-groups/${editingGroup.int_disziplinen_gruppenid}`
        : '/api/discipline-groups';
      
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save discipline group');
      }

      await fetchDisciplineGroups();
    } catch (error) {
      console.error('Error saving discipline group:', error);
      throw error; // Re-throw to let the modal handle it
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this discipline group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/discipline-groups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete discipline group');
      }

      await fetchDisciplineGroups();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Filter options
  const filterOptions = [
    {
      value: 'hasComment',
      label: 'Comment Status',
      selectedValue: hasCommentFilter,
      onChange: setHasCommentFilter,
      options: [
        { value: 'all', label: 'All Groups' },
        { value: 'with-comment', label: 'With Comment' },
        { value: 'no-comment', label: 'No Comment' },
      ]
    },
    {
      value: 'disciplineCount',
      label: 'Discipline Count',
      selectedValue: disciplineCountFilter,
      onChange: setDisciplineCountFilter,
      options: [
        { value: 'all', label: 'All Counts' },
        { value: 'empty', label: 'No Disciplines (0)' },
        { value: 'few', label: 'Few Disciplines (1-5)' },
        { value: 'many', label: 'Many Disciplines (6+)' },
      ]
    }
  ];

  // Apply filters
  const getFilteredData = () => {
    return disciplineGroups.filter(group => {
      // Search filter
      const matchesSearch = !searchFilter || 
        group.var_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        group.txt_comment?.toLowerCase().includes(searchFilter.toLowerCase());

      // Comment filter
      const matchesComment = hasCommentFilter === 'all' ||
        (hasCommentFilter === 'with-comment' && group.txt_comment && group.txt_comment.trim()) ||
        (hasCommentFilter === 'no-comment' && (!group.txt_comment || !group.txt_comment.trim()));

      // Discipline count filter
      const disciplineCount = group.discipline_count || 0;
      const matchesDisciplineCount = disciplineCountFilter === 'all' ||
        (disciplineCountFilter === 'empty' && disciplineCount === 0) ||
        (disciplineCountFilter === 'few' && disciplineCount >= 1 && disciplineCount <= 5) ||
        (disciplineCountFilter === 'many' && disciplineCount >= 6);

      return matchesSearch && matchesComment && matchesDisciplineCount;
    });
  };

  const filteredData = getFilteredData();

  const resetFilters = () => {
    setSearchFilter('');
    setHasCommentFilter('all');
    setDisciplineCountFilter('all');
  };

  // Custom table row renderer
  const renderTableRow = (group: DisciplineGroup) => (
    <tr key={group.int_disziplinen_gruppenid}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {group.int_disziplinen_gruppenid}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <TagIcon className="h-5 w-5 text-orange-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{group.var_name}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {group.txt_comment || (
            <span className="text-gray-400 italic">No comment</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          {group.discipline_count || 0}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(group)}
            className="p-1 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded transition-colors"
            title="Edit discipline group"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(group.int_disziplinen_gruppenid)}
            className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
            title="Delete discipline group"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Custom card renderer
  const renderCard = (group: DisciplineGroup) => (
    <div key={group.int_disziplinen_gruppenid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <TagIcon className="h-8 w-8 text-orange-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{group.var_name}</h3>
            <p className="text-sm text-gray-500">ID: {group.int_disziplinen_gruppenid}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(group)}
            className="p-2 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition-colors"
            title="Edit discipline group"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(group.int_disziplinen_gruppenid)}
            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete discipline group"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {group.txt_comment && (
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-gray-500 mb-1">Comment:</p>
            <p className="text-sm text-gray-800">
              {group.txt_comment.length > 100 
                ? `${group.txt_comment.substring(0, 100)}...` 
                : group.txt_comment
              }
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Disciplines:</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {group.discipline_count || 0}
          </span>
        </div>

        {group.disciplines && group.disciplines.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">Sample disciplines:</p>
            <div className="flex flex-wrap gap-1">
              {group.disciplines.slice(0, 3).map((discipline) => (
                <span
                  key={discipline.int_disziplinenid}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {discipline.var_name}
                </span>
              ))}
              {group.disciplines.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  +{group.disciplines.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <DatabaseManagementTemplate
        title="Discipline Groups Management"
        subtitle={`Manage groups of related disciplines for organization and competition (${disciplineGroups.length} groups loaded)`}
        icon={TagIcon}
        data={filteredData}
        isLoading={loading}
        error={error}
        searchTerm={searchFilter}
        onSearchChange={setSearchFilter}
        searchPlaceholder="Search discipline groups..."
        filterOptions={filterOptions}
        onClearAllFilters={resetFilters}
        onAdd={handleCreate}
        addLabel="Add Group"
        viewStorageKey="discipline-groups-view"
        itemsPerPage={50}
        renderTableHeaders={() => (
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disciplines</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        )}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      <DisciplineGroupFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        disciplineGroup={editingGroup}
        mode={modalMode}
      />
    </>
  );
};

export default DisciplineGroupsUnified;
