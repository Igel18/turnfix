import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, MapIcon } from '@heroicons/react/24/outline';
import DatabaseManagementTemplate from '@/components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '@/components/SortableTableHeader';
import { exportToCSV } from '@/utils/csvExport';

interface Region {
  int_gaueid: number;
  var_name: string;
  var_kuerzel: string;
  int_verbaendeid?: number;
  verband_name?: string;
}

interface Verband {
  int_verbaendeid: number;
  var_name: string;
  var_kurz: string;
}

const Regions: React.FC = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [verbaende, setVerbaende] = useState<Verband[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVerband, setSelectedVerband] = useState<string | number>('');
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');

  // Form state
  const [formData, setFormData] = useState({
    var_name: '',
    var_kurz: '',
    int_verbaendeid: ''
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [regionsResponse, verbaendeResponse] = await Promise.all([
          fetch('/api/regions'),
          fetch('/api/associations')
        ]);

        if (!regionsResponse.ok || !verbaendeResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [regionsData, verbaendeData] = await Promise.all([
          regionsResponse.json(),
          verbaendeResponse.json()
        ]);

        setRegions(regionsData.regions || regionsData);
        setVerbaende(verbaendeData.associations || verbaendeData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get filter options
  const getFilterOptions = () => [
    {
      label: 'Association',
      value: '',
      selectedValue: selectedVerband.toString(),
      options: [
        ...verbaende.map(verband => ({
          value: verband.int_verbaendeid.toString(),
          label: verband.var_name
        }))
      ],
      onChange: (value: string) => setSelectedVerband(value === '' ? '' : parseInt(value))
    },
    {
      label: 'Region Type',
      value: '',
      selectedValue: '',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'district', label: 'Districts' },
        { value: 'region', label: 'Regions' }
      ],
      onChange: (value: string) => {
        // This could filter by region type if we had that data
        console.log('Region type filter:', value);
      }
    }
  ];

  // Sort and filter data
  const sortedRegions = sortData(regions, (region) => {
    if (sortKey === 'verband_name') return region.verband_name || '';
    return region[sortKey as keyof Region];
  });

  const filteredRegions = sortedRegions.filter(region => {
    const matchesSearch = region.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         region.var_kuerzel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVerband = selectedVerband === '' || region.int_verbaendeid === selectedVerband;
    return matchesSearch && matchesVerband;
  });

  // Handle actions
  const handleCreate = () => {
    setEditingRegion(null);
    setFormData({ var_name: '', var_kurz: '', int_verbaendeid: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (region: Region) => {
    setEditingRegion(region);
    setFormData({
      var_name: region.var_name,
      var_kurz: region.var_kuerzel,
      int_verbaendeid: region.int_verbaendeid?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingRegion 
        ? `/api/regions/${editingRegion.int_gaueid}`
        : '/api/regions';
      
      const method = editingRegion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          var_name: formData.var_name,
          var_kuerzel: formData.var_kurz,
          int_verbaendeid: formData.int_verbaendeid ? parseInt(formData.int_verbaendeid) : null
        })
      });

      if (!response.ok) throw new Error('Failed to save region');

      const savedRegion = await response.json();
      
      if (editingRegion) {
        setRegions(prev => prev.map(r => 
          r.int_gaueid === editingRegion.int_gaueid ? savedRegion : r
        ));
      } else {
        setRegions(prev => [...prev, savedRegion]);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving region:', error);
    }
  };

  const handleDelete = async (region: Region) => {
    if (!window.confirm(`Are you sure you want to delete "${region.var_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/regions/${region.int_gaueid}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete region');

      setRegions(prev => prev.filter(r => r.int_gaueid !== region.int_gaueid));
    } catch (error) {
      console.error('Error deleting region:', error);
    }
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: 'regions.csv',
      headers: ['Region Name', 'Abbreviation', 'Association'],
      data: filteredRegions.map(region => {
        const verband = verbaende.find(v => v.int_verbaendeid === region.int_verbaendeid);
        return {
          'Region Name': region.var_name,
          'Abbreviation': region.var_kuerzel,
          'Association': verband?.var_name || 'No Association'
        };
      })
    });
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedVerband('');
  };

  // Card render function for grid view
  const renderCard = (region: Region) => {
    const verband = verbaende.find(v => v.int_verbaendeid === region.int_verbaendeid);
    
    return (
      <div key={region.int_gaueid} className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{region.var_name}</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-20">Code:</span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                  {region.var_kuerzel}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-20">Association:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  verband ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                }`}>
                  {verband?.var_name || 'No Association'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => handleEdit(region)}
              className="p-1 text-blue-600 hover:text-blue-900"
              title="Edit region"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(region)}
              className="p-1 text-red-600 hover:text-red-900"
              title="Delete region"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <DatabaseManagementTemplate
        title="Region Management"
        subtitle={`Manage gymnastics regions and districts (${regions.length} regions loaded)`}
        icon={MapIcon}
        data={filteredRegions}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search regions..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        onAdd={handleCreate}
        addLabel="Add Region"
        viewStorageKey="regions-view"
        itemsPerPage={20}
        renderTableHeaders={() => (
          <tr>
            <SortableTableHeader
              label="Region Name"
              sortKey="var_name"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label="Abbreviation"
              sortKey="var_kuerzel"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label="Association"
              sortKey="verband_name"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        )}
        renderTableRow={(region: Region) => (
          <tr key={region.int_gaueid} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="font-medium text-gray-900">{region.var_name}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                {region.var_kuerzel}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              {(() => {
                const verband = verbaende.find(v => v.int_verbaendeid === region.int_verbaendeid);
                return (
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    verband ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {verband?.var_name || 'No Association'}
                  </span>
                );
              })()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(region)}
                  className="p-1 text-blue-600 hover:text-blue-900"
                  title="Edit region"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(region)}
                  className="p-1 text-red-600 hover:text-red-900"
                  title="Delete region"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        )}
        renderCard={renderCard}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {editingRegion ? 'Edit Region' : 'Add New Region'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region Name
                </label>
                <input
                  type="text"
                  value={formData.var_name}
                  onChange={(e) => setFormData({...formData, var_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter region name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abbreviation
                </label>
                <input
                  type="text"
                  value={formData.var_kurz}
                  onChange={(e) => setFormData({...formData, var_kurz: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter abbreviation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Association
                </label>
                <select
                  value={formData.int_verbaendeid}
                  onChange={(e) => setFormData({...formData, int_verbaendeid: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Association</option>
                  {verbaende.map(verband => (
                    <option key={verband.int_verbaendeid} value={verband.int_verbaendeid}>
                      {verband.var_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingRegion ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Regions;
