/**
 * Event CRUD Routes — Manages gymnastics events (Veranstaltungen).
 *
 * Routes:
 *   GET    /              - List all events (with pagination + search)
 *   POST   /              - Create new event
 *   PUT    /:id           - Update event
 *   DELETE /:id           - Delete event (with cascade option)
 *   GET    /:id           - Get single event by ID
 *   GET    /:id/statistics - Event statistics
 *   GET    /:id/participants - Deprecated compatibility redirect
 *   PUT    /:id/generate-start-numbers - Auto-assign start numbers
 *   POST   /:id/export-timeplan - Export time plan (placeholder)
 *
 * GymNet XML import routes are delegated to gymnetImport.ts.
 *
 * Refactored from original 3179-line monolith (SoC).
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=events.d.ts.map