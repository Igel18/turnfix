export function isDatabaseUnavailableImportError(message?: string | null): boolean {
  if (!message) return false;

  const normalized = message.toLowerCase();
  return (
    normalized.includes('database not available') ||
    normalized.includes('does not exist on the database server') ||
    normalized.includes('invalid prisma.$queryrawunsafe() invocation')
  );
}