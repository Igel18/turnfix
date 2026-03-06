/**
 * Status Loader
 * 
 * Loads status data from JSON files.
 * Status types are used to track participant progress through the competition.
 */

import fs from 'fs';
import path from 'path';
import { Status, parseColorCode, colorCodeToHex } from '../types/status.types';

/**
 * Resolve the path to the JSON data directory.
 * Works from both ts-node (src/) and compiled (dist/) contexts:
 *   1. __dirname/../json/  (same level — works in dist/ after postbuild copy)
 *   2. <serverRoot>/src/data/json/  (works when running via ts-node)
 */
function resolveJsonDir(): string {
  // Option 1: sibling json/ folder (dist/data/json/ when running from dist/data/loaders/)
  const siblingDir = path.join(__dirname, '..', 'json');
  if (fs.existsSync(siblingDir)) return siblingDir;

  // Option 2: src/data/json/ relative to server root (ts-node or dev)
  const srcDir = path.join(__dirname, '..', '..', '..', 'src', 'data', 'json');
  if (fs.existsSync(srcDir)) return srcDir;

  throw new Error(
    `Cannot find JSON data directory. Tried:\n  - ${siblingDir}\n  - ${srcDir}`
  );
}

const JSON_DIR = resolveJsonDir();
const STATUSES_PATH = path.join(JSON_DIR, 'statuses-production.json');

// Cache loaded data
let statusesCache: Status[] | null = null;

/**
 * Load production statuses from JSON
 */
export function loadProductionStatuses(): Status[] {
  if (statusesCache) {
    return statusesCache;
  }

  try {
    const data = fs.readFileSync(STATUSES_PATH, 'utf-8');
    statusesCache = JSON.parse(data);
    return statusesCache!;
  } catch (error) {
    console.error('Error loading production statuses:', error);
    throw new Error('Failed to load production statuses from JSON');
  }
}

/**
 * Get status by name
 */
export function getStatusByName(name: string): Status | undefined {
  const statuses = loadProductionStatuses();
  return statuses.find(s => s.name === name);
}

/**
 * Get all status names
 */
export function getAllStatusNames(): string[] {
  const statuses = loadProductionStatuses();
  return statuses.map(s => s.name);
}

/**
 * Get statistics about loaded statuses
 */
export function getStatusStatistics() {
  const statuses = loadProductionStatuses();
  
  return {
    total: statuses.length,
    withBogen: statuses.filter(s => s.bogen).length,
    withKarte: statuses.filter(s => s.karte).length
  };
}

// Re-export helper functions from types
export { parseColorCode, colorCodeToHex };
