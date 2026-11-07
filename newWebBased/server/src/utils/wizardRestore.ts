import { PrismaClient } from '@prisma/client';
import path from 'path';
import { restoreBackupToUrl, validateRestoreFiles } from './backupRestore';

interface WizardRestoreInput {
  backupPath: string;
  stagingPath: string;
  databaseName: string;
}

export class WizardRestoreError extends Error {
  constructor(public status: number, public code: string, message: string, public databaseCreated?: boolean | 'unknown', public databaseName?: string) {
    super(message);
  }
}

let restoring = false;

function overlaps(first: string, second: string): boolean {
  const relative = path.relative(first, second);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export async function restoreWizardBackup(input: WizardRestoreInput): Promise<{ success: true; databaseName: string; stagingPath: string }> {
  if (restoring) throw new WizardRestoreError(409, 'RESTORE_IN_PROGRESS', 'Another restore is already running');
  restoring = true;
  try {
    if (!input || typeof input.backupPath !== 'string' || typeof input.stagingPath !== 'string' || typeof input.databaseName !== 'string' || !/^[a-z][a-z0-9_]{0,62}$/.test(input.databaseName)) {
      throw new WizardRestoreError(400, 'INVALID_REQUEST', 'Valid backup path, staging path and database name are required');
    }
    let activeUrl: URL;
    try {
      activeUrl = new URL(process.env.DATABASE_URL || '');
      if (!['postgres:', 'postgresql:'].includes(activeUrl.protocol) || !activeUrl.hostname || !activeUrl.username || !activeUrl.pathname.slice(1)) throw new Error();
    } catch {
      throw new WizardRestoreError(500, 'INVALID_DATABASE_CONFIG', 'The active database configuration is invalid');
    }
    let activeName: string;
    try { activeName = decodeURIComponent(activeUrl.pathname.slice(1)); } catch {
      throw new WizardRestoreError(500, 'INVALID_DATABASE_CONFIG', 'The active database configuration is invalid');
    }
    if (input.databaseName === activeName || input.databaseName === 'postgres') {
      throw new WizardRestoreError(400, 'INVALID_TARGET_DATABASE', 'The active or administrative database cannot be the restore target');
    }
    const installationRoot = path.resolve(__dirname, '../../../..');
    const stagingPath = path.resolve(input.stagingPath);
    if (path.isAbsolute(input.stagingPath) && (overlaps(installationRoot, stagingPath) || overlaps(stagingPath, installationRoot))) {
      throw new WizardRestoreError(400, 'INVALID_BACKUP_OR_STAGING', 'Staging must be outside the installation directory');
    }
    try {
      await validateRestoreFiles(input, true);
    } catch {
      throw new WizardRestoreError(400, 'INVALID_BACKUP_OR_STAGING', 'Backup or staging validation failed');
    }
    const adminUrl = new URL(activeUrl.toString());
    adminUrl.pathname = '/postgres';
    const targetUrl = new URL(activeUrl.toString());
    targetUrl.pathname = `/${input.databaseName}`;
    for (const key of [...targetUrl.searchParams.keys()]) {
      if (key !== 'sslmode') targetUrl.searchParams.delete(key);
    }
    let created = false;
    try {
      const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
      try {
        await admin.$executeRawUnsafe(`CREATE DATABASE "${input.databaseName}" TEMPLATE template0`);
        created = true;
      } finally {
        await admin.$disconnect();
      }
    } catch (error: any) {
      if (created) throw new WizardRestoreError(500, 'RESTORE_FAILED', 'The new database was created and remains in place; restore did not complete', true, input.databaseName);
      if (error?.meta?.code === '42P04' || error?.code === '42P04') {
        throw new WizardRestoreError(409, 'DATABASE_EXISTS', 'The target database already exists');
      }
      throw new WizardRestoreError(502, 'DATABASE_CREATE_FAILED', 'Database creation failed or its outcome is unknown; check manually before retrying', 'unknown', input.databaseName);
    }
    try {
      await restoreBackupToUrl({ ...input, databaseUrl: targetUrl.toString(), confirmEmptyDatabase: input.databaseName });
    } catch {
      throw new WizardRestoreError(500, 'RESTORE_FAILED', 'The new database remains in place; restore or staging did not complete', true, input.databaseName);
    }
    return { success: true, databaseName: input.databaseName, stagingPath: input.stagingPath };
  } finally {
    restoring = false;
  }
}