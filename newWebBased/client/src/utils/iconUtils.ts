/**
 * Client-side utility functions for handling discipline icons
 */

/**
 * Converts Qt resource icon path to web-accessible URL
 * @param iconPath - Qt resource path like ":/icons/100.png"
 * @returns Web-accessible icon URL or null if no icon
 */
export function getIconUrl(iconPath?: string): string | null {
  if (!iconPath) return null;
  
  // Handle Qt resource paths that start with ":/"
  if (iconPath.startsWith(':/icons/')) {
    const filename = iconPath.substring(':/icons/'.length); // Remove ":/icons/" prefix
    return `http://localhost:3001/public/icons/${filename}`;
  }
  
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
 * Check if an icon exists by attempting to load it
 * @param iconUrl - URL to check
 * @returns Promise<boolean> indicating if the icon exists
 */
export function checkIconExists(iconUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = iconUrl;
  });
}
