import React, { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useTranslation } from 'react-i18next';

export interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  
  // Footer buttons
  showFooter?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  cancelLabel?: string;
  showCancel?: boolean;
  additionalButtons?: ReactNode;
  
  // Size variants
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  
  // Style variants
  fullHeight?: boolean;
  
  // Custom classes
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

/**
 * UnifiedModal - Standardized modal component for consistent UI/UX
 * 
 * Features:
 * - Consistent styling (colors, fonts, spacing)
 * - ESC key support (closes modal)
 * - Configurable sizes (sm to 4xl)
 * - Standard header with title and close button
 * - Optional footer with Save/Cancel buttons
 * - Full height option for scrollable content
 * 
 * Usage:
 * ```tsx
 * <UnifiedModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Edit Item"
 *   onSave={handleSave}
 *   saveLabel="Save Changes"
 * >
 *   <form>...</form>
 * </UnifiedModal>
 * ```
 */
export const UnifiedModal: React.FC<UnifiedModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showFooter = true,
  onSave,
  saveLabel,
  saveDisabled = false,
  cancelLabel,
  showCancel = true,
  additionalButtons,
  size = 'md',
  fullHeight = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = ''
}) => {
  const { t } = useTranslation();
  
  // ESC key support
  useEscapeKey(onClose, isOpen);
  
  if (!isOpen) return null;

  // Size mapping
  const sizeClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  };

  const maxHeightClass = fullHeight ? 'max-h-[90vh]' : 'max-h-[80vh]';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-lg ${sizeClasses[size]} w-full ${maxHeightClass} flex flex-col ${className}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 ${headerClassName}`}>
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
            aria-label="Close"
            type="button"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className={`p-6 overflow-y-auto flex-1 ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className={`flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 ${footerClassName}`}>
            {additionalButtons}
            
            {showCancel && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                {cancelLabel || t('common.cancel', 'Cancel')}
              </button>
            )}
            
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saveLabel || t('common.save', 'Save')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * UnifiedConfirmModal - Specialized modal for confirmation dialogs
 * 
 * Usage:
 * ```tsx
 * <UnifiedConfirmModal
 *   isOpen={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item? This action cannot be undone."
 *   confirmLabel="Delete"
 *   confirmStyle="danger"
 * />
 * ```
 */
export interface UnifiedConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmStyle?: 'primary' | 'danger' | 'warning';
}

export const UnifiedConfirmModal: React.FC<UnifiedConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmStyle = 'primary'
}) => {
  const { t } = useTranslation();
  
  useEscapeKey(onClose, isOpen);
  
  if (!isOpen) return null;

  const confirmButtonClasses = {
    'primary': 'bg-blue-600 hover:bg-blue-700 text-white',
    'danger': 'bg-red-600 hover:bg-red-700 text-white',
    'warning': 'bg-yellow-600 hover:bg-yellow-700 text-white'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {title}
          </h3>
          
          <div className="text-gray-600 mb-6">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              {cancelLabel || t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${confirmButtonClasses[confirmStyle]}`}
            >
              {confirmLabel || t('common.confirm', 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedModal;
