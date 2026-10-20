import React from 'react';
import UnifiedModal from './UnifiedModal';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingClub ? t('clubs.editClub') : t('clubs.addClub')}
      size="2xl"
      showFooter={false}
    >
      <form onSubmit={onSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('clubs.form.basicInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('clubs.form.name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.var_name}
                    onChange={(e) => setFormData({...formData, var_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('clubs.form.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('clubs.form.website')}
                  </label>
                  <input
                    type="url"
                    value={formData.var_website}
                    onChange={(e) => setFormData({...formData, var_website: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('clubs.form.websitePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('clubs.form.startPosition')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.int_start_ort}
                    onChange={(e) => setFormData({...formData, int_start_ort: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('clubs.form.startPositionPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Organization */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('clubs.form.organization')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('clubs.form.region')} *
                  </label>
                  <select
                    required
                    value={formData.int_gaueid}
                    onChange={(e) => setFormData({...formData, int_gaueid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('clubs.form.selectRegion')}</option>
                    {Array.isArray(regions) && regions.map(region => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  {regions.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {t('clubs.form.noRegionsAvailable')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('clubs.form.contactPerson')}
                  </label>
                  <select
                    value={formData.int_personenid}
                    onChange={(e) => setFormData({...formData, int_personenid: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('clubs.form.noContactPerson')}</option>
                    {Array.isArray(contacts) && contacts.map(contact => (
                      <option key={contact.int_personenid} value={contact.int_personenid}>
                        {contact.var_vorname} {contact.var_nachname}
                        {contact.var_email && ` (${contact.var_email})`}
                      </option>
                    ))}
                  </select>
                  {contacts.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('clubs.form.noContactsAvailable')}
                    </p>
                  )}
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
              {t('clubs.form.cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingClub ? t('clubs.form.updateClubAction') : t('clubs.form.createClubAction')}
            </button>
          </div>
        </form>
      </UnifiedModal>
  );
};

export default ClubFormModal;
