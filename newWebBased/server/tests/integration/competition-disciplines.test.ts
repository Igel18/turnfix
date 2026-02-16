/**
 * Competition Disciplines Integration Tests
 * 
 * Tests the full CRUD lifecycle for discipline assignments to competitions.
 * This ensures that:
 * 1. Creating a competition with disciplines stores them correctly
 * 2. GET /:id returns disciplines with full details (id, name, gender flags)
 * 3. GET / list returns disciplines with disciplineId field
 * 4. Updating a competition preserves/replaces disciplines correctly
 * 5. The GET /:id/disciplines endpoint returns the correct disciplines
 * 
 * These tests are particularly important to verify that the frontend
 * race condition fix (disciplinesLoadedRef guard) has correct API data
 * to work with.
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import competitionRoutes from '../../src/routes/competitions';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/competitions', competitionRoutes);

describe('Competition Disciplines API', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let existingDisciplines: any[];

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
    
    // Fetch real disciplines from DB (we never create test disciplines — use real ones)
    existingDisciplines = await prisma.tfx_disziplinen.findMany({
      take: 5,
      orderBy: { int_disziplinenid: 'asc' }
    });

    if (existingDisciplines.length < 2) {
      console.warn('⚠️ Not enough disciplines in database to run full test suite. Need at least 2.');
    }
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    testEvent = await TestUtils.createTestEvent({
      name: 'Discipline Test Event',
      description: 'Event for testing discipline assignments'
    });
  });

  describe('POST /api/competitions - Discipline Assignment', () => {
    it('should create a competition with disciplines and return them', async () => {
      if (existingDisciplines.length < 2) return;

      const disc1 = existingDisciplines[0];
      const disc2 = existingDisciplines[1];

      // Find a bereich that matches
      const bereich = await prisma.tfx_bereiche.findFirst({
        where: { bol_maennlich: true, bol_weiblich: true }
      });

      const newCompetition = {
        name: 'Test Competition With Disciplines',
        eventId: testEvent.int_veranstaltungenid,
        gender: 'gemischt',
        areaId: bereich?.int_bereicheid || undefined,
        ageFrom: 10,
        ageTo: 18,
        disciplines: [
          { disciplineId: disc1.int_disziplinenid, maxScore: 10 },
          { disciplineId: disc2.int_disziplinenid, maxScore: 15 }
        ]
      };

      const response = await request(app)
        .post('/api/competitions')
        .send(newCompetition)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.disciplines).toBeDefined();
      expect(response.body.disciplines).toHaveLength(2);

      // Track for cleanup
      TestUtils.trackCreated('competitions', response.body.id);

      // Also clean up the junction table entries
      // (they are cascade-deleted when competition is deleted, but let's be safe)

      // Verify disciplines are stored in DB
      const junctionEntries = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
        where: { int_wettkaempfeid: response.body.id },
        orderBy: { int_sortierung: 'asc' }
      });

      expect(junctionEntries).toHaveLength(2);
      expect(junctionEntries[0].int_disziplinenid).toBe(disc1.int_disziplinenid);
      expect(junctionEntries[1].int_disziplinenid).toBe(disc2.int_disziplinenid);
      expect(Number(junctionEntries[0].rel_max)).toBe(10);
      expect(Number(junctionEntries[1].rel_max)).toBe(15);
    });

    it('should reject creation without disciplines', async () => {
      const newCompetition = {
        name: 'No Disciplines Competition',
        eventId: testEvent.int_veranstaltungenid,
        gender: 'gemischt',
        ageFrom: 10,
        ageTo: 18,
        disciplines: []
      };

      const response = await request(app)
        .post('/api/competitions')
        .send(newCompetition)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject disciplines that do not exist', async () => {
      const newCompetition = {
        name: 'Invalid Discipline Competition',
        eventId: testEvent.int_veranstaltungenid,
        gender: 'gemischt',
        ageFrom: 10,
        ageTo: 18,
        disciplines: [
          { disciplineId: 999999, maxScore: 10 }
        ]
      };

      const response = await request(app)
        .post('/api/competitions')
        .send(newCompetition)
        .expect(400);

      expect(response.body.error).toContain('do not exist');
    });
  });

  describe('GET /api/competitions/:id - Discipline Return Format', () => {
    let createdCompetitionId: number;

    beforeEach(async () => {
      if (existingDisciplines.length < 2) return;

      const disc1 = existingDisciplines[0];
      const disc2 = existingDisciplines[1];

      const bereich = await prisma.tfx_bereiche.findFirst({
        where: { bol_maennlich: true, bol_weiblich: true }
      });

      const response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Disciplines Format Test',
          eventId: testEvent.int_veranstaltungenid,
          gender: 'gemischt',
          areaId: bereich?.int_bereicheid || undefined,
          ageFrom: 10,
          ageTo: 18,
          disciplines: [
            { disciplineId: disc1.int_disziplinenid, maxScore: 10 },
            { disciplineId: disc2.int_disziplinenid, maxScore: 15 }
          ]
        })
        .expect(201);

      createdCompetitionId = response.body.id;
      TestUtils.trackCreated('competitions', createdCompetitionId);
    });

    it('should return disciplines with id field (not disciplineId) in detail view', async () => {
      if (!createdCompetitionId) return;

      const response = await request(app)
        .get(`/api/competitions/${createdCompetitionId}`)
        .expect(200);

      expect(response.body.disciplines).toBeDefined();
      expect(response.body.disciplines.length).toBeGreaterThanOrEqual(2);

      // Detail endpoint uses 'id' field
      const disc = response.body.disciplines[0];
      expect(disc.id).toBeDefined();
      expect(disc.name).toBeDefined();
      expect(disc.male_allowed).toBeDefined();
      expect(disc.female_allowed).toBeDefined();
      expect(disc.maxScore).toBeDefined();
    });

    it('should return all discipline properties needed by edit form', async () => {
      if (!createdCompetitionId) return;

      const response = await request(app)
        .get(`/api/competitions/${createdCompetitionId}`)
        .expect(200);

      // The edit form needs these fields to properly populate the discipline list
      const disc = response.body.disciplines[0];
      
      // Required fields for CompetitionFormModalNew.tsx
      expect(disc).toHaveProperty('id');
      expect(disc).toHaveProperty('name');
      expect(disc).toHaveProperty('male_allowed');
      expect(disc).toHaveProperty('female_allowed');
      expect(disc).toHaveProperty('maxScore');

      // Verify the ID matches a real discipline
      expect(existingDisciplines.some(d => d.int_disziplinenid === disc.id)).toBe(true);
    });

    it('should preserve discipline count after fetching (race condition scenario)', async () => {
      if (!createdCompetitionId) return;

      // Simulate the race condition scenario:
      // 1. Create competition with 2 disciplines
      // 2. Fetch it via GET /:id
      // 3. Verify disciplines are still there (not wiped)
      
      const response = await request(app)
        .get(`/api/competitions/${createdCompetitionId}`)
        .expect(200);

      // This verifies the server-side data is correct
      // The race condition was a client-side issue, but we need the server
      // to always return the correct data for the fix to work
      expect(response.body.disciplines).toHaveLength(2);
      
      // Verify each discipline has the correct maxScore
      const disc1 = response.body.disciplines.find(
        (d: any) => d.id === existingDisciplines[0].int_disziplinenid
      );
      const disc2 = response.body.disciplines.find(
        (d: any) => d.id === existingDisciplines[1].int_disziplinenid
      );
      
      expect(disc1).toBeDefined();
      expect(disc2).toBeDefined();
      expect(disc1.maxScore).toBe(10);
      expect(disc2.maxScore).toBe(15);
    });
  });

  describe('GET /api/competitions - Discipline Format in List View', () => {
    it('should return disciplines with disciplineId field in list view', async () => {
      if (existingDisciplines.length < 1) return;

      const disc1 = existingDisciplines[0];
      const bereich = await prisma.tfx_bereiche.findFirst({
        where: { bol_maennlich: true, bol_weiblich: true }
      });

      const createResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'List View Disciplines Test',
          eventId: testEvent.int_veranstaltungenid,
          gender: 'gemischt',
          areaId: bereich?.int_bereicheid || undefined,
          ageFrom: 10,
          ageTo: 18,
          disciplines: [
            { disciplineId: disc1.int_disziplinenid, maxScore: 10 }
          ]
        })
        .expect(201);

      TestUtils.trackCreated('competitions', createResponse.body.id);

      // Fetch list and find our competition
      const listResponse = await request(app)
        .get(`/api/competitions?eventId=${testEvent.int_veranstaltungenid}`)
        .expect(200);

      const competitions = listResponse.body.competitions || listResponse.body;
      const ourComp = competitions.find((c: any) => c.id === createResponse.body.id);

      expect(ourComp).toBeDefined();
      expect(ourComp.disciplines).toBeDefined();
      expect(ourComp.disciplines.length).toBeGreaterThanOrEqual(1);

      // List endpoint uses 'disciplineId' field (not 'id')
      const disc = ourComp.disciplines[0];
      expect(disc.disciplineId).toBeDefined();
      expect(disc.name).toBeDefined();
    });
  });

  describe('GET /api/competitions/:id/disciplines - Dedicated Endpoint', () => {
    it('should return disciplines for a competition via dedicated endpoint', async () => {
      if (existingDisciplines.length < 2) return;

      const disc1 = existingDisciplines[0];
      const disc2 = existingDisciplines[1];
      const bereich = await prisma.tfx_bereiche.findFirst({
        where: { bol_maennlich: true, bol_weiblich: true }
      });

      const createResponse = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Dedicated Endpoint Disciplines Test',
          eventId: testEvent.int_veranstaltungenid,
          gender: 'gemischt',
          areaId: bereich?.int_bereicheid || undefined,
          ageFrom: 10,
          ageTo: 18,
          disciplines: [
            { disciplineId: disc1.int_disziplinenid, maxScore: 10 },
            { disciplineId: disc2.int_disziplinenid, maxScore: 20 }
          ]
        })
        .expect(201);

      TestUtils.trackCreated('competitions', createResponse.body.id);

      const response = await request(app)
        .get(`/api/competitions/${createResponse.body.id}/disciplines`)
        .expect(200);

      expect(response.body.competitionId).toBe(createResponse.body.id);
      expect(response.body.disciplines).toBeDefined();
      expect(response.body.disciplines).toHaveLength(2);

      // Verify discipline fields
      const disc = response.body.disciplines[0];
      expect(disc.int_disziplinenid).toBeDefined();
      expect(disc.var_name).toBeDefined();
      expect(disc.bol_m).toBeDefined();
      expect(disc.bol_w).toBeDefined();
      expect(disc.maxScore).toBeDefined();
    });
  });

  describe('PUT /api/competitions/:id - Discipline Update', () => {
    let createdCompetitionId: number;

    beforeEach(async () => {
      if (existingDisciplines.length < 3) return;

      const disc1 = existingDisciplines[0];
      const disc2 = existingDisciplines[1];
      const bereich = await prisma.tfx_bereiche.findFirst({
        where: { bol_maennlich: true, bol_weiblich: true }
      });

      const response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Disciplines Update Test',
          eventId: testEvent.int_veranstaltungenid,
          gender: 'gemischt',
          areaId: bereich?.int_bereicheid || undefined,
          ageFrom: 10,
          ageTo: 18,
          disciplines: [
            { disciplineId: disc1.int_disziplinenid, maxScore: 10 },
            { disciplineId: disc2.int_disziplinenid, maxScore: 15 }
          ]
        })
        .expect(201);

      createdCompetitionId = response.body.id;
      TestUtils.trackCreated('competitions', createdCompetitionId);
    });

    it('should replace disciplines when updating', async () => {
      if (!createdCompetitionId || existingDisciplines.length < 3) return;

      const newDisc = existingDisciplines[2];

      // Update with only one discipline (replacing the original two)
      await request(app)
        .put(`/api/competitions/${createdCompetitionId}`)
        .send({
          disciplines: [
            { disciplineId: newDisc.int_disziplinenid, maxScore: 25 }
          ]
        })
        .expect(200);

      // Verify via GET /:id
      const response = await request(app)
        .get(`/api/competitions/${createdCompetitionId}`)
        .expect(200);

      expect(response.body.disciplines).toHaveLength(1);
      expect(response.body.disciplines[0].id).toBe(newDisc.int_disziplinenid);
      expect(response.body.disciplines[0].maxScore).toBe(25);
    });

    it('should keep existing disciplines when disciplines not included in update', async () => {
      if (!createdCompetitionId) return;

      // Update only the name, not disciplines
      await request(app)
        .put(`/api/competitions/${createdCompetitionId}`)
        .send({
          name: 'Updated Name Only'
        })
        .expect(200);

      // Verify disciplines are still there
      const response = await request(app)
        .get(`/api/competitions/${createdCompetitionId}`)
        .expect(200);

      expect(response.body.name).toBe('Updated Name Only');
      expect(response.body.disciplines).toHaveLength(2);
    });

    it('should handle the edit dialog scenario: fetch → display → save with same disciplines', async () => {
      if (!createdCompetitionId) return;

      // Step 1: Fetch the competition (like the edit dialog does)
      const fetchResponse = await request(app)
        .get(`/api/competitions/${createdCompetitionId}`)
        .expect(200);

      const originalDisciplines = fetchResponse.body.disciplines;
      expect(originalDisciplines).toHaveLength(2);

      // Step 2: Save with the same disciplines (like the dialog does when user clicks Save without changing disciplines)
      // The dialog maps 'id' → 'disciplineId' when saving
      const disciplinesToSave = originalDisciplines.map((d: any) => ({
        disciplineId: d.id,
        maxScore: d.maxScore
      }));

      await request(app)
        .put(`/api/competitions/${createdCompetitionId}`)
        .send({
          name: fetchResponse.body.name,
          disciplines: disciplinesToSave
        })
        .expect(200);

      // Step 3: Verify disciplines are preserved
      const verifyResponse = await request(app)
        .get(`/api/competitions/${createdCompetitionId}`)
        .expect(200);

      expect(verifyResponse.body.disciplines).toHaveLength(2);
      
      // Verify discipline IDs match
      const originalIds = originalDisciplines.map((d: any) => d.id).sort();
      const savedIds = verifyResponse.body.disciplines.map((d: any) => d.id).sort();
      expect(savedIds).toEqual(originalIds);
    });
  });

  describe('Gender Compatibility Validation', () => {
    it('should reject male-only disciplines for female competition', async () => {
      // Find a male-only discipline
      const maleOnlyDiscipline = await prisma.tfx_disziplinen.findFirst({
        where: { bol_m: true, bol_w: false }
      });

      if (!maleOnlyDiscipline) {
        console.warn('⚠️ No male-only discipline found, skipping test');
        return;
      }

      const response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Gender Mismatch Test',
          eventId: testEvent.int_veranstaltungenid,
          gender: 'weiblich',
          ageFrom: 10,
          ageTo: 18,
          disciplines: [
            { disciplineId: maleOnlyDiscipline.int_disziplinenid, maxScore: 10 }
          ]
        })
        .expect(400);

      expect(response.body.error).toContain('gender');
    });

    it('should accept any disciplines for gemischt competition', async () => {
      if (existingDisciplines.length < 1) return;

      const bereich = await prisma.tfx_bereiche.findFirst({
        where: { bol_maennlich: true, bol_weiblich: true }
      });

      const response = await request(app)
        .post('/api/competitions')
        .send({
          name: 'Gemischt All Disciplines Test',
          eventId: testEvent.int_veranstaltungenid,
          gender: 'gemischt',
          areaId: bereich?.int_bereicheid || undefined,
          ageFrom: 10,
          ageTo: 18,
          disciplines: [
            { disciplineId: existingDisciplines[0].int_disziplinenid, maxScore: 10 }
          ]
        })
        .expect(201);

      TestUtils.trackCreated('competitions', response.body.id);
      expect(response.body.id).toBeDefined();
    });
  });
});
