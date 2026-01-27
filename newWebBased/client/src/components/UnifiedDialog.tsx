import React from 'react';
import { UnifiedModal } from './UnifiedModal';

interface UnifiedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

/**
 * UnifiedDialog - Wrapper around UnifiedModal for backward compatibility
 * 
 * This component exists to maintain compatibility with existing code that uses
 * UnifiedDialog. All new code should use UnifiedModal directly.
 * 
 * Migrated from @headlessui/react to use internal UnifiedModal for consistency.
 */
export default function UnifiedDialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '2xl'
}: UnifiedDialogProps) {
  // Map maxWidth to UnifiedModal size prop
  // UnifiedModal supports: sm, md, lg, xl, 2xl, 3xl, 4xl
  // UnifiedDialog supports: sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl
  const sizeMap: Record<string, 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'> = {
    'sm': 'sm',
    'md': 'md',
    'lg': 'lg',
    'xl': 'xl',
    '2xl': '2xl',
    '3xl': '3xl',
    '4xl': '4xl',
    '5xl': '4xl', // Map to largest supported size
    '6xl': '4xl',
    '7xl': '4xl'
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={sizeMap[maxWidth]}
      showFooter={false} // UnifiedDialog doesn't show footer by default
    >
      {children}
    </UnifiedModal>
  );
}
