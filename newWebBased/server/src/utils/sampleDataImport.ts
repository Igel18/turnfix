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
 * All seed values are stored in src/data/sampleData.json – edit that file
 * to change names, fields or layout definitions without touching this code.
 *
 * Uses the dynamic Prisma client to support wizard's custom DB connections.
 */

import { PrismaClient } from '@prisma/client';
import prisma from '../db/connection';
import { isDebug } from './debug';
import rawSampleData from '../data/sampleData.json';

// ─── Types matching sampleData.json ──────────────────────────────────────────

export interface SampleLayoutField {
  int_typ: number;
  var_font: string;
  rel_x: number;
  rel_y: number;
  rel_w: number;
  rel_h: number;
  var_value: string;
  int_align: number;
  int_layer: number;
}

export interface SampleParticipant {
  var_vorname: string;
  var_nachname: string;
  int_geschlecht: number;
  /** ISO date string, e.g. "2010-06-15" */
  dat_geburtstag: string;
  bool_nur_jahr: boolean;
}

export interface SampleData {
  country: { var_name: string; var_kuerzel: string };
  association: { var_name: string; var_kuerzel: string };
  region: { var_name: string; var_kuerzel: string };
  club: { var_name: string };
  participants: SampleParticipant[];
  venue: { var_name: string; var_adresse: string; var_plz: string; var_ort: string };
  layout: { var_name: string; txt_comment: string; fields: SampleLayoutField[] };
}

/** Returns the sample data loaded from sampleData.json. Exported for testing. */
export function loadSampleData(): SampleData {
  return rawSampleData as SampleData;
}

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
  const data = loadSampleData();

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
        var_name: data.country.var_name,
        var_kuerzel: data.country.var_kuerzel,
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
        var_name: data.association.var_name,
        var_kuerzel: data.association.var_kuerzel,
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
        var_name: data.region.var_name,
        var_kuerzel: data.region.var_kuerzel,
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
        var_name: data.club.var_name,
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

  // 5. Participants (Teilnehmer)
  const participantCount = await db.tfx_teilnehmer.count();
  if (participantCount === 0) {
    for (const p of data.participants) {
      await db.tfx_teilnehmer.create({
        data: {
          var_vorname: p.var_vorname,
          var_nachname: p.var_nachname,
          int_geschlecht: p.int_geschlecht,
          int_vereineid: clubId,
          dat_geburtstag: new Date(p.dat_geburtstag),
          bool_nur_jahr: p.bool_nur_jahr,
        },
      });
    }
    stats.createdParticipants = data.participants.length;
    if (isDebug()) console.log('🔍 DEBUG: Created', data.participants.length, 'sample participants');
  } else {
    stats.skipped.push('participants');
    if (isDebug()) console.log('🔍 DEBUG: Participants already exist, skipping');
  }

  // 6. Venue (Wettkampfort)
  const venueCount = await db.tfx_wettkampforte.count();
  if (venueCount === 0) {
    const venue = await db.tfx_wettkampforte.create({
      data: {
        var_name: data.venue.var_name,
        var_adresse: data.venue.var_adresse,
        var_plz: data.venue.var_plz,
        var_ort: data.venue.var_ort,
      },
    });
    stats.createdVenues = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample venue:', venue);
  } else {
    stats.skipped.push('venues');
    if (isDebug()) console.log('🔍 DEBUG: Venues already exist, skipping');
  }

  // 7. Certificate Layout (Layout) with layout fields
  const layoutCount = await db.tfx_layouts.count();
  if (layoutCount === 0) {
    const layout = await db.tfx_layouts.create({
      data: {
        var_name: data.layout.var_name,
        txt_comment: data.layout.txt_comment,
      },
    });

    for (const field of data.layout.fields) {
      await db.tfx_layout_felder.create({
        data: {
          int_layoutid: layout.int_layoutid,
          ...field,
        },
      });
    }

    stats.createdLayouts = 1;
    if (isDebug()) console.log('🔍 DEBUG: Created sample layout with', data.layout.fields.length, 'fields:', layout);
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
