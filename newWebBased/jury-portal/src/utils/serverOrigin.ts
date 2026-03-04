/**
 * Server origin resolution for the Jury Portal.
 *
 * SINGLE SOURCE OF TRUTH for how the jury-portal derives the main server URL.
 * Used by:
 *   - JuryPortal.types.ts (API_BASE_URL)
 *   - socket.ts           (Socket.IO URL)
 *
 * In production the jury-portal is served on port 3002 / 5174,
 * but the backend API and Socket.IO both run on port 3001.
 */

const MAIN_SERVER_PORT = 3001;
const JURY_PORTS = [3002, 5174]; // ports that need to be replaced

/**
 * Returns the origin of the main backend server.
 *
 * - **Production**: replaces the jury-portal port with the main server port.
 * - **Development**: returns `http://localhost:3001`.
 */
export function getServerOrigin(): string {
  if (import.meta.env.PROD) {
    let origin = window.location.origin;
    for (const port of JURY_PORTS) {
      origin = origin.replace(`:${port}`, `:${MAIN_SERVER_PORT}`);
    }
    return origin;
  }
  return `http://localhost:${MAIN_SERVER_PORT}`;
}

/**
 * Returns the full API base URL (`<origin>/api`).
 *
 * - **Production**: uses `getServerOrigin()` + `/api`.
 * - **Development**: returns `/api` (relies on Vite proxy).
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    const url = `${getServerOrigin()}/api`;
    console.log('🔧 JURY API: Using production URL:', url);
    return url;
  }
  console.log('🔧 JURY API: Using development proxy: /api');
  return '/api';
}
