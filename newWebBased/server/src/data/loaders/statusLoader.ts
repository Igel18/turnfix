/**
 * Status Loader
 * 
 * Loads status data from JSON files.
 * Status types are used to track participant progress through the competition.
 */

import fs from 'fs';
import path from 'path';
import { Status, parseColorCode, colorCodeToHex } from '../types/status.types';

// JSON file path - point to source directory (not dist)
const JSON_DIR = path.join(__dirname, '..', '..', '..', 'src', 'data', 'json');
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
