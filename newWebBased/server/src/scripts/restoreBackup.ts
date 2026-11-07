import { restoreBackup, RestoreOptions } from '../utils/backupRestore';

export function parseRestoreArguments(args: string[]): RestoreOptions {
  const allowed = new Set(['--backup', '--target-config', '--staging', '--confirm-empty-database']);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!allowed.has(key) || !value || value.startsWith('--') || values.has(key)) throw new Error('Invalid or duplicate argument');
    values.set(key, value);
  }
  if (values.size !== allowed.size) throw new Error('All four arguments are required');
  return {
    backupPath: values.get('--backup')!,
    targetConfigPath: values.get('--target-config')!,
    stagingPath: values.get('--staging')!,
    confirmEmptyDatabase: values.get('--confirm-empty-database')!
  };
}

async function main(): Promise<void> {
  await restoreBackup(parseRestoreArguments(process.argv.slice(2)));
  console.log('Database restored and files staged. Stop the application before manually transferring staged files.');
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Restore failed');
    console.error('Usage: node dist/scripts/restoreBackup.js --backup <absolute-path> --target-config <absolute-path> --staging <absolute-path> --confirm-empty-database <database-name>');
    process.exitCode = 1;
  });
}