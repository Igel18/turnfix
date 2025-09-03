import React, { useState, useEffect } from 'react';
import { PlusIcon, BeakerIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader';

interface Sport {
  int_sportid: number;
  var_name: string;
  discipline_count: number;
  tfx_disziplinen?: Array<{
    int_disziplinenid: number;
    var_name: string;
  }>;
}

interface SportsResponse {
  sports: Sport[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

const Sports: React.FC = () => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    var_name: '',
  });

  const resetForm = () => {
    setFormData({
      var_name: '',
    });
    setEditingSport(null);
  };

  const fetchSports = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
        ...(search && { search })
      });

      const response = await fetch(`/api/sports?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sports');
      }

      const data: SportsResponse = await response.json();
      setSports(data.sports || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSports(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleAddSport = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (sport: Sport) => {
    setFormData({
      var_name: sport.var_name || '',
    });
    setEditingSport(sport);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.var_name.trim()) {
      alert('Please enter a sport name');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingSport 
        ? `/api/sports/${editingSport.int_sportid}`
        : '/api/sports';
      
      const method = editingSport ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save sport');
      }

      setIsModalOpen(false);
      resetForm();
      fetchSports(currentPage, searchTerm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sport? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sports/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete sport');
      }

      fetchSports(currentPage, searchTerm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getSportsStateInfo = (): StateInfo[] => {
    const totalSports = sports.length;
    const totalDisciplines = sports.reduce((sum, sport) => sum + (sport.discipline_count || 0), 0);
    
    return [
      {
        value: 'total',
        label: 'Total Sports',
        count: totalSports,
        color: 'blue'
      },
      {
        value: 'disciplines',
        label: 'Total Disciplines',
        count: totalDisciplines,
        color: 'green'
      }
    ];
  };

  const filteredSports = sports.filter(sport =>
    sport.var_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Sports Management"
        description="Manage sports categories and their associated disciplines"
        icon={BeakerIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search sports..."
        stateInfo={getSportsStateInfo()}
        onClearAllFilters={() => {
          setSearchTerm('')
        }}
        onExportCSV={() => {
          // TODO: Implement CSV export for sports
          console.log('Export sports to CSV');
        }}
        primaryAction={{
          label: 'Add Sport',
          icon: PlusIcon,
          onClick: handleAddSport
        }}
        showHomeButton={true}
        totalCount={sports.length}
        filteredCount={filteredSports.length}
      />

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading sports...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <BeakerIcon className="h-12 w-12 mx-auto mb-4" />
            </div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => fetchSports(currentPage, searchTerm)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSports.map((sport) => (
              <div key={sport.int_sportid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <BeakerIcon className="h-8 w-8 text-indigo-500 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{sport.var_name}</h3>
                      <p className="text-sm text-gray-500">ID: {sport.int_sportid}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(sport)}
                      className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit sport"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sport.int_sportid)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete sport"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Disciplines:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {sport.discipline_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredSports.length === 0 && !loading && (
              <div className="col-span-full text-center py-12">
                <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sports found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first sport to get started.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleAddSport}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Sport
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
                  {editingSport ? 'Edit Sport' : 'Create New Sport'}
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
                    Sport Name *
                  </label>
                  <input
                    type="text"
                    value={formData.var_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, var_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter sport name"
                    required
                    disabled={isSubmitting}
                  />
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
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : (editingSport ? 'Update' : 'Create')}
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

export default Sports;
