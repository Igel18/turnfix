import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalculatorIcon,
  PencilIcon,
  TrashIcon,
  CodeBracketIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';
import FormulaFormModal from '../components/FormulaFormModal';

interface Formula {
  int_formelid: number;
  var_name: string;
  var_formel?: string;
  int_typ?: number;
  discipline_count?: number;
}

interface FormData {
  var_name: string;
  var_formel: string;
  int_typ: number;
}

const FormulasUnified: React.FC = () => {
  const { t } = useTranslation();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [formulaTypeFilter, setFormulaTypeFilter] = useState('');
  const [usageFilter, setUsageFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');

  const [formData, setFormData] = useState<FormData>({
    var_name: '',
    var_formel: '',
    int_typ: 0,
  });

  const resetForm = () => {
    setFormData({
      var_name: '',
      var_formel: '',
      int_typ: 0,
    });
    setEditingFormula(null);
  };

  const fetchFormulas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/formulas?limit=5000');
      if (!response.ok) {
        throw new Error('Failed to fetch formulas');
      }

      const data = await response.json();
      const formulasData = data.formulas || [];
      setFormulas(formulasData);
    } catch (error) {
      console.error('Error fetching formulas:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch formulas');
      setFormulas([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFormulas();
  }, []);

  // Form handlers
  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (formula: Formula) => {
    setFormData({
      var_name: formula.var_name || '',
      var_formel: formula.var_formel || '',
      int_typ: formula.int_typ || 0,
    });
    setEditingFormula(formula);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.var_name.trim()) {
      alert(t('formulas.messages.nameRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingFormula 
        ? `/api/formulas/${editingFormula.int_formelid}`
        : '/api/formulas';
      
      const method = editingFormula ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          var_name: formData.var_name.trim(),
          var_formel: formData.var_formel.trim() || undefined,
          int_typ: formData.int_typ,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save formula');
      }

      setIsModalOpen(false);
      resetForm();
      fetchFormulas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('formulas.messages.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/formulas/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete formula');
      }

      fetchFormulas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getFormulaTypeLabel = (type: number) => {
    switch (type) {
      case 0: return 'Standard';
      case 1: return 'Custom';
      case 2: return 'Advanced';
      default: return 'Unknown';
    }
  };

  const getFormulaTypeColor = (type: number) => {
    switch (type) {
      case 0: return 'bg-blue-100 text-blue-800';
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Sort and filter data
  const sortedFormulas = sortData(formulas, (formula) => {
    if (sortKey === 'int_typ') {
      return getFormulaTypeLabel(formula.int_typ || 0);
    }
    if (sortKey === 'discipline_count') return formula.discipline_count || 0;
    if (sortKey === 'var_formel') return formula.var_formel || '';
    return formula[sortKey as keyof Formula];
  });

  const filteredData = sortedFormulas.filter(formula => {
    const matchesSearch = !searchFilter || 
      formula.var_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      formula.var_formel?.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesType = !formulaTypeFilter || 
      formula.int_typ?.toString() === formulaTypeFilter;

    const matchesUsage = !usageFilter || 
      (usageFilter === 'with-disciplines' && (formula.discipline_count || 0) > 0) ||
      (usageFilter === 'no-disciplines' && (formula.discipline_count || 0) === 0) ||
      (usageFilter === 'with-code' && formula.var_formel && formula.var_formel.trim()) ||
      (usageFilter === 'no-code' && (!formula.var_formel || !formula.var_formel.trim()));
    
    return matchesSearch && matchesType && matchesUsage;
  });

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchFilter('');
    setFormulaTypeFilter('');
    setUsageFilter('');
  };

  // Get filter options for template
  const getFilterOptions = () => [
    {
      value: 'formula-type',
      label: 'Formula Type',
      selectedValue: formulaTypeFilter,
      onChange: setFormulaTypeFilter,
      options: [
        { value: '0', label: 'Standard' },
        { value: '1', label: 'Custom' },
        { value: '2', label: 'Advanced' }
      ]
    },
    {
      value: 'usage',
      label: 'Usage Status',
      selectedValue: usageFilter,
      onChange: setUsageFilter,
      options: [
        { value: 'with-disciplines', label: 'Used by Disciplines' },
        { value: 'no-disciplines', label: 'Not Used' },
        { value: 'with-code', label: 'Has Formula Code' },
        { value: 'no-code', label: 'No Formula Code' }
      ]
    }
  ];

  // Table headers
  const renderTableHeaders = () => (
    <tr>
      <SortableTableHeader
        label="Formula"
        sortKey="var_name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label="Type"
        sortKey="int_typ"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label="Code"
        sortKey="var_formel"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label="Usage"
        sortKey="discipline_count"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
    </tr>
  );

  const renderTableRow = (formula: Formula) => (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <CalculatorIcon className="h-5 w-5 text-purple-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{formula.var_name}</div>
            <div className="text-sm text-gray-500">ID: {formula.int_formelid}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFormulaTypeColor(formula.int_typ || 0)}`}>
          {getFormulaTypeLabel(formula.int_typ || 0)}
        </span>
      </td>
      <td className="px-6 py-4">
        {formula.var_formel && formula.var_formel.trim() ? (
          <div className="flex items-center">
            <CodeBracketIcon className="h-4 w-4 text-gray-400 mr-2" />
            <code className="text-sm text-gray-800 font-mono bg-gray-50 px-2 py-1 rounded max-w-xs truncate">
              {formula.var_formel.length > 40 
                ? `${formula.var_formel.substring(0, 40)}...` 
                : formula.var_formel
              }
            </code>
          </div>
        ) : (
          <span className="text-sm text-gray-500 italic">No code</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <HashtagIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {formula.discipline_count || 0} discipline{(formula.discipline_count || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleEdit(formula)}
            className="text-purple-600 hover:text-purple-800"
            title="Edit Formula"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(formula.int_formelid)}
            className="text-red-600 hover:text-red-800"
            title="Delete Formula"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card render function
  const renderCard = (formula: Formula) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <CalculatorIcon className="h-5 w-5 text-purple-400 mr-2" />
            {formula.var_name}
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">ID: {formula.int_formelid}</div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Type:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFormulaTypeColor(formula.int_typ || 0)}`}>
                {getFormulaTypeLabel(formula.int_typ || 0)}
              </span>
            </div>
            
            {formula.var_formel && formula.var_formel.trim() && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Formula:</p>
                <code className="text-sm text-gray-800 font-mono break-all">
                  {formula.var_formel.length > 50 
                    ? `${formula.var_formel.substring(0, 50)}...` 
                    : formula.var_formel
                  }
                </code>
              </div>
            )}
            
            <div className="flex items-center text-sm text-gray-600">
              <HashtagIcon className="h-4 w-4 mr-2" />
              <span>
                Used by {formula.discipline_count || 0} discipline{(formula.discipline_count || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            
            {(formula.discipline_count || 0) === 0 && (
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Not used
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex space-x-2">
          <button
            onClick={() => handleEdit(formula)}
            className="text-purple-600 hover:text-purple-800"
            title="Edit Formula"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(formula.int_formelid)}
            className="text-red-600 hover:text-red-800"
            title="Delete Formula"
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
        title={t('formulas.title')}
        subtitle={t('formulas.subtitle') + ` (${formulas.length} ${t('formulas.formulasLoaded')})`}
        icon={CalculatorIcon}
        data={filteredData}
        isLoading={isLoading}
        error={error}
        searchTerm={searchFilter}
        onSearchChange={setSearchFilter}
        searchPlaceholder={t('formulas.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onAdd={handleCreate}
        addLabel={t('formulas.addFormula')}
        onEdit={handleEdit}
        onDelete={(formula) => handleDelete(formula.int_formelid)}
        viewStorageKey="formulas-view"
        itemsPerPage={50}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      <FormulaFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        editingFormula={editingFormula}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default FormulasUnified;
