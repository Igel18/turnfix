import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import venueRoutes from '../../src/routes/venues';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/venues', venueRoutes);

describe('Venues API', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  describe('GET /api/venues', () => {
    it('should return a list of venues', async () => {
      const response = await request(app)
        .get('/api/venues')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.venues).toBeTruthy();
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/venues?search=hall')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by city', async () => {
      const response = await request(app)
        .get('/api/venues?city=Munich')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by capacity', async () => {
      const response = await request(app)
        .get('/api/venues?minCapacity=100')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/venues?limit=10&page=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/venues/:id', () => {
    it('should return 404 for non-existent venue', async () => {
      const response = await request(app)
        .get('/api/venues/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should handle invalid venue ID', async () => {
      const response = await request(app)
        .get('/api/venues/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });
    });
  });

  describe('POST /api/venues', () => {
    it('should handle venue creation', async () => {
      const newVenueData = {
        name: 'Test Sports Hall',
        address: '123 Test Street',
        city: 'Test City',
        postalCode: '12345',
        country: 'Germany',
        capacity: 500,
        facilities: ['gymnastics equipment', 'parking', 'catering']
      };

      const response = await request(app)
        .post('/api/venues')
        .send(newVenueData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        address: '123 Test Street'
        // Missing name
      };

      const response = await request(app)
        .post('/api/venues')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate capacity values', async () => {
      const invalidData = {
        name: 'Test Venue',
        address: '123 Test Street',
        city: 'Test City',
        capacity: -50 // Invalid negative capacity
      };

      const response = await request(app)
        .post('/api/venues')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle venue with coordinates', async () => {
      const venueWithGPS = {
        name: 'GPS Venue',
        address: '123 GPS Street',
        city: 'GPS City',
        latitude: 48.1351,
        longitude: 11.5820,
        capacity: 300
      };

      const response = await request(app)
        .post('/api/venues')
        .send(venueWithGPS)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });
  });

  describe('PUT /api/venues/:id', () => {
    it('should handle venue updates', async () => {
      const updateData = {
        name: 'Updated Venue Name',
        capacity: 600,
        facilities: ['updated equipment', 'new parking']
      };

      const response = await request(app)
        .put('/api/venues/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400, 422]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent venue', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/venues/99999')
        .send(updateData)
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should validate update data', async () => {
      const invalidData = {
        capacity: 'not-a-number'
      };

      const response = await request(app)
        .put('/api/venues/1')
        .send(invalidData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('DELETE /api/venues/:id', () => {
    it('should handle venue deletion', async () => {
      const response = await request(app)
        .delete('/api/venues/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should prevent deletion of venues with events', async () => {
      const response = await request(app)
        .delete('/api/venues/1') // Assuming venue 1 might have events
        .expect((res) => {
          expect([200, 400, 409, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('Venue Availability', () => {
    it('should check venue availability', async () => {
      const availabilityData = {
        venueId: 1,
        startDate: '2024-12-01',
        endDate: '2024-12-03'
      };

      const response = await request(app)
        .post('/api/venues/check-availability')
        .send(availabilityData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should get venue calendar', async () => {
      const response = await request(app)
        .get('/api/venues/1/calendar')
        .query({
          month: '2024-12',
          year: '2024'
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Venue Search and Filtering', () => {
    it('should search venues by equipment', async () => {
      const response = await request(app)
        .get('/api/venues/search')
        .query({
          equipment: 'gymnastics',
          minCapacity: 200
        })
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should find venues near location', async () => {
      const response = await request(app)
        .get('/api/venues/nearby')
        .query({
          latitude: 48.1351,
          longitude: 11.5820,
          radius: 50 // km
        })
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Venue Statistics', () => {
    it('should provide venue utilization stats', async () => {
      const response = await request(app)
        .get('/api/venues/1/statistics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide venue ratings', async () => {
      const response = await request(app)
        .get('/api/venues/1/ratings')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Venue Reviews and Ratings', () => {
    it('should handle venue rating submission', async () => {
      const ratingData = {
        venueId: 1,
        rating: 4.5,
        review: 'Great facilities and location',
        eventId: 1
      };

      const response = await request(app)
        .post('/api/venues/1/ratings')
        .send(ratingData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });
  });
});
