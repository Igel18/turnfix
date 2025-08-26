import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MapIcon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { exportToCSV } from '@/utils/csvExport'

interface Region {
  int_gaueid: number;
  var_name: string;
  var_kuerzel: string;
  int_verbaendeid: number | null;
  verband_name?: string;
  verband_kuerzel?: string;
}

interface Verband {
  int_verbaendeid: number;
  var_name: string;
  var_kuerzel: string;
}

interface RegionForm {
  var_name: string;
  var_kuerzel: string;
  int_verbaendeid: number | null;
}

const Regions: React.FC = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [verbaende, setVerbaende] = useState<Verband[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVerband, setSelectedVerband] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState<RegionForm>({
    var_name: '',
    var_kuerzel: '',
    int_verbaendeid: null
  });

  // State for UnifiedHeader
  const [selectedStatus, setSelectedStatus] = useState('');

  // Get region state info for badges
  const getRegionStateInfo = (): StateInfo[] => {
    const totalRegions = regions.length;
    const regionsWithAssociation = regions.filter(r => r.int_verbaendeid).length;
    const regionsWithoutAssociation = totalRegions - regionsWithAssociation;

    return [
      {
        value: 'with-association',
        label: 'With Association',
        count: regionsWithAssociation,
        color: 'bg-green-100 text-green-800'
      },
      {
        value: 'without-association',
        label: 'Without Association',
        count: regionsWithoutAssociation,
        color: 'bg-red-100 text-red-800'
      }
    ];
  };

  // Get filter options for UnifiedHeader
  const getFilterOptions = () => [
    {
      label: 'Association',
      value: 'verband',
      options: [
        { value: '', label: 'All Associations' },
        ...verbaende.map(verband => ({
          value: verband.int_verbaendeid.toString(),
          label: verband.var_name,
          count: regions.filter(r => r.int_verbaendeid === verband.int_verbaendeid).length
        }))
      ],
      selectedValue: selectedVerband.toString(),
      onChange: (value: string) => setSelectedVerband(value === '' ? '' : parseInt(value))
    }
  ];

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedVerband('');
    setSelectedStatus('');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = filteredRegions.map(region => ({
      'Region Name': region.var_name,
      'Abbreviation': region.var_kuerzel,
      'Association': region.verband_name || 'No Association',
      'Association Code': region.verband_kuerzel || ''
    }));

    exportToCSV({
      data: csvData,
      headers: ['Region Name', 'Abbreviation', 'Association', 'Association Code'],
      filename: 'regions-export'
    });
  };

  // Filter regions based on search and selection
  const filteredRegions = regions.filter(region => {
    const matchesSearch = !searchTerm || 
      region.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.var_kuerzel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.verband_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVerband = !selectedVerband || region.int_verbaendeid === selectedVerband;

    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'with-association' && region.int_verbaendeid) ||
      (selectedStatus === 'without-association' && !region.int_verbaendeid);

    return matchesSearch && matchesVerband && matchesStatus;
  });

  const fetchRegions = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedVerband) params.append('verband_id', selectedVerband.toString());
      
      const response = await fetch(`/api/regions?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }

      const data = await response.json();
      setRegions(data.regions || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerbaende = async () => {
    try {
      const response = await fetch('/api/regions/data/verbaende');

      if (!response.ok) {
        throw new Error('Failed to fetch verbaende');
      }

      const data = await response.json();
      setVerbaende(data || []);
    } catch (error) {
      console.error('Error fetching verbaende:', error);
    }
  };

  useEffect(() => {
    fetchRegions();
    fetchVerbaende();
  }, [searchTerm, selectedVerband]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingRegion 
        ? `/api/regions/${editingRegion.int_gaueid}`
        : '/api/regions';
      
      const method = editingRegion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save region');
      }

      await fetchRegions();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving region:', error);
      alert('Failed to save region. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this region? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/regions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete region');
      }

      await fetchRegions();
    } catch (error) {
      console.error('Error deleting region:', error);
      alert('Failed to delete region. It may be in use by existing clubs.');
    }
  };

  const handleEdit = (region: Region) => {
    setEditingRegion(region);
    setFormData({
      var_name: region.var_name,
      var_kuerzel: region.var_kuerzel || '',
      int_verbaendeid: region.int_verbaendeid || null
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRegion(null);
    setFormData({
      var_name: '',
      var_kuerzel: '',
      int_verbaendeid: null
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Region Management"
        description={`Manage gymnastics regions and districts (${regions.length} regions loaded)`}
        icon={MapIcon}
        stateInfo={getRegionStateInfo()}
        selectedState={selectedStatus}
        onStateChange={setSelectedStatus}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search regions..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'Add Region',
          icon: PlusIcon,
          onClick: () => setIsModalOpen(true)
        }}
        totalCount={filteredRegions.length}
      />

      {/* Regions Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Region Name</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Abbreviation</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Association</th>
                <th className="text-right py-4 px-6 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRegions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    No regions found. {searchTerm && "Try adjusting your search criteria."}
                  </td>
                </tr>
              ) : (
                filteredRegions.map((region) => (
                  <tr key={region.int_gaueid} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{region.var_name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-600">{region.var_kuerzel || '-'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-600">
                        {region.verband_name || 'No Association'}
                        {region.verband_kuerzel && (
                          <span className="text-gray-400 ml-2">({region.verband_kuerzel})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(region)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Region"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(region.int_gaueid)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Region"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Adding/Editing Regions */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingRegion ? 'Edit Region' : 'Add New Region'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Region Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.var_name}
                  onChange={(e) => setFormData({...formData, var_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="abbreviation" className="block text-sm font-medium text-gray-700 mb-2">
                  Abbreviation
                </label>
                <input
                  id="abbreviation"
                  type="text"
                  value={formData.var_kuerzel}
                  onChange={(e) => setFormData({...formData, var_kuerzel: e.target.value})}
                  maxLength={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="verband" className="block text-sm font-medium text-gray-700 mb-2">
                  Association
                </label>
                <select
                  id="verband"
                  value={formData.int_verbaendeid || ''}
                  onChange={(e) => setFormData({...formData, int_verbaendeid: e.target.value === '' ? null : parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Association</option>
                  {verbaende.map((verband) => (
                    <option key={verband.int_verbaendeid} value={verband.int_verbaendeid}>
                      {verband.var_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRegion ? 'Update' : 'Create'} Region
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Regions;
