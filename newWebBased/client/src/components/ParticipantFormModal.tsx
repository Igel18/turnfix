import React from 'react';

interface Participant {
  int_teilnehmerid: number;
  var_nachname: string;
  var_vorname: string;
  dat_geburtstag: string;
  int_geschlecht: number;
  int_vereineid: number;
  verein_name: string;
  geschlecht_name: string;
  age: number | null;
  int_startpassnummer: number | null;
}

interface Club {
  int_vereineid: number;
  var_name: string;
}

interface FormData {
  var_nachname: string;
  var_vorname: string;
  dat_geburtsdatum: string;
  var_geschlecht: string;
  int_vereineid: number;
  int_startpassnummer: string;
}

interface ParticipantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingParticipant: Participant | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  clubs: Club[];
}

const ParticipantFormModal: React.FC<ParticipantFormModalProps> = ({
  isOpen,
  onClose,
  editingParticipant,
  formData,
  setFormData,
  onSubmit,
  clubs
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingParticipant ? 'Edit Athlete' : 'Add New Athlete'}
          </h2>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.var_vorname}
                  onChange={(e) => setFormData({ ...formData, var_vorname: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.var_nachname}
                  onChange={(e) => setFormData({ ...formData, var_nachname: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Birth Date *
              </label>
              <input
                type="date"
                required
                value={formData.dat_geburtsdatum}
                onChange={(e) => setFormData({ ...formData, dat_geburtsdatum: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                required
                value={formData.var_geschlecht}
                onChange={(e) => setFormData({ ...formData, var_geschlecht: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select gender</option>
                <option value="1">Male</option>
                <option value="2">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Club *
              </label>
              <select
                required
                value={formData.int_vereineid}
                onChange={(e) => setFormData({ ...formData, int_vereineid: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>Select club</option>
                {Array.isArray(clubs) && clubs.map(club => (
                  <option key={club.int_vereineid} value={club.int_vereineid}>
                    {club.var_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Number
              </label>
              <input
                type="number"
                value={formData.int_startpassnummer}
                onChange={(e) => setFormData({ ...formData, int_startpassnummer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional start number"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                {editingParticipant ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ParticipantFormModal;
