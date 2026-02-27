/**
 * Socket.IO shared configuration (Shared)
 *
 * SINGLE SOURCE OF TRUTH for socket connection options.
 * Each project provides its own URL resolution and singleton management.
 * Do NOT duplicate. Import from @turnfix/shared.
 */

/**
 * Default Socket.IO connection options shared across client &amp; jury-portal.
 * Pass these to `io(url, SOCKET_OPTIONS)`.
 */
export const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'] as string[],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
} as const;

/** Default backend port where Socket.IO server runs. */
export const SOCKET_SERVER_PORT = 3001;
