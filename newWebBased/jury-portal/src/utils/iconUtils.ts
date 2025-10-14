/**
 * Jury Portal - Icon utility functions
 * Converts discipline icon paths from database to web-accessible URLs
 */

/**
 * Converts Qt resource icon path to web-accessible URL
 * @param iconPath - Qt resource path like ":/icons/100.png"
 * @returns Web-accessible icon URL or null if no icon
 */
export function getIconUrl(iconPath?: string): string | null {
  if (!iconPath) return null;
  
  // Handle Qt resource paths that start with ":/"
  if (iconPath.startsWith(':/')) {
    const filename = iconPath.substring(2); // Remove ":/" prefix
    return `http://localhost:3001/public/${filename}`;
  }
  
  // Handle already formatted paths
  if (iconPath.startsWith('/') || iconPath.startsWith('http')) {
    return iconPath;
  }
  
  // Default handling - assume it's a filename in the icons directory
  return `http://localhost:3001/public/icons/${iconPath}`;
}

/**
 * Extracts filename from Qt resource path
 * @param iconPath - Qt resource path like ":/icons/100.png"
 * @returns Filename like "100.png" or null
 */
export function getIconFilename(iconPath?: string): string | null {
  if (!iconPath) return null;
  
  if (iconPath.startsWith(':/')) {
    const path = iconPath.substring(2); // Remove ":/" prefix
    return path.split('/').pop() || null;
  }
  
  return iconPath.split('/').pop() || null;
}

/**
 * Fallback emoji icons for disciplines (used when database icon is not available)
 * @param deviceName - Name of the discipline/device
 * @returns Emoji representing the device
 */
export function getFallbackDeviceEmoji(deviceName: string): string {
  const emojiMap: { [key: string]: string } = {
    'Boden': '🤸',
    'Reck': '🏃',
    'Barren': '💪', 
    'Pferd': '🏇',
    'Pauschenpferd': '🏇',
    'Stufenbarren': '🤸‍♀️',
    'Schwebebalken': '⚖️',
    'Balken': '⚖️',
    'Sprung': '🤾',
    'Ringe': '💍'
  };
  return emojiMap[deviceName] || '🏆';
}
