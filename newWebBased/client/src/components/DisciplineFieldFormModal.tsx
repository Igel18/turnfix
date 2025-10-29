import React from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedModal from './UnifiedModal';

interface DisciplineField {
  id: number;
  disciplineId: number;
  disciplineName: string;
  disciplineShort: string;
  name: string;
  sortOrder: number | null;
  isFinalScore: boolean;
  isStartingScore: boolean;
  group: number;
  enabled: boolean;
}

interface Discipline {
  id: number;
  name: string;
  short_name?: string;
}

interface FormData {
  disciplineId: string;
  name: string;
  sortOrder: string;
  isFinalScore: boolean;
  isStartingScore: boolean;
  group: string;
  enabled: boolean;
}

interface DisciplineFieldFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingField: DisciplineField | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  disciplines: Discipline[];
}

const DisciplineFieldFormModal: React.FC<DisciplineFieldFormModalProps> = ({
  isOpen,
  onClose,
  editingField,
  formData,
  setFormData,
  onSubmit,
  disciplines
}) => {
  const { t } = useTranslation();

  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('DisciplineFieldFormModal opened');
      console.log('editingField:', editingField);
      console.log('formData:', formData);
      console.log('disciplines count:', disciplines.length);
      console.log('disciplines:', disciplines);
    }
  }, [isOpen, editingField, formData, disciplines]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingField ? t('disciplineFields.editField') : t('disciplineFields.createField')}
      size="2xl"
      showFooter={false}
    >
      <form onSubmit={onSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('disciplineFields.form.basicInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Discipline Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplineFields.form.discipline')} *
                  </label>
                  <select
                    required
                    value={formData.disciplineId}
                    onChange={(e) => setFormData({...formData, disciplineId: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editingField 
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-white border-gray-300'
                    }`}
                    disabled={!!editingField} // Cannot change discipline when editing
                  >
                    <option value="">{ t('disciplineFields.form.selectDiscipline')}</option>
                    {disciplines.map(discipline => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name} ({discipline.short_name || 'N/A'})
                      </option>
                    ))}
                  </select>
                  {editingField && (
                    <p className="mt-1 text-xs text-amber-600 font-medium">
                      ⚠️ {t('disciplineFields.form.disciplineCannotChange')}
                    </p>
                  )}
                </div>

                {/* Field Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplineFields.form.fieldName')} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplineFields.form.fieldNamePlaceholder')}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('disciplineFields.form.fieldNameHelp')}
                  </p>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplineFields.form.sortOrder')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={99}
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({...formData, sortOrder: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('disciplineFields.form.sortOrderHelp')}
                  </p>
                </div>

                {/* Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplineFields.form.group')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formData.group}
                    onChange={(e) => setFormData({...formData, group: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('disciplineFields.form.groupHelp')}
                  </p>
                </div>
              </div>
            </div>

            {/* Field Properties */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('disciplineFields.form.fieldProperties')}</h3>
              <div className="space-y-4">
                
                {/* Final Score Checkbox */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isFinalScore"
                      type="checkbox"
                      checked={formData.isFinalScore}
                      onChange={(e) => setFormData({...formData, isFinalScore: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="isFinalScore" className="font-medium text-gray-700">
                      {t('disciplineFields.form.isFinalScore')}
                    </label>
                    <p className="text-sm text-gray-500">{t('disciplineFields.form.isFinalScoreHelp')}</p>
                  </div>
                </div>

                {/* Starting Score Checkbox */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isStartingScore"
                      type="checkbox"
                      checked={formData.isStartingScore}
                      onChange={(e) => setFormData({...formData, isStartingScore: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="isStartingScore" className="font-medium text-gray-700">
                      {t('disciplineFields.form.isStartingScore')}
                    </label>
                    <p className="text-sm text-gray-500">{t('disciplineFields.form.isStartingScoreHelp')}</p>
                  </div>
                </div>

                {/* Enabled Checkbox */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="enabled"
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="enabled" className="font-medium text-gray-700">
                      {t('disciplineFields.form.enabled')}
                    </label>
                    <p className="text-sm text-gray-500">{t('disciplineFields.form.enabledHelp')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingField ? t('common.save') : t('common.create')}
              </button>
            </div>
          </form>
    </UnifiedModal>
  );
};

export default DisciplineFieldFormModal;
