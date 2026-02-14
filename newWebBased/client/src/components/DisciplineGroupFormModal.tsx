import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import UnifiedModal from './UnifiedModal';

interface DisciplineGroup {
  int_disziplinen_gruppenid: number;
  var_name: string;
  txt_comment?: string;
  discipline_count: number;
  disciplines?: Array<{
    int_disziplinenid: number;
    var_name: string;
    position?: number;
  }>;
}

interface Discipline {
  id: number;
  name: string;
  unit?: string;
  short_name?: string;
  male_allowed?: boolean;
  female_allowed?: boolean;
}

interface DisciplineGroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  disciplineGroup?: DisciplineGroup | null;
  mode: 'create' | 'edit';
}

const DisciplineGroupFormModal: React.FC<DisciplineGroupFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  disciplineGroup,
  mode
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    var_name: '',
    txt_comment: '',
  });
  const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [disciplineSearch, setDisciplineSearch] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAllDisciplines();
      setDisciplineSearch('');
      setShowSelectedOnly(false);
      if (mode === 'edit' && disciplineGroup) {
        setFormData({
          var_name: disciplineGroup.var_name || '',
          txt_comment: disciplineGroup.txt_comment || '',
        });
        // Set selected disciplines from the group
        const disciplineIds = disciplineGroup.disciplines?.map(d => d.int_disziplinenid) || [];
        setSelectedDisciplines(disciplineIds);
      } else {
        resetForm();
      }
    }
  }, [isOpen, mode, disciplineGroup]);

  const resetForm = () => {
    setFormData({
      var_name: '',
      txt_comment: '',
    });
    setSelectedDisciplines([]);
  };

  const fetchAllDisciplines = async () => {
    try {
      setLoadingDisciplines(true);
      const response = await fetch('/api/disciplines?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch disciplines');
      }
      const data = await response.json();
      const disciplines = Array.isArray(data) ? data : [];
      setAllDisciplines(disciplines);
    } catch (err) {
      console.error('Error fetching disciplines:', err);
      setAllDisciplines([]);
    } finally {
      setLoadingDisciplines(false);
    }
  };

  // Filter disciplines based on search and selected-only toggle
  const filteredDisciplines = useMemo(() => {
    let filtered = allDisciplines;
    
    if (showSelectedOnly) {
      filtered = filtered.filter(d => selectedDisciplines.includes(d.id));
    }
    
    if (disciplineSearch.trim()) {
      const search = disciplineSearch.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.name?.toLowerCase().includes(search) ||
        d.short_name?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [allDisciplines, disciplineSearch, showSelectedOnly, selectedDisciplines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.var_name.trim()) {
      alert(t('disciplineGroups.messages.enterName', 'Please enter a group name'));
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        var_name: formData.var_name.trim(),
        txt_comment: formData.txt_comment.trim() || undefined,
        disciplineIds: selectedDisciplines,
      };

      await onSave(requestData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving discipline group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisciplineToggle = (disciplineId: number) => {
    setSelectedDisciplines(prev => 
      prev.includes(disciplineId)
        ? prev.filter(id => id !== disciplineId)
        : [...prev, disciplineId]
    );
  };

  const handleSelectAll = () => {
    const filteredIds = filteredDisciplines.map(d => d.id);
    setSelectedDisciplines(prev => {
      const newSelection = new Set(prev);
      filteredIds.forEach(id => newSelection.add(id));
      return Array.from(newSelection);
    });
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredDisciplines.map(d => d.id));
    setSelectedDisciplines(prev => prev.filter(id => !filteredIds.has(id)));
  };

  const getSelectedDisciplineNames = () => {
    return allDisciplines
      .filter(d => selectedDisciplines.includes(d.id))
      .map(d => d.name)
      .join(', ');
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' 
        ? t('disciplineGroups.editGroup', 'Edit Discipline Group')
        : t('disciplineGroups.createGroup', 'Create New Discipline Group')
      }
      size="3xl"
      showFooter={false}
      fullHeight
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('disciplineGroups.form.groupName', 'Group Name')} *
          </label>
          <input
            type="text"
            value={formData.var_name}
            onChange={(e) => setFormData(prev => ({ ...prev, var_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder={t('disciplineGroups.form.groupNamePlaceholder', 'Enter group name')}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('disciplineGroups.form.comment', 'Comment')}
          </label>
          <textarea
            value={formData.txt_comment}
            onChange={(e) => setFormData(prev => ({ ...prev, txt_comment: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder={t('disciplineGroups.form.commentPlaceholder', 'Enter description or comment (optional)')}
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        {/* Discipline Assignment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('disciplineGroups.form.assignDisciplines', 'Assign Disciplines')}
          </label>

          {/* Search and controls bar */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={disciplineSearch}
                onChange={(e) => setDisciplineSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('disciplineGroups.form.searchDisciplines', 'Search disciplines...')}
                disabled={isSubmitting}
              />
              {disciplineSearch && (
                <button
                  type="button"
                  onClick={() => setDisciplineSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSelectedOnly(!showSelectedOnly)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                showSelectedOnly
                  ? 'bg-orange-100 border-orange-300 text-orange-800'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              disabled={isSubmitting}
            >
              {showSelectedOnly 
                ? t('disciplineGroups.form.showAll', 'Show all')
                : t('disciplineGroups.form.showSelected', `Selected (${selectedDisciplines.length})`)
              }
            </button>
          </div>

          {/* Select/Deselect all for current filter */}
          {filteredDisciplines.length > 0 && (
            <div className="flex items-center gap-3 mb-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-orange-600 hover:text-orange-800 hover:underline"
                disabled={isSubmitting}
              >
                {t('disciplineGroups.form.selectAllVisible', 'Select all visible')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-gray-500 hover:text-gray-700 hover:underline"
                disabled={isSubmitting}
              >
                {t('disciplineGroups.form.deselectAllVisible', 'Deselect all visible')}
              </button>
              <span className="ml-auto text-gray-400">
                {filteredDisciplines.length} {t('disciplineGroups.form.disciplinesShown', 'shown')}
              </span>
            </div>
          )}

          {/* Discipline list */}
          <div className="border border-gray-300 rounded-md max-h-80 overflow-y-auto bg-gray-50">
            {loadingDisciplines ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-5 w-5 text-orange-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-500 text-sm">{t('common.loading', 'Loading...')}</span>
              </div>
            ) : allDisciplines.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">{t('disciplineGroups.form.noDisciplines', 'No disciplines available')}</p>
            ) : filteredDisciplines.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">
                {disciplineSearch 
                  ? t('disciplineGroups.form.noSearchResults', 'No disciplines match your search')
                  : t('disciplineGroups.form.noSelectedDisciplines', 'No disciplines selected')
                }
              </p>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredDisciplines.map((discipline) => (
                  <label
                    key={discipline.id}
                    className={`flex items-center gap-3 cursor-pointer px-3 py-2 transition-colors ${
                      selectedDisciplines.includes(discipline.id)
                        ? 'bg-orange-50 hover:bg-orange-100'
                        : 'hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDisciplines.includes(discipline.id)}
                      onChange={() => handleDisciplineToggle(discipline.id)}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-800 flex-1 min-w-0">
                      <span className="font-medium">{discipline.name}</span>
                      {discipline.short_name && (
                        <span className="text-gray-400 ml-2 text-xs">[{discipline.short_name}]</span>
                      )}
                    </span>
                    {discipline.unit && (
                      <span className="text-gray-400 text-xs shrink-0">{discipline.unit}</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected summary */}
          {selectedDisciplines.length > 0 && (
            <div className="mt-2 p-2.5 bg-orange-50 rounded-md border border-orange-200">
              <p className="text-sm text-orange-800 font-medium">
                {t('disciplineGroups.form.selectedCount', { count: selectedDisciplines.length, defaultValue: `${selectedDisciplines.length} disciplines selected` })}
              </p>
              <p className="text-xs text-orange-600 mt-1 line-clamp-2">
                {getSelectedDisciplineNames()}
              </p>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.saving', 'Saving...')}
              </span>
            ) : (
              mode === 'edit' 
                ? t('disciplineGroups.form.updateGroup', 'Update Group')
                : t('disciplineGroups.form.createGroup', 'Create Group')
            )}
          </button>
        </div>
      </form>
    </UnifiedModal>
  );
};

export default DisciplineGroupFormModal;
