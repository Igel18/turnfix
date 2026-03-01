/**
 * Jury Portal — icon utilities — delegates to @turnfix/shared
 *
 * Icon data comes from the DATABASE (`tfx_disziplinen.var_icon`).
 * When no icon is set in the DB, a "missing icon" placeholder is shown.
 * There are NO hardcoded fallback mappings.
 */
import { MISSING_ICON_FILENAME } from '@turnfix/shared';

// Re-export shared helpers directly
export { getIconFilename, stripQtPrefix, MISSING_ICON_FILENAME, MISSING_ICON_EMOJI } from '@turnfix/shared';

// Get base URL from Vite config (will be '/jury/' in production)
const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Converts Qt resource icon path to web-accessible URL (jury-portal-specific)
 */
export function getIconUrl(iconPath?: string): string | null {
  if (!iconPath) return null;

  if (iconPath.startsWith(':/')) {
    const filename = iconPath.replace(':/icons/', '');
    return `${BASE_URL}assets/icons/${filename}`;
  }
  if (iconPath.startsWith('/') || iconPath.startsWith('http')) {
    return iconPath;
  }
  return `${BASE_URL}assets/icons/${iconPath}`;
}

/**
 * Gets the missing-icon placeholder URL (jury-portal-specific, uses BASE_URL)
 */
export function getMissingIconUrl(): string {
  return `${BASE_URL}assets/icons/${MISSING_ICON_FILENAME}`;
}

/**
 * Gets discipline icon path — DB icon only, no hardcoded fallback.
 * Returns the missing-icon URL when no DB icon is available.
 */
export function getDisciplineIcon(_disciplineName: string, iconPath?: string): string {
  if (iconPath && iconPath !== '') {
    const url = getIconUrl(iconPath);
    if (url) return url;
  }

  // No DB icon → show missing-icon placeholder
  return getMissingIconUrl();
}
