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
import { 
  loadProductionDisciplines, 
  getAvailableSports 
} from '../data/loaders/disciplineLoader';

export async function applyProductionDisciplines() {
  try {
    // Check if database schema exists
    try {
      await prisma.tfx_formeln.count();
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

    // First, create all unique formulas from the disciplines
    const uniqueFormulas = new Map<string, { name: string; formula: string }>();
    disciplines.forEach(d => {
      if (d.formelName && d.formel) {
        uniqueFormulas.set(d.formelName, { name: d.formelName, formula: d.formel });
      }
    });

    console.log(`[ProductionDisciplines] Creating ${uniqueFormulas.size} unique formulas...`);
    for (const [_, formula] of uniqueFormulas) {
      const existing = await prisma.tfx_formeln.findFirst({
        where: { var_name: formula.name }
      });
      
      if (!existing) {
        await prisma.tfx_formeln.create({
          data: {
            var_name: formula.name,
            var_formel: formula.formula,
            int_typ: 0 // Default type
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
      const existingSport = await prisma.tfx_sport.findFirst({
        where: { var_name: sportName }
      });
      
      if (!existingSport) {
        await prisma.tfx_sport.create({
          data: { var_name: sportName }
        });
        createdSports++;
      }
    }

    // Now import all disciplines
    console.log(`[ProductionDisciplines] Importing disciplines...`);
    for (const disc of disciplines) {
      // Check if discipline already exists
      const existing = await prisma.tfx_disziplinen.findFirst({
        where: { var_name: disc.name }
      });

      if (existing) {
        skippedDisciplines++;
        continue;
      }

      // Get sport ID
      const sport = await prisma.tfx_sport.findFirst({
        where: { var_name: disc.sportart }
      });

      if (!sport) {
        console.warn(`[ProductionDisciplines] Sport not found: ${disc.sportart} for discipline ${disc.name}`);
        continue;
      }

      // Get formula ID if exists
      let formelId = null;
      if (disc.formelName) {
        const formel = await prisma.tfx_formeln.findFirst({
          where: { var_name: disc.formelName }
        });
        formelId = formel?.int_formelid || null;
      }

      // Create discipline
      const created = await prisma.tfx_disziplinen.create({
        data: {
          var_name: disc.name,
          var_kurz1: disc.kurzname.substring(0, 5), // DB constraint: max 5 chars
          var_kurz2: disc.anzeigename,
          var_maske: disc.maske,
          var_einheit: disc.einheit,
          var_icon: disc.icon,
          var_kuerzel: disc.kuerzel,
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
          await prisma.tfx_disziplinen_felder.create({
            data: {
              int_disziplinenid: created.int_disziplinenid,
              var_name: field.name,
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
