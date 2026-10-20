/**
 * File-based store for the GymNet event ID (evID) per TurnFix event.
 *
 * TurnFix generates its own event IDs, unrelated to GymNet's evID, and the
 * database schema is shared with the legacy Qt/C++ app (no schema changes).
 * The mapping is therefore kept as a small JSON sidecar file, keyed by the
 * TurnFix event ID — same pattern as the tagged GymNet XML imports.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface GymnetEventIdMapping {
  gymnetEventId: string;
  evName: string;
  evStart: string;
  evStop: string;
  updatedAt: string;
}

function getMetaDir(): string {
  const dir = path.join(process.cwd(), 'uploads', 'gymnet-meta');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMappingPath(eventId: number): string {
  return path.join(getMetaDir(), `event-${eventId}.json`);
}

export function saveGymnetEventIdMapping(
  eventId: number,
  mapping: Omit<GymnetEventIdMapping, 'updatedAt'>
): GymnetEventIdMapping {
  const record: GymnetEventIdMapping = { ...mapping, updatedAt: new Date().toISOString() };
  fs.writeFileSync(getMappingPath(eventId), JSON.stringify(record, null, 2), 'utf-8');
  return record;
}

export function loadGymnetEventIdMapping(eventId: number): GymnetEventIdMapping | null {
  const filePath = getMappingPath(eventId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function buildGymnetResultsServiceUrl(gymnetEventId: string): string {
  return `https://m.ergebnisse.dtb-gymnet.de/index.php?eventID=${encodeURIComponent(gymnetEventId)}`;
}
