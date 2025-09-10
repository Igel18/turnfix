import React from 'react';

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

interface FormulaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFormula: Formula | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

const FormulaFormModal: React.FC<FormulaFormModalProps> = ({
  isOpen,
  onClose,
  editingFormula,
  formData,
  setFormData,
  onSubmit,
  isSubmitting
}) => {
  if (!isOpen) return null;

  const getFormulaTypeLabel = (type: number) => {
    switch (type) {
      case 0: return 'Standard';
      case 1: return 'Custom';
      case 2: return 'Advanced';
      default: return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingFormula ? 'Edit Formula' : 'Create New Formula'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
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
              <p className="mt-1 text-sm text-gray-500">
                Mathematical formula used for calculations
              </p>
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
              <p className="mt-1 text-sm text-gray-500">
                Current: {getFormulaTypeLabel(formData.int_typ)}
              </p>
            </div>

            {editingFormula && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="text-sm text-blue-800">
                  <p><strong>Formula ID:</strong> {editingFormula.int_formelid}</p>
                  <p><strong>Used by:</strong> {editingFormula.discipline_count || 0} disciplines</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
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
                {isSubmitting ? 'Saving...' : (editingFormula ? 'Update Formula' : 'Create Formula')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FormulaFormModal;
