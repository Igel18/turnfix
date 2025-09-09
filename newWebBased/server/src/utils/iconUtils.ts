/**
 * Utility functions for handling discipline icons
 */

/**
 * Converts Qt resource icon path to web-accessible URL
 * @param iconPath - Qt resource path like ":/icons/100.png"
 * @param baseUrl - Base URL of the server (optional)
 * @returns Web-accessible icon URL or null if no icon
 */
export function getIconUrl(iconPath: string | null | undefined, baseUrl?: string): string | null {
  if (!iconPath || iconPath.trim() === '') {
    return null;
  }

  // Remove Qt resource prefix ":/icons/" and keep just the filename
  const filename = iconPath.replace(/^:\/icons\//, '');
  
  // If no valid filename extracted, return null
  if (!filename || filename === iconPath) {
    return null;
  }

  // Build the web URL
  const serverBase = baseUrl || '/public/icons';
  return `${serverBase}/${filename}`;
}

/**
 * Gets the icon filename from Qt resource path
 * @param iconPath - Qt resource path like ":/icons/100.png" 
 * @returns Just the filename like "100.png" or null
 */
export function getIconFilename(iconPath: string | null | undefined): string | null {
  if (!iconPath || iconPath.trim() === '') {
    return null;
  }

  // Extract filename from Qt resource path
  const filename = iconPath.replace(/^:\/icons\//, '');
  
  // If no valid filename extracted, return null
  if (!filename || filename === iconPath) {
    return null;
  }

  return filename;
}

/**
 * Checks if an icon file exists in the public directory
 * @param filename - Icon filename like "100.png"
 * @returns boolean indicating if file exists
 */
export function iconExists(filename: string): boolean {
  const fs = require('fs');
  const path = require('path');
  
  const iconPath = path.join(process.cwd(), 'public', 'icons', filename);
  return fs.existsSync(iconPath);
}
