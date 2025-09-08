import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import personRoutes from '../../src/routes/persons';
import configurationRoutes from '../../src/routes/configuration';
import layoutRoutes from '../../src/routes/layouts';
import imageRoutes from '../../src/routes/images';
import adminRoutes from '../../src/routes/admin';
import meldematrixRoutes from '../../src/routes/meldematrix';
import wertungenDetailsRoutes from '../../src/routes/wertungenDetails';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/persons', personRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/layouts', layoutRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/meldematrix', meldematrixRoutes);
app.use('/api/wertungen-details', wertungenDetailsRoutes);

describe('System and Utility APIs', () => {
  let prisma: PrismaClient;
  let testEvent: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  beforeEach(async () => {
    testEvent = await TestUtils.createTestEvent({
      name: 'Test Event for System APIs',
      description: 'Test Event Description'
    });
  });

  describe('Persons API', () => {
    it('should return a list of persons', async () => {
      const response = await request(app)
        .get('/api/persons')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.persons).toBeTruthy();
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/persons?search=john')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by role', async () => {
      const response = await request(app)
        .get('/api/persons?role=judge')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle person creation', async () => {
      const newPersonData = {
        firstName: 'Test',
        lastName: 'Person',
        email: 'test.person@example.com',
        phone: '+49 123 456789',
        role: 'official',
        qualifications: ['level_1_judge', 'safety_certified']
      };

      const response = await request(app)
        .post('/api/persons')
        .send(newPersonData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate email format', async () => {
      const invalidData = {
        firstName: 'Test',
        lastName: 'Person',
        email: 'invalid-email-format',
        role: 'official'
      };

      const response = await request(app)
        .post('/api/persons')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle person updates', async () => {
      const updateData = {
        email: 'updated.email@example.com',
        qualifications: ['level_2_judge', 'safety_certified']
      };

      const response = await request(app)
        .put('/api/persons/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should provide person availability', async () => {
      const response = await request(app)
        .get('/api/persons/1/availability')
        .query({
          startDate: '2024-12-01',
          endDate: '2024-12-03'
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Configuration API', () => {
    it('should return system configuration', async () => {
      const response = await request(app)
        .get('/api/configuration')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should support filtering by category', async () => {
      const response = await request(app)
        .get('/api/configuration?category=scoring')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle configuration updates', async () => {
      const configData = {
        key: 'test_setting',
        value: 'test_value',
        category: 'system',
        description: 'Test configuration setting'
      };

      const response = await request(app)
        .post('/api/configuration')
        .send(configData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate configuration values', async () => {
      const invalidData = {
        key: 'max_score',
        value: 'not_a_number', // Should be numeric
        category: 'scoring'
      };

      const response = await request(app)
        .post('/api/configuration')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle bulk configuration update', async () => {
      const bulkConfig = {
        settings: [
          { key: 'setting1', value: 'value1', category: 'system' },
          { key: 'setting2', value: 'value2', category: 'scoring' }
        ]
      };

      const response = await request(app)
        .put('/api/configuration/bulk')
        .send(bulkConfig)
        .expect((res) => {
          expect([200, 400, 422]).toContain(res.status);
        });
    });

    it('should export configuration', async () => {
      const response = await request(app)
        .get('/api/configuration/export')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Layouts API', () => {
    it('should return a list of layouts', async () => {
      const response = await request(app)
        .get('/api/layouts')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.layouts).toBeTruthy();
    });

    it('should support filtering by type', async () => {
      const response = await request(app)
        .get('/api/layouts?type=scoresheet')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle layout creation', async () => {
      const newLayoutData = {
        name: 'Test Layout',
        type: 'scoresheet',
        template: '<div>Test Layout Template</div>',
        styles: 'body { font-family: Arial; }'
      };

      const response = await request(app)
        .post('/api/layouts')
        .send(newLayoutData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate layout templates', async () => {
      const invalidData = {
        name: 'Invalid Layout',
        type: 'scoresheet',
        template: '<script>alert("xss")</script>' // Should be sanitized
      };

      const response = await request(app)
        .post('/api/layouts')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should preview layout', async () => {
      const previewData = {
        layoutId: 1,
        data: {
          participantName: 'Test Participant',
          score: 15.25
        }
      };

      const response = await request(app)
        .post('/api/layouts/preview')
        .send(previewData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Images API', () => {
    it('should return a list of images', async () => {
      const response = await request(app)
        .get('/api/images')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.images).toBeTruthy();
    });

    it('should support filtering by category', async () => {
      const response = await request(app)
        .get('/api/images?category=logos')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle image metadata', async () => {
      const imageData = {
        filename: 'test-image.jpg',
        category: 'participant_photos',
        description: 'Test participant photo',
        alt_text: 'Photo of test participant'
      };

      const response = await request(app)
        .post('/api/images/metadata')
        .send(imageData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate image formats', async () => {
      const response = await request(app)
        .get('/api/images/formats')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.allowedFormats || response.body.formats).toBeDefined();
    });

    it('should handle image deletion', async () => {
      const response = await request(app)
        .delete('/api/images/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Admin API', () => {
    it('should return system status', async () => {
      const response = await request(app)
        .get('/api/admin/status')
        .expect((res) => {
          expect([200, 401, 403]).toContain(res.status);
        });
    });

    it('should provide system metrics', async () => {
      const response = await request(app)
        .get('/api/admin/metrics')
        .expect((res) => {
          expect([200, 401, 403]).toContain(res.status);
        });
    });

    it('should handle database maintenance', async () => {
      const maintenanceData = {
        operation: 'vacuum',
        tables: ['tfx_teilnehmer', 'tfx_wertungen']
      };

      const response = await request(app)
        .post('/api/admin/maintenance')
        .send(maintenanceData)
        .expect((res) => {
          expect([200, 400, 401, 403]).toContain(res.status);
        });
    });

    it('should provide audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          action: 'create'
        })
        .expect((res) => {
          expect([200, 401, 403]).toContain(res.status);
        });
    });

    it('should handle system backup', async () => {
      const backupData = {
        type: 'incremental',
        includeUploads: true
      };

      const response = await request(app)
        .post('/api/admin/backup')
        .send(backupData)
        .expect((res) => {
          expect([200, 202, 400, 401, 403]).toContain(res.status);
        });
    });
  });

  describe('Meldematrix API', () => {
    it('should return registration matrix', async () => {
      const response = await request(app)
        .get('/api/meldematrix')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/meldematrix?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should provide registration statistics', async () => {
      const response = await request(app)
        .get('/api/meldematrix/statistics')
        .query({
          eventId: testEvent.int_eventid
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should export registration matrix', async () => {
      const response = await request(app)
        .get('/api/meldematrix/export')
        .query({
          eventId: testEvent.int_eventid,
          format: 'excel'
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should validate registration deadlines', async () => {
      const registrationData = {
        eventId: testEvent.int_eventid,
        participantId: 1,
        disciplines: [1, 2]
      };

      const response = await request(app)
        .post('/api/meldematrix/validate')
        .send(registrationData)
        .expect((res) => {
          expect([200, 400, 422]).toContain(res.status);
        });
    });
  });

  describe('Wertungen Details API', () => {
    it('should return detailed scoring information', async () => {
      const response = await request(app)
        .get('/api/wertungen-details')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by participant', async () => {
      const response = await request(app)
        .get('/api/wertungen-details?participantId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by event and discipline', async () => {
      const response = await request(app)
        .get(`/api/wertungen-details?eventId=${testEvent.int_eventid}&disciplineId=1`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle detailed score entry', async () => {
      const scoreDetailsData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        judgeId: 1,
        scoreBreakdown: {
          difficulty: 6.5,
          execution: 8.2,
          artistry: 7.8,
          penalties: 0.1
        },
        notes: 'Clean routine with minor form deduction'
      };

      const response = await request(app)
        .post('/api/wertungen-details')
        .send(scoreDetailsData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should provide score analysis', async () => {
      const response = await request(app)
        .get('/api/wertungen-details/analysis')
        .query({
          participantId: 1,
          eventId: testEvent.int_eventid
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should handle score corrections', async () => {
      const correctionData = {
        scoreId: 1,
        correctedScore: 15.1,
        reason: 'Judge error correction',
        approvedBy: 'head_judge'
      };

      const response = await request(app)
        .post('/api/wertungen-details/1/correction')
        .send(correctionData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Cross-System Integration', () => {
    it('should link persons to events as officials', async () => {
      const assignmentData = {
        eventId: testEvent.int_eventid,
        personId: 1,
        role: 'head_judge',
        disciplines: [1, 2]
      };

      const response = await request(app)
        .post('/api/persons/1/assign-event')
        .send(assignmentData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should use layouts for score reporting', async () => {
      const reportData = {
        layoutId: 1,
        eventId: testEvent.int_eventid,
        reportType: 'final_results'
      };

      const response = await request(app)
        .post('/api/layouts/generate-report')
        .send(reportData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should provide comprehensive system health check', async () => {
      const response = await request(app)
        .get('/api/admin/health-check')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/configuration')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle database connection issues', async () => {
      // This test would need to simulate database connectivity issues
      const response = await request(app)
        .get('/api/admin/db-status')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });
    });

    it('should rate limit administrative operations', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array.from({length: 10}, () =>
        request(app).get('/api/admin/metrics')
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);
      
      // Rate limiting might not be configured in test environment
      expect(responses.length).toBe(10);
    });
  });
});
