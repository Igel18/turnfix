 import React from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedModal from './UnifiedModal';

// Types (matching Teams.types.ts)
interface Club {
  int_vereineid: number;
  var_name: string;
}

interface Competition {
  id: number;
  name: string;
}

interface FormData {
  clubId: string;
  competitionId: string;
  number: string;
  riege: string | null;
  startNumber: string;
}

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  clubs: Club[];
  competitions: Competition[];
  isEditing: boolean;
}

const TeamFormModal: React.FC<TeamFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  clubs,
  competitions,
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
      title={isEditing ? t('teams.editTeam') : t('teams.createTeam')}
      size="lg"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Club Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('teams.form.club')} *
          </label>
          <select
            required
            value={formData.clubId}
            onChange={(e) => setFormData({...formData, clubId: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('teams.form.clubPlaceholder')}</option>
            {Array.isArray(clubs) && clubs.map(club => (
              <option key={club.int_vereineid} value={club.int_vereineid}>
                {club.var_name}
              </option>
            ))}
          </select>
          {clubs.length === 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              ⚠️ {t('teams.form.noClubsAvailable')}
            </p>
          )}
        </div>

        {/* Competition Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('teams.form.competition')} *
          </label>
          <select
            required
            value={formData.competitionId}
            onChange={(e) => setFormData({...formData, competitionId: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('teams.form.competitionPlaceholder')}</option>
            {Array.isArray(competitions) && competitions.map(comp => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
          {competitions.length === 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              ⚠️ {t('teams.form.noCompetitionsAvailable')}
            </p>
          )}
        </div>

        {/* Team Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('teams.form.number')} *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.number}
            onChange={(e) => setFormData({...formData, number: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('teams.form.numberPlaceholder')}
          />
        </div>

        {/* Optional Fields Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Riege (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('teams.form.squad')}
            </label>
            <input
              type="text"
              value={formData.riege || ''}
              onChange={(e) => setFormData({...formData, riege: e.target.value || null})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('teams.form.squadPlaceholder')}
            />
          </div>

          {/* Start Number (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('teams.form.startNumber')}
            </label>
            <input
              type="number"
              min="1"
              value={formData.startNumber}
              onChange={(e) => setFormData({...formData, startNumber: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('teams.form.startNumberPlaceholder')}
            />
          </div>
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
            disabled={clubs.length === 0 || competitions.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                     disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isEditing ? t('common.save') : t('common.create')}
          </button>
        </div>
      </form>
    </UnifiedModal>
  );
};

export default TeamFormModal;

