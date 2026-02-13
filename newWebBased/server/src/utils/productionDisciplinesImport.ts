/**
 * Production Disciplines Import Utility
 * 
 * This utility imports all disciplines from the production TurnFix database.
 * It includes:
 * - All sports (Turnen, Leichtathletik, Schwimmen, Gymnastik, etc.)
 * - Complete discipline configurations
 * - Associated formulas and fields
 * 
 * Usage: Called during database setup wizard or manually via API
 * 
 * Now uses JSON-based data loaders for better maintainability.
 */

import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { 
  loadProductionDisciplines, 
  getAvailableSports 
} from '../data/loaders/disciplineLoader';

// Known formula definitions - used when JSON disciplines reference a formelName
// but don't include the formula string themselves (e.g. Turnen DTB, DTB P, DTB LK).
// These must match the formulas created by GymNet preset.
const KNOWN_FORMULAS: Record<string, { formula: string; typ: number }> = {
  'D+E-Neutral': { formula: '1*x', typ: 0 },
  'P-Wettkampf': { formula: '(10 + A) - B', typ: 1 },
  'AK':          { formula: 'A - B - C', typ: 1 },
  'LK':          { formula: 'A + B - C', typ: 1 },
};

// Sports where the default einheit should be "Pkt." if not set
const TURNEN_SPORTS = ['Turnen', 'Turnen DTB', 'Turnen DTB P', 'Turnen DTB LK', 'Turnen DTB Turn10'];

export async function applyProductionDisciplines(customPrismaClient?: PrismaClient) {
  // Use custom client if provided (for wizard), otherwise use default
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

    console.log('[ProductionDisciplines] Starting import...');
    
    // Load disciplines from JSON
    const disciplines = loadProductionDisciplines();
    console.log(`[ProductionDisciplines] Loaded ${disciplines.length} disciplines from JSON`);
    
    let createdSports = 0;
    let createdFormulas = 0;
    let createdDisciplines = 0;
    let createdFields = 0;
    let skippedDisciplines = 0;

    // First, collect all unique formulas referenced by disciplines.
    // Use the formula string from the JSON if available, otherwise fall back
    // to KNOWN_FORMULAS so that DTB formulas (LK, AK, P-Wettkampf) are also created.
    const uniqueFormulas = new Map<string, { name: string; formula: string; typ: number }>();
    disciplines.forEach(d => {
      if (d.formelName) {
        if (d.formel) {
          // Formula string from JSON data
          uniqueFormulas.set(d.formelName, { name: d.formelName, formula: d.formel, typ: 0 });
        } else if (KNOWN_FORMULAS[d.formelName] && !uniqueFormulas.has(d.formelName)) {
          // Fallback to known formula definition
          uniqueFormulas.set(d.formelName, {
            name: d.formelName,
            formula: KNOWN_FORMULAS[d.formelName].formula,
            typ: KNOWN_FORMULAS[d.formelName].typ
          });
        }
      }
    });

    console.log(`[ProductionDisciplines] Creating ${uniqueFormulas.size} unique formulas...`);
    for (const [_, formula] of uniqueFormulas) {
      const existing = await db.tfx_formeln.findFirst({
        where: { var_name: formula.name }
      });
      
      if (!existing) {
        await db.tfx_formeln.create({
          data: {
            var_name: formula.name,
            var_formel: formula.formula,
            int_typ: formula.typ
          }
        });
        createdFormulas++;
        console.log(`[ProductionDisciplines] Formula created: ${formula.name}`);
      }
    }

    // Get all unique sports
    const sports = getAvailableSports();
    console.log(`[ProductionDisciplines] Found ${sports.length} sports`);

    // Create sports if they don't exist
    for (const sportName of sports) {
      const existingSport = await db.tfx_sport.findFirst({
        where: { var_name: sportName }
      });
      
      if (!existingSport) {
        await db.tfx_sport.create({
          data: { var_name: sportName }
        });
        createdSports++;
      }
    }

    // Now import all disciplines
    console.log(`[ProductionDisciplines] Importing disciplines...`);
    for (const disc of disciplines) {
      // Check if discipline already exists
      const existing = await db.tfx_disziplinen.findFirst({
        where: { var_name: disc.name }
      });

      if (existing) {
        skippedDisciplines++;
        continue;
      }

      // Get sport ID
      const sport = await db.tfx_sport.findFirst({
        where: { var_name: disc.sportart }
      });

      if (!sport) {
        console.warn(`[ProductionDisciplines] Sport not found: ${disc.sportart} for discipline ${disc.name}`);
        continue;
      }

      // Get formula ID if exists
      let formelId = null;
      if (disc.formelName) {
        const formel = await db.tfx_formeln.findFirst({
          where: { var_name: disc.formelName }
        });
        formelId = formel?.int_formelid || null;
        if (!formelId) {
          console.warn(`[ProductionDisciplines] Formula '${disc.formelName}' not found for discipline '${disc.name}' - will be imported without formula link`);
        }
      }

      // Default einheit to "Pkt." for all Turnen sports if not set in JSON
      const einheit = disc.einheit || (TURNEN_SPORTS.includes(disc.sportart) ? 'Pkt.' : '');

      // Create discipline
      const created = await db.tfx_disziplinen.create({
        data: {
          var_name: disc.name?.substring(0, 100),                          // DB: VarChar(100)
          var_kurz1: disc.kurzname?.substring(0, 6),                        // DB: VarChar(6)
          var_kurz2: (disc.anzeigename || disc.name)?.substring(0, 20),     // DB: VarChar(20)
          var_maske: disc.maske?.substring(0, 10),                          // DB: VarChar(10)
          var_einheit: einheit?.substring(0, 5),                            // DB: VarChar(5)
          var_icon: disc.icon?.substring(0, 50),                            // DB: VarChar(50)
          var_kuerzel: disc.kuerzel?.substring(0, 50),                      // DB: VarChar(50)
          int_versuche: disc.versuche,
          int_formelid: formelId,
          int_sportid: sport.int_sportid,
          int_berechnung: disc.berechnungstyp,
          bol_m: disc.maennlich,
          bol_w: disc.weiblich,
          bol_bahnen: disc.bahnen,
          bol_berechnen: disc.berechnen
        }
      });

      createdDisciplines++;

      // Create fields if they exist
      if (disc.felder && disc.felder.length > 0) {
        for (const field of disc.felder) {
          await db.tfx_disziplinen_felder.create({
            data: {
              int_disziplinenid: created.int_disziplinenid,
              var_name: field.name?.substring(0, 15),    // DB: VarChar(15)
              int_sortierung: field.sortierung,
              bol_endwert: field.endwert,
              bol_ausgangswert: field.ausgangswert,
              int_gruppe: field.gruppe,
              bol_enabled: field.enabled
            }
          });
          createdFields++;
        }
      }
    }

    const result = {
      success: true,
      stats: {
        createdSports: createdSports,
        createdFormulas: createdFormulas,
        totalFormulas: uniqueFormulas.size,
        createdDisciplines: createdDisciplines,
        skippedDisciplines: skippedDisciplines,
        totalDisciplines: disciplines.length,
        createdFields: createdFields
      }
    };

    console.log('[ProductionDisciplines] Import complete!');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error: any) {
    console.error('[ProductionDisciplines] Import failed:', error);
    throw error;
  }
}
