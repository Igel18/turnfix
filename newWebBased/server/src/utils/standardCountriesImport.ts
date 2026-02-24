/**
 * Standard Countries Import
 * 
 * Seeds the tfx_laender table with standard countries commonly used
 * in gymnastics competitions (DACH region + European neighbors + major FIG nations).
 * Called from DB wizard to ensure the country dropdown is pre-populated.
 */

import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { isDebug } from './debug';

/** Standard countries relevant for gymnastics federations */
const STANDARD_COUNTRIES = [
  // DACH (primary)
  { var_name: 'Österreich', var_kuerzel: 'AT' },
  { var_name: 'Deutschland', var_kuerzel: 'DE' },
  { var_name: 'Schweiz', var_kuerzel: 'CH' },
  { var_name: 'Liechtenstein', var_kuerzel: 'LI' },
  // Central/Western Europe
  { var_name: 'Italien', var_kuerzel: 'IT' },
  { var_name: 'Frankreich', var_kuerzel: 'FR' },
  { var_name: 'Belgien', var_kuerzel: 'BE' },
  { var_name: 'Niederlande', var_kuerzel: 'NL' },
  { var_name: 'Luxemburg', var_kuerzel: 'LU' },
  // Eastern neighbors
  { var_name: 'Tschechien', var_kuerzel: 'CZ' },
  { var_name: 'Slowakei', var_kuerzel: 'SK' },
  { var_name: 'Ungarn', var_kuerzel: 'HU' },
  { var_name: 'Slowenien', var_kuerzel: 'SI' },
  { var_name: 'Kroatien', var_kuerzel: 'HR' },
  { var_name: 'Polen', var_kuerzel: 'PL' },
  // Northern Europe
  { var_name: 'Dänemark', var_kuerzel: 'DK' },
  { var_name: 'Schweden', var_kuerzel: 'SE' },
  { var_name: 'Norwegen', var_kuerzel: 'NO' },
  { var_name: 'Finnland', var_kuerzel: 'FI' },
  // Southern Europe
  { var_name: 'Spanien', var_kuerzel: 'ES' },
  { var_name: 'Portugal', var_kuerzel: 'PT' },
  { var_name: 'Griechenland', var_kuerzel: 'GR' },
  // Major FIG nations
  { var_name: 'Vereinigtes Königreich', var_kuerzel: 'GB' },
  { var_name: 'Vereinigte Staaten', var_kuerzel: 'US' },
  { var_name: 'Japan', var_kuerzel: 'JP' },
  { var_name: 'China', var_kuerzel: 'CN' },
  { var_name: 'Russland', var_kuerzel: 'RU' },
  { var_name: 'Kanada', var_kuerzel: 'CA' },
  { var_name: 'Australien', var_kuerzel: 'AU' },
  { var_name: 'Brasilien', var_kuerzel: 'BR' },
  { var_name: 'Rumänien', var_kuerzel: 'RO' },
  { var_name: 'Bulgarien', var_kuerzel: 'BG' },
  { var_name: 'Türkei', var_kuerzel: 'TR' },
  { var_name: 'Irland', var_kuerzel: 'IE' },
];

export interface StandardCountriesResult {
  success: boolean;
  stats: {
    totalCountries: number;
    createdCountries: number;
    skippedCountries: number;
    existingCountries: string[];
  };
}

/**
 * Import standard countries into tfx_laender.
 * Skips countries that already exist (matched by var_kuerzel or var_name).
 */
export async function importStandardCountries(
  customClient?: PrismaClient | null
): Promise<StandardCountriesResult> {
  const db = customClient || prisma;

  // Get existing countries
  const existing = await db.tfx_laender.findMany({
    select: { var_name: true, var_kuerzel: true }
  });

  const existingNames = new Set(existing.map((c: { var_name: string | null; var_kuerzel: string | null }) => c.var_name?.toLowerCase()));
  const existingCodes = new Set(existing.map((c: { var_name: string | null; var_kuerzel: string | null }) => c.var_kuerzel?.toUpperCase()));

  let created = 0;
  let skipped = 0;
  const skippedNames: string[] = [];

  for (const country of STANDARD_COUNTRIES) {
    // Skip if name or code already exists
    if (
      existingNames.has(country.var_name.toLowerCase()) ||
      existingCodes.has(country.var_kuerzel.toUpperCase())
    ) {
      skipped++;
      skippedNames.push(country.var_name);
      if (isDebug()) {
        console.log(`🔍 DEBUG: Country "${country.var_name}" (${country.var_kuerzel}) already exists, skipping`);
      }
      continue;
    }

    await db.tfx_laender.create({
      data: {
        var_name: country.var_name,
        var_kuerzel: country.var_kuerzel,
      }
    });
    created++;

    if (isDebug()) {
      console.log(`🔍 DEBUG: Created country: ${country.var_name} (${country.var_kuerzel})`);
    }
  }

  console.log(`✅ Standard countries: ${created} created, ${skipped} skipped (already existed)`);

  return {
    success: true,
    stats: {
      totalCountries: STANDARD_COUNTRIES.length,
      createdCountries: created,
      skippedCountries: skipped,
      existingCountries: skippedNames,
    }
  };
}
