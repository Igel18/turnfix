/**
 * Client-side icon utilities — delegates to @turnfix/shared
 *
 * getIconFilename is shared; getIconUrl + checkIconExists are client-specific.
 */
// Re-export shared helpers
export { getIconFilename, stripQtPrefix, MISSING_ICON_FILENAME, MISSING_ICON_EMOJI } from '@turnfix/shared';

/**
 * Converts Qt resource icon path to web-accessible URL (client-specific)
 */
export function getIconUrl(iconPath?: string): string | null {
  if (!iconPath) return null;

  if (iconPath.startsWith(':/icons/')) {
    const filename = iconPath.substring(':/icons/'.length);
    return `http://localhost:3001/public/icons/${filename}`;
  }
  if (iconPath.startsWith(':/')) {
    const filename = iconPath.substring(2);
    return `http://localhost:3001/public/${filename}`;
  }
  if (iconPath.startsWith('/') || iconPath.startsWith('http')) {
    return iconPath;
  }
  return `http://localhost:3001/public/icons/${iconPath}`;
}

/**
 * Check if an icon exists by attempting to load it (browser-only)
 */
export function checkIconExists(iconUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = iconUrl;
  });
}
