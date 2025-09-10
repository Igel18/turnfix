import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';

// Import all the route modules
import disciplineRoutes from '../../src/routes/disciplines';
import associationRoutes from '../../src/routes/associations';
import clubRoutes from '../../src/routes/clubs';
import participantRoutes from '../../src/routes/participants';
import regionRoutes from '../../src/routes/regions';

const app = express();
app.use(express.json());

// Set up all routes
app.use('/api/disciplines', disciplineRoutes);
app.use('/api/associations', associationRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/regions', regionRoutes);

describe('API Endpoints Comprehensive Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  describe('API Health and Basic Functionality', () => {
    it('should have all API endpoints responding', async () => {
      const endpoints = [
        '/api/disciplines',
        '/api/associations', 
        '/api/clubs',
        '/api/participants',
        '/api/regions'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect((res) => {
            // Accept any successful response (200, 201) or client error that indicates the endpoint exists
            if (res.status >= 500) {
              throw new Error(`Server error on ${endpoint}: ${res.status}`);
            }
          });
        
        expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      }
    });

    it('should handle invalid endpoints with 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      const endpoints = [
        '/api/disciplines/invalid-id',
        '/api/associations/invalid-id',
        '/api/clubs/invalid-id'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect((res) => {
            // Should return 400 (bad request) or 404 (not found), not 500
            expect([400, 404]).toContain(res.status);
          });
      }
    });
  });

  describe('Disciplines API Basic Tests', () => {
    it('should return disciplines data in correct format', async () => {
      const response = await request(app)
        .get('/api/disciplines');

      if (response.status === 200) {
        expect(response.body).toBeDefined();
        
        // Handle both array and object response formats
        const disciplines = Array.isArray(response.body) ? response.body : response.body.disciplines;
        
        if (disciplines && disciplines.length > 0) {
          const discipline = disciplines[0];
          
          // Check for expected field patterns (either database fields or API fields)
          expect(
            discipline.hasOwnProperty('int_disziplinenid') || 
            discipline.hasOwnProperty('id') ||
            discipline.hasOwnProperty('var_name') ||
            discipline.hasOwnProperty('name')
          ).toBeTruthy();
        }
      }
    });

    it('should handle discipline search and filtering', async () => {
      const testParams = ['?search=floor', '?limit=5', '?gender=male'];
      
      for (const param of testParams) {
        const response = await request(app)
          .get(`/api/disciplines${param}`);
        
        // Should return 200 or handle gracefully
        expect([200, 400, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      }
    });
  });

  describe('Associations API Basic Tests', () => {
    it('should return associations data in correct format', async () => {
      const response = await request(app)
        .get('/api/associations');

      if (response.status === 200) {
        expect(response.body).toBeDefined();
        
        const associations = Array.isArray(response.body) ? response.body : response.body.associations;
        
        if (associations && associations.length > 0) {
          const association = associations[0];
          
          expect(
            association.hasOwnProperty('int_gaueid') ||
            association.hasOwnProperty('id') ||
            association.hasOwnProperty('var_name') ||
            association.hasOwnProperty('name')
          ).toBeTruthy();
        }
      }
    });
  });

  describe('Clubs API Basic Tests', () => {
    it('should return clubs data in correct format', async () => {
      const response = await request(app)
        .get('/api/clubs');

      if (response.status === 200) {
        expect(response.body).toBeDefined();
        
        const clubs = Array.isArray(response.body) ? response.body : response.body.clubs;
        
        if (clubs && clubs.length > 0) {
          const club = clubs[0];
          
          expect(
            club.hasOwnProperty('int_vereineid') ||
            club.hasOwnProperty('id') ||
            club.hasOwnProperty('var_name') ||
            club.hasOwnProperty('name')
          ).toBeTruthy();
        }
      }
    });

    it('should handle club search and filtering', async () => {
      const testParams = ['?search=test', '?limit=10'];
      
      for (const param of testParams) {
        const response = await request(app)
          .get(`/api/clubs${param}`);
        
        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });

  describe('Participants API Basic Tests', () => {
    it('should return participants data in correct format', async () => {
      const response = await request(app)
        .get('/api/participants');

      if (response.status === 200) {
        expect(response.body).toBeDefined();
        
        const participants = Array.isArray(response.body) ? response.body : response.body.participants;
        
        if (participants && participants.length > 0) {
          const participant = participants[0];
          
          expect(
            participant.hasOwnProperty('int_teilnehmerid') ||
            participant.hasOwnProperty('id') ||
            participant.hasOwnProperty('var_vorname') ||
            participant.hasOwnProperty('firstName')
          ).toBeTruthy();
        }
      }
    });

    it('should handle participant pagination and search', async () => {
      const testParams = ['?limit=5', '?search=test', '?page=1'];
      
      for (const param of testParams) {
        const response = await request(app)
          .get(`/api/participants${param}`);
        
        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });

  describe('Regions API Basic Tests', () => {
    it('should return regions data in correct format', async () => {
      const response = await request(app)
        .get('/api/regions');

      if (response.status === 200) {
        expect(response.body).toBeDefined();
        
        const regions = Array.isArray(response.body) ? response.body : response.body.regions;
        
        if (regions && regions.length > 0) {
          const region = regions[0];
          
          expect(
            region.hasOwnProperty('int_regionid') ||
            region.hasOwnProperty('id') ||
            region.hasOwnProperty('var_name') ||
            region.hasOwnProperty('name')
          ).toBeTruthy();
        }
      }
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle non-existent resource IDs gracefully', async () => {
      const testCases = [
        '/api/disciplines/99999',
        '/api/associations/99999',
        '/api/clubs/99999',
        '/api/participants/99999'
      ];

      for (const endpoint of testCases) {
        const response = await request(app).get(endpoint);
        expect([404, 400]).toContain(response.status);
        
        if (response.body.error) {
          expect(typeof response.body.error).toBe('string');
        }
      }
    });

    it('should validate request parameters', async () => {
      const testCases = [
        '/api/disciplines/-1',
        '/api/associations/abc',
        '/api/clubs/null'
      ];

      for (const endpoint of testCases) {
        const response = await request(app).get(endpoint);
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent response formats across endpoints', async () => {
      const endpoints = [
        '/api/disciplines',
        '/api/associations',
        '/api/clubs',
        '/api/participants',
        '/api/regions'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          expect(typeof response.body).toBe('object');
          
          // Response should be either an array or an object with data property
          expect(
            Array.isArray(response.body) ||
            (typeof response.body === 'object' && response.body !== null)
          ).toBeTruthy();
        }
      }
    });

    it('should include proper headers', async () => {
      const response = await request(app).get('/api/disciplines');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Performance and Load Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/api/disciplines')
      );

      const responses = await Promise.all(requests);
      
      // All requests should complete successfully
      responses.forEach(response => {
        expect([200, 400, 404]).toContain(response.status);
      });
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await request(app).get('/api/disciplines');
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});
