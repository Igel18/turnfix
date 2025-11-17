/**
 * Input Mask Utilities
 * Handles formatting and normalization of score values based on discipline input masks
 * 
 * Based on C++ _global::strLeistung implementation - GENERIC approach
 * 
 * Supported formats:
 * - Decimal: 0.00, 00.00, 000.000, etc. (any combination)
 * - Time: 0:00, 0:00.00, 00:00.00, h:mm:ss, hh:mm:ss.ss, etc.
 * - Comma decimal: 0,00, 00,00, 000,000, etc.
 * 
 * The mask defines:
 * - Total width (maske.length())
 * - Decimal places (digits after . or ,)
 * - Fill character (0 for padding)
 */

export interface InputMaskInfo {
  type: 'decimal' | 'time' | 'comma';
  decimalPlaces: number;
  totalLength: number;
  pattern: string;
  separator: string;
}

/**
 * Parse input mask to extract formatting information
 * GENERIC: Works with any mask pattern
 */
export function parseInputMask(mask: string): InputMaskInfo {
  if (!mask) {
    return {
      type: 'decimal',
      decimalPlaces: 3,
      totalLength: 5,
      pattern: '0.000',
      separator: '.'
    };
  }

  // Time format: Contains colon (:)
  // Examples: 0:00, 0:00.00, 00:00.00, h:mm:ss, hh:mm:ss.ss
  if (mask.includes(':')) {
    // Extract decimal places from time format (e.g., "00:00.00" → 2)
    const parts = mask.split(':');
    const lastPart = parts[parts.length - 1]; // "00.00" or "ss.ss"
    const decimalMatch = lastPart.match(/\.(\d+)/);
    const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;
    
    return {
      type: 'time',
      decimalPlaces,
      totalLength: mask.length,
      pattern: mask,
      separator: ':'
    };
  }

  // Comma format: Contains comma (,)
  // Examples: 0,00, 00,00, 000,000
  if (mask.includes(',')) {
    const parts = mask.split(',');
    const decimalPlaces = parts[1] ? parts[1].length : 0;
    
    return {
      type: 'comma',
      decimalPlaces,
      totalLength: mask.length,
      pattern: mask,
      separator: ','
    };
  }

  // Decimal format (default): Contains dot (.)
  // Examples: 0.00, 00.00, 000.000, 0.0, etc.
  const parts = mask.split('.');
  const decimalPlaces = parts[1] ? parts[1].length : 0;
  
  return {
    type: 'decimal',
    decimalPlaces,
    totalLength: mask.length,
    pattern: mask,
    separator: '.'
  };
}

/**
 * Format a numeric value according to input mask
 * GENERIC implementation based on C++ _global::strLeistung
 * 
 * C++ Logic:
 * if ((lst > 59.59 && einheit != "m") || maske == "00:00.00") {
 *   // Time format
 * } else {
 *   meldeleistung = QString("%1").arg(lst, maske.length(), 'f', nk, '0');
 * }
 */
export function formatScore(value: number, inputMask: string, unit: string = ''): string {
  const maskInfo = parseInputMask(inputMask);

  // Time format handling (from C++ code)
  // Convert seconds to time format: MM:SS.ss or HH:MM:SS.ss
  if ((value > 59.59 && unit !== 'm') || maskInfo.type === 'time') {
    return formatTimeValue(value, inputMask, maskInfo.decimalPlaces);
  }

  // GENERIC decimal/comma formatting (like C++)
  // Uses mask.length() for total width, decimalPlaces for precision
  const formatted = value.toFixed(maskInfo.decimalPlaces);
  
  // Replace separator if comma format
  const withSeparator = maskInfo.type === 'comma' 
    ? formatted.replace('.', ',') 
    : formatted;
  
  // Pad to total length with leading zeros (like C++ fillChar='0')
  return padToMaskLength(withSeparator, maskInfo.totalLength, maskInfo.separator);
}

/**
 * Format time value (seconds) to time string
 * Supports: MM:SS, MM:SS.ss, HH:MM:SS, HH:MM:SS.ss
 */
function formatTimeValue(totalSeconds: number, mask: string, decimalPlaces: number): string {
  const parts = mask.split(':');
  const isHHMMSS = parts.length >= 3; // h:mm:ss or hh:mm:ss.ss
  
  if (isHHMMSS) {
    // Format: HH:MM:SS or HH:MM:SS.ss
    const hours = Math.floor(totalSeconds / 3600);
    const remainingSeconds = totalSeconds - (hours * 3600);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds - (minutes * 60);
    
    const hoursStr = hours.toString().padStart(parts[0].length, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toFixed(decimalPlaces).padStart(decimalPlaces > 0 ? 5 : 2, '0');
    
    return `${hoursStr}:${minutesStr}:${secondsStr}`;
  } else {
    // Format: MM:SS or MM:SS.ss
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - (minutes * 60);
    
    const minutesStr = minutes.toString().padStart(parts[0].length, '0');
    const secondsStr = seconds.toFixed(decimalPlaces).padStart(decimalPlaces > 0 ? 5 : 2, '0');
    
    return `${minutesStr}:${secondsStr}`;
  }
}

/**
 * Pad formatted value to mask length with leading zeros
 * GENERIC: Works with any separator (. or ,)
 */
function padToMaskLength(formatted: string, totalLength: number, separator: string): string {
  const currentLength = formatted.length;
  
  if (currentLength >= totalLength) {
    return formatted;
  }
  
  // Split at separator to pad integer part only
  const parts = formatted.split(separator);
  const paddingNeeded = totalLength - currentLength;
  
  // Add leading zeros to integer part
  parts[0] = '0'.repeat(paddingNeeded) + parts[0];
  
  return parts.join(separator);
}

/**
 * Normalize user input according to input mask
 * Used during score entry to format values on blur
 * 
 * GENERIC implementation - works with any mask pattern
 * 
 * Examples:
 * - mask "0.00": "5" → "5.00", "5.5" → "5.50"
 * - mask "00.00": "5" → "05.00", "5.5" → "05.50"
 * - mask "000.000": "5" → "005.000"
 * - mask "0,00": "5" → "5,00"
 * - mask "0:00.00": "65.5" → "1:05.50"
 * - mask "h:mm:ss": "3661" → "1:01:01"
 */
export function normalizeScoreInput(value: string, inputMask: string): string {
  if (!value || value === '.' || value === ',' || value === ':') {
    return '';
  }

  const maskInfo = parseInputMask(inputMask);

  // Handle time format input
  if (maskInfo.type === 'time') {
    return normalizeTimeInput(value, inputMask, maskInfo);
  }

  // Handle comma format
  if (maskInfo.type === 'comma') {
    return normalizeDecimalInput(value, inputMask, maskInfo, ',');
  }

  // Handle decimal format (default)
  return normalizeDecimalInput(value, inputMask, maskInfo, '.');
}

/**
 * Normalize time format input
 * Handles: MM:SS, HH:MM:SS, or decimal seconds
 */
function normalizeTimeInput(value: string, mask: string, _maskInfo: InputMaskInfo): string {
  // Already in time format (e.g., "1:05.50" or "1:01:30")
  const timeMatch = value.match(/^(\d+):(\d+)(?::(\d+(?:\.\d+)?))?$/);
  if (timeMatch) {
    if (timeMatch[3]) {
      // HH:MM:SS format
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseFloat(timeMatch[3]);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return formatScore(totalSeconds, mask);
    } else {
      // MM:SS format
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseFloat(timeMatch[2]);
      const totalSeconds = minutes * 60 + seconds;
      return formatScore(totalSeconds, mask);
    }
  }
  
  // Input is decimal seconds (e.g., "65.5" or "3661")
  const num = parseFloat(value.replace(',', '.'));
  if (!isNaN(num)) {
    return formatScore(num, mask);
  }
  
  return '';
}

/**
 * Normalize decimal/comma format input
 * GENERIC: Uses mask info for formatting
 */
function normalizeDecimalInput(value: string, _mask: string, maskInfo: InputMaskInfo, separator: string): string {
  // Clean input (keep only digits and separator)
  const cleaned = value.replace(new RegExp(`[^\\d${separator === ',' ? ',' : '.'}]`, 'g'), '');
  const num = parseFloat(cleaned.replace(',', '.'));
  
  if (isNaN(num)) {
    return '';
  }
  
  // Format with decimal places
  const formatted = num.toFixed(maskInfo.decimalPlaces);
  
  // Replace separator if needed
  const withSeparator = separator === ',' 
    ? formatted.replace('.', ',') 
    : formatted;
  
  // Pad to mask length
  return padToMaskLength(withSeparator, maskInfo.totalLength, separator);
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
    // Time can be HH:MM:SS, MM:SS, or decimal
    return /^(\d+):(\d+)(?::(\d+(?:\.\d+)?))?$/.test(value) || /^\d+(\.\d+)?$/.test(value);
  }
  
  if (maskInfo.type === 'comma') {
    return /^\d+(,\d+)?$/.test(value);
  }
  
  return /^\d+(\.\d+)?$/.test(value);
}

/**
 * Normalize score input using decimal places (legacy support for ScoreCapture)
 * 
 * @param value - The input value to normalize
 * @param decimalPlaces - Number of decimal places (from int_berechnung)
 * @returns Normalized value with fixed decimal places
 * 
 * Examples:
 * - decimalPlaces=2: "5" → "5.00", "5.5" → "5.50"
 * - decimalPlaces=3: "5" → "5.000", "5.5" → "5.500"
 */
export function normalizeScoreByDecimalPlaces(value: string, decimalPlaces: number): string {
  if (!value || value === '.') {
    return '';
  }

  const cleaned = value.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) {
    return '';
  }
  
  return num.toFixed(decimalPlaces);
}
