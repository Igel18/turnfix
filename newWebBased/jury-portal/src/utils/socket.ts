import { io, Socket } from 'socket.io-client';

// Use relative URL in production (served from same server) or VITE_SOCKET_URL for dev
const getSocketUrl = () => {
  // If we're in production and served from the main server, use relative URL
  if (import.meta.env.PROD) {
    // Connect to the same host that served the page
    return window.location.origin.replace(':3002', ':3001').replace(':5174', ':3001');
  }
  // In development, use environment variable or default
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    // Only create new socket if none exists or it's disconnected
    if (!socket) {
      console.log('🔌 JURY: Creating new Socket.IO connection to:', SOCKET_URL);
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('✅ JURY: Socket.IO connected with ID:', socket?.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ JURY: Socket.IO disconnected:', reason);
        // Don't reset socket to null on disconnect, allow reconnection
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
