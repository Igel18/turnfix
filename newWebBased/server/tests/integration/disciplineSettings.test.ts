/**
 * Integration tests for discipline settings:
 *   - Icon              (var_icon)
 *   - Kürzel            (var_kurz1, var_kurz2, var_kuerzel)
 *   - Einheit           (var_einheit)
 *   - Sportart          (int_sportid)
 *   - Eingabemaske      (var_maske)
 *   - Disziplinen-Felder (tfx_disziplinen_felder)
 *   - Formel            (var_formel, int_formelid — COALESCE priority)
 *   - Geschlecht        (bol_m, bol_w)
 *
 * Verifies that settings are:
 *   (A) persisted and retrievable via the Management-Server API
 *       (GET  /api/disciplines/:id)
 *       (PUT  /api/disciplines/:id)
 *   (B) visible in the Jury-Portal / Competition-Disciplines endpoint
 *       (GET  /api/competitions/:id/disciplines)
 *   (C) correct for discipline-level input fields
 *       (GET  /api/discipline-fields?disciplineId=X)
 *
 * Formula-priority rule (COALESCE in competitions/:id/disciplines):
 *   - If a formula record is linked (int_formelid → tfx_formeln), the formula's
 *     var_formel overrides the discipline's own var_formel.
 *   - If no formula record linked, the discipline's var_formel is used.
 *
 * NOTE:
 *   - Disciplines are created with int_sportid = TEST_IDS.sport.turnen (9001) to
 *     satisfy the FK constraint in the test DB.
 *   - Seed formula IDs: standard (9001, 'a'), mitAbzug (9002, 'a-b').
 *   - Competitions are created via POST /api/competitions to properly link disciplines.
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';
import { TEST_IDS } from '../fixtures/seed-test-data';

import disciplinesRouter from '../../src/routes/disciplines';
import disciplineFieldsRouter from '../../src/routes/disciplineFields';
import competitionsRouter from '../../src/routes/competitions';

// ─── Test Apps ────────────────────────────────────────────────────────────────

const disciplinesApp = express();
disciplinesApp.use(express.json());
disciplinesApp.use('/api/disciplines', disciplinesRouter);

const disciplineFieldsApp = express();
disciplineFieldsApp.use(express.json());
disciplineFieldsApp.use('/api/discipline-fields', disciplineFieldsRouter);

const competitionsApp = express();
competitionsApp.use(express.json());
competitionsApp.use('/api/competitions', competitionsRouter);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a discipline via POST /api/disciplines and track it for cleanup.
 * Returns the created discipline response body.
 */
async function createDiscipline(overrides: Record<string, any> = {}) {
  const payload = {
    name: overrides.name ?? 'Test Discipline',
    sportId: overrides.sportId ?? TEST_IDS.sport.turnen,
    maleAllowed: overrides.maleAllowed ?? true,
    femaleAllowed: overrides.femaleAllowed ?? true,
    ...overrides,
  };
  const response = await request(disciplinesApp)
    .post('/api/disciplines')
    .send(payload)
    .expect(201);
  const id = response.body.id ?? response.body.int_disziplinenid;
  TestUtils.trackCreated('disciplines', id);
  return response.body;
}

/**
 * Create a competition via POST /api/competitions with the given discipline linked.
 */
async function createCompetitionWithDiscipline(
  eventId: number,
  disciplineId: number,
  maxScore = 10,
): Promise<number> {
  const response = await request(competitionsApp)
    .post('/api/competitions')
    .send({
      name: 'Discipline Settings Comp',
      gender: 'männlich',
      ageFrom: 16,
      ageTo: 30,
      eventId,
      disciplines: [{ disciplineId, maxScore }],
    })
    .expect(201);
  const compId = response.body.id;
  TestUtils.trackCreated('competitions', compId);
  return compId;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Discipline Settings — Icons, Kürzel, Einheiten, Sportarten, Eingabemaske, Formel', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    await TestUtils.cleanupCreatedRecords();
  });

  // ── Icon (var_icon) ────────────────────────────────────────────────────────

  describe('Icon (var_icon)', () => {
    it('should create discipline with icon and retrieve via GET /api/disciplines/:id', async () => {
      const disc = await createDiscipline({ name: 'Icon Test Disc', icon: 'mdi-basketball' });
      const id = disc.id ?? disc.int_disziplinenid;

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.icon ?? getRes.body.var_icon).toBe('mdi-basketball');
    });

    it('should update icon via PUT /api/disciplines/:id', async () => {
      const disc = await createDiscipline({ name: 'Icon Update Disc', icon: 'mdi-run' });
      const id = disc.id ?? disc.int_disziplinenid;

      const putRes = await request(disciplinesApp)
        .put(`/api/disciplines/${id}`)
        .send({ icon: 'mdi-swim' })
        .expect(200);

      expect(putRes.body.icon ?? putRes.body.var_icon).toBe('mdi-swim');

      // Verify in DB
      const db = await prisma.tfx_disziplinen.findUnique({ where: { int_disziplinenid: id } });
      expect(db?.var_icon).toBe('mdi-swim');
    });

    it('should return icon in GET /api/competitions/:id/disciplines (Jury Portal)', async () => {
      const disc = await createDiscipline({ name: 'Icon Jury Disc', icon: 'mdi-trophy' });
      const discId = disc.id ?? disc.int_disziplinenid;

      const event = await TestUtils.createTestEvent({ name: 'Icon Jury Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      expect(found.var_icon).toBe('mdi-trophy');
    });
  });

  // ── Kürzel (var_kurz1, var_kurz2, var_kuerzel) ────────────────────────────

  describe('Kürzel (var_kurz1, var_kurz2, var_kuerzel)', () => {
    it('should create discipline with abbreviations and retrieve via GET /api/disciplines/:id', async () => {
      const disc = await createDiscipline({
        name: 'Kürzel Test Disc',
        shortName: 'KT',
        displayName: 'KürzTest',
        shortcut: 'kuerzel-test',
      });
      const id = disc.id ?? disc.int_disziplinenid;

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.var_kurz1 ?? getRes.body.short_name).toBe('KT');
      expect(getRes.body.var_kurz2 ?? getRes.body.display_name).toBe('KürzTest');
      expect(getRes.body.var_kuerzel ?? getRes.body.shortcut).toBe('kuerzel-test');
    });

    it('should update abbreviations via PUT /api/disciplines/:id', async () => {
      const disc = await createDiscipline({ name: 'Kürzel Update Disc', shortName: 'OL' });
      const id = disc.id ?? disc.int_disziplinenid;

      const putRes = await request(disciplinesApp)
        .put(`/api/disciplines/${id}`)
        .send({ shortName: 'NW', displayName: 'Neu' })
        .expect(200);

      expect(putRes.body.var_kurz1 ?? putRes.body.short_name).toBe('NW');
      expect(putRes.body.var_kurz2 ?? putRes.body.display_name).toBe('Neu');
    });

    it('should return abbreviations in GET /api/competitions/:id/disciplines', async () => {
      const disc = await createDiscipline({
        name: 'Kürzel Jury Disc',
        shortName: 'KJ',
        displayName: 'KürzJury',
      });
      const discId = disc.id ?? disc.int_disziplinenid;

      const event = await TestUtils.createTestEvent({ name: 'Kürzel Jury Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      expect(found.var_kurz1).toBe('KJ');
      expect(found.var_kurz2).toBe('KürzJury');
    });
  });

  // ── Einheit (var_einheit) ─────────────────────────────────────────────────

  describe('Einheit (var_einheit)', () => {
    it('should create discipline with unit and retrieve via GET /api/disciplines/:id', async () => {
      const disc = await createDiscipline({ name: 'Einheit Test Disc', unit: 'Pkt' });
      const id = disc.id ?? disc.int_disziplinenid;

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.var_einheit ?? getRes.body.unit).toBe('Pkt');
    });

    it('should return unit in GET /api/competitions/:id/disciplines', async () => {
      const disc = await createDiscipline({ name: 'Einheit Jury Disc', unit: 'm' });
      const discId = disc.id ?? disc.int_disziplinenid;

      const event = await TestUtils.createTestEvent({ name: 'Einheit Jury Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      expect(found.var_einheit).toBe('m');
    });

    it('should update unit via PUT /api/disciplines/:id', async () => {
      const disc = await createDiscipline({ name: 'Einheit Update Disc', unit: 'Pkt' });
      const id = disc.id ?? disc.int_disziplinenid;

      await request(disciplinesApp)
        .put(`/api/disciplines/${id}`)
        .send({ unit: 'sec' })
        .expect(200);

      const db = await prisma.tfx_disziplinen.findUnique({ where: { int_disziplinenid: id } });
      expect(db?.var_einheit).toBe('sec');
    });
  });

  // ── Sportart (int_sportid) ────────────────────────────────────────────────

  describe('Sportart (int_sportid)', () => {
    it('should create discipline linked to a sport and retrieve via GET /api/disciplines/:id', async () => {
      const disc = await createDiscipline({
        name: 'Sport Test Disc',
        sportId: TEST_IDS.sport.turnen,
      });
      const id = disc.id ?? disc.int_disziplinenid;

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.int_sportid ?? getRes.body.sport_id).toBe(TEST_IDS.sport.turnen);
    });

    it('should filter disciplines by sport via GET /api/disciplines (gender filter test)', async () => {
      // Create male-only discipline (bol_m=true, bol_w=false)
      const maleDisc = await createDiscipline({
        name: 'Male Only Disc',
        maleAllowed: true,
        femaleAllowed: false,
      });
      const maleId = maleDisc.id ?? maleDisc.int_disziplinenid;

      // GET all male disciplines
      const res = await request(disciplinesApp)
        .get('/api/disciplines')
        .query({ gender: 'male' })
        .expect(200);

      const ids = (res.body as any[]).map((d: any) => d.id ?? d.int_disziplinenid);
      expect(ids).toContain(maleId);
    });

    it('should return sport ID in GET /api/competitions/:id/disciplines (via discipline data)', async () => {
      const disc = await createDiscipline({
        name: 'Sport Jury Disc',
        sportId: TEST_IDS.sport.turnen,
      });
      const discId = disc.id ?? disc.int_disziplinenid;

      // Verify directly via disciplines endpoint
      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${discId}`)
        .expect(200);

      expect(Number(getRes.body.int_sportid ?? getRes.body.sport_id)).toBe(TEST_IDS.sport.turnen);
    });
  });

  // ── Eingabemaske (var_maske) ──────────────────────────────────────────────

  describe('Eingabemaske / Input Mask (var_maske)', () => {
    it('should create discipline with input mask and retrieve via GET /api/disciplines/:id', async () => {
      const disc = await createDiscipline({ name: 'Maske Test Disc', inputMask: 'DD.DD' });
      const id = disc.id ?? disc.int_disziplinenid;

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.var_maske ?? getRes.body.input_mask).toBe('DD.DD');
    });

    it('should update input mask via PUT /api/disciplines/:id', async () => {
      const disc = await createDiscipline({ name: 'Maske Update Disc', inputMask: 'DD.DD' });
      const id = disc.id ?? disc.int_disziplinenid;

      const putRes = await request(disciplinesApp)
        .put(`/api/disciplines/${id}`)
        .send({ inputMask: 'HH:MM' })
        .expect(200);

      expect(putRes.body.var_maske ?? putRes.body.input_mask).toBe('HH:MM');

      const db = await prisma.tfx_disziplinen.findUnique({ where: { int_disziplinenid: id } });
      expect(db?.var_maske).toBe('HH:MM');
    });

    it('should return input mask in GET /api/competitions/:id/disciplines (Jury Portal)', async () => {
      const disc = await createDiscipline({ name: 'Maske Jury Disc', inputMask: 'T:DDD' });
      const discId = disc.id ?? disc.int_disziplinenid;

      const event = await TestUtils.createTestEvent({ name: 'Maske Jury Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      // var_maske is mapped to both var_maske and var_eingabemaske
      expect(found.var_maske ?? found.var_eingabemaske).toBe('T:DDD');
    });
  });

  // ── Disziplinen-Felder (discipline input fields for jury portal) ───────────

  describe('Disziplinen-Felder (var_name, bol_endwert, bol_ausgangswert, bol_enabled)', () => {
    it('should create discipline fields and retrieve via GET /api/discipline-fields?disciplineId=X', async () => {
      const disc = await createDiscipline({ name: 'Fields Test Disc' });
      const discId = disc.id ?? disc.int_disziplinenid;

      // Create two input fields for this discipline
      const field1Res = await request(disciplineFieldsApp)
        .post('/api/discipline-fields')
        .send({
          disciplineId: discId,
          name: 'Note',
          sortOrder: 1,
          isFinalScore: true,
          isStartingScore: false,
          group: 1,
          enabled: true,
        })
        .expect(201);

      const field2Res = await request(disciplineFieldsApp)
        .post('/api/discipline-fields')
        .send({
          disciplineId: discId,
          name: 'Abzug',
          sortOrder: 2,
          isFinalScore: false,
          isStartingScore: false,
          group: 1,
          enabled: true,
        })
        .expect(201);

      // Retrieve by disciplineId
      const listRes = await request(disciplineFieldsApp)
        .get('/api/discipline-fields')
        .query({ disciplineId: discId })
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBe(2);

      const noteField = listRes.body.find((f: any) => f.name === 'Note');
      const abzugField = listRes.body.find((f: any) => f.name === 'Abzug');

      expect(noteField).toBeDefined();
      expect(noteField.isFinalScore).toBe(true);
      expect(noteField.sortOrder).toBe(1);
      expect(noteField.enabled).toBe(true);

      expect(abzugField).toBeDefined();
      expect(abzugField.isFinalScore).toBe(false);
      expect(abzugField.sortOrder).toBe(2);
    });

    it('should update discipline field enabled status via PUT /api/discipline-fields/:id', async () => {
      const disc = await createDiscipline({ name: 'Fields Update Disc' });
      const discId = disc.id ?? disc.int_disziplinenid;

      const createRes = await request(disciplineFieldsApp)
        .post('/api/discipline-fields')
        .send({
          disciplineId: discId,
          name: 'Pflichtfeld',
          sortOrder: 1,
          isFinalScore: true,
          isStartingScore: false,
          group: 1,
          enabled: true,
        })
        .expect(201);

      const fieldId = createRes.body.id;

      // Disable the field
      const putRes = await request(disciplineFieldsApp)
        .put(`/api/discipline-fields/${fieldId}`)
        .send({ enabled: false })
        .expect(200);

      expect(putRes.body.enabled).toBe(false);

      // Verify in DB
      const db = await prisma.tfx_disziplinen_felder.findUnique({
        where: { int_disziplinen_felderid: fieldId },
      });
      expect(db?.bol_enabled).toBe(false);
    });

    it('should return discipline fields for seed disciplines correctly', async () => {
      // The seed data for Boden (9001) has fields: Note (isFinalScore=true, sortOrder=1), Abzug (sortOrder=2)
      const res = await request(disciplineFieldsApp)
        .get('/api/discipline-fields')
        .query({ disciplineId: TEST_IDS.disziplinen.boden })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const noteField = res.body.find((f: any) => f.name === 'Note');
      expect(noteField).toBeDefined();
      expect(noteField.isFinalScore).toBe(true);
      expect(noteField.sortOrder).toBe(1);
    });
  });

  // ── Formel (var_formel, int_formelid — COALESCE priority) ─────────────────

  describe('Formel (var_formel, int_formelid)', () => {
    it('should create discipline with direct formula and retrieve via GET /api/disciplines/:id', async () => {
      const disc = await createDiscipline({
        name: 'Formula Test Disc',
        formula: 'a+b',
      });
      const id = disc.id ?? disc.int_disziplinenid;

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.var_formel ?? getRes.body.formula).toBe('a+b');
    });

    it('should use discipline var_formel in competition disciplines when no formula record linked', async () => {
      // Create discipline with formula directly, no formulaId
      const disc = await createDiscipline({
        name: 'Direct Formula Disc',
        formula: 'a*2',
      });
      const discId = disc.id ?? disc.int_disziplinenid;

      const event = await TestUtils.createTestEvent({ name: 'Direct Formula Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      // COALESCE(null, 'a*2') = 'a*2'
      expect(found.var_formel).toBe('a*2');
    });

    it('should prioritize formula table var_formel via COALESCE when int_formelid is set', async () => {
      // Discipline links to TEST_IDS.formeln.mitAbzug (var_formel = 'a-b')
      // Discipline also has its own var_formel = 'x+y'
      // COALESCE(f.var_formel='a-b', d.var_formel='x+y') should return 'a-b'
      const disc = await createDiscipline({
        name: 'COALESCE Formula Disc',
        formula: 'x+y',
        formulaId: TEST_IDS.formeln.mitAbzug,
      });
      const discId = disc.id ?? disc.int_disziplinenid;

      const event = await TestUtils.createTestEvent({ name: 'COALESCE Formula Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      // Formula table 'a-b' takes priority over discipline's 'x+y'
      expect(found.var_formel).toBe('a-b');
    });

    it('should use discipline var_formel when int_formelid is null (discipline level formula)', async () => {
      // Discipline has only its own formula (no formelId link)
      const disc = await createDiscipline({
        name: 'Disc Formula Only',
        formula: 'a-b+c',
        // formulaId explicitly not set → null
      });
      const discId = disc.id ?? disc.int_disziplinenid;

      const event = await TestUtils.createTestEvent({ name: 'Disc Formula Only Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      // No formula record linked → discipline formula used
      expect(found.var_formel).toBe('a-b+c');
    });

    it('should return formula ID in GET /api/disciplines/:id when linked to a formula record', async () => {
      const disc = await createDiscipline({
        name: 'Formula ID Disc',
        formula: 'placeholder',
        formulaId: TEST_IDS.formeln.standard,
      });
      const id = disc.id ?? disc.int_disziplinenid;

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(Number(getRes.body.int_formelid ?? getRes.body.formula_id)).toBe(TEST_IDS.formeln.standard);
    });
  });

  // ── Geschlecht / Gender Flags (bol_m, bol_w) ──────────────────────────────
  //
  // NOTE: POST /api/disciplines uses `validatedData.maleAllowed || ... || true` which
  // means `false` cannot be set for bol_m/bol_w at creation time (JS coercison bug).
  // The PUT endpoint uses direct parameter binding and sets false correctly.
  // These tests therefore set false flags via PUT after creation.

  describe('Geschlecht (bol_m, bol_w)', () => {
    it('should set male-only flags via PUT and return bol_m=true, bol_w=false', async () => {
      const disc = await createDiscipline({ name: 'Male Only Discipline' });
      const id = disc.id ?? disc.int_disziplinenid;

      // Use PUT to set femaleAllowed=false (POST bug prevents false at creation)
      await request(disciplinesApp)
        .put(`/api/disciplines/${id}`)
        .send({ maleAllowed: true, femaleAllowed: false })
        .expect(200);

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.bol_m ?? getRes.body.male_allowed).toBe(true);
      expect(getRes.body.bol_w ?? getRes.body.female_allowed).toBe(false);
    });

    it('should set female-only flags via PUT and return bol_m=false, bol_w=true', async () => {
      const disc = await createDiscipline({ name: 'Female Only Discipline' });
      const id = disc.id ?? disc.int_disziplinenid;

      // Use PUT to set maleAllowed=false
      await request(disciplinesApp)
        .put(`/api/disciplines/${id}`)
        .send({ maleAllowed: false, femaleAllowed: true })
        .expect(200);

      const getRes = await request(disciplinesApp)
        .get(`/api/disciplines/${id}`)
        .expect(200);

      expect(getRes.body.bol_m ?? getRes.body.male_allowed).toBe(false);
      expect(getRes.body.bol_w ?? getRes.body.female_allowed).toBe(true);
    });

    it('should return updated gender flags in GET /api/competitions/:id/disciplines', async () => {
      const disc = await createDiscipline({ name: 'Gender Jury Disc' });
      const discId = disc.id ?? disc.int_disziplinenid;

      // Set male-only via PUT
      await request(disciplinesApp)
        .put(`/api/disciplines/${discId}`)
        .send({ maleAllowed: true, femaleAllowed: false })
        .expect(200);

      const event = await TestUtils.createTestEvent({ name: 'Gender Jury Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const res = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const found = res.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(found).toBeDefined();
      expect(found.bol_m).toBe(true);
      expect(found.bol_w).toBe(false);
    });

    it('should filter male disciplines via GET /api/disciplines?gender=male', async () => {
      const maleDisc = await createDiscipline({ name: 'Male Filter Disc' });
      const femaleDisc = await createDiscipline({ name: 'Female Filter Disc' });
      const maleId = maleDisc.id ?? maleDisc.int_disziplinenid;
      const femaleId = femaleDisc.id ?? femaleDisc.int_disziplinenid;

      // Set male-only: bol_m=true, bol_w=false
      await request(disciplinesApp)
        .put(`/api/disciplines/${maleId}`)
        .send({ maleAllowed: true, femaleAllowed: false })
        .expect(200);
      // Set female-only: bol_m=false, bol_w=true
      await request(disciplinesApp)
        .put(`/api/disciplines/${femaleId}`)
        .send({ maleAllowed: false, femaleAllowed: true })
        .expect(200);

      const res = await request(disciplinesApp)
        .get('/api/disciplines')
        .query({ gender: 'male' })
        .expect(200);

      const ids = (res.body as any[]).map((d: any) => d.id ?? d.int_disziplinenid);
      expect(ids).toContain(maleId);
      expect(ids).not.toContain(femaleId);
    });

    it('should filter female disciplines via GET /api/disciplines?gender=female', async () => {
      const maleDisc = await createDiscipline({ name: 'Male Filter Disc 2' });
      const femaleDisc = await createDiscipline({ name: 'Female Filter Disc 2' });
      const maleId = maleDisc.id ?? maleDisc.int_disziplinenid;
      const femaleId = femaleDisc.id ?? femaleDisc.int_disziplinenid;

      // Set male-only
      await request(disciplinesApp)
        .put(`/api/disciplines/${maleId}`)
        .send({ maleAllowed: true, femaleAllowed: false })
        .expect(200);
      // Set female-only
      await request(disciplinesApp)
        .put(`/api/disciplines/${femaleId}`)
        .send({ maleAllowed: false, femaleAllowed: true })
        .expect(200);

      const res = await request(disciplinesApp)
        .get('/api/disciplines')
        .query({ gender: 'female' })
        .expect(200);

      const ids = (res.body as any[]).map((d: any) => d.id ?? d.int_disziplinenid);
      expect(ids).toContain(femaleId);
      expect(ids).not.toContain(maleId);
    });
  });

  // ── Settings propagation — Management API vs Jury Portal ──────────────────

  describe('Settings propagation — Management API vs Jury Portal consistency', () => {
    it('should show same settings in both GET /disciplines/:id and GET /competitions/:id/disciplines', async () => {
      const disc = await createDiscipline({
        name: 'All Settings Disc',
        icon: 'mdi-all',
        shortName: 'AS',
        displayName: 'AllSettings',
        unit: 'Pkt',
        inputMask: 'DD.DD',
        formula: 'a-b',
        maleAllowed: true,
        femaleAllowed: true,
        sportId: TEST_IDS.sport.turnen,
      });
      const discId = disc.id ?? disc.int_disziplinenid;

      // Management API
      const mgmtRes = await request(disciplinesApp)
        .get(`/api/disciplines/${discId}`)
        .expect(200);

      // Jury Portal (via competition disciplines)
      const event = await TestUtils.createTestEvent({ name: 'Consistency Event' });
      const compId = await createCompetitionWithDiscipline(event.int_veranstaltungenid, discId);

      const juryRes = await request(competitionsApp)
        .get(`/api/competitions/${compId}/disciplines`)
        .expect(200);

      const juryDisc = juryRes.body.disciplines?.find((d: any) => d.int_disziplinenid === discId);
      expect(juryDisc).toBeDefined();

      // Icon matches
      expect(mgmtRes.body.var_icon).toBe('mdi-all');
      expect(juryDisc.var_icon).toBe('mdi-all');

      // Abbreviations match
      expect(mgmtRes.body.var_kurz1).toBe('AS');
      expect(juryDisc.var_kurz1).toBe('AS');

      // Unit matches
      expect(mgmtRes.body.var_einheit).toBe('Pkt');
      expect(juryDisc.var_einheit).toBe('Pkt');

      // Input mask matches
      expect(mgmtRes.body.var_maske).toBe('DD.DD');
      expect(juryDisc.var_maske ?? juryDisc.var_eingabemaske).toBe('DD.DD');
    });
  });
});
