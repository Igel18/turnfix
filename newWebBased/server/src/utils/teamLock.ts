import { Prisma } from '@prisma/client';

export async function lockTeam(tx: Prisma.TransactionClient, teamId: number): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(195286, ${teamId}::integer)`;
}
