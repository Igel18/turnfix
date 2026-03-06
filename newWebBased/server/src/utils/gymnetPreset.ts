/**
 * GymNet Preset — DB Wizard Import
 * 
 * Loads formulas, devices, and field definitions from the external JSON file
 * `src/data/json/gymnet-preset.json` and applies them to the database.
 * 
 * To modify the preset (add/change formulas, devices, fields):
 *   → Edit `server/src/data/json/gymnet-preset.json`
 *   → No rebuild required — changes take effect on next DB Wizard run.
 * 
 * The JSON is the SINGLE SOURCE OF TRUTH for all GymNet preset data.
 */

import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types for the JSON schema
// ---------------------------------------------------------------------------
interface PresetField {
  name: string;
  sortierung: number;
}

interface PresetFormula {
  name: string;
  formula: string;
  type: number;
  description?: string;
}

interface PresetDevice {
  id: number;
  name: string;
  anzeigename: string;
  kurzname: string;
  eingabemaske: string;
  einheit: string;
  symbol: string;
  formula: string;
  sport: string;
  bol_m: boolean;
  bol_w: boolean;
  isP?: boolean;
  fields: PresetField[];
}

export interface GymNetPresetData {
  version: string;
  maxPresetDisciplineId: number;
  formulas: PresetFormula[];
  devices: PresetDevice[];
}

// ---------------------------------------------------------------------------
// JSON file loader (runtime — no rebuild needed)
// ---------------------------------------------------------------------------

/**
 * Resolve the path to the gymnet-preset.json file.
 * Works from both ts-node (src/) and compiled (dist/) contexts.
 */
function resolvePresetJsonPath(): string {
  const candidates = [
    // From src/utils/ or dist/utils/ → ../data/json/
    path.join(__dirname, '..', 'data', 'json', 'gymnet-preset.json'),
    // Fallback: server root / src/data/json/
    path.join(__dirname, '..', '..', 'src', 'data', 'json', 'gymnet-preset.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Cannot find gymnet-preset.json. Tried:\n${candidates.map(c => `  - ${c}`).join('\n')}`
  );
}

let presetCache: GymNetPresetData | null = null;

/**
 * Load the GymNet preset data from JSON.
 * Cached after first load. Call `clearPresetCache()` to force reload.
 */
export function loadGymNetPreset(): GymNetPresetData {
  if (presetCache) return presetCache;
  
  const jsonPath = resolvePresetJsonPath();
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw) as GymNetPresetData;
  
  // Basic validation
  if (!data.formulas || !Array.isArray(data.formulas)) {
    throw new Error('gymnet-preset.json: missing or invalid "formulas" array');
  }
  if (!data.devices || !Array.isArray(data.devices)) {
    throw new Error('gymnet-preset.json: missing or invalid "devices" array');
  }
  if (typeof data.maxPresetDisciplineId !== 'number') {
    throw new Error('gymnet-preset.json: missing or invalid "maxPresetDisciplineId"');
  }
  
  console.log(`[GymNetPreset] Loaded preset from JSON: ${data.formulas.length} formulas, ${data.devices.length} devices (v${data.version})`);
  presetCache = data;
  return data;
}

/**
 * Clear the cached preset data. Useful after editing the JSON file at runtime.
 */
export function clearPresetCache(): void {
  presetCache = null;
}

// ---------------------------------------------------------------------------
// DB application logic (reads data from JSON, writes to database)
// ---------------------------------------------------------------------------

export async function applyGymNetPreset(customPrismaClient?: PrismaClient) {
  const db = customPrismaClient || prisma;
  
  try {
    // Check if database schema exists
    try {
      await db.tfx_formeln.count();
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        throw new Error('Database schema not initialized. Please run "Create Schema" step first.');
      }
      throw error;
    }

    // Load preset data from JSON (no hardcoded data!)
    const preset = loadGymNetPreset();

    // --- 1. Create/update formulas ---
    let createdFormulas = 0;
    for (const formula of preset.formulas) {
      const existing = await db.tfx_formeln.findFirst({ where: { var_name: formula.name } });
      const formulaData = {
        var_name: formula.name,
        var_formel: formula.formula,
        int_typ: formula.type
      };
      
      if (!existing) {
        await db.tfx_formeln.create({ data: formulaData });
        console.log(`[GymNetPreset] Formel hinzugefügt: ${formula.name}`);
        createdFormulas++;
      } else if (existing.var_formel !== formula.formula || existing.int_typ !== formula.type) {
        await db.tfx_formeln.update({
          where: { int_formelid: existing.int_formelid },
          data: formulaData
        });
        console.log(`[GymNetPreset] Formel aktualisiert: ${formula.name}`);
      }
    }

    // --- 2. Set PostgreSQL sequence ---
    const maxPresetId = preset.maxPresetDisciplineId;
    try {
      const maxIdResult = await db.$queryRawUnsafe<Array<{ max: number | null }>>(
        `SELECT MAX(int_disziplinenid) as max FROM tfx_disziplinen`
      );
      const currentMaxId = maxIdResult[0]?.max || 0;
      const newSeqValue = Math.max(currentMaxId, maxPresetId);
      await db.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('tfx_disziplinen', 'int_disziplinenid'), $1, true)`,
        newSeqValue
      );
      console.log(`[GymNetPreset] PostgreSQL Sequence auf ${newSeqValue} gesetzt (DB max: ${currentMaxId}, Preset max: ${maxPresetId}).`);
    } catch (seqError: any) {
      console.warn(`[GymNetPreset] Sequence-Reset fehlgeschlagen (nicht kritisch): ${seqError.message}`);
    }

    // --- 3. Create/update devices with fields ---
    let createdDevices = 0;
    let createdFields = 0;

    for (const device of preset.devices) {
      // Get or create sport
      let sport = await db.tfx_sport.findFirst({ where: { var_name: device.sport } });
      if (!sport) {
        sport = await db.tfx_sport.create({ data: { var_name: device.sport } });
        console.log(`[GymNetPreset] Sportart "${device.sport}" wurde angelegt.`);
      }
      const sportId = sport.int_sportid;

      // Look up formula
      const formula = await db.tfx_formeln.findFirst({ where: { var_name: device.formula } });

      // Build discipline data
      const disziplinData = {
        var_name: device.name?.substring(0, 100),
        var_kurz1: device.kurzname?.substring(0, 6),
        var_kurz2: (device.anzeigename || device.name)?.substring(0, 20),
        var_maske: device.eingabemaske?.substring(0, 10),
        var_einheit: device.einheit?.substring(0, 5),
        var_icon: device.symbol?.substring(0, 50),
        int_formelid: formula?.int_formelid || null,
        int_sportid: sportId,
        bol_m: device.bol_m,
        bol_w: device.bol_w
      };

      // Check if device already exists (by name or by ID)
      const existingByName = await db.tfx_disziplinen.findFirst({ where: { var_name: device.name } });
      const existingById = await db.tfx_disziplinen.findFirst({ where: { int_disziplinenid: device.id } });
      let disziplinId: number | null = null;

      if (existingByName) {
        disziplinId = existingByName.int_disziplinenid;
      } else if (existingById) {
        await db.tfx_disziplinen.update({
          where: { int_disziplinenid: device.id },
          data: disziplinData
        });
        disziplinId = device.id;
        console.log(`[GymNetPreset] Gerät aktualisiert (ID=${device.id} war belegt): ${device.name} (${device.kurzname})`);
        createdDevices++;
      } else {
        const created = await db.tfx_disziplinen.create({
          data: {
            int_disziplinenid: device.id,
            ...disziplinData
          }
        });
        disziplinId = created.int_disziplinenid;
        console.log(`[GymNetPreset] Gerät hinzugefügt: ${device.name} (ID=${device.id}, ${device.kurzname})`);
        createdDevices++;
      }

      // Create fields for this device
      if (disziplinId && device.fields && device.fields.length > 0) {
        for (const field of device.fields) {
          const existingField = await db.tfx_disziplinen_felder.findFirst({
            where: { int_disziplinenid: disziplinId, var_name: field.name }
          });
          if (!existingField) {
            await db.tfx_disziplinen_felder.create({
              data: {
                int_disziplinenid: disziplinId,
                var_name: field.name?.substring(0, 15),
                int_sortierung: field.sortierung,
                bol_endwert: field.name === 'Endwert',
                bol_ausgangswert: field.name === 'Ausgangswert',
                bol_enabled: true,
                int_gruppe: 1
              }
            });
            createdFields++;
            console.log(`[GymNetPreset]   Feld hinzugefügt: ${device.name} - ${field.name}`);
          }
        }
      }
    }

    // Summary
    const totalFormulas = preset.formulas.length;
    const totalDevices = preset.devices.length;
    const totalFields = preset.devices.reduce((sum, d) => sum + (d.fields?.length || 0), 0);

    console.log(`[GymNetPreset] Hinzugefügt: ${createdFormulas} neue Formeln, ${createdDevices} neue Geräte, ${createdFields} neue Felder.`);
    return {
      success: true,
      createdFormulas,
      createdDevices,
      createdFields,
      totalFormulas,
      totalDevices,
      totalFields
    };
  } catch (error: any) {
    console.error('[GymNetPreset] Error:', error);
    throw error;
  }
}
