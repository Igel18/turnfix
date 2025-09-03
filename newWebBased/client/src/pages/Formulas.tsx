import React, { useState, useEffect } from 'react';
import { PlusIcon, CalculatorIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader';

interface Formula {
  int_formelid: number;
  var_name: string;
  var_formel?: string;
  int_typ?: number;
  discipline_count: number;
  tfx_disziplinen?: Array<{
    int_disziplinenid: number;
    var_name: string;
  }>;
}

interface FormulasResponse {
  formulas: Formula[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

const Formulas: React.FC = () => {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
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

  const fetchFormulas = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
        ...(search && { search })
      });

      const response = await fetch(`/api/formulas?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch formulas');
      }

      const data: FormulasResponse = await response.json();
      setFormulas(data.formulas || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setFormulas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormulas(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleAddFormula = () => {
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
      alert('Please enter a formula name');
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
      fetchFormulas(currentPage, searchTerm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this formula? This action cannot be undone.')) {
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

      fetchFormulas(currentPage, searchTerm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getFormulasStateInfo = (): StateInfo[] => {
    const totalFormulas = formulas.length;
    const totalDisciplines = formulas.reduce((sum, formula) => sum + (formula.discipline_count || 0), 0);
    const formulasWithCode = formulas.filter(f => f.var_formel && f.var_formel.trim()).length;
    
    return [
      {
        value: 'total',
        label: 'Total Formulas',
        count: totalFormulas,
        color: 'blue'
      },
      {
        value: 'withCode',
        label: 'With Code',
        count: formulasWithCode,
        color: 'green'
      },
      {
        value: 'disciplines',
        label: 'Used by Disciplines',
        count: totalDisciplines,
        color: 'purple'
      }
    ];
  };

  const getFormulaTypeLabel = (type: number) => {
    switch (type) {
      case 0: return 'Standard';
      case 1: return 'Custom';
      case 2: return 'Advanced';
      default: return 'Unknown';
    }
  };

  const filteredFormulas = formulas.filter(formula =>
    formula.var_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formula.var_formel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Formulas Management"
        description="Manage calculation formulas used by disciplines"
        icon={CalculatorIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search formulas..."
        stateInfo={getFormulasStateInfo()}
        onClearAllFilters={() => {
          setSearchTerm('')
        }}
        onExportCSV={() => {
          // TODO: Implement CSV export for formulas
          console.log('Export formulas to CSV');
        }}
        primaryAction={{
          label: 'Add Formula',
          icon: PlusIcon,
          onClick: handleAddFormula
        }}
        showHomeButton={true}
        totalCount={formulas.length}
        filteredCount={filteredFormulas.length}
      />

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading formulas...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <CalculatorIcon className="h-12 w-12 mx-auto mb-4" />
            </div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => fetchFormulas(currentPage, searchTerm)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFormulas.map((formula) => (
              <div key={formula.int_formelid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CalculatorIcon className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{formula.var_name}</h3>
                      <p className="text-sm text-gray-500">ID: {formula.int_formelid}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(formula)}
                      className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Edit formula"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(formula.int_formelid)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete formula"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Type:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getFormulaTypeLabel(formula.int_typ || 0)}
                    </span>
                  </div>
                  
                  {formula.var_formel && (
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
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Used by:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {formula.discipline_count || 0} disciplines
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredFormulas.length === 0 && !loading && (
              <div className="col-span-full text-center py-12">
                <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No formulas found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first formula to get started.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleAddFormula}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Formula
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
                  {editingFormula ? 'Edit Formula' : 'Create New Formula'}
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
                    Formula Name *
                  </label>
                  <input
                    type="text"
                    value={formData.var_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, var_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter formula name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formula Code
                  </label>
                  <textarea
                    value={formData.var_formel}
                    onChange={(e) => setFormData(prev => ({ ...prev, var_formel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter formula code (optional)"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.int_typ}
                    onChange={(e) => setFormData(prev => ({ ...prev, int_typ: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    <option value={0}>Standard</option>
                    <option value={1}>Custom</option>
                    <option value={2}>Advanced</option>
                  </select>
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
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : (editingFormula ? 'Update' : 'Create')}
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

export default Formulas;
