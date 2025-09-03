import React, { useState, useEffect } from 'react';
import { PlusIcon, TagIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader';

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

interface Discipline {
  id: number;
  name: string;
  unit?: string;
  short_name?: string;
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

const DisciplineGroups: React.FC = () => {
  const [disciplineGroups, setDisciplineGroups] = useState<DisciplineGroup[]>([]);
  const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DisciplineGroup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    var_name: '',
    txt_comment: '',
  });

  const resetForm = () => {
    setFormData({
      var_name: '',
      txt_comment: '',
    });
    setSelectedDisciplines([]);
    setEditingGroup(null);
  };

  const fetchDisciplineGroups = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
        ...(search && { search })
      });

      const response = await fetch(`/api/discipline-groups?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch discipline groups');
      }

      const data: DisciplineGroupsResponse = await response.json();
      setDisciplineGroups(data.disciplineGroups || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDisciplineGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDisciplines = async () => {
    try {
      const response = await fetch('/api/disciplines?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch disciplines');
      }
      const data = await response.json();
      // The API returns a flat array, not an object with disciplines property
      setAllDisciplines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching disciplines:', err);
      setAllDisciplines([]);
    }
  };

  useEffect(() => {
    fetchDisciplineGroups(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleAddGroup = async () => {
    resetForm();
    await fetchAllDisciplines();
    setIsModalOpen(true);
  };

  const handleEdit = async (group: DisciplineGroup) => {
    setFormData({
      var_name: group.var_name || '',
      txt_comment: group.txt_comment || '',
    });
    setEditingGroup(group);
    
    // Set selected disciplines from the group
    // Note: disciplines from the group API use int_disziplinenid
    const disciplineIds = group.disciplines?.map(d => d.int_disziplinenid) || [];
    setSelectedDisciplines(disciplineIds);
    
    await fetchAllDisciplines();
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.var_name.trim()) {
      alert('Please enter a group name');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingGroup 
        ? `/api/discipline-groups/${editingGroup.int_disziplinen_gruppenid}`
        : '/api/discipline-groups';
      
      const method = editingGroup ? 'PUT' : 'POST';
      
      const requestBody = {
        var_name: formData.var_name.trim(),
        txt_comment: formData.txt_comment.trim() || undefined,
        disciplineIds: selectedDisciplines,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save discipline group');
      }

      setIsModalOpen(false);
      resetForm();
      fetchDisciplineGroups(currentPage, searchTerm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisciplineToggle = (disciplineId: number) => {
    setSelectedDisciplines(prev => 
      prev.includes(disciplineId)
        ? prev.filter(id => id !== disciplineId)
        : [...prev, disciplineId]
    );
  };

  const getSelectedDisciplineNames = () => {
    return allDisciplines
      .filter(d => selectedDisciplines.includes(d.id))
      .map(d => d.name)
      .join(', ');
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

      fetchDisciplineGroups(currentPage, searchTerm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getDisciplineGroupsStateInfo = (): StateInfo[] => {
    const totalGroups = disciplineGroups.length;
    const totalDisciplines = disciplineGroups.reduce((sum, group) => sum + (group.discipline_count || 0), 0);
    const groupsWithComment = disciplineGroups.filter(g => g.txt_comment && g.txt_comment.trim()).length;
    
    return [
      {
        value: 'total',
        label: 'Total Groups',
        count: totalGroups,
        color: 'blue'
      },
      {
        value: 'withComment',
        label: 'With Comments',
        count: groupsWithComment,
        color: 'green'
      },
      {
        value: 'disciplines',
        label: 'Total Disciplines',
        count: totalDisciplines,
        color: 'orange'
      }
    ];
  };

  const filteredDisciplineGroups = disciplineGroups.filter(group =>
    group.var_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.txt_comment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Discipline Groups Management"
        description="Manage groups of related disciplines for organization and competition"
        icon={TagIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search discipline groups..."
        stateInfo={getDisciplineGroupsStateInfo()}
        onClearAllFilters={() => {
          setSearchTerm('')
        }}
        onExportCSV={() => {
          // TODO: Implement CSV export for discipline groups
          console.log('Export discipline groups to CSV');
        }}
        primaryAction={{
          label: 'Add Group',
          icon: PlusIcon,
          onClick: handleAddGroup
        }}
        showHomeButton={true}
        totalCount={disciplineGroups.length}
        filteredCount={filteredDisciplineGroups.length}
      />

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading discipline groups...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <TagIcon className="h-12 w-12 mx-auto mb-4" />
            </div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => fetchDisciplineGroups(currentPage, searchTerm)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDisciplineGroups.map((group) => (
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
            ))}
            
            {filteredDisciplineGroups.length === 0 && !loading && (
              <div className="col-span-full text-center py-12">
                <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No discipline groups found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first discipline group to get started.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleAddGroup}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Group
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingGroup ? 'Edit Discipline Group' : 'Create New Discipline Group'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.var_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, var_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter group name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment
                  </label>
                  <textarea
                    value={formData.txt_comment}
                    onChange={(e) => setFormData(prev => ({ ...prev, txt_comment: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter description or comment (optional)"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Disciplines
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                    {allDisciplines.length === 0 ? (
                      <p className="text-gray-500 text-sm">Loading disciplines...</p>
                    ) : (
                      <div className="space-y-2">
                        {allDisciplines.map((discipline) => (
                          <label
                            key={discipline.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDisciplines.includes(discipline.id)}
                              onChange={() => handleDisciplineToggle(discipline.id)}
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              disabled={isSubmitting}
                            />
                            <span className="text-sm text-gray-700">
                              {discipline.name}
                              {discipline.unit && (
                                <span className="text-gray-500 ml-1">({discipline.unit})</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedDisciplines.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {getSelectedDisciplineNames()}
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : (editingGroup ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineGroups;
