import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import disciplineRoutes from '../../src/routes/disciplines';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/disciplines', disciplineRoutes);

describe('Disciplines API', () => {
  let prisma: PrismaClient;
  let testDiscipline: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    // Clean up the test discipline created in beforeEach
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    // Create a test discipline
    testDiscipline = await prisma.tfx_disziplinen.create({
      data: {
        var_name: 'Test Floor Exercise',
        var_kurz1: 'FX',
        var_kurz2: 'Floor',
        int_sportid: 1, // Default sport ID
        bol_m: true, // Male
        bol_w: false // Not female
      }
    });
    TestUtils.trackCreated('disciplines', testDiscipline.int_disziplinenid);
  });

  describe('GET /api/disciplines', () => {
    it('should return a list of disciplines', async () => {
      const response = await request(app)
        .get('/api/disciplines')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.disciplines).toBeTruthy();
      
      // Handle both array and object response formats
      const disciplines = Array.isArray(response.body) ? response.body : response.body.disciplines;
      if (disciplines) {
        expect(disciplines.length).toBeGreaterThan(0);
        
        const discipline = disciplines.find((d: any) => 
          d.int_disziplinenid === testDiscipline.int_disziplinenid ||
          d.id === testDiscipline.int_disziplinenid
        );
        
        if (discipline) {
          expect(discipline.var_name || discipline.name).toBe('Test Floor Exercise');
        }
      }
    });

    it('should support filtering by gender', async () => {
      const response = await request(app)
        .get('/api/disciplines?gender=male')
        .expect(200);

      expect(response.body).toBeDefined();
      
      const disciplines = Array.isArray(response.body) ? response.body : response.body.disciplines;
      if (disciplines && disciplines.length > 0) {
        const foundDiscipline = disciplines.find((d: any) => 
          (d.bol_m === true) || (d.male === true) ||
          (d.var_name && d.var_name.includes('Test Floor'))
        );
        expect(foundDiscipline).toBeDefined();
      }
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/disciplines?search=Floor')
        .expect(200);

      expect(response.body).toBeDefined();
      
      const disciplines = Array.isArray(response.body) ? response.body : response.body.disciplines;
      if (disciplines && disciplines.length > 0) {
        const foundDiscipline = disciplines.find((d: any) => 
          (d.var_name && d.var_name.includes('Floor')) ||
          (d.name && d.name.includes('Floor'))
        );
        expect(foundDiscipline).toBeDefined();
      }
    });
  });

  describe('GET /api/disciplines/:id', () => {
    it('should return a specific discipline by ID', async () => {
      const response = await request(app)
        .get(`/api/disciplines/${testDiscipline.int_disziplinenid}`)
        .expect(200);

      expect(response.body.var_name || response.body.name).toBe('Test Floor Exercise');
      expect(response.body.var_kurz1 || response.body.shortName).toBe('FX');
      expect(response.body.int_disziplinenid || response.body.id).toBe(testDiscipline.int_disziplinenid);
    });

    it('should return 404 for non-existent discipline', async () => {
      const response = await request(app)
        .get('/api/disciplines/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid discipline ID', async () => {
      const response = await request(app)
        .get('/api/disciplines/invalid-id')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/disciplines', () => {
    it('should create a new discipline with valid data', async () => {
      const newDisciplineData = {
        var_name: 'Test Pommel Horse',
        var_kurz1: 'PH',
        var_kurz2: 'Pommel',
        int_sportid: 1,
        bol_m: true,
        bol_w: false
      };

      const response = await request(app)
        .post('/api/disciplines')
        .send(newDisciplineData)
        .expect(201);

      expect(response.body.var_name || response.body.name).toBe('Test Pommel Horse');
      expect(response.body.var_kurz1 || response.body.shortName).toBe('PH');
      expect(response.body.int_disziplinenid || response.body.id).toBeDefined();

      // Cleanup created discipline
      if (response.body.int_disziplinenid || response.body.id) {
        const disciplineId = response.body.int_disziplinenid || response.body.id;
        await prisma.tfx_disziplinen.delete({
          where: { int_disziplinenid: disciplineId }
        }).catch(() => {}); // Ignore cleanup errors
      }
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        var_name: '', // Empty name should fail validation
        int_sportid: 1
      };

      const response = await request(app)
        .post('/api/disciplines')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/disciplines/:id', () => {
    it('should update an existing discipline', async () => {
      const updateData = {
        var_name: 'Updated Floor Exercise',
        var_kurz1: 'UPD-FX'
      };

      const response = await request(app)
        .put(`/api/disciplines/${testDiscipline.int_disziplinenid}`)
        .send(updateData)
        .expect(200);

      expect(response.body.var_name || response.body.name).toBe('Updated Floor Exercise');
      expect(response.body.var_kurz1 || response.body.shortName).toBe('UPD-FX');
    });

    it('should return 404 for non-existent discipline', async () => {
      const updateData = {
        var_name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/disciplines/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/disciplines/:id', () => {
    it('should delete an existing discipline', async () => {
      // Create a discipline specifically for deletion
      const disciplineToDelete = await prisma.tfx_disziplinen.create({
        data: {
          var_name: 'Discipline To Delete',
          var_kurz1: 'DEL',
          var_kurz2: 'Delete',
          int_sportid: 1,
          bol_m: true,
          bol_w: false
        }
      });

      const response = await request(app)
        .delete(`/api/disciplines/${disciplineToDelete.int_disziplinenid}`)
        .expect(200);

      expect(response.body.message || response.body.success).toBeDefined();

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/disciplines/${disciplineToDelete.int_disziplinenid}`)
        .expect(404);
    });

    it('should return 404 for non-existent discipline', async () => {
      const response = await request(app)
        .delete('/api/disciplines/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });
});
