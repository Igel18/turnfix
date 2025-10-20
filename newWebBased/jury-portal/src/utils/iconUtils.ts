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
    const filename = iconPath.replace(':/icons/', ''); // Remove ":/icons/" prefix
    // Use relative path - Vite proxy will forward to backend server
    return `/assets/icons/${filename}`;
  }
  
  // Handle already formatted paths
  if (iconPath.startsWith('/') || iconPath.startsWith('http')) {
    return iconPath;
  }
  
  // Default handling - assume it's a filename in the icons directory
  return `/assets/icons/${iconPath}`;
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
  
  // Fallback mapping based on discipline name - use relative paths (Vite proxy)
  const nameToIcon: Record<string, string> = {
    'Balken': '/assets/icons/balken.png',
    'Schwebebalken': '/assets/icons/balken.png',
    'Boden': '/assets/icons/boden.png',
    'Sprung': '/assets/icons/sprung.png',
    'Stufenbarren': '/assets/icons/barren.png',
    'Barren': '/assets/icons/barren.png',
    'Reck': '/assets/icons/reck.png',
    'Pferd': '/assets/icons/seitpferd.png',
    'Seitpferd': '/assets/icons/seitpferd.png',
    'Pauschenpferd': '/assets/icons/seitpferd.png',
    'Ringe': '/assets/icons/ringe.png',
    'Minitrampolin': '/assets/icons/minitrampolin.png',
    'Gerätebahn A': '/assets/icons/geraetebahn.png',
    'Gerätebahn B': '/assets/icons/geraetebahn.png',
  };
  
  return nameToIcon[disciplineName] || null;
}
