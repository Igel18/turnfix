import React, { useEffect, useState } from 'react';
import { PencilIcon, TrashIcon, GlobeEuropeAfricaIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import DatabaseManagementTemplate from '@/components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '@/components/SortableTableHeader';
import { exportToCSV } from '@/utils/csvExport';
import UnifiedModal, { UnifiedConfirmModal } from '@/components/UnifiedModal';
import { debugLog } from '@/utils/debug';

interface Country {
  int_laenderid: number;
  var_name: string;
  var_kuerzel: string;
}

interface CountryForm {
  var_name: string;
  var_kuerzel: string;
}

const SORT_KEY_NAME = 'var_name';
const SORT_KEY_ABBREVIATION = 'var_kuerzel';
const MODAL_SIZE_MD: 'md' = 'md';
const CONFIRM_STYLE_DANGER: 'danger' = 'danger';

const Countries: React.FC = () => {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAbbreviation, setSelectedAbbreviation] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [pendingDeleteCountry, setPendingDeleteCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState<CountryForm>({
    var_name: '',
    var_kuerzel: '',
  });

  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/countries?limit=10000');
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }

        const data = await response.json();
        setCountries(data.countries || data || []);
      } catch (loadError) {
        debugLog('Error loading countries:', loadError);
        setError(t('countries.messages.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const sortedCountries = sortData(countries, (country) => country[sortKey as keyof Country]);

  const getFilterOptions = () => {
    const abbreviations = Array.from(new Set(countries.map(country => country.var_kuerzel))).sort();
    return [
      {
        label: t('countries.filter.abbreviation'),
        value: '',
        selectedValue: selectedAbbreviation,
        options: abbreviations.map(code => ({
          value: code,
          label: code,
        })),
        onChange: (value: string) => setSelectedAbbreviation(value),
      },
    ];
  };

  const filteredCountries = sortedCountries.filter(country => {
    const matchesSearch = country.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.var_kuerzel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAbbreviation = selectedAbbreviation === '' || country.var_kuerzel === selectedAbbreviation;
    return matchesSearch && matchesAbbreviation;
  });

  const handleCreate = () => {
    setEditingCountry(null);
    setFormData({ var_name: '', var_kuerzel: '' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      var_name: country.var_name,
      var_kuerzel: country.var_kuerzel,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = (country: Country) => {
    setPendingDeleteCountry(country);
  };

  const executeDelete = async (country: Country) => {
    try {
      setError(null);

      const response = await fetch(`/api/countries/${country.int_laenderid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t('countries.messages.deleteError'));
      }

      setCountries(prev => prev.filter(item => item.int_laenderid !== country.int_laenderid));
    } catch (deleteError) {
      debugLog('Error deleting country:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : t('countries.messages.deleteError'));
    }
  };

  const handleSave = async () => {
    try {
      setError(null);

      const payload = {
        var_name: formData.var_name.trim(),
        var_kuerzel: formData.var_kuerzel.trim(),
      };

      const url = editingCountry
        ? `/api/countries/${editingCountry.int_laenderid}`
        : '/api/countries';

      const method = editingCountry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t('countries.messages.saveError'));
      }

      const savedCountry = await response.json();

      if (editingCountry) {
        setCountries(prev => prev.map(country => (
          country.int_laenderid === editingCountry.int_laenderid ? savedCountry : country
        )));
      } else {
        setCountries(prev => [...prev, savedCountry]);
      }

      setIsModalOpen(false);
    } catch (saveError) {
      debugLog('Error saving country:', saveError);
      setError(saveError instanceof Error ? saveError.message : t('countries.messages.saveError'));
    }
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: 'countries.csv',
      headers: [t('countries.table.name'), t('countries.table.abbreviation')],
      data: filteredCountries.map(country => ({
        [t('countries.table.name')]: country.var_name,
        [t('countries.table.abbreviation')]: country.var_kuerzel,
      })),
    });
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedAbbreviation('');
  };

  const renderCard = (country: Country) => (
    <div key={country.int_laenderid} className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{country.var_name}</h3>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-20">{t('countries.table.abbreviation')}:</span>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
              {country.var_kuerzel || t('common.notAvailable', 'N/A')}
            </span>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => handleEdit(country)}
            className="p-1 text-blue-600 hover:text-blue-900"
            title={t('countries.editCountry')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(country)}
            className="p-1 text-red-600 hover:text-red-900"
            title={t('countries.deleteCountry')}
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
        title={t('countries.title')}
        subtitle={`${t('countries.subtitle')} (${t('countries.subtitleCount', { count: countries.length })})`}
        icon={GlobeEuropeAfricaIcon}
        data={filteredCountries}
        isLoading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('countries.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        onAdd={handleCreate}
        addLabel={t('countries.addCountry')}
        viewStorageKey="countries-view"
        itemsPerPage={20}
        renderTableHeaders={() => (
          <tr>
            <SortableTableHeader
              label={t('countries.table.name')}
              sortKey={SORT_KEY_NAME}
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('countries.table.abbreviation')}
              sortKey={SORT_KEY_ABBREVIATION}
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('common.actions')}
            </th>
          </tr>
        )}
        renderTableRow={(country: Country) => (
          <tr key={country.int_laenderid} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="font-medium text-gray-900">{country.var_name}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                {country.var_kuerzel || t('common.notAvailable', 'N/A')}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(country)}
                  className="p-1 text-blue-600 hover:text-blue-900"
                  title={t('countries.editCountry')}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(country)}
                  className="p-1 text-red-600 hover:text-red-900"
                  title={t('countries.deleteCountry')}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        )}
        renderCard={renderCard}
      />

      <UnifiedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCountry ? t('countries.editCountry') : t('countries.addNewCountry')}
        onSave={handleSave}
        saveLabel={editingCountry ? t('common.update') : t('common.create')}
        size={MODAL_SIZE_MD}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('countries.form.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.var_name}
              onChange={(e) => setFormData({ ...formData, var_name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('countries.form.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('countries.form.abbreviation')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.var_kuerzel}
              onChange={(e) => setFormData({ ...formData, var_kuerzel: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('countries.form.abbreviationPlaceholder')}
              required
            />
          </div>
        </div>
      </UnifiedModal>

      <UnifiedConfirmModal
        isOpen={pendingDeleteCountry !== null}
        onClose={() => setPendingDeleteCountry(null)}
        onConfirm={() => executeDelete(pendingDeleteCountry!)}
        title={t('common.confirmDeleteTitle')}
        message={t('countries.messages.confirmDelete', { name: pendingDeleteCountry?.var_name || '' })}
        confirmLabel={t('common.delete')}
        confirmStyle={CONFIRM_STYLE_DANGER}
      />
    </>
  );
};

export default Countries;