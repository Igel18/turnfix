/**
 * Score Formatting Utility (Shared)
 *
 * SINGLE SOURCE OF TRUTH — used by client and jury-portal.
 * Do NOT duplicate this file. Import from @turnfix/shared.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DisciplineScoreConfig {
  disciplineId?: number | string;
  calculationType?: number; // int_berechnung from tfx_disziplinen
  inputMask?: string;       // var_maske from tfx_disziplinen
  unit?: string;            // var_einheit from tfx_disziplinen
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const disciplineConfigCache = new Map<number | string, DisciplineScoreConfig>();

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Detect format type from input mask.
 * @returns 'time' | 'decimal-comma' | 'decimal-point'
 */
export function detectFormatType(inputMask?: string): 'time' | 'decimal-comma' | 'decimal-point' {
  if (!inputMask) return 'decimal-point';
  if (inputMask.includes(':')) return 'time';
  if (inputMask.includes(',')) return 'decimal-comma';
  return 'decimal-point';
}

/**
 * Get decimal separator based on input mask.
 */
export function getDecimalSeparator(inputMask?: string): '.' | ',' {
  return detectFormatType(inputMask) === 'decimal-comma' ? ',' : '.';
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

/**
 * Convert seconds to time format.
 */
export function formatTime(seconds: number, format: string = '0:00:00'): string {
  if (seconds < 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const decimalPlaces = (format.match(/\.0+/) || [''])[0].length - 1;
  const secondsStr = decimalPlaces > 0
    ? secs.toFixed(decimalPlaces).padStart(2 + decimalPlaces + 1, '0')
    : Math.floor(secs).toString().padStart(2, '0');

  if (format.includes('0:00:00')) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secondsStr}`;
  } else if (format.includes('00:00')) {
    const totalMinutes = Math.floor(seconds / 60);
    return `${totalMinutes.toString().padStart(2, '0')}:${secondsStr}`;
  }
  return `${minutes}:${secondsStr}`;
}

/**
 * Parse time string to seconds.
 */
export function parseTime(timeStr: string): number {
  if (!timeStr || timeStr === '-') return 0;

  const parts = timeStr.split(':');
  if (parts.length === 3) {
    return (parseInt(parts[0]) || 0) * 3600 +
           (parseInt(parts[1]) || 0) * 60 +
           (parseFloat(parts[2].replace(',', '.')) || 0);
  } else if (parts.length === 2) {
    return (parseInt(parts[0]) || 0) * 60 +
           (parseFloat(parts[1].replace(',', '.')) || 0);
  }
  return parseFloat(timeStr.replace(',', '.')) || 0;
}

// ---------------------------------------------------------------------------
// Decimal helpers
// ---------------------------------------------------------------------------

/**
 * Get number of decimal places for a discipline (0-3).
 */
export function getDecimalPlaces(calculationType?: number): number {
  if (calculationType === undefined || calculationType === null) return 2;
  return Math.max(0, Math.min(3, calculationType));
}

// ---------------------------------------------------------------------------
// Score formatting
// ---------------------------------------------------------------------------

/**
 * Format a score with the appropriate format (decimal or time).
 */
export function formatScore(
  score: number | null | undefined,
  config?: number | DisciplineScoreConfig
): string {
  if (score === null || score === undefined || isNaN(score)) return '-';

  if (typeof config === 'number') {
    return score.toFixed(getDecimalPlaces(config));
  }

  const inputMask = config?.inputMask;
  const formatType = detectFormatType(inputMask);

  if (formatType === 'time' && inputMask) {
    return formatTime(score, inputMask);
  }

  const decimals = getDecimalPlaces(config?.calculationType);
  const formatted = score.toFixed(decimals);
  const sep = getDecimalSeparator(inputMask);
  return sep === ',' ? formatted.replace('.', ',') : formatted;
}

/**
 * Format a score for a specific discipline using cached configuration.
 */
export function formatDisciplineScore(
  score: number | null | undefined,
  disciplineId: number | string,
  config?: DisciplineScoreConfig
): string {
  if (score === null || score === undefined || isNaN(score)) return '-';
  if (config) disciplineConfigCache.set(disciplineId, config);
  const finalConfig = disciplineConfigCache.get(disciplineId) || config;
  return formatScore(score, finalConfig);
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

export function setDisciplineConfig(disciplineId: number | string, config: DisciplineScoreConfig): void {
  disciplineConfigCache.set(disciplineId, config);
}

export function initializeDisciplineConfigs(disciplines: DisciplineScoreConfig[]): void {
  disciplines.forEach(d => {
    if (d.disciplineId !== undefined) disciplineConfigCache.set(d.disciplineId, d);
  });
}

export function clearDisciplineCache(): void {
  disciplineConfigCache.clear();
}

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

/**
 * Get placeholder text for an input field based on configuration.
 */
export function getScorePlaceholder(config?: number | DisciplineScoreConfig): string {
  if (typeof config === 'number') {
    const d = getDecimalPlaces(config);
    return d === 0 ? '0' : `0.${'0'.repeat(d)}`;
  }
  if (config?.inputMask) return config.inputMask;
  const d = getDecimalPlaces(config?.calculationType);
  return d === 0 ? '0' : `0.${'0'.repeat(d)}`;
}

/**
 * Get step value for an input field.
 */
export function getScoreInputStep(config?: number | DisciplineScoreConfig): string {
  if (typeof config === 'number') {
    const d = getDecimalPlaces(config);
    return d === 0 ? '1' : `0.${'0'.repeat(d - 1)}1`;
  }
  if (detectFormatType(config?.inputMask) === 'time') return '0.1';
  const d = getDecimalPlaces(config?.calculationType);
  return d === 0 ? '1' : `0.${'0'.repeat(d - 1)}1`;
}

/**
 * Validate and round a score to the correct precision.
 */
export function validateAndRoundScore(score: number, config?: number | DisciplineScoreConfig): number {
  if (typeof config === 'number') {
    const m = Math.pow(10, getDecimalPlaces(config));
    return Math.round(score * m) / m;
  }
  if (detectFormatType(config?.inputMask) === 'time') return score;
  const m = Math.pow(10, getDecimalPlaces(config?.calculationType));
  return Math.round(score * m) / m;
}

/**
 * Normalize input string to ensure correct decimal places are shown.
 */
export function normalizeScoreInput(input: string, config?: number | DisciplineScoreConfig): string {
  if (!input || input === '-' || input.trim() === '') return '';

  const num = parseFloat(input.replace(',', '.'));
  if (isNaN(num)) return input;

  if (typeof config === 'number') {
    return num.toFixed(getDecimalPlaces(config));
  }

  if (detectFormatType(config?.inputMask) === 'time') return input;

  const decimals = getDecimalPlaces(config?.calculationType);
  const formatted = num.toFixed(decimals);
  const sep = getDecimalSeparator(config?.inputMask);
  return sep === ',' ? formatted.replace('.', ',') : formatted;
}

/**
 * Parse user input to number, handling comma/point separators.
 */
export function parseScoreInput(input: string): number {
  if (!input || input === '-' || input.trim() === '') return 0;
  const num = parseFloat(input.replace(',', '.'));
  return isNaN(num) ? 0 : num;
}
