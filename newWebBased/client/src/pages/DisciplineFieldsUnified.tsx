import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, TableCellsIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import DatabaseManagementTemplate from '../components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';
import { BlueInfoBox, GreenInfoBox, RedInfoBox, InfoList, FeatureList } from '../components/InfoBoxes';
import DisciplineFieldFormModal from '../components/DisciplineFieldFormModal';

interface DisciplineField {
  id: number;
  disciplineId: number;
  disciplineName: string;
  disciplineShort: string;
  name: string;
  sortOrder: number | null;
  isFinalScore: boolean;
  isStartingScore: boolean;
  group: number;
  enabled: boolean;
}

interface Discipline {
  id: number;
  name: string;
  short_name?: string;
}

const DisciplineFieldsUnified: React.FC = () => {
  const { t } = useTranslation();
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<DisciplineField | null>(null);
  const [formData, setFormData] = useState({
    disciplineId: '',
    name: '',
    sortOrder: '',
    group: '',
    isFinalScore: false,
    isStartingScore: false,
    enabled: true
  });

  // Filter states
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [fieldTypeFilter, setFieldTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('disciplineName', 'asc');

  // Help panel state
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch discipline fields and disciplines
      const [fieldsResponse, disciplinesResponse] = await Promise.all([
        fetch('/api/discipline-fields?limit=1000'),
        fetch('/api/disciplines?limit=1000')
      ]);

      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        // Handle both array response and object with disciplineFields property
        const fieldsArray = Array.isArray(fieldsData) ? fieldsData : 
                           (Array.isArray(fieldsData.disciplineFields) ? fieldsData.disciplineFields : 
                            Array.isArray(fieldsData.value) ? fieldsData.value : []);
        setDisciplineFields(fieldsArray);
      }

      if (disciplinesResponse.ok) {
        const disciplinesData = await disciplinesResponse.json();
        // Handle both array response and object with disciplines property
        const disciplinesArray = Array.isArray(disciplinesData) ? disciplinesData :
                                 (Array.isArray(disciplinesData.disciplines) ? disciplinesData.disciplines : []);
        console.log('Loaded disciplines:', disciplinesArray.length, disciplinesArray);
        setDisciplines(disciplinesArray);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setDisciplineFields([]);
      setDisciplines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: DisciplineField) => {
    setEditingField(field);
    setFormData({
      disciplineId: field.disciplineId.toString(),
      name: field.name,
      sortOrder: field.sortOrder?.toString() || '',
      group: field.group.toString(),
      isFinalScore: field.isFinalScore,
      isStartingScore: field.isStartingScore,
      enabled: field.enabled
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    console.log('handleCreate called');
    console.log('Available disciplines:', disciplines.length);
    setEditingField(null);
    setFormData({
      disciplineId: '',
      name: '',
      sortOrder: '',
      group: '0',
      isFinalScore: false,
      isStartingScore: false,
      enabled: true
    });
    setIsModalOpen(true);
    console.log('Modal should be open now');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        disciplineId: parseInt(formData.disciplineId),
        name: formData.name,
        sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : null,
        group: parseInt(formData.group),
        isFinalScore: formData.isFinalScore,
        isStartingScore: formData.isStartingScore,
        enabled: formData.enabled
      };

      const url = editingField 
        ? `/api/discipline-fields/${editingField.id}`
        : '/api/discipline-fields';
      
      const method = editingField ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setIsModalOpen(false);
        await fetchData();
      } else {
        const error = await response.json();
        console.error('Error saving discipline field:', error);
        alert(`Error: ${error.error || 'Failed to save discipline field'}`);
      }
    } catch (error) {
      console.error('Error saving discipline field:', error);
      alert('Error saving discipline field');
    }
  };

  const handleDelete = async (field: DisciplineField) => {
    if (!confirm(`Are you sure you want to delete the field "${field.name}"?\n\nNote: Fields with existing jury evaluations cannot be deleted.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/discipline-fields/${field.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to delete discipline field'}`);
      }
    } catch (error) {
      console.error('Error deleting discipline field:', error);
      alert('Error deleting discipline field');
    }
  };

  const handleClearAllFilters = () => {
    setDisciplineFilter('all');
    setFieldTypeFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  };

  // Apply sorting and filters
  const getFilteredData = () => {
    const sorted = sortData(disciplineFields, (field) => {
      if (sortKey === 'disciplineName') return field.disciplineName || '';
      if (sortKey === 'sortOrder') return field.sortOrder || 0;
      if (sortKey === 'group') return field.group;
      return field[sortKey as keyof DisciplineField];
    });

    return sorted.filter(field => {
      // Search filter
      const matchesSearch = !searchTerm || 
        field.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.disciplineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.disciplineShort?.toLowerCase().includes(searchTerm.toLowerCase());

      // Discipline filter
      const matchesDiscipline = disciplineFilter === 'all' || 
        field.disciplineId.toString() === disciplineFilter;

      // Field type filter
      const matchesFieldType = fieldTypeFilter === 'all' ||
        (fieldTypeFilter === 'final' && field.isFinalScore) ||
        (fieldTypeFilter === 'starting' && field.isStartingScore) ||
        (fieldTypeFilter === 'both' && field.isFinalScore && field.isStartingScore) ||
        (fieldTypeFilter === 'neither' && !field.isFinalScore && !field.isStartingScore);

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'enabled' && field.enabled) ||
        (statusFilter === 'disabled' && !field.enabled);

      return matchesSearch && matchesDiscipline && matchesFieldType && matchesStatus;
    });
  };

  const filteredData = getFilteredData();

  // Table headers
  const renderTableHeaders = () => (
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('disciplineFields.table.id')}
      </th>
      <SortableTableHeader
        label={t('disciplineFields.table.fieldName')}
        sortKey="name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('disciplineFields.table.discipline')}
        sortKey="disciplineName"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('disciplineFields.table.sortOrder')}
        sortKey="sortOrder"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('disciplineFields.table.finalScore')}
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('disciplineFields.table.startingScore')}
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('disciplineFields.table.status')}
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('disciplineFields.table.actions')}
      </th>
    </tr>
  );

  // Table row renderer
  const renderTableRow = (field: DisciplineField) => (
    <tr key={field.id}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {field.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <TableCellsIcon className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{field.name}</div>
            <div className="text-sm text-gray-500">Group: {field.group}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{field.disciplineName}</div>
          <div className="text-sm text-gray-500">{field.disciplineShort}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {field.sortOrder || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          field.isFinalScore 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {field.isFinalScore ? (
            <>
              <CheckIcon className="w-3 h-3 mr-1" />
              {t('common.yes')}
            </>
          ) : (
            <>
              <XMarkIcon className="w-3 h-3 mr-1" />
              {t('common.no')}
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          field.isStartingScore 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {field.isStartingScore ? (
            <>
              <CheckIcon className="w-3 h-3 mr-1" />
              {t('common.yes')}
            </>
          ) : (
            <>
              <XMarkIcon className="w-3 h-3 mr-1" />
              {t('common.no')}
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          field.enabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {field.enabled ? t('disciplineFields.status.enabled') : t('disciplineFields.status.disabled')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => handleEdit(field)}
            className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
            title="Edit field"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(field)}
            className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
            title="Delete field"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card renderer
  const renderCard = (field: DisciplineField) => (
    <div key={field.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <TableCellsIcon className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
              <p className="text-sm text-gray-500">{t('disciplineFields.card.id')}: {field.id} • {t('disciplineFields.card.group')}: {field.group}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">{t('disciplineFields.card.discipline')}:</span>
              <div>
                <div className="text-sm font-medium text-gray-900">{field.disciplineName}</div>
                <div className="text-sm text-gray-500">{field.disciplineShort}</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">{t('disciplineFields.card.sortOrder')}:</span>
              <span className="text-sm text-gray-900">{field.sortOrder || 'N/A'}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">{t('disciplineFields.card.finalScore')}:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  field.isFinalScore 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {field.isFinalScore ? (
                    <>
                      <CheckIcon className="w-3 h-3 mr-1" />
                      {t('common.yes')}
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="w-3 h-3 mr-1" />
                      {t('common.no')}
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">{t('disciplineFields.card.startingScore')}:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  field.isStartingScore 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {field.isStartingScore ? (
                    <>
                      <CheckIcon className="w-3 h-3 mr-1" />
                      {t('common.yes')}
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="w-3 h-3 mr-1" />
                      {t('common.no')}
                    </>
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">{t('disciplineFields.card.status')}:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                field.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {field.enabled ? t('disciplineFields.status.enabled') : t('disciplineFields.status.disabled')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => handleEdit(field)}
            className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
            title="Edit Field"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(field)}
            className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
            title="Delete Field"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const filterOptions = [
    {
      value: 'discipline',
      label: t('disciplineFields.filter.discipline'),
      selectedValue: disciplineFilter,
      onChange: setDisciplineFilter,
      options: [
        { value: 'all', label: t('disciplineFields.filter.allDisciplines') },
        ...disciplines.map(discipline => ({
          value: discipline.id.toString(),
          label: `${discipline.name} (${discipline.short_name || 'N/A'})`
        }))
      ]
    },
    {
      value: 'fieldType',
      label: t('disciplineFields.filter.scoreType'),
      selectedValue: fieldTypeFilter,
      onChange: setFieldTypeFilter,
      options: [
        { value: 'all', label: t('disciplineFields.filter.allScoreTypes') },
        { value: 'final', label: t('disciplineFields.filter.finalScoreOnly') },
        { value: 'starting', label: t('disciplineFields.filter.startingScoreOnly') },
        { value: 'both', label: t('disciplineFields.filter.bothFinalAndStarting') },
        { value: 'neither', label: t('disciplineFields.filter.neitherFinalNorStarting') }
      ]
    },
    {
      value: 'status',
      label: t('disciplineFields.filter.status'),
      selectedValue: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: t('disciplineFields.filter.allStatuses') },
        { value: 'enabled', label: t('disciplineFields.filter.enabledOnly') },
        { value: 'disabled', label: t('disciplineFields.filter.disabledOnly') }
      ]
    }
  ];

  // Help content similar to the screenshot
  const helpContent = (
    <div className="space-y-4">
      <BlueInfoBox title={t('disciplineFields.help.scoreCapture.title')}>
        <div className="space-y-2">
          <p>
            {t('disciplineFields.help.scoreCapture.description')}
          </p>
          <div className="mt-3">
            <p><strong>{t('disciplineFields.help.scoreCapture.visibleFields')}</strong></p>
            <InfoList items={[
              { label: "D/A-Note", value: t('disciplineFields.help.scoreCapture.fields.dNote') },
              { label: "E/B-Note", value: t('disciplineFields.help.scoreCapture.fields.eNote') },
              { label: t('disciplineFields.help.scoreCapture.fields.neutralDeductions'), value: "" },
              { label: t('disciplineFields.help.scoreCapture.fields.executionDeductions'), value: "" },
              { label: t('disciplineFields.help.scoreCapture.fields.additional'), value: "" }
            ]} />
          </div>
          <div className="mt-3">
            <p><strong>{t('disciplineFields.help.scoreCapture.configuration')}</strong></p>
            <InfoList items={[
              { label: "", value: t('disciplineFields.help.scoreCapture.configItems.sorting') },
              { label: "", value: t('disciplineFields.help.scoreCapture.configItems.grouping') },
              { label: "", value: t('disciplineFields.help.scoreCapture.configItems.type') },
              { label: "", value: t('disciplineFields.help.scoreCapture.configItems.visibility') }
            ]} />
          </div>
        </div>
      </BlueInfoBox>

      <GreenInfoBox title={t('disciplineFields.help.fieldEvaluations.title')}>
        <div className="space-y-2">
          <p>
            <strong>{t('disciplineFields.help.fieldEvaluations.description')}</strong>
          </p>
          <div className="mt-2">
            <p><strong>{t('disciplineFields.help.fieldEvaluations.functionality')}</strong></p>
            <FeatureList features={[
              t('disciplineFields.help.fieldEvaluations.features.displayed'),
              t('disciplineFields.help.fieldEvaluations.features.stored'),
              t('disciplineFields.help.fieldEvaluations.features.apiBinding'),
              t('disciplineFields.help.fieldEvaluations.features.dbIntegration')
            ]} />
          </div>
          <p className="mt-2 text-green-700">
            {t('disciplineFields.help.fieldEvaluations.summary')}
          </p>
        </div>
      </GreenInfoBox>

      <RedInfoBox title={t('disciplineFields.help.deletion.title')}>
        <div className="space-y-2">
          <p>
            <strong>{t('disciplineFields.help.deletion.warning')}</strong>
          </p>
          <div className="mt-2">
            <p><strong>Deletion not possible when:</strong></p>
            <FeatureList features={[
              "Jury evaluations exist",
              "Field is used in competitions",
              "References in other tables"
            ]} />
          </div>
          <div className="mt-2">
            <p><strong>Alternatives:</strong></p>
            <FeatureList features={[
              "Deactivate: Hide field",
              "Rename: Adapt field",
              "Delete evaluations: Then remove field"
            ]} />
          </div>
          <p className="mt-2 text-red-700">
            This protection prevents data loss and ensures the integrity of competition data.
          </p>
        </div>
      </RedInfoBox>
    </div>
  );

  return (
    <>
      <DatabaseManagementTemplate
        title={t('disciplineFields.title')}
        subtitle={t('disciplineFields.subtitle', { count: disciplineFields.length })}
        icon={TableCellsIcon}
        data={filteredData}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('disciplineFields.searchPlaceholder')}
        itemsPerPage={50}
        viewStorageKey="discipline-fields-view"
        addLabel={t('disciplineFields.addField')}
        onAdd={handleCreate}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
        filterOptions={filterOptions}
        onClearAllFilters={handleClearAllFilters}
        showFilters={false}
        showHelpPanel={showHelpPanel}
        onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
        helpContent={helpContent}
        helpLabel={t('disciplineFields.helpLabel')}
      />

      <DisciplineFieldFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingField={editingField}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        disciplines={disciplines}
      />
    </>
  );
};

export default DisciplineFieldsUnified;
