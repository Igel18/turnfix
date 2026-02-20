/**
 * Scores CRUD routes for TurnFix.
 *
 * Refactored for Separation of Concerns:
 * - scores.ts         → This file: CRUD routes (GET /, POST /, PUT /:id, DELETE /:id)
 * - scoresScoring.ts  → Scoring operations (save-value, create-wertung, calculate-final)
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=scores.d.ts.map