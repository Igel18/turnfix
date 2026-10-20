/**
 * Unit tests for the GymNet import file-tagging helpers (gymnetImport.ts).
 *
 * After a successful import, the source XML is renamed (not deleted) so a
 * later GymNet results export can find it again via its event ID.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { xmlEventFilePrefix, renameImportedXmlFilesForEvent } from '../../src/routes/gymnetImport';

describe('xmlEventFilePrefix', () => {
  it('builds a prefix containing the event ID', () => {
    expect(xmlEventFilePrefix(42)).toBe('gymnet-event42-');
  });

  it('does not collide between event 4 and event 42', () => {
    const prefix4 = xmlEventFilePrefix(4);
    expect('gymnet-event42-import.xml'.startsWith(prefix4)).toBe(false);
  });
});

describe('renameImportedXmlFilesForEvent', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymnet-import-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prefixes a "gymnet-<timestamp>-<name>" file with the event ID after the "gymnet-" marker', () => {
    const original = path.join(tmpDir, 'gymnet-2026-09-23T10-11-12-123Z-original.xml');
    fs.writeFileSync(original, '<root/>');

    renameImportedXmlFilesForEvent([original], 42);

    const files = fs.readdirSync(tmpDir);
    expect(files).toEqual(['gymnet-event42-2026-09-23T10-11-12-123Z-original.xml']);
    expect(fs.existsSync(original)).toBe(false);
  });

  it('prepends the event prefix when the file does not start with "gymnet-"', () => {
    const original = path.join(tmpDir, 'custom-upload.xml');
    fs.writeFileSync(original, '<root/>');

    renameImportedXmlFilesForEvent([original], 7);

    const files = fs.readdirSync(tmpDir);
    expect(files).toEqual(['gymnet-event7-custom-upload.xml']);
  });

  it('renames every file when importing multiple XML files for the same event', () => {
    const first = path.join(tmpDir, 'gymnet-2026-01-01T00-00-00-000Z-a.xml');
    const second = path.join(tmpDir, 'gymnet-2026-01-01T00-00-01-000Z-b.xml');
    fs.writeFileSync(first, '<root/>');
    fs.writeFileSync(second, '<root/>');

    renameImportedXmlFilesForEvent([first, second], 99);

    const files = fs.readdirSync(tmpDir).sort();
    expect(files).toEqual([
      'gymnet-event99-2026-01-01T00-00-00-000Z-a.xml',
      'gymnet-event99-2026-01-01T00-00-01-000Z-b.xml',
    ]);
  });

  it('silently skips paths that no longer exist instead of throwing', () => {
    const missing = path.join(tmpDir, 'already-gone.xml');

    expect(() => renameImportedXmlFilesForEvent([missing], 1)).not.toThrow();
  });
});
