/**
 * Input Mask Utilities
 * Handles formatting and normalization of score values based on discipline input masks
 * 
 * Supported formats:
 * - Decimal: 0.00, 00.00, 0.000, etc.
 * - Time: 0:00, 0:00.00, 00:00.00, etc.
 * - Comma decimal: 0,00, 00,000, etc.
 * 
 * Based on legacy C++ implementation in _global::strLeistung
 */

export interface InputMaskInfo {
  type: 'decimal' | 'time' | 'comma';
  decimalPlaces: number;
  length: number;
  pattern: string;
}

/**
 * Parse input mask to extract formatting information
 */
export function parseInputMask(mask: string): InputMaskInfo {
  if (!mask) {
    return {
      type: 'decimal',
      decimalPlaces: 3,
      length: 5,
      pattern: '0.000'
    };
  }

  // Time format: 0:00, 0:00.00, 00:00.00
  if (mask.includes(':')) {
    const parts = mask.split(':');
    const secondsPart = parts[1] || '00';
    const decimalMatch = secondsPart.match(/\.(\d+)/);
    const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;
    
    return {
      type: 'time',
      decimalPlaces,
      length: mask.length,
      pattern: mask
    };
  }

  // Comma format: 0,00, 00,000
  if (mask.includes(',')) {
    const parts = mask.split(',');
    const decimalPlaces = parts[1] ? parts[1].length : 0;
    
    return {
      type: 'comma',
      decimalPlaces,
      length: mask.length,
      pattern: mask
    };
  }

  // Decimal format: 0.00, 00.00, 0.000
  const parts = mask.split('.');
  const decimalPlaces = parts[1] ? parts[1].length : 0;
  
  return {
    type: 'decimal',
    decimalPlaces,
    length: mask.length,
    pattern: mask
  };
}

/**
 * Format a numeric value according to input mask
 * Based on C++ _global::strLeistung function
 */
export function formatScore(value: number, inputMask: string, unit: string = ''): string {
  const maskInfo = parseInputMask(inputMask);

  // Time format handling (from C++ code)
  if ((value > 59.59 && unit !== 'm') || inputMask === '00:00.00') {
    const minutes = Math.floor(value / 60);
    const seconds = value - (minutes * 60);
    
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toFixed(maskInfo.decimalPlaces).padStart(5, '0');
    
    return `${minutesStr}:${secondsStr}`;
  }

  // Decimal or comma format
  const formatted = value.toFixed(maskInfo.decimalPlaces);
  
  if (maskInfo.type === 'comma') {
    return formatted.replace('.', ',');
  }
  
  // Pad to mask length if needed
  return formatted.padStart(maskInfo.length, '0');
}

/**
 * Normalize user input according to input mask
 * Used during score entry to format values on blur
 */
export function normalizeScoreInput(value: string, inputMask: string): string {
  if (!value || value === '.' || value === ',') {
    return '';
  }

  const maskInfo = parseInputMask(inputMask);

  // Handle time format (H:MM or HH:MM.ss)
  if (maskInfo.type === 'time') {
    // Parse time input
    const timeMatch = value.match(/^(\d+):(\d+(?:\.\d+)?)$/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseFloat(timeMatch[2]);
      
      // Convert to total seconds for storage
      const totalSeconds = minutes * 60 + seconds;
      return formatScore(totalSeconds, inputMask);
    }
    
    // If not in time format, try to parse as decimal and convert
    const num = parseFloat(value.replace(',', '.'));
    if (!isNaN(num)) {
      return formatScore(num, inputMask);
    }
    
    return '';
  }

  // Handle comma format
  if (maskInfo.type === 'comma') {
    const cleaned = value.replace(/[^\d,]/g, '');
    const num = parseFloat(cleaned.replace(',', '.'));
    
    if (isNaN(num)) {
      return '';
    }
    
    return num.toFixed(maskInfo.decimalPlaces).replace('.', ',');
  }

  // Handle decimal format (default)
  const cleaned = value.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) {
    return '';
  }
  
  return num.toFixed(maskInfo.decimalPlaces);
}

/**
 * Get placeholder text for input field based on mask
 */
export function getPlaceholder(inputMask: string): string {
  if (!inputMask) {
    return '0.000';
  }
  return inputMask;
}

/**
 * Validate if a value matches the input mask format
 */
export function validateInput(value: string, inputMask: string): boolean {
  if (!value) return true; // Empty is valid
  
  const maskInfo = parseInputMask(inputMask);
  
  if (maskInfo.type === 'time') {
    return /^\d+:\d+(\.\d+)?$/.test(value);
  }
  
  if (maskInfo.type === 'comma') {
    return /^\d+(,\d+)?$/.test(value);
  }
  
  return /^\d+(\.\d+)?$/.test(value);
}
