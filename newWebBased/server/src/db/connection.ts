// Re-export the shared Prisma singleton from lib/prisma.ts
// This ensures all code uses the same Proxy-based instance that
// automatically switches to the new database after reconnectPrisma().
import { prisma } from '../lib/prisma';
export { prisma };

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
    return false;
  }
}

// Graceful disconnect
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error);
  }
}

// Auto-reconnect on connection loss
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

export async function ensureDatabaseConnection(): Promise<void> {
  const isConnected = await checkDatabaseConnection();
  
  if (!isConnected) {
    console.log(`⚠️ Database connection lost. Attempting to reconnect... (Attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      
      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
      
      try {
        // Try to reconnect
        await prisma.$connect();
        console.log('✅ Database reconnected successfully');
        reconnectAttempts = 0; // Reset counter on success
      } catch (error) {
        console.error('❌ Failed to reconnect to database:', error);
        await ensureDatabaseConnection(); // Retry
      }
    } else {
      console.error('❌ Maximum reconnection attempts reached. Giving up.');
      throw new Error('Database connection lost and could not be reestablished');
    }
  }
}

// Periodic connection check (every 60 seconds)
let healthCheckInterval: NodeJS.Timeout | null = null;

export function startDatabaseHealthCheck(intervalMs: number = 60000): void {
  if (healthCheckInterval) {
    console.log('⚠️ Health check already running');
    return;
  }
  
  console.log(`🏥 Starting database health check (interval: ${intervalMs}ms)`);
  
  healthCheckInterval = setInterval(async () => {
    const isHealthy = await checkDatabaseConnection();
    
    if (!isHealthy) {
      console.error('⚠️ Database health check failed! Attempting to reconnect...');
      await ensureDatabaseConnection();
    } else {
      if (process.env.DEBUG === 'true') {
        console.log('✅ Database health check passed');
      }
    }
  }, intervalMs);
}

export function stopDatabaseHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('🛑 Database health check stopped');
  }
}

// Query wrapper with automatic retry
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is connection-related
      const isConnectionError = 
        error.code === 'P1001' || // Can't reach database server
        error.code === 'P1002' || // Database server timeout
        error.code === 'P1017' || // Server closed connection
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT');
      
      if (isConnectionError && attempt < maxRetries) {
        console.log(`⚠️ Connection error detected. Retrying... (Attempt ${attempt}/${maxRetries})`);
        await ensureDatabaseConnection();
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
      
      // If not a connection error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError;
}

// Export configured Prisma instance
export default prisma;
