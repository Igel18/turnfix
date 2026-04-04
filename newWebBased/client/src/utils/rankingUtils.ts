/**
 * rankingUtils — client compatibility shim
 *
 * All ranking logic lives in @turnfix/shared/rankingUtils (single source of truth).
 * This file re-exports everything so existing relative imports continue to work.
 *
 * Prefer importing directly from '@turnfix/shared' in new code.
 */
export { assignRanks, computeTotalScore, sortAndRank } from '@turnfix/shared';
