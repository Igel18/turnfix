import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import personsRoutes from '../../src/routes/persons';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/persons', personsRoutes);

describe('Persons API', () => {
  let prisma: PrismaClient;
  let testPerson: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    if (testPerson) {
      await prisma.$queryRawUnsafe(
        'DELETE FROM tfx_personen WHERE int_personenid = $1',
        testPerson.int_personenid
      ).catch(() => {});
      testPerson = null;
    }
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO tfx_personen (var_vorname, var_nachname, var_email, var_ort)
      VALUES ($1, $2, $3, $4)
      RETURNING int_personenid, var_vorname, var_nachname, var_email, var_ort
    `, `Test${Date.now()}`, `Person${Date.now()}`, `test${Date.now()}@example.com`, 'Berlin') as any[];
    testPerson = result[0];
    testPerson.int_personenid = Number(testPerson.int_personenid);
  });

  describe('GET /api/persons', () => {
    it('should return a list of persons with pagination', async () => {
      const response = await request(app)
        .get('/api/persons')
        .expect(200);

      expect(response.body).toHaveProperty('persons');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.persons).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/persons')
        .query({ search: testPerson.var_nachname })
        .expect(200);

      expect(response.body.persons.length).toBeGreaterThanOrEqual(1);
      const found = response.body.persons.find(
        (p: any) => p.int_personenid === testPerson.int_personenid
      );
      expect(found).toBeDefined();
    });

    it('should support search by email', async () => {
      const response = await request(app)
        .get('/api/persons')
        .query({ search: testPerson.var_email })
        .expect(200);

      expect(response.body.persons.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect limit and offset', async () => {
      const response = await request(app)
        .get('/api/persons')
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body.persons.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('GET /api/persons/count', () => {
    it('should return the total count of persons', async () => {
      const response = await request(app)
        .get('/api/persons/count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/persons/:id', () => {
    it('should return a specific person by ID', async () => {
      const response = await request(app)
        .get(`/api/persons/${testPerson.int_personenid}`)
        .expect(200);

      expect(response.body.int_personenid).toBe(testPerson.int_personenid);
      expect(response.body.var_vorname).toBe(testPerson.var_vorname);
      expect(response.body.var_nachname).toBe(testPerson.var_nachname);
    });

    it('should return 404 for non-existent person', async () => {
      await request(app)
        .get('/api/persons/999999')
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .get('/api/persons/abc')
        .expect(400);
    });
  });

  describe('POST /api/persons', () => {
    it('should create a person with required fields', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/persons')
        .send({
          var_vorname: `Max${timestamp}`,
          var_nachname: `Mustermann${timestamp}`
        })
        .expect(201);

      expect(response.body.message).toContain('created successfully');
      expect(response.body.person).toHaveProperty('int_personenid');
      expect(response.body.person.var_vorname).toContain('Max');

      // Clean up
      await prisma.$queryRawUnsafe(
        'DELETE FROM tfx_personen WHERE int_personenid = $1',
        response.body.person.int_personenid
      ).catch(() => {});
    });

    it('should create a person with all fields', async () => {
      const timestamp = Date.now();
      const personData = {
        var_vorname: `Full${timestamp}`,
        var_nachname: `Person${timestamp}`,
        var_email: `full${timestamp}@example.com`,
        var_telefon: '+49 123 456789',
        var_fax: '+49 123 456780',
        var_adresse: 'Teststraße 1',
        var_plz: '12345',
        var_ort: 'München'
      };

      const response = await request(app)
        .post('/api/persons')
        .send(personData)
        .expect(201);

      expect(response.body.person.var_email).toBe(personData.var_email);

      // Clean up
      await prisma.$queryRawUnsafe(
        'DELETE FROM tfx_personen WHERE int_personenid = $1',
        response.body.person.int_personenid
      ).catch(() => {});
    });

    it('should reject empty first name', async () => {
      await request(app)
        .post('/api/persons')
        .send({ var_vorname: '', var_nachname: 'Test' })
        .expect(400);
    });

    it('should reject empty last name', async () => {
      await request(app)
        .post('/api/persons')
        .send({ var_vorname: 'Test', var_nachname: '' })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app)
        .post('/api/persons')
        .send({})
        .expect(400);
    });
  });

  describe('PUT /api/persons/:id', () => {
    it('should update a person first name', async () => {
      const response = await request(app)
        .put(`/api/persons/${testPerson.int_personenid}`)
        .send({ var_vorname: 'Updated' })
        .expect(200);

      expect(response.body.message).toContain('updated successfully');
    });

    it('should update multiple fields', async () => {
      const response = await request(app)
        .put(`/api/persons/${testPerson.int_personenid}`)
        .send({ var_vorname: 'NewFirst', var_nachname: 'NewLast', var_ort: 'Hamburg' })
        .expect(200);

      expect(response.body.message).toContain('updated successfully');

      // Verify
      const verify = await request(app).get(`/api/persons/${testPerson.int_personenid}`).expect(200);
      expect(verify.body.var_vorname).toBe('NewFirst');
      expect(verify.body.var_nachname).toBe('NewLast');
      expect(verify.body.var_ort).toBe('Hamburg');
    });

    it('should return 400 when no fields provided', async () => {
      await request(app)
        .put(`/api/persons/${testPerson.int_personenid}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent person', async () => {
      await request(app)
        .put('/api/persons/999999')
        .send({ var_vorname: 'Ghost' })
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .put('/api/persons/abc')
        .send({ var_vorname: 'Invalid' })
        .expect(400);
    });
  });

  describe('DELETE /api/persons/:id', () => {
    it('should delete a person', async () => {
      const response = await request(app)
        .delete(`/api/persons/${testPerson.int_personenid}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
      testPerson = null; // Already deleted
    });

    it('should return 404 for non-existent person', async () => {
      await request(app)
        .delete('/api/persons/999999')
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .delete('/api/persons/abc')
        .expect(400);
    });
  });
});
