import React, { useState, useEffect } from 'react';
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
  const [formData, setFormData] = useState({
    var_name: '',
    txt_comment: '',
  });
  const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAllDisciplines();
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
      setAllDisciplines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching disciplines:', err);
      setAllDisciplines([]);
    } finally {
      setLoadingDisciplines(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.var_name.trim()) {
      alert('Please enter a group name');
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
      // Error handling is done in the parent component
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
      title={mode === 'edit' ? 'Edit Discipline Group' : 'Create New Discipline Group'}
      size="2xl"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.var_name}
                onChange={(e) => setFormData(prev => ({ ...prev, var_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter group name"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment
              </label>
              <textarea
                value={formData.txt_comment}
                onChange={(e) => setFormData(prev => ({ ...prev, txt_comment: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter description or comment (optional)"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Discipline Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Disciplines
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto bg-gray-50">
                {loadingDisciplines ? (
                  <p className="text-gray-500 text-sm">Loading disciplines...</p>
                ) : allDisciplines.length === 0 ? (
                  <p className="text-gray-500 text-sm">No disciplines available</p>
                ) : (
                  <div className="space-y-2">
                    {allDisciplines.map((discipline) => (
                      <label
                        key={discipline.id}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDisciplines.includes(discipline.id)}
                          onChange={() => handleDisciplineToggle(discipline.id)}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-gray-700 flex-1">
                          {discipline.name}
                          {discipline.unit && (
                            <span className="text-gray-500 ml-1">({discipline.unit})</span>
                          )}
                          {discipline.short_name && (
                            <span className="text-gray-400 ml-2 text-xs">[{discipline.short_name}]</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedDisciplines.length > 0 && (
                <div className="mt-2 p-2 bg-orange-50 rounded-md">
                  <p className="text-sm text-orange-800 font-medium">
                    Selected ({selectedDisciplines.length}): 
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
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
                Cancel
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
                    Saving...
                  </span>
                ) : (
                  mode === 'edit' ? 'Update Group' : 'Create Group'
                )}
              </button>
            </div>
          </form>
    </UnifiedModal>
  );
};

export default DisciplineGroupFormModal;
