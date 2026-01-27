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

// JSON file paths - point to source directory (not dist)
const JSON_DIR = path.join(__dirname, '..', '..', '..', 'src', 'data', 'json');
const PRODUCTION_DISCIPLINES_PATH = path.join(JSON_DIR, 'disciplines-production.json');
const GYMNET_DISCIPLINES_PATH = path.join(JSON_DIR, 'disciplines-gymnet.json');

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
 * Load GymNet preset data from JSON
 */
export function loadGymNetPresetData(): { formulas: any[]; devices: any[] } {
  if (gymnetDataCache) {
    return gymnetDataCache;
  }

  try {
    const data = fs.readFileSync(GYMNET_DISCIPLINES_PATH, 'utf-8');
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
