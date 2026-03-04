/**
 * Socket.IO client (Jury Portal) — uses shared config from @turnfix/shared
 *
 * URL resolution is jury-portal-specific; connection options are shared.
 */
import { io, Socket } from 'socket.io-client';
import { SOCKET_OPTIONS } from '@turnfix/shared';
import { getServerOrigin } from './serverOrigin';

const getSocketUrl = () => {
  if (import.meta.env.PROD) {
    return getServerOrigin();
  }
  return import.meta.env.VITE_SOCKET_URL || getServerOrigin();
};

const SOCKET_URL = getSocketUrl();
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    if (!socket) {
      console.log('🔌 JURY: Creating new Socket.IO connection to:', SOCKET_URL);
      socket = io(SOCKET_URL, { ...SOCKET_OPTIONS });

      socket.on('connect', () => {
        console.log('✅ JURY: Socket.IO connected with ID:', socket?.id);
      });
      socket.on('disconnect', (reason) => {
        console.log('❌ JURY: Socket.IO disconnected:', reason);
      });
      socket.on('connect_error', (error) => {
        console.error('❌ JURY: Socket.IO connection error:', error);
      });
      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 JURY: Socket.IO reconnected after', attemptNumber, 'attempts');
      });
    } else if (!socket.connected) {
      console.log('🔄 JURY: Reconnecting existing socket...');
      socket.connect();
    }
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    console.log('🔌 JURY: Disconnecting Socket.IO');
    socket.disconnect();
    socket = null;
  }
}

export default getSocket;
