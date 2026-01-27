/**
 * GymNet Preset - Production Disciplines Import
 * 
 * This utility imports all disciplines from the production TurnFix database.
 * It includes:
 * - All sports (Turnen, Leichtathletik, Schwimmen, Gymnastik, etc.)
 * - Complete discipline configurations
 * - Associated formulas and fields
 * 
 * Usage: Called during database setup wizard or manually via API
 */

import prisma from '../lib/prisma';
import { PRODUCTION_DISCIPLINES, getAllSports } from '../data/productionDisciplines';

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
    console.log(`[ProductionDisciplines] Total disciplines to process: ${PRODUCTION_DISCIPLINES.length}`);
    
    let createdSports = 0;
    let createdFormulas = 0;
    let createdDisciplines = 0;
    let createdFields = 0;
    let skippedDisciplines = 0;

    // First, create all unique formulas from the disciplines
    const uniqueFormulas = new Map<string, { name: string; formula: string }>();
    PRODUCTION_DISCIPLINES.forEach(d => {
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

    // Process each discipline
    for (const disc of PRODUCTION_DISCIPLINES) {
      try {
        // 1. Ensure sport exists
        let sport = await prisma.tfx_sport.findFirst({
          where: { var_name: disc.sportart }
        });

        if (!sport) {
          sport = await prisma.tfx_sport.create({
            data: { var_name: disc.sportart }
          });
          createdSports++;
          console.log(`[ProductionDisciplines] Sport created: ${disc.sportart}`);
        }

        // 2. Check if discipline already exists
        const existing = await prisma.tfx_disziplinen.findFirst({
          where: {
            var_name: disc.name,
            int_sportid: sport.int_sportid
          }
        });

        if (existing) {
          skippedDisciplines++;
          continue; // Skip if already exists
        }

        // 3. Get formula ID if formula name is provided
        let formulaId: number | null = null;
        if (disc.formelName) {
          const formula = await prisma.tfx_formeln.findFirst({
            where: { var_name: disc.formelName }
          });
          formulaId = formula?.int_formelid || null;
        }

        // 4. Create discipline
        const createdDisc = await prisma.tfx_disziplinen.create({
          data: {
            int_sportid: sport.int_sportid,
            var_name: disc.name,
            var_kurz1: disc.kurzname?.substring(0, 5) || null, // Max 5 chars
            var_kurz2: disc.anzeigename || null,
            var_formel: disc.formel,
            var_maske: disc.maske || null,
            int_versuche: disc.versuche || 1,
            var_einheit: disc.einheit || null,
            var_icon: disc.icon || null,
            var_kuerzel: disc.kuerzel || null,
            int_berechnung: disc.berechnungstyp || 2,
            bol_bahnen: disc.bahnen || false,
            bol_m: disc.maennlich,
            bol_w: disc.weiblich,
            int_formelid: formulaId,
            bol_berechnen: disc.berechnen
          }
        });

        createdDisciplines++;
        console.log(`[ProductionDisciplines] Discipline created: ${disc.name} (${disc.sportart})`);

        // 5. Create fields for this discipline
        if (disc.felder && disc.felder.length > 0) {
          for (const field of disc.felder) {
            await prisma.tfx_disziplinen_felder.create({
              data: {
                int_disziplinenid: createdDisc.int_disziplinenid,
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
          console.log(`[ProductionDisciplines]   → ${disc.felder.length} fields created`);
        }

      } catch (error) {
        console.error(`[ProductionDisciplines] Error processing ${disc.name}:`, error);
        // Continue with next discipline
      }
    }

    const stats = {
      createdSports,
      createdFormulas,
      totalFormulas: uniqueFormulas.size,
      createdDisciplines,
      createdFields,
      skippedDisciplines,
      totalDisciplines: PRODUCTION_DISCIPLINES.length
    };

    console.log('[ProductionDisciplines] Import complete!');
    console.log(`[ProductionDisciplines] Stats:`, stats);

    return {
      success: true,
      stats
    };

  } catch (error: any) {
    console.error('[ProductionDisciplines] Import failed:', error);
    throw error;
  }
}
