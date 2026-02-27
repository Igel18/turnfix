/**
 * Score Formatting Utility — re-export from @turnfix/shared
 *
 * DO NOT add logic here. Edit the canonical source at:
 *   newWebBased/shared/src/scoreFormatter.ts
 *
 * This file exists only so that existing imports
 *   import { ... } from '@/utils/scoreFormatter'
 * continue to work without changing every consumer file.
 *
 * NOTE: Uses subpath import (not barrel) because scoreFormatter.formatScore
 * collides with formulaUtils.formatScore in the barrel export.
 */
export {
  detectFormatType,
  getDecimalSeparator,
  formatTime,
  parseTime,
  getDecimalPlaces,
  formatScore,
  formatDisciplineScore,
  setDisciplineConfig,
  initializeDisciplineConfigs,
  clearDisciplineCache,
  getScorePlaceholder,
  getScoreInputStep,
  validateAndRoundScore,
  normalizeScoreInput,
  parseScoreInput,
} from '@turnfix/shared/dist/scoreFormatter';

export type { DisciplineScoreConfig } from '@turnfix/shared/dist/scoreFormatter';
