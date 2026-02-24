import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import DatabaseManagementTemplate from '@/components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '@/components/SortableTableHeader';
import { exportToCSV } from '@/utils/csvExport';
import UnifiedModal from '@/components/UnifiedModal';
import { debugLog } from '@/utils/debug';

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
  const { t } = useTranslation();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [formData, setFormData] = useState<AssociationForm>({
    var_name: '',
    var_kuerzel: '',
    int_laenderid: null
  });
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [associationsResponse, countriesResponse] = await Promise.all([
          fetch('/api/associations'),
          fetch('/api/countries')
        ]);

        if (!associationsResponse.ok || !countriesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [associationsData, countriesData] = await Promise.all([
          associationsResponse.json(),
          countriesResponse.json()
        ]);

        setAssociations(associationsData.associations || associationsData);
        setCountries(countriesData.countries || countriesData);
      } catch (error) {
        debugLog('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get filter options
  const getFilterOptions = () => [
    {
      label: t('associations.table.country'),
      value: '',
      selectedValue: selectedCountry.toString(),
      options: [
        ...countries.map(country => ({
          value: country.int_laenderid.toString(),
          label: country.var_name
        }))
      ],
      onChange: (value: string) => setSelectedCountry(value === '' ? '' : parseInt(value))
    }
  ];

  // Sort and filter data
  const sortedAssociations = sortData(associations, (association) => {
    if (sortKey === 'country_name') return association.country_name || '';
    return association[sortKey as keyof Association];
  });

  const filteredAssociations = sortedAssociations.filter(association => {
    const matchesSearch = association.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (association.var_kuerzel && association.var_kuerzel.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCountry = selectedCountry === '' || association.int_laenderid === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  // Handle actions
  const handleCreate = () => {
    setEditingAssociation(null);
    setFormData({ var_name: '', var_kuerzel: '', int_laenderid: null });
    setIsModalOpen(true);
  };

  const handleEdit = (association: Association) => {
    setEditingAssociation(association);
    setFormData({
      var_name: association.var_name,
      var_kuerzel: association.var_kuerzel || '',
      int_laenderid: association.int_laenderid
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (associationId: number) => {
    const association = associations.find(a => a.int_verbaendeid === associationId);
    if (!association || !window.confirm(t('associations.messages.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/associations/${associationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete association');

      setAssociations(prev => prev.filter(a => a.int_verbaendeid !== associationId));
    } catch (error) {
      debugLog('Error deleting association:', error);
    }
  };

  const handleSave = async () => {
    try {
      const processedData = {
        ...formData,
        var_kuerzel: formData.var_kuerzel.trim() === '' ? null : formData.var_kuerzel.trim(),
        int_laenderid: formData.int_laenderid === null || formData.int_laenderid === 0 ? null : formData.int_laenderid
      };
      
      const url = editingAssociation 
        ? `/api/associations/${editingAssociation.int_verbaendeid}`
        : '/api/associations';
      
      const method = editingAssociation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save association');
      }

      const savedAssociation = await response.json();
      
      if (editingAssociation) {
        setAssociations(prev => prev.map(a => 
          a.int_verbaendeid === editingAssociation.int_verbaendeid ? savedAssociation : a
        ));
      } else {
        setAssociations(prev => [...prev, savedAssociation]);
      }

      setIsModalOpen(false);
    } catch (error) {
      debugLog('Error saving association:', error);
    }
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: 'associations.csv',
      headers: [t('associations.table.name'), t('associations.table.abbreviation'), t('associations.table.country')],
      data: filteredAssociations.map(association => ({
        [t('associations.table.name')]: association.var_name,
        [t('associations.table.abbreviation')]: association.var_kuerzel || '',
        [t('associations.table.country')]: association.country_name || t('associations.noCountry')
      }))
    });
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedCountry('');
  };

  // Card render function for grid view
  const renderCard = (association: Association) => {
    return (
      <div key={association.int_verbaendeid} className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{association.var_name}</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-20">{t('associations.table.abbreviation')}:</span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                  {association.var_kuerzel || 'N/A'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-20">{t('associations.table.country')}:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  association.country_name ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                }`}>
                  {association.country_name || t('associations.noCountry')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => handleEdit(association)}
              className="p-1 text-blue-600 hover:text-blue-900"
              title={t('associations.editAssociation')}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(association.int_verbaendeid)}
              className="p-1 text-red-600 hover:text-red-900"
              title={t('associations.deleteAssociation')}
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
        title={t('associations.title')}
        subtitle={t('associations.subtitle') + ` (${associations.length} ${t('common.loaded')})`}
        icon={BuildingOffice2Icon}
        data={filteredAssociations}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('associations.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        onAdd={handleCreate}
        addLabel={t('associations.addAssociation')}
        viewStorageKey="associations-view"
        itemsPerPage={20}
        renderTableHeaders={() => (
          <tr>
            <SortableTableHeader
              label={t('associations.table.name')}
              sortKey="var_name"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('associations.table.abbreviation')}
              sortKey="var_kuerzel"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('associations.table.country')}
              sortKey="country_name"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('common.actions')}
            </th>
          </tr>
        )}
        renderTableRow={(association: Association) => (
          <tr key={association.int_verbaendeid} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="font-medium text-gray-900">{association.var_name}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                {association.var_kuerzel || '-'}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                association.country_name ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
              }`}>
                {association.country_name || t('associations.noCountry')}
                {association.country_kuerzel && (
                  <span className="text-gray-400 ml-1">({association.country_kuerzel})</span>
                )}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(association)}
                  className="p-1 text-blue-600 hover:text-blue-900"
                  title={t('associations.editAssociation')}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(association.int_verbaendeid)}
                  className="p-1 text-red-600 hover:text-red-900"
                  title={t('associations.deleteAssociation')}
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
      <UnifiedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssociation ? t('associations.editAssociation') : t('associations.addAssociation')}
        onSave={handleSave}
        saveLabel={editingAssociation ? t('common.update') : t('common.create')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('associations.form.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.var_name}
              onChange={(e) => setFormData({...formData, var_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder={t('associations.form.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('associations.form.abbreviation')}
            </label>
            <input
              type="text"
              value={formData.var_kuerzel}
              onChange={(e) => setFormData({...formData, var_kuerzel: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder={t('associations.form.abbreviationPlaceholder')}
              maxLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('associations.form.country')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.int_laenderid || ''}
              onChange={(e) => setFormData({...formData, int_laenderid: e.target.value === '' ? null : parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">{t('associations.noCountry')}</option>
              {countries.map(country => (
                <option key={country.int_laenderid} value={country.int_laenderid}>
                  {country.var_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </UnifiedModal>
    </>
  );
};

export default Associations;
