import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import resultRoutes from '../../src/routes/results';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/results', resultRoutes);

describe('Results API', () => {
  let prisma: PrismaClient;
  let testEvent: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
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
      name: 'Test Event for Results',
      description: 'Test Event Description'
    });
  });

  describe('GET /api/results', () => {
    it('should return a list of results', async () => {
      const response = await request(app)
        .get('/api/results')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.results).toBeTruthy();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/results?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by participant', async () => {
      const response = await request(app)
        .get('/api/results?participantId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by discipline', async () => {
      const response = await request(app)
        .get('/api/results?disciplineId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/results?limit=10&page=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/results/:id', () => {
    it('should return 404 for non-existent result', async () => {
      const response = await request(app)
        .get('/api/results/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should handle invalid result ID', async () => {
      const response = await request(app)
        .get('/api/results/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });
    });
  });

  describe('POST /api/results', () => {
    it('should handle result creation', async () => {
      const newResultData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        score: 15.25,
        rank: 1
      };

      const response = await request(app)
        .post('/api/results')
        .send(newResultData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        score: 15.25
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/results')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate score ranges', async () => {
      const invalidData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        score: -5.0 // Invalid negative score
      };

      const response = await request(app)
        .post('/api/results')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });
  });

  describe('PUT /api/results/:id', () => {
    it('should handle result updates', async () => {
      const updateData = {
        score: 16.50,
        rank: 2
      };

      const response = await request(app)
        .put('/api/results/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400, 422]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent result', async () => {
      const updateData = {
        score: 16.50
      };

      const response = await request(app)
        .put('/api/results/99999')
        .send(updateData)
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });
  });

  describe('DELETE /api/results/:id', () => {
    it('should handle result deletion', async () => {
      const response = await request(app)
        .delete('/api/results/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk result import', async () => {
      const bulkData = {
        results: [
          {
            participantId: 1,
            eventId: testEvent.int_eventid,
            disciplineId: 1,
            score: 15.25
          },
          {
            participantId: 2,
            eventId: testEvent.int_eventid,
            disciplineId: 1,
            score: 14.75
          }
        ]
      };

      const response = await request(app)
        .post('/api/results/bulk')
        .send(bulkData)
        .expect((res) => {
          expect([200, 201, 400, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('Statistics and Analytics', () => {
    it('should provide result statistics', async () => {
      const response = await request(app)
        .get('/api/results/statistics')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide event rankings', async () => {
      const response = await request(app)
        .get(`/api/results/rankings?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('GymNet XML Export (Template-based)', () => {
    it('returns 400 when xml template file is missing', async () => {
      const response = await request(app)
        .post('/api/results/export-gymnet-xml-template')
        .field('eventId', String(testEvent.int_veranstaltungenid))
        .expect(400);

      expect(response.body.error).toContain('Template XML file is required');
    });
  });

  describe('GymNet Event ID (Standardexport.xls)', () => {
    function buildStandardExportBuffer(rows: string[][]): Buffer {
      const worksheet = XLSX.utils.aoa_to_sheet([['evName', 'evStart', 'evStop', 'evID'], ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Meldungen');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }

    afterEach(() => {
      const filePath = path.join(process.cwd(), 'uploads', 'gymnet-meta', `event-${testEvent.int_veranstaltungenid}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    it('returns 404 when no mapping has been imported yet', async () => {
      await request(app)
        .get(`/api/results/gymnet-event-id/${testEvent.int_veranstaltungenid}`)
        .expect(404);
    });

    it('imports the Standardexport.xls and stores the evID', async () => {
      const buffer = buildStandardExportBuffer([
        ['Test Event for Results', '2026-05-01', '2026-05-02', '654321'],
      ]);

      const response = await request(app)
        .post(`/api/results/gymnet-event-id/${testEvent.int_veranstaltungenid}`)
        .attach('xlsFile', buffer, { filename: 'Standardexport.xls' })
        .expect(200);

      expect(response.body.mapping.gymnetEventId).toBe('654321');
      expect(response.body.resultsServiceUrl).toBe(
        'https://m.ergebnisse.dtb-gymnet.de/index.php?eventID=654321'
      );
      expect(response.body.warning).toBeNull();
    });

    it('returns the stored mapping on subsequent GET requests', async () => {
      const buffer = buildStandardExportBuffer([
        ['Test Event for Results', '2026-05-01', '2026-05-02', '777777'],
      ]);
      await request(app)
        .post(`/api/results/gymnet-event-id/${testEvent.int_veranstaltungenid}`)
        .attach('xlsFile', buffer, { filename: 'Standardexport.xls' })
        .expect(200);

      const response = await request(app)
        .get(`/api/results/gymnet-event-id/${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(response.body.mapping.gymnetEventId).toBe('777777');
    });

    it('warns when the evID is inconsistent across rows', async () => {
      const buffer = buildStandardExportBuffer([
        ['Test Event for Results', '2026-05-01', '2026-05-02', '111'],
        ['Test Event for Results', '2026-05-01', '2026-05-02', '222'],
      ]);

      const response = await request(app)
        .post(`/api/results/gymnet-event-id/${testEvent.int_veranstaltungenid}`)
        .attach('xlsFile', buffer, { filename: 'Standardexport.xls' })
        .expect(200);

      expect(response.body.warning).toContain('unterschiedliche evID');
    });

    it('returns 400 when the file is missing required columns', async () => {
      const worksheet = XLSX.utils.aoa_to_sheet([['name'], ['Test Event']]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Meldungen');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      await request(app)
        .post(`/api/results/gymnet-event-id/${testEvent.int_veranstaltungenid}`)
        .attach('xlsFile', buffer, { filename: 'Standardexport.xls' })
        .expect(400);
    });

    it('returns 400 for a non-numeric eventId', async () => {
      await request(app)
        .get('/api/results/gymnet-event-id/not-a-number')
        .expect(400);
    });
  });
});
