import type { PrismaClient as PrismaClientType } from '@prisma/client';
/**
 * Generalized discipline selection for a competition name using DB values.
 * @param {string} competitionName
 * @param {PrismaClient} prisma
 * @returns {Promise<string[]>}
 */
export declare function getDisciplinesForCompetition(competitionName: string, prismaInstance: PrismaClientType): Promise<string[]>;
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=events.d.ts.map