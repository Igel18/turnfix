import React from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedModal from './UnifiedModal';

interface Club {
  int_vereineid: number;
  var_name: string;
}

interface FormData {
  name: string;
  clubId: string;
}

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  clubs: Club[];
  isEditing: boolean;
}

const GroupFormModal: React.FC<GroupFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  clubs,
  isEditing
}) => {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('groups.editGroup') : t('groups.createGroup')}
      size="lg"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('groups.form.name')} *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('groups.form.namePlaceholder')}
          />
        </div>

        {/* Club Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('groups.form.club')} *
          </label>
          <select
            required
            value={formData.clubId}
            onChange={(e) => setFormData({...formData, clubId: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('groups.form.selectClub')}</option>
            {Array.isArray(clubs) && clubs.map(club => (
              <option key={club.int_vereineid} value={club.int_vereineid}>
                {club.var_name}
              </option>
            ))}
          </select>
          {clubs.length === 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              ⚠️ {t('groups.form.noClubsAvailable')}
            </p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 
                     rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={clubs.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                     disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isEditing ? t('common.update') : t('common.create')}
          </button>
        </div>
      </form>
    </UnifiedModal>
  );
};

export default GroupFormModal;
