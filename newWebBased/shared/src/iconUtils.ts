/**
 * Icon Utilities (Shared)
 *
 * SINGLE SOURCE OF TRUTH for icon path parsing &amp; discipline icon mappings.
 * Do NOT duplicate. Import from @turnfix/shared.
 *
 * Environment-specific URL construction stays in the per-project wrappers.
 */

// ---------------------------------------------------------------------------
// Qt resource path handling
// ---------------------------------------------------------------------------

/**
 * Extracts filename from a Qt resource path.
 * ":/icons/100.png" → "100.png"
 */
export function getIconFilename(iconPath?: string | null): string | null {
  if (!iconPath || iconPath.trim() === '') return null;

  if (iconPath.startsWith(':/')) {
    const path = iconPath.substring(2); // Remove ":/"
    return path.split('/').pop() || null;
  }

  return iconPath.split('/').pop() || null;
}

/**
 * Strip the Qt resource prefix and return a relative path segment.
 * ":/icons/balken.png" → "balken.png"
 * Already-relative paths are returned as-is.
 */
export function stripQtPrefix(iconPath: string): string {
  if (iconPath.startsWith(':/icons/')) return iconPath.substring(':/icons/'.length);
  if (iconPath.startsWith(':/')) return iconPath.substring(2);
  return iconPath;
}

// ---------------------------------------------------------------------------
// Discipline icon / name mappings  (domain knowledge)
// ---------------------------------------------------------------------------

/**
 * Fallback mapping: discipline name → icon filename.
 * Used when the database icon path is empty or missing.
 */
export const DISCIPLINE_ICON_MAP: Record<string, string> = {
  'Balken': 'balken.png',
  'Schwebebalken': 'balken.png',
  'Sch.-Balken': 'balken.png',
  'Boden': 'boden.png',
  'Sprung': 'sprung.png',
  'Stufenbarren': 'barren.png',
  'Stu.-Barren': 'barren.png',
  'Barren': 'barren.png',
  'Par.-Barren': 'barren.png',
  'Reck': 'reck.png',
  'Pferd': 'seitpferd.png',
  'Seitpferd': 'seitpferd.png',
  'Pauschenpferd': 'seitpferd.png',
  'Ringe': 'ringe.png',
  'Minitrampolin': 'minitrampolin.png',
  'Gerätebahn A': 'geraetebahn.png',
  'Gerätebahn B': 'geraetebahn.png',
};

/**
 * Fallback mapping: discipline name → emoji.
 * Used when no icon image is available at all.
 */
export const DISCIPLINE_EMOJI_MAP: Record<string, string> = {
  'Boden': '🤸',
  'Reck': '🏃',
  'Barren': '💪',
  'Par.-Barren': '💪',
  'Pferd': '🏇',
  'Pauschenpferd': '🏇',
  'Seitpferd': '🏇',
  'Stufenbarren': '🤸‍♀️',
  'Stu.-Barren': '🤸‍♀️',
  'Schwebebalken': '⚖️',
  'Sch.-Balken': '⚖️',
  'Balken': '⚖️',
  'Sprung': '🤾',
  'Ringe': '💍',
  'Minitrampolin': '🤾',
  'Gerätebahn A': '🏃',
  'Gerätebahn B': '🏃',
};

/**
 * Get a fallback emoji for a discipline when no icon image is available.
 */
export function getFallbackDeviceEmoji(deviceName: string): string {
  return DISCIPLINE_EMOJI_MAP[deviceName] || '🏆';
}

/**
 * Fallback short-name mapping for PDF headers.
 */
export const DISCIPLINE_SHORT_NAME_MAP: Record<string, string> = {
  'Balken': 'BALK',
  'Schwebebalken': 'BALK',
  'Boden': 'BODEN',
  'Sprung': 'SPRU',
  'Stufenbarren': 'STBARR',
  'Barren': 'BARR',
  'Reck': 'RECK',
  'Pferd': 'PFERD',
  'Seitpferd': 'PFERD',
  'Ringe': 'RINGE',
  'Minitrampolin': 'MINITR',
  'Gerätebahn A': 'GERA',
  'Gerätebahn B': 'GERB',
};
