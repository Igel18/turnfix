import React from 'react';
import UnifiedModal from './UnifiedModal';

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

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLocation: Location | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
}

const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  editingLocation,
  formData,
  setFormData,
  onSubmit
}) => {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLocation ? 'Edit Location' : 'Create New Location'}
      size="2xl"
      showFooter={false}
    >
      <form onSubmit={onSubmit} className="space-y-6">
            
        {/* Basic Information */}
        <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.var_name}
                    onChange={(e) => setFormData({...formData, var_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.var_adresse}
                    onChange={(e) => setFormData({...formData, var_adresse: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter street address"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.var_plz}
                      onChange={(e) => setFormData({...formData, var_plz: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Postal code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.var_ort}
                      onChange={(e) => setFormData({...formData, var_ort: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="City name"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingLocation ? 'Update' : 'Create'} Location
            </button>
          </div>
        </form>
    </UnifiedModal>
  );
};

export default LocationFormModal;
