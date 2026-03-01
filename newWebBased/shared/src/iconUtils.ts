/**
 * Icon Utilities (Shared)
 *
 * SINGLE SOURCE OF TRUTH for icon path parsing.
 * Do NOT duplicate. Import from @turnfix/shared.
 *
 * Icon data (which discipline has which icon) comes from the **database**
 * (`tfx_disziplinen.var_icon`). There are NO hardcoded fallback mappings.
 * When a discipline has no icon in the DB, an error/missing icon is shown.
 *
 * Environment-specific URL construction stays in the per-project wrappers.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Filename of the "missing icon" placeholder shown when a discipline
 * has no `var_icon` value in the database.
 */
export const MISSING_ICON_FILENAME = 'missing-icon.svg';

/**
 * Emoji placeholder for contexts where an image cannot be rendered
 * (e.g. plain-text fallbacks). Shown when no DB icon is available.
 */
export const MISSING_ICON_EMOJI = '❓';

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
