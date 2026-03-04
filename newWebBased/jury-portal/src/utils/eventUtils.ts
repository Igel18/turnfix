/**
 * Event utility functions — re-export from @turnfix/shared.
 *
 * DO NOT add logic here. Edit the canonical sources at:
 *   newWebBased/shared/src/eventDateUtils.ts  (isEventOnDate)
 *   newWebBased/shared/src/scoreFormatter.ts  (validateScore)
 *
 * This file exists only so that existing imports
 *   import { ... } from '../utils/eventUtils'
 * continue to work without changing every consumer file.
 */
export { isEventOnDate } from '@turnfix/shared';
export type { EventDateInfo } from '@turnfix/shared';

export { validateScore } from '@turnfix/shared/dist/scoreFormatter';
export type { ScoreValidationResult } from '@turnfix/shared/dist/scoreFormatter';
