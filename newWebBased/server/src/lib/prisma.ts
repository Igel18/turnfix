import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.DEBUG === 'true' ? ['query', 'error', 'warn'] : ['error'],
  })
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient()
}

/**
 * Proxy that always delegates to the current globalForPrisma.prisma instance.
 * This ensures that after reconnectPrisma() swaps the underlying client,
 * every module that imported `prisma` automatically uses the new connection —
 * no stale cached references.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(globalForPrisma.prisma, prop, receiver)
  },
  set(_target, prop, value) {
    return Reflect.set(globalForPrisma.prisma, prop, value)
  },
})

/**
 * Reconnect Prisma to a (potentially new) database.
 *
 * Call this after updating process.env.DATABASE_URL so that the singleton
 * PrismaClient is replaced by a fresh instance that picks up the new URL.
 * Because `prisma` is a Proxy, all existing imports automatically see the
 * new client without needing to re-import.
 */
export async function reconnectPrisma(): Promise<void> {
  console.log('🔄 Reconnecting Prisma to new DATABASE_URL …')
  try {
    await globalForPrisma.prisma.$disconnect()
  } catch (err) {
    console.warn('⚠️ Error disconnecting old Prisma client:', err)
  }

  // Create a fresh client that reads the updated process.env.DATABASE_URL
  const newClient = createPrismaClient()
  await newClient.$connect()

  // Swap the global reference — the Proxy will immediately delegate to it
  globalForPrisma.prisma = newClient
  console.log('✅ Prisma reconnected to:', process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@'))
}

export default prisma
