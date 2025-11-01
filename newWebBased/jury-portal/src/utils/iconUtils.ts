/**
 * Jury Portal - Icon utility functions
 * Converts discipline icon paths from database to web-accessible URLs
 */

// Get base URL from Vite config (will be '/jury/' in production)
const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Converts Qt resource icon path to web-accessible URL
 * @param iconPath - Qt resource path like ":/icons/100.png"
 * @returns Web-accessible icon URL or null if no icon
 */
export function getIconUrl(iconPath?: string): string | null {
  if (!iconPath) return null;
  
  // Handle Qt resource paths that start with ":/"
  if (iconPath.startsWith(':/')) {
    const filename = iconPath.replace(':/icons/', ''); // Remove ":/icons/" prefix
    // Use BASE_URL for proper path resolution
    return `${BASE_URL}assets/icons/${filename}`;
  }
  
  // Handle already formatted paths
  if (iconPath.startsWith('/') || iconPath.startsWith('http')) {
    return iconPath;
  }
  
  // Default handling - assume it's a filename in the icons directory
  return `${BASE_URL}assets/icons/${iconPath}`;
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
    'Seitpferd': '🏇',
    'Stufenbarren': '🤸‍♀️',
    'Schwebebalken': '⚖️',
    'Balken': '⚖️',
    'Sprung': '🤾',
    'Ringe': '💍',
    'Minitrampolin': '🤾',
    'Gerätebahn A': '🏃',
    'Gerätebahn B': '🏃'
  };
  return emojiMap[deviceName] || '🏆';
}

/**
 * Gets the discipline icon path, with fallback logic
 * @param disciplineName - Name of the discipline
 * @param iconPath - Optional database icon path (Qt resource format)
 * @returns Web-accessible icon URL or null for emoji fallback
 */
export function getDisciplineIcon(disciplineName: string, iconPath?: string): string | null {
  if (iconPath && iconPath !== '') {
    return getIconUrl(iconPath);
  }
  
  // Fallback mapping based on discipline name - use BASE_URL for proper path resolution
  const nameToIcon: Record<string, string> = {
    'Balken': `${BASE_URL}assets/icons/balken.png`,
    'Schwebebalken': `${BASE_URL}assets/icons/balken.png`,
    'Boden': `${BASE_URL}assets/icons/boden.png`,
    'Sprung': `${BASE_URL}assets/icons/sprung.png`,
    'Stufenbarren': `${BASE_URL}assets/icons/barren.png`,
    'Barren': `${BASE_URL}assets/icons/barren.png`,
    'Reck': `${BASE_URL}assets/icons/reck.png`,
    'Pferd': `${BASE_URL}assets/icons/seitpferd.png`,
    'Seitpferd': `${BASE_URL}assets/icons/seitpferd.png`,
    'Pauschenpferd': `${BASE_URL}assets/icons/seitpferd.png`,
    'Ringe': `${BASE_URL}assets/icons/ringe.png`,
    'Minitrampolin': `${BASE_URL}assets/icons/minitrampolin.png`,
    'Gerätebahn A': `${BASE_URL}assets/icons/geraetebahn.png`,
    'Gerätebahn B': `${BASE_URL}assets/icons/geraetebahn.png`,
  };
  
  return nameToIcon[disciplineName] || null;
}
