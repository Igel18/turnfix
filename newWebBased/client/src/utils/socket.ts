/**
 * Socket.IO client — uses shared config from @turnfix/shared
 *
 * URL resolution is client-specific; connection options are shared.
 */
import { io, Socket } from 'socket.io-client';
import { SOCKET_OPTIONS } from '@turnfix/shared';

const getSocketUrl = () => {
  if (import.meta.env.PROD) {
    const origin = window.location.origin;
    console.log('🔌 Socket.IO: Using production origin:', origin);
    return origin;
  }
  const devUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  console.log('🔌 Socket.IO: Using development URL:', devUrl);
  return devUrl;
};

const SOCKET_URL = getSocketUrl();
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    if (!socket) {
      console.log('🔌 Creating new Socket.IO connection to:', SOCKET_URL);
      socket = io(SOCKET_URL, { ...SOCKET_OPTIONS });

      socket.on('connect', () => {
        console.log('✅ Socket.IO connected with ID:', socket?.id);
      });
      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason);
      });
      socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
      });
      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      });
    } else if (!socket.connected) {
      console.log('🔄 Reconnecting existing socket...');
      socket.connect();
    }
  }
  return socket;
}

export default getSocket;
