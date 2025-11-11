/**
 * SquadFormModal Component
 * Modal for creating new squads or editing existing ones
 * Supports both create and edit modes
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import UnifiedModal from '@/components/UnifiedModal';

interface SquadFormModalProps {
  isOpen: boolean;
  isLoading: boolean;
  mode: 'create' | 'edit';
  initialName?: string;
  onClose: () => void;
  onCreate?: (name: string) => Promise<void>;
  onUpdate?: (oldName: string, newName: string) => Promise<void>;
}

export const SquadFormModal: React.FC<SquadFormModalProps> = ({
  isOpen,
  isLoading,
  mode,
  initialName = '',
  onClose,
  onCreate,
  onUpdate
}) => {
  const { t } = useTranslation();
  const [squadName, setSquadName] = useState('');

  // Initialize/reset form when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setSquadName(initialName);
    }
  }, [isOpen, initialName]);

  const handleSubmit = async () => {
    try {
      if (mode === 'create' && onCreate) {
        await onCreate(squadName);
      } else if (mode === 'edit' && onUpdate && initialName) {
        await onUpdate(initialName, squadName);
      }
      setSquadName('');
      onClose();
    } catch (error) {
      // Error is handled in the hook, just display it
      alert(error instanceof Error ? error.message : `Failed to ${mode} squad`);
    }
  };

  const handleClose = () => {
    setSquadName('');
    onClose();
  };

  const isFormValid = squadName.trim() && squadName.length <= 5;
  const hasChanges = mode === 'edit' ? squadName !== initialName : true;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? t('squadManagement.createModal.title') : t('squadManagement.createModal.editTitle')}
      size="md"
      showFooter={false}
    >
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('squadManagement.createModal.squadName')} * <span className="text-sm text-gray-500">{t('squadManagement.createModal.maxCharacters')}</span>
        </label>
        <input
          type="text"
          value={squadName}
          onChange={(e) => setSquadName(e.target.value)}
          maxLength={5}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            squadName.length > 5 ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('squadManagement.createModal.placeholder')}
          autoFocus
        />
        <div className="flex justify-between items-center mt-1">
          <p className={`text-sm ${squadName.length > 5 ? 'text-red-500' : 'text-gray-500'}`}>
            {squadName.length > 5 
              ? t('squadManagement.createModal.nameTooLong')
              : t('squadManagement.createModal.hint')
            }
          </p>
          <span className={`text-xs ${squadName.length > 5 ? 'text-red-500' : 'text-gray-400'}`}>
            {t('squadManagement.createModal.characterCount', { count: squadName.length })}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || !hasChanges || isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-5 h-5" />
          {mode === 'create' ? t('squadManagement.createModal.createButton') : t('squadManagement.createModal.updateButton')}
        </button>
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {t('squadManagement.createModal.cancelButton')}
        </button>
      </div>
    </UnifiedModal>
  );
};

// Keep the old export for backward compatibility
export const CreateSquadModal = SquadFormModal;
