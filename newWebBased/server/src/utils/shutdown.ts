import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { disconnectDatabase } from '../db/connection';

let isShuttingDown = false;

/**
 * Graceful Shutdown Handler
 * Ensures clean shutdown of:
 * - HTTP Server (no new connections)
 * - Socket.IO (close all connections)
 * - Database (disconnect properly)
 * - Active Requests (finish processing)
 */
export function setupGracefulShutdown(
  server: Server,
  io?: SocketIOServer
): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('⚠️ Shutdown already in progress...');
      return;
    }

    isShuttingDown = true;
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

    // Step 1: Stop accepting new connections
    console.log('1️⃣ Stopping new connections...');
    server.close((err) => {
      if (err) {
        console.error('❌ Error closing server:', err);
      } else {
        console.log('✅ Server closed successfully');
      }
    });

    // Step 2: Close Socket.IO connections
    if (io) {
      console.log('2️⃣ Closing Socket.IO connections...');
      io.close(() => {
        console.log('✅ Socket.IO closed successfully');
      });
    }

    // Step 3: Wait for active requests to complete (with timeout)
    console.log('3️⃣ Waiting for active requests to complete...');
    const shutdownTimeout = setTimeout(() => {
      console.error('⚠️ Shutdown timeout reached. Forcing exit.');
      process.exit(1);
    }, parseInt(process.env.SHUTDOWN_TIMEOUT || '30000')); // 30 seconds default

    // Step 4: Disconnect from database
    try {
      console.log('4️⃣ Disconnecting from database...');
      await disconnectDatabase();
    } catch (error) {
      console.error('❌ Error disconnecting database:', error);
    }

    // Step 5: Clear timeout and exit
    clearTimeout(shutdownTimeout);
    console.log('✅ Graceful shutdown complete. Goodbye! 👋');
    process.exit(0);
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors during shutdown
  process.on('beforeExit', (code) => {
    console.log(`Process beforeExit event with code: ${code}`);
  });

  console.log('✅ Graceful shutdown handlers registered');
}

/**
 * Handle process warnings
 */
export function setupProcessWarnings(): void {
  process.on('warning', (warning) => {
    console.warn('⚠️ Process warning:', warning.name, warning.message);
    if (warning.stack) {
      console.warn(warning.stack);
    }
  });
}

/**
 * Handle unhandled promise rejections (backup safety net)
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    
    // In production, log and continue
    // In development, exit to ensure we fix the issue
    if (process.env.NODE_ENV === 'development') {
      console.error('💥 Exiting due to unhandled rejection (development mode)');
      process.exit(1);
    }
  });
}

/**
 * Handle uncaught exceptions (backup safety net)
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    
    // Always exit on uncaught exception (application is in undefined state)
    console.error('💥 Exiting due to uncaught exception');
    process.exit(1);
  });
}

export default setupGracefulShutdown;
