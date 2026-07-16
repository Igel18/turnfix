/**
 * Test Database Seed Data
 * 
 * Creates a realistic, minimal dataset for integration tests.
 * Covers the full entity hierarchy:
 * 
 *   Sport
 *     └─ Disziplinen + Disziplinen_Felder + Formeln
 *   Laender → Verbaende → Gaue → Vereine
 *   Status (Wettkampf-Status)
 *   Bereiche (Competition Areas)
 *   Wettkampforte (Venues)
 *   Veranstaltungen (Events)
 *     └─ Wettkaempfe (Competitions)
 *         └─ Wettkaempfe_x_Disziplinen
 *   Teilnehmer (Participants)
 *     └─ Wertungen (Registrations)
 *         └─ Wertungen_Details (Scores)
 *
 * IDs are deterministic (hardcoded) so tests can reference them directly.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL },
  },
});

// ─── Deterministic IDs for referencing in tests ────────────────────────────

// IDs start at 9000+ to avoid conflicts with integration tests that use
// autoincrement IDs (1, 2, 3...). This way both can coexist.
export const TEST_IDS = {
  sport: { turnen: 9001 },
  formeln: { standard: 9001, mitAbzug: 9002 },
  disziplinen: { boden: 9001, sprung: 9002, reck: 9003, barren: 9004 },
  disziplinenFelder: {
    bodenNote: 9001, bodenAbzug: 9002,
    sprungNote: 9003, sprungAbzug: 9004,
    reckNote: 9005, reckAbzug: 9006,
    barrenNote: 9007, barrenAbzug: 9008,
  },
  laender: { deutschland: 9001 },
  verbaende: { dtb: 9001 },
  gaue: { berlin: 9001, bayern: 9002 },
  vereine: { tvBerlin: 9001, tsvMuenchen: 9002, scHamburg: 9003 },
  bereiche: { maennlich: 9001, weiblich: 9002 },
  status: { gemeldet: 9001, gestartet: 9002, fertig: 9003, disqualifiziert: 9004 },
  wettkampforte: { halleA: 9001, halleB: 9002 },
  veranstaltungen: { stadtmeisterschaft: 9001, vereinsfest: 9002 },
  wettkaempfe: { einzelM: 9001, einzelW: 9002, mannschaftM: 9003 },
  teilnehmer: {
    maxMueller: 9001, annaSchmidt: 9002, tomBecker: 9003,
    lisaWeber: 9004, paulFischer: 9005, mariaWagner: 9006,
  },
  wertungen: {
    maxEinzel: 9001, annaEinzel: 9002, tomEinzel: 9003,
    lisaEinzel: 9004, paulEinzel: 9005, mariaEinzel: 9006,
  },
} as const;

// ─── Seed Function ─────────────────────────────────────────────────────────

export async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data...');

  // ── 1. Sport ──────────────────────────────────────────────────────────
  await prisma.tfx_sport.create({
    data: { int_sportid: TEST_IDS.sport.turnen, var_name: 'Turnen' },
  });

  // ── 2. Formeln (Score Formulas) ───────────────────────────────────────
  await prisma.tfx_formeln.create({
    data: { int_formelid: TEST_IDS.formeln.standard, var_name: 'Standard', var_formel: 'a', int_typ: 0 },
  });
  await prisma.tfx_formeln.create({
    data: { int_formelid: TEST_IDS.formeln.mitAbzug, var_name: 'Mit Abzug', var_formel: 'a-b', int_typ: 0 },
  });

  // ── 3. Disziplinen (Disciplines) ──────────────────────────────────────
  const disciplines = [
    { int_disziplinenid: TEST_IDS.disziplinen.boden, var_name: 'Boden', var_kurz1: 'BO', var_kurz2: 'Boden', var_kuerzel: 'boden', int_versuche: 1, int_formelid: TEST_IDS.formeln.mitAbzug },
    { int_disziplinenid: TEST_IDS.disziplinen.sprung, var_name: 'Sprung', var_kurz1: 'SP', var_kurz2: 'Sprung', var_kuerzel: 'sprung', int_versuche: 2, int_formelid: TEST_IDS.formeln.standard },
    { int_disziplinenid: TEST_IDS.disziplinen.reck, var_name: 'Reck', var_kurz1: 'RE', var_kurz2: 'Reck', var_kuerzel: 'reck', int_versuche: 1, int_formelid: TEST_IDS.formeln.mitAbzug },
    { int_disziplinenid: TEST_IDS.disziplinen.barren, var_name: 'Barren', var_kurz1: 'BA', var_kurz2: 'Barren', var_kuerzel: 'barren', int_versuche: 1, int_formelid: TEST_IDS.formeln.mitAbzug },
  ];
  for (const d of disciplines) {
    await prisma.tfx_disziplinen.create({
      data: { ...d, int_sportid: TEST_IDS.sport.turnen },
    });
  }

  // ── 4. Disziplinen_Felder (Score Entry Fields) ────────────────────────
  const fields = [
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.bodenNote, int_disziplinenid: TEST_IDS.disziplinen.boden, var_name: 'Note', int_sortierung: 1, bol_endwert: true, bol_ausgangswert: false, int_gruppe: 1 },
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.bodenAbzug, int_disziplinenid: TEST_IDS.disziplinen.boden, var_name: 'Abzug', int_sortierung: 2, bol_endwert: false, bol_ausgangswert: false, int_gruppe: 1 },
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.sprungNote, int_disziplinenid: TEST_IDS.disziplinen.sprung, var_name: 'Note', int_sortierung: 1, bol_endwert: true, bol_ausgangswert: false, int_gruppe: 1 },
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.sprungAbzug, int_disziplinenid: TEST_IDS.disziplinen.sprung, var_name: 'Abzug', int_sortierung: 2, bol_endwert: false, bol_ausgangswert: false, int_gruppe: 1 },
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.reckNote, int_disziplinenid: TEST_IDS.disziplinen.reck, var_name: 'Note', int_sortierung: 1, bol_endwert: true, bol_ausgangswert: false, int_gruppe: 1 },
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.reckAbzug, int_disziplinenid: TEST_IDS.disziplinen.reck, var_name: 'Abzug', int_sortierung: 2, bol_endwert: false, bol_ausgangswert: false, int_gruppe: 1 },
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.barrenNote, int_disziplinenid: TEST_IDS.disziplinen.barren, var_name: 'Note', int_sortierung: 1, bol_endwert: true, bol_ausgangswert: false, int_gruppe: 1 },
    { int_disziplinen_felderid: TEST_IDS.disziplinenFelder.barrenAbzug, int_disziplinenid: TEST_IDS.disziplinen.barren, var_name: 'Abzug', int_sortierung: 2, bol_endwert: false, bol_ausgangswert: false, int_gruppe: 1 },
  ];
  for (const f of fields) {
    await prisma.tfx_disziplinen_felder.create({ data: f });
  }

  // ── 5. Laender → Verbaende → Gaue (Country → Association → District) ──
  await prisma.tfx_laender.create({
    data: { int_laenderid: TEST_IDS.laender.deutschland, var_name: 'Deutschland', var_kuerzel: 'DE' },
  });
  await prisma.tfx_verbaende.create({
    data: { int_verbaendeid: TEST_IDS.verbaende.dtb, int_laenderid: TEST_IDS.laender.deutschland, var_name: 'Deutscher Turner-Bund', var_kuerzel: 'DTB' },
  });
  await prisma.tfx_gaue.create({
    data: { int_gaueid: TEST_IDS.gaue.berlin, int_verbaendeid: TEST_IDS.verbaende.dtb, var_name: 'Turngau Berlin', var_kuerzel: 'BER' },
  });
  await prisma.tfx_gaue.create({
    data: { int_gaueid: TEST_IDS.gaue.bayern, int_verbaendeid: TEST_IDS.verbaende.dtb, var_name: 'Turngau Bayern', var_kuerzel: 'BAY' },
  });

  // ── 6. Vereine (Clubs) ────────────────────────────────────────────────
  await prisma.tfx_vereine.create({
    data: { int_vereineid: TEST_IDS.vereine.tvBerlin, var_name: 'TV Berlin 1850', int_gaueid: TEST_IDS.gaue.berlin },
  });
  await prisma.tfx_vereine.create({
    data: { int_vereineid: TEST_IDS.vereine.tsvMuenchen, var_name: 'TSV München', int_gaueid: TEST_IDS.gaue.bayern },
  });
  await prisma.tfx_vereine.create({
    data: { int_vereineid: TEST_IDS.vereine.scHamburg, var_name: 'SC Hamburg', int_gaueid: TEST_IDS.gaue.berlin },
  });

  // ── 7. Bereiche (Competition Areas) ───────────────────────────────────
  await prisma.tfx_bereiche.create({
    data: { int_bereicheid: TEST_IDS.bereiche.maennlich, var_name: 'Männlich', bol_maennlich: true, bol_weiblich: false },
  });
  await prisma.tfx_bereiche.create({
    data: { int_bereicheid: TEST_IDS.bereiche.weiblich, var_name: 'Weiblich', bol_maennlich: false, bol_weiblich: true },
  });

  // ── 8. Status ─────────────────────────────────────────────────────────
  const statuses = [
    { int_statusid: TEST_IDS.status.gemeldet, var_name: 'Gemeldet', ary_colorcode: '{128,128,128}' },
    { int_statusid: TEST_IDS.status.gestartet, var_name: 'Gestartet', ary_colorcode: '{0,128,0}' },
    { int_statusid: TEST_IDS.status.fertig, var_name: 'Fertig', ary_colorcode: '{0,0,255}' },
    { int_statusid: TEST_IDS.status.disqualifiziert, var_name: 'Disqualifiziert', ary_colorcode: '{255,0,0}' },
  ];
  for (const s of statuses) {
    await prisma.tfx_status.create({ data: s });
  }

  // ── 9. Wettkampforte (Venues) ─────────────────────────────────────────
  await prisma.tfx_wettkampforte.create({
    data: { int_wettkampforteid: TEST_IDS.wettkampforte.halleA, var_name: 'Sporthalle A', var_adresse: 'Hauptstraße 1', var_plz: '10115', var_ort: 'Berlin' },
  });
  await prisma.tfx_wettkampforte.create({
    data: { int_wettkampforteid: TEST_IDS.wettkampforte.halleB, var_name: 'Turnhalle B', var_adresse: 'Nebenstraße 5', var_plz: '80331', var_ort: 'München' },
  });

  // ── 10. Veranstaltungen (Events) ──────────────────────────────────────
  await prisma.tfx_veranstaltungen.create({
    data: {
      int_veranstaltungenid: TEST_IDS.veranstaltungen.stadtmeisterschaft,
      var_name: 'Stadtmeisterschaft Berlin 2026',
      dat_von: new Date('2026-06-15'),
      dat_bis: new Date('2026-06-16'),
      dat_meldeschluss: new Date('2026-06-01'),
      var_veranstalter: 'TV Berlin 1850',
      int_wettkampforteid: TEST_IDS.wettkampforte.halleA,
      int_runde: 1,
      txt_hinweise: 'Testveranstaltung für automatisierte Tests',
    },
  });
  await prisma.tfx_veranstaltungen.create({
    data: {
      int_veranstaltungenid: TEST_IDS.veranstaltungen.vereinsfest,
      var_name: 'Vereinsfest TSV München',
      dat_von: new Date('2026-09-20'),
      dat_bis: new Date('2026-09-20'),
      var_veranstalter: 'TSV München',
      int_wettkampforteid: TEST_IDS.wettkampforte.halleB,
      int_runde: 1,
    },
  });

  // ── 11. Wettkaempfe (Competitions) ────────────────────────────────────
  await prisma.tfx_wettkaempfe.create({
    data: {
      int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelM,
      int_veranstaltungenid: TEST_IDS.veranstaltungen.stadtmeisterschaft,
      int_bereicheid: TEST_IDS.bereiche.maennlich,
      var_name: 'Einzel männlich AK 16+',
      var_nummer: 'W01',
      yer_von: 2010,
      yer_bis: 1990,
      int_typ: 0,
      int_durchgang: 1,
    },
  });
  await prisma.tfx_wettkaempfe.create({
    data: {
      int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelW,
      int_veranstaltungenid: TEST_IDS.veranstaltungen.stadtmeisterschaft,
      int_bereicheid: TEST_IDS.bereiche.weiblich,
      var_name: 'Einzel weiblich AK 16+',
      var_nummer: 'W02',
      yer_von: 2010,
      yer_bis: 1990,
      int_typ: 0,
      int_durchgang: 1,
    },
  });
  await prisma.tfx_wettkaempfe.create({
    data: {
      int_wettkaempfeid: TEST_IDS.wettkaempfe.mannschaftM,
      int_veranstaltungenid: TEST_IDS.veranstaltungen.stadtmeisterschaft,
      int_bereicheid: TEST_IDS.bereiche.maennlich,
      var_name: 'Mannschaft männlich',
      var_nummer: 'W03',
      yer_von: 2010,
      yer_bis: 1990,
      int_typ: 1, // Mannschaftswettkampf
      int_durchgang: 1,
    },
  });

  // ── 12. Wettkaempfe_x_Disziplinen (Competition-Discipline mapping) ───
  let wxdId = 9001;
  for (const wkId of [TEST_IDS.wettkaempfe.einzelM, TEST_IDS.wettkaempfe.einzelW, TEST_IDS.wettkaempfe.mannschaftM]) {
    let sortierung = 1;
    for (const diszId of [TEST_IDS.disziplinen.boden, TEST_IDS.disziplinen.sprung, TEST_IDS.disziplinen.reck, TEST_IDS.disziplinen.barren]) {
      await prisma.tfx_wettkaempfe_x_disziplinen.create({
        data: {
          int_wettkaempfe_x_disziplinenid: wxdId++,
          int_wettkaempfeid: wkId,
          int_disziplinenid: diszId,
          int_sortierung: sortierung++,
        },
      });
    }
  }

  // ── 13. Teilnehmer (Participants) ─────────────────────────────────────
  const participants = [
    { int_teilnehmerid: TEST_IDS.teilnehmer.maxMueller, var_vorname: 'Max', var_nachname: 'Müller', int_geschlecht: 1, dat_geburtstag: new Date('2000-03-15'), int_vereineid: TEST_IDS.vereine.tvBerlin },
    { int_teilnehmerid: TEST_IDS.teilnehmer.annaSchmidt, var_vorname: 'Anna', var_nachname: 'Schmidt', int_geschlecht: 2, dat_geburtstag: new Date('2001-07-22'), int_vereineid: TEST_IDS.vereine.tvBerlin },
    { int_teilnehmerid: TEST_IDS.teilnehmer.tomBecker, var_vorname: 'Tom', var_nachname: 'Becker', int_geschlecht: 1, dat_geburtstag: new Date('1999-11-08'), int_vereineid: TEST_IDS.vereine.tsvMuenchen },
    { int_teilnehmerid: TEST_IDS.teilnehmer.lisaWeber, var_vorname: 'Lisa', var_nachname: 'Weber', int_geschlecht: 2, dat_geburtstag: new Date('2002-01-30'), int_vereineid: TEST_IDS.vereine.tsvMuenchen },
    { int_teilnehmerid: TEST_IDS.teilnehmer.paulFischer, var_vorname: 'Paul', var_nachname: 'Fischer', int_geschlecht: 1, dat_geburtstag: new Date('2000-05-12'), int_vereineid: TEST_IDS.vereine.scHamburg },
    { int_teilnehmerid: TEST_IDS.teilnehmer.mariaWagner, var_vorname: 'Maria', var_nachname: 'Wagner', int_geschlecht: 2, dat_geburtstag: new Date('2001-09-03'), int_vereineid: TEST_IDS.vereine.scHamburg },
  ];
  for (const p of participants) {
    await prisma.tfx_teilnehmer.create({ data: p });
  }

  // ── 14. Wertungen (Registrations / Score Entries) ─────────────────────
  const wertungen = [
    // Männlich → einzelM
    { int_wertungenid: TEST_IDS.wertungen.maxEinzel, int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelM, int_teilnehmerid: TEST_IDS.teilnehmer.maxMueller, int_statusid: TEST_IDS.status.fertig, int_startnummer: 101, var_riege: 'A' },
    { int_wertungenid: TEST_IDS.wertungen.tomEinzel, int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelM, int_teilnehmerid: TEST_IDS.teilnehmer.tomBecker, int_statusid: TEST_IDS.status.fertig, int_startnummer: 102, var_riege: 'A' },
    { int_wertungenid: TEST_IDS.wertungen.paulEinzel, int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelM, int_teilnehmerid: TEST_IDS.teilnehmer.paulFischer, int_statusid: TEST_IDS.status.gemeldet, int_startnummer: 103, var_riege: 'B' },
    // Weiblich → einzelW
    { int_wertungenid: TEST_IDS.wertungen.annaEinzel, int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelW, int_teilnehmerid: TEST_IDS.teilnehmer.annaSchmidt, int_statusid: TEST_IDS.status.fertig, int_startnummer: 201, var_riege: 'A' },
    { int_wertungenid: TEST_IDS.wertungen.lisaEinzel, int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelW, int_teilnehmerid: TEST_IDS.teilnehmer.lisaWeber, int_statusid: TEST_IDS.status.gestartet, int_startnummer: 202, var_riege: 'A' },
    { int_wertungenid: TEST_IDS.wertungen.mariaEinzel, int_wettkaempfeid: TEST_IDS.wettkaempfe.einzelW, int_teilnehmerid: TEST_IDS.teilnehmer.mariaWagner, int_statusid: TEST_IDS.status.gemeldet, int_startnummer: 203, var_riege: 'B' },
  ];
  for (const w of wertungen) {
    await prisma.tfx_wertungen.create({ data: { ...w, int_runde: 1 } });
  }

  // ── 15. Wertungen_Details (Actual Scores) ─────────────────────────────
  // Only for participants with status "Fertig"
  const scores = [
    // Max Müller - Boden: 13.5, Sprung: 14.0, Reck: 12.8, Barren: 13.2
    { int_wertungenid: TEST_IDS.wertungen.maxEinzel, int_disziplinenid: TEST_IDS.disziplinen.boden, rel_leistung: 13.5, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.maxEinzel, int_disziplinenid: TEST_IDS.disziplinen.sprung, rel_leistung: 14.0, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.maxEinzel, int_disziplinenid: TEST_IDS.disziplinen.reck, rel_leistung: 12.8, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.maxEinzel, int_disziplinenid: TEST_IDS.disziplinen.barren, rel_leistung: 13.2, int_versuch: 1 },
    // Tom Becker - Boden: 12.9, Sprung: 13.5, Reck: 14.1, Barren: 12.7
    { int_wertungenid: TEST_IDS.wertungen.tomEinzel, int_disziplinenid: TEST_IDS.disziplinen.boden, rel_leistung: 12.9, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.tomEinzel, int_disziplinenid: TEST_IDS.disziplinen.sprung, rel_leistung: 13.5, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.tomEinzel, int_disziplinenid: TEST_IDS.disziplinen.reck, rel_leistung: 14.1, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.tomEinzel, int_disziplinenid: TEST_IDS.disziplinen.barren, rel_leistung: 12.7, int_versuch: 1 },
    // Anna Schmidt - Boden: 14.2, Sprung: 13.8, Reck: 13.0, Barren: 14.5
    { int_wertungenid: TEST_IDS.wertungen.annaEinzel, int_disziplinenid: TEST_IDS.disziplinen.boden, rel_leistung: 14.2, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.annaEinzel, int_disziplinenid: TEST_IDS.disziplinen.sprung, rel_leistung: 13.8, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.annaEinzel, int_disziplinenid: TEST_IDS.disziplinen.reck, rel_leistung: 13.0, int_versuch: 1 },
    { int_wertungenid: TEST_IDS.wertungen.annaEinzel, int_disziplinenid: TEST_IDS.disziplinen.barren, rel_leistung: 14.5, int_versuch: 1 },
  ];

  let detailId = 9001;
  for (const score of scores) {
    await prisma.tfx_wertungen_details.create({
      data: { int_wertungen_detailsid: detailId++, ...score },
    });
  }

  // ── 16. Wertungen_x_Disziplinen (which disciplines a participant competes in) ──
  let wxdisId = 9001;
  for (const wId of [TEST_IDS.wertungen.maxEinzel, TEST_IDS.wertungen.tomEinzel, TEST_IDS.wertungen.annaEinzel]) {
    for (const dId of [TEST_IDS.disziplinen.boden, TEST_IDS.disziplinen.sprung, TEST_IDS.disziplinen.reck, TEST_IDS.disziplinen.barren]) {
      await prisma.tfx_wertungen_x_disziplinen.create({
        data: { int_wertungen_x_disziplinenid: wxdisId++, int_wertungenid: wId, int_disziplinenid: dId },
      });
    }
  }

  // ── 17. Reset sequences so autoincrement starts at 1 (not after seed IDs) ──
  // This ensures integration tests that create records get IDs 1, 2, 3...
  // which don't conflict with our 9000+ seed IDs.
  const sequences: Array<{ table: string; column: string }> = [
    { table: 'tfx_sport', column: 'int_sportid' },
    { table: 'tfx_formeln', column: 'int_formelid' },
    { table: 'tfx_disziplinen', column: 'int_disziplinenid' },
    { table: 'tfx_disziplinen_felder', column: 'int_disziplinen_felderid' },
    { table: 'tfx_laender', column: 'int_laenderid' },
    { table: 'tfx_verbaende', column: 'int_verbaendeid' },
    { table: 'tfx_gaue', column: 'int_gaueid' },
    { table: 'tfx_vereine', column: 'int_vereineid' },
    { table: 'tfx_bereiche', column: 'int_bereicheid' },
    { table: 'tfx_status', column: 'int_statusid' },
    { table: 'tfx_wettkampforte', column: 'int_wettkampforteid' },
    { table: 'tfx_veranstaltungen', column: 'int_veranstaltungenid' },
    { table: 'tfx_wettkaempfe', column: 'int_wettkaempfeid' },
    { table: 'tfx_wettkaempfe_x_disziplinen', column: 'int_wettkaempfe_x_disziplinenid' },
    { table: 'tfx_teilnehmer', column: 'int_teilnehmerid' },
    { table: 'tfx_wertungen', column: 'int_wertungenid' },
    { table: 'tfx_wertungen_details', column: 'int_wertungen_detailsid' },
    { table: 'tfx_wertungen_x_disziplinen', column: 'int_wertungen_x_disziplinenid' },
  ];

  for (const { table, column } of sequences) {
    try {
      // setval to 1 with is_called=false → next nextval() returns 1
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), 1, false)`
      );
    } catch {
      // Some tables may not have a sequence (e.g., if PK is not serial)
    }
  }

  console.log('✅ Test data seeded (IDs 9000+, sequences reset to 1):');
  console.log('   • 1 Sport, 2 Formeln, 4 Disziplinen, 8 Felder');
  console.log('   • 1 Land, 1 Verband, 2 Gaue, 3 Vereine');
  console.log('   • 2 Bereiche, 4 Status, 2 Wettkampforte');
  console.log('   • 2 Veranstaltungen, 3 Wettkämpfe, 12 Wettkampf-Disziplinen');
  console.log('   • 6 Teilnehmer, 6 Wertungen, 12 Wertungen_Details');

  await prisma.$disconnect();
}

// Allow direct execution
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
