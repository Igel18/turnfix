/**
 * Discipline icon helpers — uses shared maps from @turnfix/shared
 *
 * Name-to-filename and short-name maps are shared.
 * URL construction & PDF helpers are client-specific.
 */
import { DISCIPLINE_ICON_MAP, DISCIPLINE_SHORT_NAME_MAP } from '@turnfix/shared';

// Re-export shared maps for consumers
export { DISCIPLINE_ICON_MAP, DISCIPLINE_SHORT_NAME_MAP } from '@turnfix/shared';

// Function to convert Qt resource path to web-accessible path
export const getWebIconPath = (qtIconPath: string): string => {
  if (!qtIconPath || qtIconPath === '') return '/assets/icons/default.png';
  const iconFileName = qtIconPath.replace(':/icons/', '');
  return `/assets/icons/${iconFileName}`;
};

// Function to get icon path for a discipline
export const getDisciplineIcon = (disciplineName: string, iconPath?: string): string => {
  if (iconPath) {
    return getWebIconPath(iconPath);
  }
  const filename = DISCIPLINE_ICON_MAP[disciplineName];
  if (filename) {
    return `/assets/icons/${filename}`;
  }
  return '/assets/icons/default.png';
};

// Function to get discipline short name for PDF headers
export const getDisciplineShortName = (disciplineName: string, disciplineData?: any): string => {
  import('./debug').then(({ isDebugEnabled, debugLog }) => {
    if (isDebugEnabled()) {
      debugLog('getDisciplineShortName called with:', { disciplineName, disciplineData });
    }
  });

  if (disciplineData?.var_kurz1) {
    return disciplineData.var_kurz1;
  }

  const result = DISCIPLINE_SHORT_NAME_MAP[disciplineName] || disciplineName.substring(0, 5).toUpperCase();
  console.log(`Using fallback: ${result} for ${disciplineName}`);
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
