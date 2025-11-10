/**
 * CreateSquadModal Component
 * Modal for creating new squads
 * Extracted from SquadManagement.tsx
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import UnifiedModal from '@/components/UnifiedModal';

interface CreateSquadModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const CreateSquadModal: React.FC<CreateSquadModalProps> = ({
  isOpen,
  isLoading,
  onClose,
  onCreate
}) => {
  const { t } = useTranslation();
  const [newSquadName, setNewSquadName] = useState('');

  const handleCreate = async () => {
    try {
      await onCreate(newSquadName);
      setNewSquadName('');
      onClose();
    } catch (error) {
      // Error is handled in the hook, just display it
      alert(error instanceof Error ? error.message : 'Failed to create squad');
    }
  };

  const handleClose = () => {
    setNewSquadName('');
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('squadManagement.createModal.title')}
      size="md"
      showFooter={false}
    >
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('squadManagement.createModal.squadName')} * <span className="text-sm text-gray-500">{t('squadManagement.createModal.maxCharacters')}</span>
        </label>
        <input
          type="text"
          value={newSquadName}
          onChange={(e) => setNewSquadName(e.target.value)}
          maxLength={5}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            newSquadName.length > 5 ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('squadManagement.createModal.placeholder')}
          autoFocus
        />
        <div className="flex justify-between items-center mt-1">
          <p className={`text-sm ${newSquadName.length > 5 ? 'text-red-500' : 'text-gray-500'}`}>
            {newSquadName.length > 5 
              ? t('squadManagement.createModal.nameTooLong')
              : t('squadManagement.createModal.hint')
            }
          </p>
          <span className={`text-xs ${newSquadName.length > 5 ? 'text-red-500' : 'text-gray-400'}`}>
            {t('squadManagement.createModal.characterCount', { count: newSquadName.length })}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={!newSquadName.trim() || newSquadName.length > 5 || isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-5 h-5" />
          {t('squadManagement.createModal.createButton')}
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
