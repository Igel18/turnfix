import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';
import LocationFormModal from '../components/LocationFormModal';
import { UnifiedConfirmModal } from '../components/UnifiedModal';

interface Location {
  int_wettkampforteid: number;
  var_name: string;
  var_adresse?: string;
  var_plz?: string;
  var_ort?: string;
}

interface FormData {
  var_name: string;
  var_adresse: string;
  var_plz: string;
  var_ort: string;
}

const LocationsUnified: React.FC = () => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    var_name: '',
    var_adresse: '',
    var_plz: '',
    var_ort: ''
  });

  // Fetch data
  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      // Load all locations with high limit
      const response = await fetch('/api/venues?limit=5000');
      if (response.ok) {
        const data = await response.json();
        // API response has venues wrapped in an object: { venues: [], pagination: {} }
        setLocations(Array.isArray(data.venues) ? data.venues : []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Form handlers
  const resetForm = () => {
    setFormData({
      var_name: '',
      var_adresse: '',
      var_plz: '',
      var_ort: ''
    });
    setEditingLocation(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (location: Location) => {
    setFormData({
      var_name: location.var_name,
      var_adresse: location.var_adresse || '',
      var_plz: location.var_plz || '',
      var_ort: location.var_ort || ''
    });
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingLocation 
        ? `/api/venues/${editingLocation.int_wettkampforteid}`
        : '/api/venues';
      
      const method = editingLocation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save location: ${response.status} ${errorText}`);
      }
      
      await fetchLocations();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving location:', error);
      alert(t('venues.messages.createError'));
    }
  };

  const handleDelete = (id: number) => {
    setPendingDeleteId(id);
  };

  const executeDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/venues/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete location');
      }
      
      await fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert(t('venues.messages.deleteError'));
    }
  };

  // Sort and filter data
  const sortedLocations = sortData(locations, (location) => {
    if (sortKey === 'var_adresse') return location.var_adresse || '';
    if (sortKey === 'var_ort') return location.var_ort || '';
    if (sortKey === 'var_plz') return location.var_plz || '';
    return location[sortKey as keyof Location];
  });

  const filteredData = sortedLocations.filter(location => {
    const matchesSearch = !searchFilter || 
      location.var_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (location.var_adresse && location.var_adresse.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (location.var_ort && location.var_ort.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesCity = !cityFilter || 
      (location.var_ort && location.var_ort.toLowerCase().includes(cityFilter.toLowerCase()));
    
    return matchesSearch && matchesCity;
  });

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchFilter('');
    setCityFilter('');
  };

  // Get unique cities for filter
  const uniqueCities = Array.from(new Set(
    locations
      .map(location => location.var_ort)
      .filter(city => city && city.trim() !== '')
  )).sort();

  // Get filter options for template
  const getFilterOptions = () => [
    {
      value: 'city',
      label: t('venues.filters.city'),
      selectedValue: cityFilter,
      onChange: setCityFilter,
      options: [
        ...uniqueCities.map(city => ({
          value: city!,
          label: city!
        }))
      ]
    }
  ];

  // Table render functions
  const renderTableHeaders = () => (
    <tr>
      <SortableTableHeader
        label={t('venues.table.name')}
        sortKey="var_name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('venues.table.address')}
        sortKey="var_adresse"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('venues.table.city')}
        sortKey="var_ort"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
    </tr>
  );

  const renderTableRow = (location: Location) => (
    <tr key={location.int_wettkampforteid} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div className="font-medium text-gray-900">{location.var_name}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {location.var_adresse || t('venues.noAddress')}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
          <div className="text-sm text-gray-900">
            {location.var_plz && location.var_ort 
              ? `${location.var_plz} ${location.var_ort}`
              : location.var_ort || t('venues.noCity')
            }
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleEdit(location)}
            className="text-blue-600 hover:text-blue-800"
            title={t('venues.editLocation')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(location.int_wettkampforteid)}
            className="text-red-600 hover:text-red-800"
            title={t('venues.deleteLocation')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card render function
  const renderCard = (location: Location) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
            {location.var_name}
          </h3>
          <div className="space-y-2">
            {location.var_adresse && (
              <div className="text-sm text-gray-600">
                {location.var_adresse}
              </div>
            )}
            
            {(location.var_plz || location.var_ort) && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4 mr-2" />
                <span>
                  {location.var_plz && location.var_ort 
                    ? `${location.var_plz} ${location.var_ort}`
                    : location.var_ort || location.var_plz
                  }
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex space-x-2">
          <button
            onClick={() => handleEdit(location)}
            className="text-blue-600 hover:text-blue-800"
            title={t('venues.editLocation')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(location.int_wettkampforteid)}
            className="text-red-600 hover:text-red-800"
            title={t('venues.deleteLocation')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DatabaseManagementTemplate
        title={t('venues.title')}
        subtitle={t('venues.subtitle') + ` (${locations.length} ${t('venues.locationsLoaded')})`}
        icon={BuildingOfficeIcon}
        data={filteredData}
        isLoading={isLoading}
        searchTerm={searchFilter}
        onSearchChange={setSearchFilter}
        searchPlaceholder={t('venues.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onAdd={handleCreate}
        addLabel={t('venues.addLocation')}
        onEdit={handleEdit}
        onDelete={(location) => handleDelete(location.int_wettkampforteid)}
        viewStorageKey="locations-view"
        itemsPerPage={50}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      <LocationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        editingLocation={editingLocation}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
      />

      <UnifiedConfirmModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => executeDelete(pendingDeleteId!)}
        title={t('common.confirmDeleteTitle')}
        message={t('venues.messages.confirmDelete')}
        confirmLabel={t('common.delete')}
        confirmStyle="danger"
      />
    </>
  );
};

export default LocationsUnified;
