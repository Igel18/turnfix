import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  saveGymnetEventIdMapping,
  loadGymnetEventIdMapping,
  buildGymnetResultsServiceUrl,
} from '../../src/utils/gymnetEventIdStore';

describe('gymnetEventIdStore', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymnet-event-id-store-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no mapping has been saved yet', () => {
    expect(loadGymnetEventIdMapping(123)).toBeNull();
  });

  it('saves and reloads a mapping for an event', () => {
    const saved = saveGymnetEventIdMapping(42, {
      gymnetEventId: '99999',
      evName: 'Landesmeisterschaft',
      evStart: '2026-05-01',
      evStop: '2026-05-02',
    });

    expect(saved.gymnetEventId).toBe('99999');
    expect(saved.updatedAt).toBeDefined();

    expect(loadGymnetEventIdMapping(42)).toEqual(saved);
  });

  it('keeps mappings for different events separate', () => {
    saveGymnetEventIdMapping(1, { gymnetEventId: 'A', evName: 'Event A', evStart: '2026-01-01', evStop: '2026-01-02' });
    saveGymnetEventIdMapping(2, { gymnetEventId: 'B', evName: 'Event B', evStart: '2026-02-01', evStop: '2026-02-02' });

    expect(loadGymnetEventIdMapping(1)?.gymnetEventId).toBe('A');
    expect(loadGymnetEventIdMapping(2)?.gymnetEventId).toBe('B');
  });

  it('overwrites an existing mapping when saved again', () => {
    saveGymnetEventIdMapping(5, { gymnetEventId: 'OLD', evName: 'x', evStart: 'x', evStop: 'x' });
    saveGymnetEventIdMapping(5, { gymnetEventId: 'NEW', evName: 'y', evStart: 'y', evStop: 'y' });

    expect(loadGymnetEventIdMapping(5)?.gymnetEventId).toBe('NEW');
  });
});

describe('buildGymnetResultsServiceUrl', () => {
  it('builds the DTB GymNet results service URL with the event ID', () => {
    expect(buildGymnetResultsServiceUrl('123456')).toBe(
      'https://m.ergebnisse.dtb-gymnet.de/index.php?eventID=123456'
    );
  });

  it('URL-encodes special characters in the event ID', () => {
    expect(buildGymnetResultsServiceUrl('abc def')).toBe(
      'https://m.ergebnisse.dtb-gymnet.de/index.php?eventID=abc%20def'
    );
  });
});
