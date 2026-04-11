import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import DatabaseManagementTemplate from '@/components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '@/components/SortableTableHeader';
import { GenderBadge } from '@/components/GenderBadge';
import { exportToCSV } from '@/utils/csvExport';
import UnifiedModal, { UnifiedConfirmModal } from '@/components/UnifiedModal';

interface Area {
  int_bereicheid: number;
  var_name: string | null;
  bol_maennlich: boolean | null;
  bol_weiblich: boolean | null;
  _count?: {
    tfx_wettkaempfe: number;
  };
}

const Areas: React.FC = () => {
  const { t } = useTranslation();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [pendingDeleteArea, setPendingDeleteArea] = useState<Area | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');

  // Form state
  const [formData, setFormData] = useState({
    var_name: '',
    bol_maennlich: true,
    bol_weiblich: true,
  });

  // Load data
  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/areas?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch areas');
      const data = await response.json();
      setAreas(data.areas || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get gender display value for GenderBadge
  const getGenderValue = (area: Area): string => {
    const m = area.bol_maennlich ?? true;
    const w = area.bol_weiblich ?? true;
    if (m && w) return 'both';
    if (m) return 'male';
    if (w) return 'female';
    return 'unknown';
  };

  // Filter options
  const getFilterOptions = () => [
    {
      label: t('areas.filters.gender', 'Geschlecht'),
      value: '',
      selectedValue: genderFilter,
      options: [
        { value: 'male', label: t('common.gender.male', 'Männlich') },
        { value: 'female', label: t('common.gender.female', 'Weiblich') },
        { value: 'both', label: t('common.gender.both', 'Beide') },
      ],
      onChange: (value: string) => setGenderFilter(value),
    },
  ];

  // Sort and filter
  const sortedAreas = sortData(areas, (area) => {
    return area[sortKey as keyof Area];
  });

  const filteredAreas = sortedAreas.filter((area) => {
    const matchesSearch =
      !searchTerm ||
      (area.var_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGender =
      !genderFilter || getGenderValue(area) === genderFilter;

    return matchesSearch && matchesGender;
  });

  // CRUD handlers
  const handleCreate = () => {
    setEditingArea(null);
    setFormData({ var_name: '', bol_maennlich: true, bol_weiblich: true });
    setIsModalOpen(true);
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      var_name: area.var_name || '',
      bol_maennlich: area.bol_maennlich ?? true,
      bol_weiblich: area.bol_weiblich ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingArea
        ? `/api/areas/${editingArea.int_bereicheid}`
        : '/api/areas';
      const method = editingArea ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save area');
      }

      await loadAreas();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving area:', error);
      alert(error instanceof Error ? error.message : t('areas.messages.saveError'));
    }
  };

  const handleDelete = (area: Area) => {
    setPendingDeleteArea(area);
  };

  const executeDelete = async (area: Area) => {
    try {
      const response = await fetch(`/api/areas/${area.int_bereicheid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete area');
      }

      setAreas((prev) => prev.filter((a) => a.int_bereicheid !== area.int_bereicheid));
    } catch (error) {
      console.error('Error deleting area:', error);
      alert(error instanceof Error ? error.message : t('areas.messages.deleteError'));
    }
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: 'bereiche.csv',
      headers: [
        t('areas.table.name'),
        t('areas.table.male'),
        t('areas.table.female'),
      ],
      data: filteredAreas.map((area) => ({
        [t('areas.table.name')]: area.var_name || '',
        [t('areas.table.male')]: area.bol_maennlich ? t('common.yes') : t('common.no'),
        [t('areas.table.female')]: area.bol_weiblich ? t('common.yes') : t('common.no'),
      })),
    });
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setGenderFilter('');
  };

  // Card render
  const renderCard = (area: Area) => (
    <div
      key={area.int_bereicheid}
      className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {area.var_name || t('areas.unnamed')}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {t('areas.table.gender')}:
              </span>
              <GenderBadge value={getGenderValue(area)} />
            </div>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => handleEdit(area)}
            className="p-1 text-blue-600 hover:text-blue-900"
            title={t('common.edit')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(area)}
            className="p-1 text-red-600 hover:text-red-900"
            title={t('common.delete')}
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
        title={t('areas.title')}
        subtitle={t('areas.subtitle', { count: areas.length })}
        icon={RectangleGroupIcon}
        data={filteredAreas}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('areas.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        onAdd={handleCreate}
        addLabel={t('areas.addArea')}
        viewStorageKey="areas-view"
        itemsPerPage={20}
        renderTableHeaders={() => (
          <tr>
            <SortableTableHeader
              label={t('areas.table.name')}
              sortKey="var_name"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('areas.table.gender')}
              sortKey="bol_maennlich"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('common.actions')}
            </th>
          </tr>
        )}
        renderTableRow={(area: Area) => (
          <tr key={area.int_bereicheid} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="font-medium text-gray-900">
                {area.var_name || t('areas.unnamed')}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <GenderBadge value={getGenderValue(area)} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(area)}
                  className="p-1 text-blue-600 hover:text-blue-900"
                  title={t('common.edit')}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(area)}
                  className="p-1 text-red-600 hover:text-red-900"
                  title={t('common.delete')}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        )}
        renderCard={renderCard}
      />

      {/* Create/Edit Modal */}
      <UnifiedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArea ? t('areas.editArea') : t('areas.addArea')}
        onSave={handleSave}
        saveLabel={editingArea ? t('common.update') : t('common.create')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('areas.form.name')} *
            </label>
            <input
              type="text"
              value={formData.var_name}
              onChange={(e) =>
                setFormData({ ...formData, var_name: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('areas.form.namePlaceholder')}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('areas.form.genderAccess')}
            </label>
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.bol_maennlich}
                  onChange={(e) =>
                    setFormData({ ...formData, bol_maennlich: e.target.checked })
                  }
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {t('common.gender.male', 'Männlich')}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.bol_weiblich}
                  onChange={(e) =>
                    setFormData({ ...formData, bol_weiblich: e.target.checked })
                  }
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {t('common.gender.female', 'Weiblich')}
                </span>
              </label>
            </div>
          </div>
        </div>
      </UnifiedModal>

      <UnifiedConfirmModal
        isOpen={pendingDeleteArea !== null}
        onClose={() => setPendingDeleteArea(null)}
        onConfirm={() => executeDelete(pendingDeleteArea!)}
        title={t('common.confirmDeleteTitle')}
        message={t('areas.messages.confirmDelete', { name: pendingDeleteArea?.var_name || '' })}
        confirmLabel={t('common.delete')}
        confirmStyle="danger"
      />
    </>
  );
};

export default Areas;
