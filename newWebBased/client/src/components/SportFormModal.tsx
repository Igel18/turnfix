import React from 'react';
import { XMarkIcon, BeakerIcon } from '@heroicons/react/24/outline';

interface Sport {
  int_sportid: number;
  var_name: string;
  discipline_count?: number;
}

interface FormData {
  var_name: string;
}

interface SportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSport: Sport | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
}

const SportFormModal: React.FC<SportFormModalProps> = ({
  isOpen,
  onClose,
  editingSport,
  formData,
  setFormData,
  onSubmit,
  isSubmitting = false
}) => {
  if (!isOpen) return null;

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <BeakerIcon className="h-6 w-6 mr-2" />
            {editingSport ? 'Edit Sport' : 'Add New Sport'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sport Name *
            </label>
            <input
              type="text"
              value={formData.var_name}
              onChange={(e) => handleInputChange('var_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter sport name..."
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-gray-500">
              Examples: Gymnastics, Swimming, Athletics, etc.
            </p>
          </div>

          {/* Form buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editingSport ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingSport ? 'Update Sport' : 'Create Sport'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SportFormModal;
