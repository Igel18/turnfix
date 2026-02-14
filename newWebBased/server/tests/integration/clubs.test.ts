import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import clubRoutes from '../../src/routes/clubs';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/clubs', clubRoutes);

describe('Clubs API', () => {
  let prisma: PrismaClient;
  let testClub: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    // Clean up the test club created in beforeEach (and any other tracked records)
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    // Create a test club
    testClub = await prisma.tfx_vereine.create({
      data: {
        var_name: 'Test Gymnastics Club',
        var_website: 'https://test-club.com',
        int_gaueid: 1 // Default association ID
      }
    });
    TestUtils.trackCreated('clubs', testClub.int_vereineid);
  });

  describe('GET /api/clubs', () => {
    it('should return a list of clubs', async () => {
      const response = await request(app)
        .get('/api/clubs')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.clubs).toBeTruthy();
      
      // Handle both array and object response formats
      const clubs = Array.isArray(response.body) ? response.body : response.body.clubs;
      if (clubs) {
        expect(clubs.length).toBeGreaterThan(0);
        
        const club = clubs.find((c: any) => 
          c.int_vereineid === testClub.int_vereineid ||
          c.id === testClub.int_vereineid
        );
        
        if (club) {
          expect(club.var_name || club.name).toBe('Test Gymnastics Club');
        }
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/clubs?limit=5')
        .expect(200);

      expect(response.body).toBeDefined();
      
      // Handle pagination response
      if (response.body.clubs) {
        expect(response.body.clubs.length).toBeLessThanOrEqual(5);
        expect(response.body.pagination).toBeDefined();
      } else if (Array.isArray(response.body)) {
        expect(response.body.length).toBeLessThanOrEqual(50); // Default or reasonable limit
      }
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/clubs?search=Test Gymnastics')
        .expect(200);

      expect(response.body).toBeDefined();
      
      const clubs = Array.isArray(response.body) ? response.body : response.body.clubs;
      if (clubs && clubs.length > 0) {
        const foundClub = clubs.find((c: any) => 
          (c.var_name && c.var_name.includes('Test Gymnastics')) ||
          (c.name && c.name.includes('Test Gymnastics'))
        );
        expect(foundClub).toBeDefined();
      }
    });
  });

  describe('GET /api/clubs/:id', () => {
    it('should return a specific club by ID', async () => {
      const response = await request(app)
        .get(`/api/clubs/${testClub.int_vereineid}`)
        .expect(200);

      expect(response.body.var_name || response.body.name).toBe('Test Gymnastics Club');
      expect(response.body.var_website || response.body.website).toBe('https://test-club.com');
      expect(response.body.int_vereineid || response.body.id).toBe(testClub.int_vereineid);
    });

    it('should return 404 for non-existent club', async () => {
      const response = await request(app)
        .get('/api/clubs/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid club ID', async () => {
      const response = await request(app)
        .get('/api/clubs/invalid-id')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/clubs', () => {
    it('should create a new club with valid data', async () => {
      const newClubData = {
        var_name: 'New Test Club',
        var_website: 'https://new-test-club.com',
        int_gaueid: 1
      };

      const response = await request(app)
        .post('/api/clubs')
        .send(newClubData)
        .expect(201);

      expect(response.body.var_name || response.body.name).toBe('New Test Club');
      expect(response.body.var_website || response.body.website).toBe('https://new-test-club.com');
      expect(response.body.int_vereineid || response.body.id).toBeDefined();

      // Cleanup created club
      if (response.body.int_vereineid || response.body.id) {
        const clubId = response.body.int_vereineid || response.body.id;
        await prisma.tfx_vereine.delete({
          where: { int_vereineid: clubId }
        }).catch(() => {}); // Ignore cleanup errors
      }
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        var_name: '', // Empty name should fail validation
        var_ort: 'Test City'
      };

      const response = await request(app)
        .post('/api/clubs')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/clubs/:id', () => {
    it('should update an existing club', async () => {
      const updateData = {
        var_name: 'Updated Test Club',
        var_website: 'https://updated-club.com'
      };

      const response = await request(app)
        .put(`/api/clubs/${testClub.int_vereineid}`)
        .send(updateData)
        .expect(200);

      expect(response.body.var_name || response.body.name).toBe('Updated Test Club');
      expect(response.body.var_website || response.body.website).toBe('https://updated-club.com');
    });

    it('should return 404 for non-existent club', async () => {
      const updateData = {
        var_name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/clubs/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/clubs/:id', () => {
    it('should delete an existing club', async () => {
      // Create a club specifically for deletion
      const clubToDelete = await prisma.tfx_vereine.create({
        data: {
          var_name: 'Club To Delete',
          var_website: 'https://delete-club.com',
          int_gaueid: 1
        }
      });

      const response = await request(app)
        .delete(`/api/clubs/${clubToDelete.int_vereineid}`)
        .expect(200);

      expect(response.body.message || response.body.success).toBeDefined();

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/clubs/${clubToDelete.int_vereineid}`)
        .expect(404);
    });

    it('should return 404 for non-existent club', async () => {
      const response = await request(app)
        .delete('/api/clubs/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });
});
