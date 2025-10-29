import React from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface Club {
  int_vereineid: number;
  var_name: string;
  var_website?: string;
  int_gaueid: number;
  int_personenid?: number;
  int_start_ort: number;
  gaue_name?: string;
  var_vorname?: string;
  var_nachname?: string;
  var_email?: string;
  var_telefon?: string;
  athlete_count: number;
}

interface Region {
  id: number;
  name: string;
}

interface Contact {
  int_personenid: number;
  var_vorname: string;
  var_nachname: string;
  var_email?: string;
  var_telefon?: string;
}

interface FormData {
  var_name: string;
  var_website: string;
  int_gaueid: string;
  int_personenid: string;
  int_start_ort: string;
}

interface ClubFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClub: Club | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  regions: Region[];
  contacts: Contact[];
}

const ClubFormModal: React.FC<ClubFormModalProps> = ({
  isOpen,
  onClose,
  editingClub,
  formData,
  setFormData,
  onSubmit,
  regions,
  contacts
}) => {
  // ESC key to close modal
  useEscapeKey(onClose, isOpen);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingClub ? 'Edit Club' : 'Create New Club'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-6">
            
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Club Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.var_name}
                    onChange={(e) => setFormData({...formData, var_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter club name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.var_website}
                    onChange={(e) => setFormData({...formData, var_website: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting Position
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.int_start_ort}
                    onChange={(e) => setFormData({...formData, int_start_ort: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Organization */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Organization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Region *
                  </label>
                  <select
                    required
                    value={formData.int_gaueid}
                    onChange={(e) => setFormData({...formData, int_gaueid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Region</option>
                    {Array.isArray(regions) && regions.map(region => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  {regions.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ No regions available. Please create regions first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <select
                    value={formData.int_personenid}
                    onChange={(e) => setFormData({...formData, int_personenid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No contact person</option>
                    {Array.isArray(contacts) && contacts.map(contact => (
                      <option key={contact.int_personenid} value={contact.int_personenid}>
                        {contact.var_vorname} {contact.var_nachname}
                        {contact.var_email && ` (${contact.var_email})`}
                      </option>
                    ))}
                  </select>
                  {contacts.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 No contacts available. You can manage contacts separately.
                    </p>
                  )}
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
              {editingClub ? 'Update' : 'Create'} Club
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubFormModal;
