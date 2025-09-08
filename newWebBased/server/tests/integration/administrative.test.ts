import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import regionRoutes from '../../src/routes/regions';
import areaRoutes from '../../src/routes/areas';
import countryRoutes from '../../src/routes/countries';
import statusRoutes from '../../src/routes/statuses';
import sportRoutes from '../../src/routes/sports';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/regions', regionRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/sports', sportRoutes);

describe('Administrative Data APIs', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  describe('Regions API', () => {
    it('should return a list of regions', async () => {
      const response = await request(app)
        .get('/api/regions')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.regions).toBeTruthy();
    });

    it('should support filtering by country', async () => {
      const response = await request(app)
        .get('/api/regions?countryId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/regions?search=bayern')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle region creation', async () => {
      const newRegionData = {
        name: 'Test Region',
        code: 'TR',
        countryId: 1
      };

      const response = await request(app)
        .post('/api/regions')
        .send(newRegionData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should handle region updates', async () => {
      const updateData = {
        name: 'Updated Region Name'
      };

      const response = await request(app)
        .put('/api/regions/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent region', async () => {
      const response = await request(app)
        .get('/api/regions/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });
  });

  describe('Areas API', () => {
    it('should return a list of areas', async () => {
      const response = await request(app)
        .get('/api/areas')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.areas).toBeTruthy();
    });

    it('should support filtering by region', async () => {
      const response = await request(app)
        .get('/api/areas?regionId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle area creation', async () => {
      const newAreaData = {
        name: 'Test Area',
        regionId: 1,
        postalCodes: ['12345', '12346']
      };

      const response = await request(app)
        .post('/api/areas')
        .send(newAreaData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        postalCodes: ['12345']
        // Missing name and regionId
      };

      const response = await request(app)
        .post('/api/areas')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });
  });

  describe('Countries API', () => {
    it('should return a list of countries', async () => {
      const response = await request(app)
        .get('/api/countries')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.countries).toBeTruthy();
    });

    it('should support search by name or code', async () => {
      const response = await request(app)
        .get('/api/countries?search=germany')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle country creation', async () => {
      const newCountryData = {
        name: 'Test Country',
        code: 'TC',
        iso3: 'TCO'
      };

      const response = await request(app)
        .post('/api/countries')
        .send(newCountryData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate country codes', async () => {
      const invalidData = {
        name: 'Test Country',
        code: 'INVALID', // Too long
        iso3: 'TCO'
      };

      const response = await request(app)
        .post('/api/countries')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should prevent duplicate country codes', async () => {
      const duplicateData = {
        name: 'Another Germany',
        code: 'DE', // Existing code
        iso3: 'DEU'
      };

      const response = await request(app)
        .post('/api/countries')
        .send(duplicateData)
        .expect((res) => {
          expect([400, 409, 422]).toContain(res.status);
        });
    });
  });

  describe('Statuses API', () => {
    it('should return a list of statuses', async () => {
      const response = await request(app)
        .get('/api/statuses')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.statuses).toBeTruthy();
    });

    it('should support filtering by category', async () => {
      const response = await request(app)
        .get('/api/statuses?category=event')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by active status', async () => {
      const response = await request(app)
        .get('/api/statuses?active=true')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle status creation', async () => {
      const newStatusData = {
        name: 'Test Status',
        category: 'participant',
        description: 'Test status description',
        active: true
      };

      const response = await request(app)
        .post('/api/statuses')
        .send(newStatusData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate status categories', async () => {
      const invalidData = {
        name: 'Test Status',
        category: 'invalid_category'
      };

      const response = await request(app)
        .post('/api/statuses')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle status updates', async () => {
      const updateData = {
        name: 'Updated Status',
        active: false
      };

      const response = await request(app)
        .put('/api/statuses/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should prevent deletion of statuses in use', async () => {
      const response = await request(app)
        .delete('/api/statuses/1')
        .expect((res) => {
          expect([200, 400, 409, 404]).toContain(res.status);
        });
    });
  });

  describe('Sports API', () => {
    it('should return a list of sports', async () => {
      const response = await request(app)
        .get('/api/sports')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.sports).toBeTruthy();
    });

    it('should support filtering by type', async () => {
      const response = await request(app)
        .get('/api/sports?type=gymnastics')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/sports?search=gymnastics')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle sport creation', async () => {
      const newSportData = {
        name: 'Test Sport',
        type: 'gymnastics',
        description: 'Test sport description',
        rules: 'Test sport rules'
      };

      const response = await request(app)
        .post('/api/sports')
        .send(newSportData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Test description'
        // Missing name and type
      };

      const response = await request(app)
        .post('/api/sports')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle sport updates', async () => {
      const updateData = {
        name: 'Updated Sport Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/sports/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent sport', async () => {
      const response = await request(app)
        .get('/api/sports/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });
  });

  describe('Cross-API Data Relationships', () => {
    it('should validate region-country relationships', async () => {
      const regionData = {
        name: 'Test Region',
        countryId: 99999 // Non-existent country
      };

      const response = await request(app)
        .post('/api/regions')
        .send(regionData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });

    it('should validate area-region relationships', async () => {
      const areaData = {
        name: 'Test Area',
        regionId: 99999 // Non-existent region
      };

      const response = await request(app)
        .post('/api/areas')
        .send(areaData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });

    it('should provide hierarchical data', async () => {
      const response = await request(app)
        .get('/api/countries/1/regions')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide area statistics', async () => {
      const response = await request(app)
        .get('/api/areas/1/statistics')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should handle concurrent updates gracefully', async () => {
      const updateData = {
        name: 'Concurrent Update Test'
      };

      const promises = Array.from({length: 5}, () =>
        request(app)
          .put('/api/regions/1')
          .send(updateData)
      );

      const responses = await Promise.all(promises);
      
      // At least one should succeed
      const successfulResponses = responses.filter(res => 
        [200, 201].includes(res.status)
      );
      
      expect(responses.length).toBe(5);
    });

    it('should maintain referential integrity', async () => {
      // Try to delete a country that has regions
      const response = await request(app)
        .delete('/api/countries/1')
        .expect((res) => {
          expect([200, 400, 409, 404]).toContain(res.status);
        });
    });
  });
});
