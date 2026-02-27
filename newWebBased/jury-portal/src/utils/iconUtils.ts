/**
 * Jury Portal — icon utilities — delegates to @turnfix/shared
 *
 * getIconFilename + discipline maps are shared.
 * getIconUrl + getDisciplineIcon use Vite BASE_URL (portal-specific).
 */
import { DISCIPLINE_ICON_MAP } from '@turnfix/shared';

// Re-export shared helpers directly
export { getIconFilename, stripQtPrefix, DISCIPLINE_ICON_MAP, DISCIPLINE_EMOJI_MAP, getFallbackDeviceEmoji, DISCIPLINE_SHORT_NAME_MAP } from '@turnfix/shared';

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
 * Gets discipline icon path with fallback (jury-portal-specific, uses BASE_URL)
 */
export function getDisciplineIcon(disciplineName: string, iconPath?: string): string | null {
  if (iconPath && iconPath !== '') {
    return getIconUrl(iconPath);
  }

  const filename = DISCIPLINE_ICON_MAP[disciplineName];
  if (filename) {
    return `${BASE_URL}assets/icons/${filename}`;
  }
  return null;
}
