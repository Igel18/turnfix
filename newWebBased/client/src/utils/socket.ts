import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    // Only create new socket if none exists or it's disconnected
    if (!socket) {
      console.log('🔌 Creating new Socket.IO connection to:', SOCKET_URL);
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('✅ Socket.IO connected with ID:', socket?.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason);
        // Don't reset socket to null on disconnect, allow reconnection
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
