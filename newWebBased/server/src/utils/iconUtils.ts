/**
 * Server-side icon utilities — delegates to @turnfix/shared
 *
 * getIconFilename + stripQtPrefix are shared.
 * getIconUrl + iconExists are server-specific.
 */
import * as fs from 'fs';
import * as path from 'path';

export { getIconFilename, stripQtPrefix, DISCIPLINE_ICON_MAP, DISCIPLINE_EMOJI_MAP, getFallbackDeviceEmoji, DISCIPLINE_SHORT_NAME_MAP } from '@turnfix/shared';

/**
 * Converts Qt resource icon path to web-accessible URL (server-specific)
 */
export function getIconUrl(iconPath: string | null | undefined, baseUrl?: string): string | null {
  if (!iconPath || iconPath.trim() === '') return null;

  const filename = iconPath.replace(/^:\/icons\//, '');
  if (!filename || filename === iconPath) return null;

  const serverBase = baseUrl || '/public/icons';
  return `${serverBase}/${filename}`;
}

/**
 * Checks if an icon file exists in the public directory (server-specific)
 */
export function iconExists(filename: string): boolean {
  const iconPath = path.join(process.cwd(), 'public', 'icons', filename);
  return fs.existsSync(iconPath);
}
