/**
 * Sample Data Import for the Database Setup Wizard.
 * 
 * Creates ONE sample record each for:
 * - Land (Country)
 * - Verband (Association)
 * - Gau (Region/District)
 * - Verein (Club)
 * - Teilnehmer (Athlete/Participant) - one male, one female
 * - Wettkampfort (Venue)
 * - Layout (Certificate Layout)
 * 
 * These serve as reference data so the UI is not empty after a fresh DB setup.
 * Uses the dynamic Prisma client to support wizard's custom DB connections.
 */

import { PrismaClient } from '@prisma/client';
import prisma from '../db/connection';
import { isDebug } from './debug';

export interface SampleDataStats {
  createdCountries: number;
  createdAssociations: number;
  createdRegions: number;
  createdClubs: number;
  createdParticipants: number;
  createdVenues: number;
  createdLayouts: number;
  skipped: string[];
}

/**
 * Import sample data into the database.
 * Uses the provided Prisma client (for wizard custom DB) or falls back to the default client.
 * 
 * Each record is only created if the table is currently empty,
 * to avoid duplicates when re-running the wizard.
 */
export async function importSampleData(customClient?: PrismaClient | null): Promise<{
  success: boolean;
  stats: SampleDataStats;
}> {
  const db = customClient || prisma;
  
  const stats: SampleDataStats = {
    createdCountries: 0,
    createdAssociations: 0,
    createdRegions: 0,
    createdClubs: 0,
    createdParticipants: 0,
    createdVenues: 0,
    createdLayouts: 0,
    skipped: [],
  };

  if (isDebug()) {
    console.log('🔍 DEBUG: Starting sample data import...');
  }

  // 1. Country (Land)
  const countryCount = await db.tfx_laender.count();
  let countryId: number;
  if (countryCount === 0) {
    const country = await db.tfx_laender.create({
      data: {
        var_name: 'Deutschland',
        var_kuerzel: 'DE',
      },
    });
    countryId = country.int_laenderid;
    stats.createdCountries = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample country:', country);
  } else {
    const existing = await db.tfx_laender.findFirst();
    countryId = existing!.int_laenderid;
    stats.skipped.push('countries');
    if (isDebug()) console.log('🔍 DEBUG: Countries already exist, skipping');
  }

  // 2. Association (Verband)
  const associationCount = await db.tfx_verbaende.count();
  let associationId: number;
  if (associationCount === 0) {
    const association = await db.tfx_verbaende.create({
      data: {
        var_name: 'Muster-Turnverband',
        var_kuerzel: 'MTV',
        int_laenderid: countryId,
      },
    });
    associationId = association.int_verbaendeid;
    stats.createdAssociations = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample association:', association);
  } else {
    const existing = await db.tfx_verbaende.findFirst();
    associationId = existing!.int_verbaendeid;
    stats.skipped.push('associations');
    if (isDebug()) console.log('🔍 DEBUG: Associations already exist, skipping');
  }

  // 3. Region/District (Gau)
  const regionCount = await db.tfx_gaue.count();
  let regionId: number;
  if (regionCount === 0) {
    const region = await db.tfx_gaue.create({
      data: {
        var_name: 'Muster-Turngau',
        var_kuerzel: 'MTG',
        int_verbaendeid: associationId,
      },
    });
    regionId = region.int_gaueid;
    stats.createdRegions = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample region:', region);
  } else {
    const existing = await db.tfx_gaue.findFirst();
    regionId = existing!.int_gaueid;
    stats.skipped.push('regions');
    if (isDebug()) console.log('🔍 DEBUG: Regions already exist, skipping');
  }

  // 4. Club (Verein)
  const clubCount = await db.tfx_vereine.count();
  let clubId: number;
  if (clubCount === 0) {
    const club = await db.tfx_vereine.create({
      data: {
        var_name: 'TV Musterstadt',
        int_gaueid: regionId,
      },
    });
    clubId = club.int_vereineid;
    stats.createdClubs = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample club:', club);
  } else {
    const existing = await db.tfx_vereine.findFirst();
    clubId = existing!.int_vereineid;
    stats.skipped.push('clubs');
    if (isDebug()) console.log('🔍 DEBUG: Clubs already exist, skipping');
  }

  // 5. Participants (Teilnehmer) - one male, one female
  const participantCount = await db.tfx_teilnehmer.count();
  if (participantCount === 0) {
    const maleParticipant = await db.tfx_teilnehmer.create({
      data: {
        var_vorname: 'Max',
        var_nachname: 'Mustermann',
        int_geschlecht: 1, // 1 = male
        int_vereineid: clubId,
        dat_geburtstag: new Date('2010-06-15'),
        bool_nur_jahr: false,
      },
    });
    const femaleParticipant = await db.tfx_teilnehmer.create({
      data: {
        var_vorname: 'Erika',
        var_nachname: 'Musterfrau',
        int_geschlecht: 2, // 2 = female
        int_vereineid: clubId,
        dat_geburtstag: new Date('2011-03-22'),
        bool_nur_jahr: false,
      },
    });
    stats.createdParticipants = 2;
    if (isDebug()) {
      console.log('🔍 DEBUG: Created sample participants:', maleParticipant, femaleParticipant);
    }
  } else {
    stats.skipped.push('participants');
    if (isDebug()) console.log('🔍 DEBUG: Participants already exist, skipping');
  }

  // 6. Venue (Wettkampfort)
  const venueCount = await db.tfx_wettkampforte.count();
  if (venueCount === 0) {
    const venue = await db.tfx_wettkampforte.create({
      data: {
        var_name: 'Muster-Sporthalle',
        var_adresse: 'Turnstraße 1',
        var_plz: '12345',
        var_ort: 'Musterstadt',
      },
    });
    stats.createdVenues = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample venue:', venue);
  } else {
    stats.skipped.push('venues');
    if (isDebug()) console.log('🔍 DEBUG: Venues already exist, skipping');
  }

  // 7. Certificate Layout (Layout)
  const layoutCount = await db.tfx_layouts.count();
  if (layoutCount === 0) {
    const layout = await db.tfx_layouts.create({
      data: {
        var_name: 'Standard-Urkunde',
        txt_comment: 'Muster-Layout für Urkunden. Kann in der Layout-Verwaltung angepasst werden.',
      },
    });
    stats.createdLayouts = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample layout:', layout);
  } else {
    stats.skipped.push('layouts');
    if (isDebug()) console.log('🔍 DEBUG: Layouts already exist, skipping');
  }

  const totalCreated = stats.createdCountries + stats.createdAssociations 
    + stats.createdRegions + stats.createdClubs + stats.createdParticipants 
    + stats.createdVenues + stats.createdLayouts;

  console.log(`✅ Sample data import complete: ${totalCreated} records created, ${stats.skipped.length} categories skipped`);

  return { success: true, stats };
}
