import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import disciplineGroupRoutes from '../../src/routes/disciplineGroups';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/discipline-groups', disciplineGroupRoutes);

describe('Discipline Groups API', () => {
  let prisma: PrismaClient;
  let testGroup: any;
  let testDiscipline: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    // Cleanup discipline group assignments and groups
    if (testGroup) {
      await prisma.tfx_disgrp_x_disziplinen.deleteMany({
        where: { int_disziplinen_gruppenid: testGroup.int_disziplinen_gruppenid }
      }).catch(() => {});
      await prisma.tfx_disziplinen_gruppen.delete({
        where: { int_disziplinen_gruppenid: testGroup.int_disziplinen_gruppenid }
      }).catch(() => {});
      testGroup = null;
    }
    if (testDiscipline) {
      await prisma.tfx_disziplinen_felder.deleteMany({
        where: { int_disziplinenid: testDiscipline.int_disziplinenid }
      }).catch(() => {});
      await prisma.tfx_disziplinen.delete({
        where: { int_disziplinenid: testDiscipline.int_disziplinenid }
      }).catch(() => {});
      testDiscipline = null;
    }
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    testGroup = await prisma.tfx_disziplinen_gruppen.create({
      data: { var_name: `Test DG ${Date.now()}` }
    });

    testDiscipline = await prisma.tfx_disziplinen.create({
      data: { var_name: `TestDis DG${Date.now()}`, var_kurz1: 'DG', int_versuche: 1, int_sportid: 9001 }
    });
    TestUtils.trackCreated('disciplines', testDiscipline.int_disziplinenid);
  });

  describe('GET /api/discipline-groups', () => {
    it('should return a list of discipline groups with pagination', async () => {
      const response = await request(app)
        .get('/api/discipline-groups')
        .expect(200);

      expect(response.body).toHaveProperty('disciplineGroups');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.disciplineGroups).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/discipline-groups')
        .query({ search: testGroup.var_name })
        .expect(200);

      expect(response.body.disciplineGroups.length).toBeGreaterThanOrEqual(1);
      const found = response.body.disciplineGroups.find(
        (g: any) => g.int_disziplinen_gruppenid === testGroup.int_disziplinen_gruppenid
      );
      expect(found).toBeDefined();
    });

    it('should include discipline_count and disciplines array', async () => {
      const response = await request(app)
        .get('/api/discipline-groups')
        .expect(200);

      const found = response.body.disciplineGroups.find(
        (g: any) => g.int_disziplinen_gruppenid === testGroup.int_disziplinen_gruppenid
      );
      expect(found).toBeDefined();
      expect(found).toHaveProperty('discipline_count');
      expect(found).toHaveProperty('disciplines');
    });

    it('should respect limit and offset', async () => {
      const response = await request(app)
        .get('/api/discipline-groups')
        .query({ limit: 1, offset: 0 })
        .expect(200);

      expect(response.body.disciplineGroups.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/discipline-groups/count', () => {
    it('should return the total count', async () => {
      const response = await request(app)
        .get('/api/discipline-groups/count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/discipline-groups/:id', () => {
    it('should return a specific discipline group', async () => {
      const response = await request(app)
        .get(`/api/discipline-groups/${testGroup.int_disziplinen_gruppenid}`)
        .expect(200);

      expect(response.body.int_disziplinen_gruppenid).toBe(testGroup.int_disziplinen_gruppenid);
      expect(response.body.var_name).toBe(testGroup.var_name);
      expect(response.body).toHaveProperty('discipline_count');
      expect(response.body).toHaveProperty('disciplines');
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .get('/api/discipline-groups/999999')
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .get('/api/discipline-groups/abc')
        .expect(400);
    });
  });

  describe('POST /api/discipline-groups', () => {
    it('should create a discipline group', async () => {
      const name = `New DG ${Date.now()}`;
      const response = await request(app)
        .post('/api/discipline-groups')
        .send({ var_name: name, txt_comment: 'Test group' })
        .expect(201);

      expect(response.body.var_name).toBe(name);
      expect(response.body).toHaveProperty('discipline_count');

      // Clean up
      await prisma.tfx_disziplinen_gruppen.delete({
        where: { int_disziplinen_gruppenid: response.body.int_disziplinen_gruppenid }
      }).catch(() => {});
    });

    it('should create a group with discipline assignments', async () => {
      const name = `DG with Disciplines ${Date.now()}`;
      const response = await request(app)
        .post('/api/discipline-groups')
        .send({
          var_name: name,
          disciplineIds: [testDiscipline.int_disziplinenid]
        })
        .expect(201);

      expect(response.body.discipline_count).toBe(1);
      expect(response.body.disciplines.length).toBe(1);

      // Clean up
      await prisma.tfx_disgrp_x_disziplinen.deleteMany({
        where: { int_disziplinen_gruppenid: response.body.int_disziplinen_gruppenid }
      }).catch(() => {});
      await prisma.tfx_disziplinen_gruppen.delete({
        where: { int_disziplinen_gruppenid: response.body.int_disziplinen_gruppenid }
      }).catch(() => {});
    });

    it('should reject duplicate group name', async () => {
      await request(app)
        .post('/api/discipline-groups')
        .send({ var_name: testGroup.var_name })
        .expect(400);
    });

    it('should reject empty name', async () => {
      await request(app)
        .post('/api/discipline-groups')
        .send({ var_name: '' })
        .expect(400);
    });

    it('should reject missing name', async () => {
      await request(app)
        .post('/api/discipline-groups')
        .send({})
        .expect(400);
    });
  });

  describe('PUT /api/discipline-groups/:id', () => {
    it('should update group name', async () => {
      const newName = `Updated DG ${Date.now()}`;
      const response = await request(app)
        .put(`/api/discipline-groups/${testGroup.int_disziplinen_gruppenid}`)
        .send({ var_name: newName })
        .expect(200);

      expect(response.body.var_name).toBe(newName);
    });

    it('should update discipline assignments', async () => {
      const response = await request(app)
        .put(`/api/discipline-groups/${testGroup.int_disziplinen_gruppenid}`)
        .send({ disciplineIds: [testDiscipline.int_disziplinenid] })
        .expect(200);

      expect(response.body.discipline_count).toBe(1);
    });

    it('should reject duplicate name with other group', async () => {
      const otherGroup = await prisma.tfx_disziplinen_gruppen.create({
        data: { var_name: `Other DG ${Date.now()}` }
      });

      await request(app)
        .put(`/api/discipline-groups/${testGroup.int_disziplinen_gruppenid}`)
        .send({ var_name: otherGroup.var_name })
        .expect(400);

      // Clean up
      await prisma.tfx_disziplinen_gruppen.delete({
        where: { int_disziplinen_gruppenid: otherGroup.int_disziplinen_gruppenid }
      }).catch(() => {});
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .put('/api/discipline-groups/999999')
        .send({ var_name: 'Ghost' })
        .expect(404);
    });
  });

  describe('DELETE /api/discipline-groups/:id', () => {
    it('should delete a group without discipline associations', async () => {
      const response = await request(app)
        .delete(`/api/discipline-groups/${testGroup.int_disziplinen_gruppenid}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
      testGroup = null;
    });

    it('should reject deletion of group with discipline associations', async () => {
      // Add an association
      await prisma.tfx_disgrp_x_disziplinen.create({
        data: {
          int_disziplinen_gruppenid: testGroup.int_disziplinen_gruppenid,
          int_disziplinenid: testDiscipline.int_disziplinenid,
          int_pos: 1
        }
      });

      await request(app)
        .delete(`/api/discipline-groups/${testGroup.int_disziplinen_gruppenid}`)
        .expect(400);
    });

    it('should return 404 for non-existent group', async () => {
      await request(app)
        .delete('/api/discipline-groups/999999')
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .delete('/api/discipline-groups/abc')
        .expect(400);
    });
  });
});
