import { describe, expect, it } from 'vitest';
import { isDatabaseUnavailableImportError } from '@/pages/Events/utils/importErrorHints';

describe('isDatabaseUnavailableImportError', () => {
  it('matches the Prisma database-not-available error', () => {
    expect(isDatabaseUnavailableImportError('Invalid prisma.$queryRawUnsafe() invocation: Database not available does not exist on the database server at localhost')).toBe(true);
  });

  it('matches the database server does not exist variant', () => {
    expect(isDatabaseUnavailableImportError('XML import failed: Database not available does not exist on the database server at localhost')).toBe(true);
  });

  it('does not match unrelated import errors', () => {
    expect(isDatabaseUnavailableImportError('Import failed: XML parsing error')).toBe(false);
  });
});