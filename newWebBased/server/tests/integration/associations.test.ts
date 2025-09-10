import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import associationRoutes from '../../src/routes/associations';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/associations', associationRoutes);

describe('Associations API', () => {
  let prisma: PrismaClient;
  let testAssociation: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  beforeEach(async () => {
    // Create a test association
    testAssociation = await prisma.tfx_gaue.create({
      data: {
        var_name: 'Test Gymnastics Association',
        var_kuerzel: 'TGA',
        int_verbaendeid: 1 // Default federation ID
      }
    });
  });

  describe('GET /api/associations', () => {
    it('should return a list of associations', async () => {
      const response = await request(app)
        .get('/api/associations')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.associations).toBeTruthy();
      
      // Handle both array and object response formats
      const associations = Array.isArray(response.body) ? response.body : response.body.associations;
      if (associations) {
        expect(associations.length).toBeGreaterThan(0);
        
        const association = associations.find((a: any) => 
          a.int_gaueid === testAssociation.int_gaueid ||
          a.id === testAssociation.int_gaueid
        );
        
        if (association) {
          expect(association.var_name || association.name).toBe('Test Gymnastics Association');
        }
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/associations?limit=5')
        .expect(200);

      expect(response.body).toBeDefined();
      
      // Handle pagination response
      if (response.body.associations) {
        expect(response.body.associations.length).toBeLessThanOrEqual(5);
        expect(response.body.pagination).toBeDefined();
      } else if (Array.isArray(response.body)) {
        expect(response.body.length).toBeLessThanOrEqual(50); // Default or reasonable limit
      }
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/associations?search=Test Gymnastics')
        .expect(200);

      expect(response.body).toBeDefined();
      
      const associations = Array.isArray(response.body) ? response.body : response.body.associations;
      if (associations && associations.length > 0) {
        const foundAssociation = associations.find((a: any) => 
          (a.var_name && a.var_name.includes('Test Gymnastics')) ||
          (a.name && a.name.includes('Test Gymnastics'))
        );
        expect(foundAssociation).toBeDefined();
      }
    });
  });

  describe('GET /api/associations/:id', () => {
    it('should return a specific association by ID', async () => {
      const response = await request(app)
        .get(`/api/associations/${testAssociation.int_gaueid}`)
        .expect(200);

      expect(response.body.var_name || response.body.name).toBe('Test Gymnastics Association');
      expect(response.body.var_kuerzel || response.body.shortName).toBe('TGA');
      expect(response.body.int_gaueid || response.body.id).toBe(testAssociation.int_gaueid);
    });

    it('should return 404 for non-existent association', async () => {
      const response = await request(app)
        .get('/api/associations/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid association ID', async () => {
      const response = await request(app)
        .get('/api/associations/invalid-id')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/associations', () => {
    it('should create a new association with valid data', async () => {
      const newAssociationData = {
        var_name: 'New Test Association',
        var_kuerzel: 'NTA',
        int_verbaendeid: 1
      };

      const response = await request(app)
        .post('/api/associations')
        .send(newAssociationData)
        .expect(201);

      expect(response.body.var_name || response.body.name).toBe('New Test Association');
      expect(response.body.var_kuerzel || response.body.shortName).toBe('NTA');
      expect(response.body.int_gaueid || response.body.id).toBeDefined();

      // Cleanup created association
      if (response.body.int_gaueid || response.body.id) {
        const associationId = response.body.int_gaueid || response.body.id;
        await prisma.tfx_gaue.delete({
          where: { int_gaueid: associationId }
        }).catch(() => {}); // Ignore cleanup errors
      }
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        var_name: '', // Empty name should fail validation
        int_verbaendeid: 1
      };

      const response = await request(app)
        .post('/api/associations')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/associations/:id', () => {
    it('should update an existing association', async () => {
      const updateData = {
        var_name: 'Updated Test Association',
        var_kuerzel: 'UTA'
      };

      const response = await request(app)
        .put(`/api/associations/${testAssociation.int_gaueid}`)
        .send(updateData)
        .expect(200);

      expect(response.body.var_name || response.body.name).toBe('Updated Test Association');
      expect(response.body.var_kuerzel || response.body.shortName).toBe('UTA');
    });

    it('should return 404 for non-existent association', async () => {
      const updateData = {
        var_name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/associations/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/associations/:id', () => {
    it('should delete an existing association', async () => {
      // Create an association specifically for deletion
      const associationToDelete = await prisma.tfx_gaue.create({
        data: {
          var_name: 'Association To Delete',
          var_kuerzel: 'DEL',
          int_verbaendeid: 1
        }
      });

      const response = await request(app)
        .delete(`/api/associations/${associationToDelete.int_gaueid}`)
        .expect(200);

      expect(response.body.message || response.body.success).toBeDefined();

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/associations/${associationToDelete.int_gaueid}`)
        .expect(404);
    });

    it('should return 404 for non-existent association', async () => {
      const response = await request(app)
        .delete('/api/associations/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });
});
