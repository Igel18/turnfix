/**
 * Debug utility for TurnFix server.
 * 
 * Centralized debug check - use this instead of process.env.NODE_ENV.
 * Enable debug mode by setting DEBUG=true in environment variables.
 */

/**
 * Check if debug mode is enabled.
 * @returns true if DEBUG environment variable is set to 'true'
 */
export function isDebug(): boolean {
  return process.env.DEBUG === 'true';
}
