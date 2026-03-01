/**
 * Discipline icon helpers — uses shared utilities from @turnfix/shared
 *
 * Icon data comes from the DATABASE (`tfx_disziplinen.var_icon`).
 * When no icon is set in the DB, a "missing icon" placeholder is shown.
 * There are NO hardcoded fallback mappings.
 */
import { MISSING_ICON_FILENAME } from '@turnfix/shared';

// Re-export shared constants for consumers
export { MISSING_ICON_FILENAME, MISSING_ICON_EMOJI } from '@turnfix/shared';

// Function to convert Qt resource path to web-accessible path
export const getWebIconPath = (qtIconPath: string): string => {
  if (!qtIconPath || qtIconPath === '') return `/assets/icons/${MISSING_ICON_FILENAME}`;
  const iconFileName = qtIconPath.replace(':/icons/', '');
  return `/assets/icons/${iconFileName}`;
};

// Function to get icon path for a discipline (DB icon only, no hardcoded fallback)
export const getDisciplineIcon = (_disciplineName: string, iconPath?: string): string => {
  if (iconPath) {
    return getWebIconPath(iconPath);
  }
  // No DB icon → show missing-icon placeholder
  return `/assets/icons/${MISSING_ICON_FILENAME}`;
};

// Function to get discipline short name for PDF headers (from DB data, no hardcoded map)
export const getDisciplineShortName = (disciplineName: string, disciplineData?: any): string => {
  import('./debug').then(({ isDebugEnabled, debugLog }) => {
    if (isDebugEnabled()) {
      debugLog('getDisciplineShortName called with:', { disciplineName, disciplineData });
    }
  });

  // Use DB field if available
  if (disciplineData?.var_kurz1) {
    return disciplineData.var_kurz1;
  }

  // Auto-generate from name (max 5 chars, uppercase)
  const result = disciplineName.substring(0, 5).toUpperCase();
  console.log(`No var_kurz1 in DB for "${disciplineName}", auto-generated: ${result}`);
  return result;
};

// Function to convert image to base64 for PDF embedding
export const getImageAsBase64 = async (imagePath: string): Promise<string> => {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
};

// Function specifically for PDF export
export const getDisciplineIconForPDF = (disciplineName: string, iconPath?: string): string => {
  if (iconPath) {
    return getWebIconPath(iconPath);
  }
  return getDisciplineIcon(disciplineName);
};
