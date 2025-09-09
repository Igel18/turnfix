import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader';
import { exportToCSV } from '@/utils/csvExport';

interface Association {
  int_verbaendeid: number;
  var_name: string;
  var_kuerzel: string;
  int_laenderid: number | null;
  country_name?: string;
  country_kuerzel?: string;
}

interface Country {
  int_laenderid: number;
  var_name: string;
  var_kuerzel: string;
}

interface AssociationForm {
  var_name: string;
  var_kuerzel: string;
  int_laenderid: number | null;
}

const Associations: React.FC = () => {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<number | ''>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [formData, setFormData] = useState<AssociationForm>({
    var_name: '',
    var_kuerzel: '',
    int_laenderid: null
  });

  const filteredAssociations = associations.filter(association => {
    const matchesSearch = !searchTerm || 
      association.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (association.var_kuerzel && association.var_kuerzel.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCountry = !selectedCountry || association.int_laenderid === selectedCountry;
    
    // Filter by selected state
    const matchesState = !selectedState || 
      (selectedState === 'total') ||
      (selectedState === 'with-country' && association.int_laenderid) ||
      (selectedState === 'no-country' && !association.int_laenderid);
    
    return matchesSearch && matchesCountry && matchesState;
  });

  // Unified Header functions
  const getAssociationStateInfo = (): StateInfo[] => {
    const total = associations.length;
    const withCountry = associations.filter(a => a.int_laenderid).length;
    const withoutCountry = total - withCountry;
    
    return [
      {
        label: 'Total',
        value: 'total',
        count: total,
        color: 'blue'
      },
      {
        label: 'With Country',
        value: 'with-country',
        count: withCountry,
        color: 'green'
      },
      {
        label: 'No Country',
        value: 'no-country',
        count: withoutCountry,
        color: 'red'
      }
    ];
  };

  const getFilterOptions = () => {
    return [
      {
        label: 'Country',
        value: selectedCountry.toString(),
        selectedValue: selectedCountry.toString(),
        onChange: (value: string) => setSelectedCountry(value === '' ? '' : parseInt(value)),
        options: [
          { label: 'All Countries', value: '' },
          ...countries.map(country => ({
            label: country.var_name,
            value: country.int_laenderid.toString()
          }))
        ]
      }
    ];
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedCountry('');
    setSelectedState('');
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
  };

  const handleExportCSV = () => {
    exportToCSV({
      data: filteredAssociations,
      headers: ['var_name', 'var_kuerzel', 'country_name'],
      filename: 'associations.csv'
    });
  };

  const fetchAssociations = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCountry) params.append('country_id', selectedCountry.toString());
      
      const response = await fetch(`/api/associations?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch associations');
      }

      const data = await response.json();
      setAssociations(data.associations || []);
    } catch (error) {
      console.error('Error fetching associations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/countries');

      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }

      const data = await response.json();
      setCountries(data?.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  useEffect(() => {
    fetchAssociations();
    fetchCountries();
  }, [searchTerm, selectedCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Transform form data to ensure empty strings become null
      const processedData = {
        ...formData,
        var_kuerzel: formData.var_kuerzel.trim() === '' ? null : formData.var_kuerzel.trim(),
        int_laenderid: formData.int_laenderid === null || formData.int_laenderid === 0 ? null : formData.int_laenderid
      };
      
      console.log('Original form data:', formData);
      console.log('Processed form data:', processedData);
      
      const url = editingAssociation
        ? `/api/associations/${editingAssociation.int_verbaendeid}`
        : '/api/associations';      const method = editingAssociation ? 'PUT' : 'POST';
      console.log(`Making ${method} request to ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to save association');
      }

      const responseData = await response.json();
      console.log('Success response:', responseData);
      
      await fetchAssociations();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving association:', error);
      alert('Failed to save association. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this association? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/associations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete association');
      }

      await fetchAssociations();
    } catch (error) {
      console.error('Error deleting association:', error);
      alert('Failed to delete association. It may be in use by existing regions.');
    }
  };

  const handleEdit = (association: Association) => {
    setEditingAssociation(association);
    setFormData({
      var_name: association.var_name,
      var_kuerzel: association.var_kuerzel || '',
      int_laenderid: association.int_laenderid || null
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAssociation(null);
    setFormData({
      var_name: '',
      var_kuerzel: '',
      int_laenderid: null
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Unified Header */}
      <UnifiedHeader
        title="Manage Associations"
        description="Manage gymnastics associations and federations (Verbände)"
        icon={BuildingOffice2Icon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search associations..."
        stateInfo={getAssociationStateInfo()}
        selectedState={selectedState}
        onStateChange={handleStateChange}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: "Add Association",
          icon: PlusIcon,
          onClick: () => setIsModalOpen(true)
        }}
      />

      {/* Associations Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Association Name</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Abbreviation</th>
                <th className="text-left py-4 px-6 font-medium text-gray-900">Country</th>
                <th className="text-right py-4 px-6 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssociations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    No associations found. {searchTerm && "Try adjusting your search criteria."}
                  </td>
                </tr>
              ) : (
                filteredAssociations.map((association) => (
                  <tr key={association.int_verbaendeid} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{association.var_name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-600">{association.var_kuerzel || '-'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-600">
                        {association.country_name || 'No Country'}
                        {association.country_kuerzel && (
                          <span className="text-gray-400 ml-2">({association.country_kuerzel})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(association)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Association"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(association.int_verbaendeid)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Association"
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

      {/* Modal for Adding/Editing Associations */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingAssociation ? 'Edit Association' : 'Add New Association'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Association Name *
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
                  maxLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  id="country"
                  value={formData.int_laenderid || ''}
                  onChange={(e) => setFormData({...formData, int_laenderid: e.target.value === '' ? null : parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Country</option>
                  {countries.map((country) => (
                    <option key={country.int_laenderid} value={country.int_laenderid}>
                      {country.var_name}
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
                  {editingAssociation ? 'Update' : 'Create'} Association
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Associations;
