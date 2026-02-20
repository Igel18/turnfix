/**
 * Competition Routes — CRUD for gymnastics competitions (Wettkaempfe).
 *
 * Routes:
 *   GET    /               - List competitions (optional eventId filter)
 *   GET    /:id            - Get single competition with details
 *   GET    /:id/disciplines - Disciplines for a competition
 *   POST   /               - Create competition with disciplines
 *   PUT    /:id            - Update competition
 *   DELETE /:id            - Delete competition
 *   GET    /filter/search  - Filter competitions by criteria
 *
 * Shared helpers extracted to utils/competitionHelpers.ts (SoC refactoring).
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=competitions.d.ts.map