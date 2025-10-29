/**
 * Score Formatting Utility
 * 
 * Provides consistent formatting for scores based on discipline configuration.
 * Supports:
 * - Decimal scores with configurable precision (0-3 decimal places)
 * - Time-based scores (mm:ss.d, hh:mm:ss, etc.)
 * - Locale-specific decimal separators (. or ,)
 * 
 * Uses discipline configuration from tfx_disziplinen:
 * - calculationType (int_berechnung): Number of decimal places (0-3)
 * - inputMask (var_maske): Format pattern (e.g., "0.00", "0,000", "0:00:00")
 * - unit (var_einheit): Unit indicator (e.g., "s", "m", "min")
 */

export interface DisciplineScoreConfig {
  disciplineId?: number | string; // Optional for simple formatting
  calculationType?: number; // int_berechnung from tfx_disziplinen
  inputMask?: string; // var_maske from tfx_disziplinen (e.g., "0.00", "0,00", "0:00:00")
  unit?: string; // var_einheit from tfx_disziplinen (e.g., "s", "m", "min")
}

// Cache for discipline configurations
const disciplineConfigCache = new Map<number | string, DisciplineScoreConfig>();

/**
 * Detect format type from input mask
 * @param inputMask - The var_maske value (e.g., "0.00", "0,000", "0:00:00")
 * @returns Format type: 'time' | 'decimal-comma' | 'decimal-point'
 */
export function detectFormatType(inputMask?: string): 'time' | 'decimal-comma' | 'decimal-point' {
  if (!inputMask) {
    return 'decimal-point'; // Default
  }
  
  // Check for time format (contains :)
  if (inputMask.includes(':')) {
    return 'time';
  }
  
  // Check for comma decimal separator
  if (inputMask.includes(',')) {
    return 'decimal-comma';
  }
  
  // Default to point decimal separator
  return 'decimal-point';
}

/**
 * Get decimal separator based on input mask
 * @param inputMask - The var_maske value
 * @returns Decimal separator ('.' or ',')
 */
export function getDecimalSeparator(inputMask?: string): '.' | ',' {
  const formatType = detectFormatType(inputMask);
  return formatType === 'decimal-comma' ? ',' : '.';
}

/**
 * Convert seconds to time format
 * @param seconds - Time in seconds
 * @param format - Time format pattern ('0:00.0', '0:00:00', '0:00:00.0')
 * @returns Formatted time string
 */
export function formatTime(seconds: number, format: string = '0:00:00'): string {
  if (seconds < 0) {
    return '-';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  // Determine decimal places for seconds
  const decimalPlaces = (format.match(/\.0+/) || [''])[0].length - 1;
  const secondsStr = decimalPlaces > 0 
    ? secs.toFixed(decimalPlaces).padStart(2 + decimalPlaces + 1, '0')
    : Math.floor(secs).toString().padStart(2, '0');
  
  // Format based on pattern
  if (format.includes('0:00:00')) {
    // hh:mm:ss or hh:mm:ss.d
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secondsStr}`;
  } else if (format.includes('00:00')) {
    // mm:ss or mm:ss.d
    const totalMinutes = Math.floor(seconds / 60);
    return `${totalMinutes.toString().padStart(2, '0')}:${secondsStr}`;
  } else {
    // Default: m:ss or m:ss.d
    return `${minutes}:${secondsStr}`;
  }
}

/**
 * Parse time string to seconds
 * @param timeStr - Time string (e.g., "1:23.5", "0:01:23", "1:23:45.67")
 * @returns Seconds as number
 */
export function parseTime(timeStr: string): number {
  if (!timeStr || timeStr === '-') {
    return 0;
  }
  
  const parts = timeStr.split(':');
  
  if (parts.length === 3) {
    // hh:mm:ss.d
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2].replace(',', '.')) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // mm:ss.d or m:ss.d
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseFloat(parts[1].replace(',', '.')) || 0;
    return minutes * 60 + seconds;
  } else {
    // Just seconds
    return parseFloat(timeStr.replace(',', '.')) || 0;
  }
}

/**
 * Get the number of decimal places for a discipline
 * @param calculationType - The int_berechnung value from discipline (0-3)
 * @returns Number of decimal places (0-3)
 */
export function getDecimalPlaces(calculationType?: number): number {
  // Default to 2 decimal places if not specified
  if (calculationType === undefined || calculationType === null) {
    return 2;
  }
  
  // Ensure value is within valid range (0-3)
  const decimals = Math.max(0, Math.min(3, calculationType));
  return decimals;
}

/**
 * Format a score with the appropriate format (decimal or time)
 * @param score - The score value to format
 * @param config - Discipline configuration or calculationType (legacy)
 * @returns Formatted score string
 */
export function formatScore(
  score: number | null | undefined, 
  config?: number | DisciplineScoreConfig
): string {
  if (score === null || score === undefined || isNaN(score)) {
    return '-';
  }
  
  // Handle legacy number-only parameter (calculationType)
  if (typeof config === 'number') {
    const decimals = getDecimalPlaces(config);
    return score.toFixed(decimals);
  }
  
  // Handle full config object
  const inputMask = config?.inputMask;
  const calculationType = config?.calculationType;
  const formatType = detectFormatType(inputMask);
  
  // Time format
  if (formatType === 'time' && inputMask) {
    return formatTime(score, inputMask);
  }
  
  // Decimal format with separator
  const decimals = getDecimalPlaces(calculationType);
  const formattedNumber = score.toFixed(decimals);
  const separator = getDecimalSeparator(inputMask);
  
  // Replace decimal point with configured separator
  return separator === ',' ? formattedNumber.replace('.', ',') : formattedNumber;
}

/**
 * Format a score for a specific discipline using cached configuration
 * @param score - The score value to format
 * @param disciplineId - The discipline ID
 * @param config - Optional: Discipline configuration (will be cached)
 * @returns Formatted score string
 */
export function formatDisciplineScore(
  score: number | null | undefined, 
  disciplineId: number | string,
  config?: DisciplineScoreConfig
): string {
  if (score === null || score === undefined || isNaN(score)) {
    return '-';
  }
  
  // Update cache if config is provided
  if (config) {
    disciplineConfigCache.set(disciplineId, config);
  }
  
  // Get from cache or use provided config
  const cachedConfig = disciplineConfigCache.get(disciplineId);
  const finalConfig = cachedConfig || config;
  
  return formatScore(score, finalConfig);
}

/**
 * Set the configuration for a discipline (updates cache)
 * @param disciplineId - The discipline ID
 * @param config - Discipline configuration
 */
export function setDisciplineConfig(disciplineId: number | string, config: DisciplineScoreConfig): void {
  disciplineConfigCache.set(disciplineId, config);
}

/**
 * Bulk set discipline configurations (for initialization)
 * @param disciplines - Array of discipline configurations
 */
export function initializeDisciplineConfigs(disciplines: DisciplineScoreConfig[]): void {
  disciplines.forEach(discipline => {
    if (discipline.disciplineId !== undefined) {
      disciplineConfigCache.set(discipline.disciplineId, discipline);
    }
  });
}

/**
 * Clear the discipline configuration cache
 */
export function clearDisciplineCache(): void {
  disciplineConfigCache.clear();
}

/**
 * Get the placeholder text for an input field based on configuration
 * @param config - Discipline configuration or calculationType
 * @returns Placeholder string (e.g., "0.00", "0,000", "0:00:00")
 */
export function getScorePlaceholder(config?: number | DisciplineScoreConfig): string {
  // Handle legacy number parameter
  if (typeof config === 'number') {
    const decimals = getDecimalPlaces(config);
    switch (decimals) {
      case 0: return '0';
      case 1: return '0.0';
      case 2: return '0.00';
      case 3: return '0.000';
      default: return '0.00';
    }
  }
  
  // Use inputMask if available
  const inputMask = config?.inputMask;
  if (inputMask) {
    return inputMask;
  }
  
  // Fallback to calculationType
  const calculationType = config?.calculationType;
  const decimals = getDecimalPlaces(calculationType);
  
  switch (decimals) {
    case 0: return '0';
    case 1: return '0.0';
    case 2: return '0.00';
    case 3: return '0.000';
    default: return '0.00';
  }
}

/**
 * Get the step value for an input field based on configuration
 * @param config - Discipline configuration or calculationType
 * @returns Step value (e.g., "0.01", "1", "0.1")
 */
export function getScoreInputStep(config?: number | DisciplineScoreConfig): string {
  // Handle legacy number parameter
  if (typeof config === 'number') {
    const decimals = getDecimalPlaces(config);
    switch (decimals) {
      case 0: return '1';
      case 1: return '0.1';
      case 2: return '0.01';
      case 3: return '0.001';
      default: return '0.01';
    }
  }
  
  // Check if time format
  const inputMask = config?.inputMask;
  const formatType = detectFormatType(inputMask);
  
  if (formatType === 'time') {
    return '0.1'; // Time input step (0.1 seconds)
  }
  
  // Decimal format step based on precision
  const calculationType = config?.calculationType;
  const decimals = getDecimalPlaces(calculationType);
  
  switch (decimals) {
    case 0: return '1';
    case 1: return '0.1';
    case 2: return '0.01';
    case 3: return '0.001';
    default: return '0.01';
  }
}

/**
 * Validate and round a score to the correct format
 * @param score - The score to validate
 * @param config - Discipline configuration or calculationType
 * @returns Validated and rounded score
 */
export function validateAndRoundScore(score: number, config?: number | DisciplineScoreConfig): number {
  // Handle legacy number parameter
  if (typeof config === 'number') {
    const decimals = getDecimalPlaces(config);
    const multiplier = Math.pow(10, decimals);
    return Math.round(score * multiplier) / multiplier;
  }
  
  // Time format - no rounding needed (already in seconds)
  const inputMask = config?.inputMask;
  const formatType = detectFormatType(inputMask);
  
  if (formatType === 'time') {
    return score; // Time values are already in seconds
  }
  
  // Decimal format rounding
  const calculationType = config?.calculationType;
  const decimals = getDecimalPlaces(calculationType);
  const multiplier = Math.pow(10, decimals);
  return Math.round(score * multiplier) / multiplier;
}

/**
 * Normalize input string to ensure correct decimal places are always shown
 * Converts user input like "15.5" to "15.50" for 2 decimal places
 * @param input - Input string from user
 * @param config - Discipline configuration or calculationType
 * @returns Normalized string with correct decimal places
 */
export function normalizeScoreInput(input: string, config?: number | DisciplineScoreConfig): string {
  if (!input || input === '-' || input.trim() === '') {
    return '';
  }
  
  // Parse the input (handle comma as decimal separator)
  const normalizedInput = input.replace(',', '.');
  const numericValue = parseFloat(normalizedInput);
  
  if (isNaN(numericValue)) {
    return input; // Return original if not a valid number
  }
  
  // Handle legacy number parameter
  if (typeof config === 'number') {
    const decimals = getDecimalPlaces(config);
    return numericValue.toFixed(decimals);
  }
  
  // Check if time format
  const inputMask = config?.inputMask;
  const formatType = detectFormatType(inputMask);
  
  if (formatType === 'time') {
    return input; // Don't normalize time input
  }
  
  // Decimal format - ensure all decimal places are shown
  const calculationType = config?.calculationType;
  const decimals = getDecimalPlaces(calculationType);
  const formattedNumber = numericValue.toFixed(decimals);
  const separator = getDecimalSeparator(inputMask);
  
  // Return with correct separator
  return separator === ',' ? formattedNumber.replace('.', ',') : formattedNumber;
}

/**
 * Parse user input and convert to number, handling different separators
 * @param input - Input string from user (e.g., "15,5" or "15.5")
 * @returns Numeric value
 */
export function parseScoreInput(input: string): number {
  if (!input || input === '-' || input.trim() === '') {
    return 0;
  }
  
  // Replace comma with point for parsing
  const normalizedInput = input.replace(',', '.');
  const numericValue = parseFloat(normalizedInput);
  
  return isNaN(numericValue) ? 0 : numericValue;
}
