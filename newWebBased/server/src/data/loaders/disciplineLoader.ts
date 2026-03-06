/**
 * Discipline Loader
 * 
 * Loads discipline data from JSON files:
 * - Production disciplines (from existing TurnFix database)
 * - GymNet preset disciplines (templates for new database setup)
 */

import fs from 'fs';
import path from 'path';
import { Discipline, GymNetDevice } from '../types/discipline.types';

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
const PRODUCTION_DISCIPLINES_PATH = path.join(JSON_DIR, 'disciplines-production.json');
const GYMNET_PRESET_PATH = path.join(JSON_DIR, 'gymnet-preset.json');

// Cache loaded data
let productionDisciplinesCache: Discipline[] | null = null;
let gymnetDataCache: { formulas: any[]; devices: any[] } | null = null;

/**
 * Load production disciplines from JSON
 */
export function loadProductionDisciplines(): Discipline[] {
  if (productionDisciplinesCache) {
    return productionDisciplinesCache;
  }

  try {
    const data = fs.readFileSync(PRODUCTION_DISCIPLINES_PATH, 'utf-8');
    productionDisciplinesCache = JSON.parse(data);
    return productionDisciplinesCache!;
  } catch (error) {
    console.error('Error loading production disciplines:', error);
    throw new Error('Failed to load production disciplines from JSON');
  }
}

/**
 * Load GymNet preset data from JSON (gymnet-preset.json v2.0)
 */
export function loadGymNetPresetData(): { formulas: any[]; devices: any[] } {
  if (gymnetDataCache) {
    return gymnetDataCache;
  }

  try {
    const data = fs.readFileSync(GYMNET_PRESET_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    gymnetDataCache = {
      formulas: parsed.formulas || [],
      devices: parsed.devices || []
    };
    return gymnetDataCache;
  } catch (error) {
    console.error('Error loading GymNet preset data:', error);
    throw new Error('Failed to load GymNet preset data from JSON');
  }
}

/**
 * Get all available sports from production disciplines
 */
export function getAvailableSports(): string[] {
  const disciplines = loadProductionDisciplines();
  const sports = new Set(disciplines.map(d => d.sportart));
  return Array.from(sports).sort();
}

/**
 * Get production disciplines by sport
 */
export function getProductionDisciplinesBySport(sportName: string): Discipline[] {
  const disciplines = loadProductionDisciplines();
  return disciplines.filter(d => d.sportart === sportName);
}

/**
 * Get production discipline by name
 */
export function getProductionDisciplineByName(name: string): Discipline | undefined {
  const disciplines = loadProductionDisciplines();
  return disciplines.find(d => d.name === name);
}

/**
 * Get GymNet formulas
 */
export function getGymNetFormulas(): any[] {
  const data = loadGymNetPresetData();
  return data.formulas;
}

/**
 * Get GymNet devices
 */
export function getGymNetDevices(): any[] {
  const data = loadGymNetPresetData();
  return data.devices;
}

/**
 * Get statistics about loaded data
 */
export function getDisciplineStatistics() {
  const production = loadProductionDisciplines();
  const gymnet = loadGymNetPresetData();
  
  return {
    production: {
      total: production.length,
      sports: getAvailableSports().length,
      withFormulas: production.filter(d => d.formel).length,
      withFields: production.filter(d => d.felder && d.felder.length > 0).length
    },
    gymnet: {
      formulas: gymnet.formulas.length,
      devices: gymnet.devices.length,
      devicesWithFields: gymnet.devices.filter((d: any) => d.fields).length
    }
  };
}
