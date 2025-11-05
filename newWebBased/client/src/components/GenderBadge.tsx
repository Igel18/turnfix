import { useTranslation } from 'react-i18next';
import { normalizeGender, type GenderValue } from '@/utils/genderHelpers';

/**
 * Unified Gender Badge Component
 * 
 * Purpose: Provides consistent gender display across all UIs
 * - Standardized naming (male/female/both/unknown)
 * - Consistent visual appearance (color-coded tags)
 * - Localized labels
 * 
 * Usage:
 * <GenderBadge value="male" />
 * <GenderBadge value="female" />
 * <GenderBadge value="both" />
 * <GenderBadge value="unknown" />
 * 
 * Note: normalizeGender() is now imported from @/utils/genderHelpers
 */

interface GenderBadgeProps {
  value: GenderValue | string | boolean | number;
  className?: string;
  showIcon?: boolean;
}

/**
 * Gender Badge Component
 * Displays a color-coded badge for gender with localized text
 */
export function GenderBadge({ value, className = '', showIcon = false }: GenderBadgeProps) {
  const { t } = useTranslation();
  
  // Debug logging
  if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).DEBUG)) {
    console.log('🔍 GenderBadge received value:', value, 'type:', typeof value);
  }
  
  const normalizedValue = normalizeGender(value);
  
  // Debug logging
  if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).DEBUG)) {
    console.log('🔍 GenderBadge normalized to:', normalizedValue);
  }

  // Define color schemes for each gender
  const colorSchemes = {
    male: 'bg-blue-100 text-blue-800 border-blue-200',
    female: 'bg-pink-100 text-pink-800 border-pink-200',
    both: 'bg-purple-100 text-purple-800 border-purple-200',
    unknown: 'bg-gray-100 text-gray-600 border-gray-200'
  };

  // Icons for each gender (optional)
  const icons = {
    male: '♂',
    female: '♀',
    both: '⚥',
    unknown: '?'
  };

  // Translation keys
  const labels = {
    male: t('common.gender.male'),
    female: t('common.gender.female'),
    both: t('common.gender.both'),
    unknown: t('common.gender.unknown')
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorSchemes[normalizedValue]} ${className}`}
    >
      {showIcon && <span className="mr-1">{icons[normalizedValue]}</span>}
      {labels[normalizedValue]}
    </span>
  );
}

/**
 * Gender Filter Options
 * Provides consistent filter options for dropdowns
 */
export function getGenderFilterOptions(t: any) {
  return [
    { value: '', label: t('common.gender.all') },
    { value: 'male', label: t('common.gender.male') },
    { value: 'female', label: t('common.gender.female') },
    { value: 'both', label: t('common.gender.both') },
    { value: 'unknown', label: t('common.gender.unknown') }
  ];
}

/**
 * Gender Column Header
 * Provides consistent column header text
 */
export function getGenderColumnHeader(t: any): string {
  return t('common.gender.label');
}

/**
 * Get gender display text (without badge styling)
 */
export function getGenderText(value: any, t: any): string {
  const normalizedValue = normalizeGender(value);
  const labels = {
    male: t('common.gender.male'),
    female: t('common.gender.female'),
    both: t('common.gender.both'),
    unknown: t('common.gender.unknown')
  };
  return labels[normalizedValue];
}

export default GenderBadge;
