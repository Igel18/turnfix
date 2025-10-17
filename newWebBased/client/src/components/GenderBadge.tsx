import { useTranslation } from 'react-i18next';

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
 */

export type GenderValue = 'male' | 'female' | 'both' | 'unknown';

interface GenderBadgeProps {
  value: GenderValue | string | boolean | number;
  className?: string;
  showIcon?: boolean;
}

/**
 * Normalizes various gender representations to standard values
 * Handles: male, female, both, männlich, weiblich, m, w, 1, 2, true, false, etc.
 */
export function normalizeGender(value: any): GenderValue {
  if (value === null || value === undefined || value === '') {
    return 'unknown';
  }

  // Convert to string and normalize
  const str = String(value).toLowerCase().trim();

  // Male variations
  if (
    str === 'male' ||
    str === 'm' ||
    str === 'männlich' ||
    str === '1' ||
    str === 'true'
  ) {
    return 'male';
  }

  // Female variations
  if (
    str === 'female' ||
    str === 'f' ||
    str === 'w' ||
    str === 'weiblich' ||
    str === '2' ||
    str === 'false'
  ) {
    return 'female';
  }

  // Both/Mixed variations
  if (
    str === 'both' ||
    str === 'mixed' ||
    str === 'alle' ||
    str === 'all' ||
    str === 'gemischt'
  ) {
    return 'both';
  }

  // Unknown/Undefined variations
  if (
    str === 'unknown' ||
    str === 'unbekannt' ||
    str === 'undefined' ||
    str === 'null' ||
    str === '-'
  ) {
    return 'unknown';
  }

  // Default to unknown if not recognized
  return 'unknown';
}

/**
 * Gender Badge Component
 * Displays a color-coded badge for gender with localized text
 */
export function GenderBadge({ value, className = '', showIcon = false }: GenderBadgeProps) {
  const { t } = useTranslation();
  const normalizedValue = normalizeGender(value);

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
