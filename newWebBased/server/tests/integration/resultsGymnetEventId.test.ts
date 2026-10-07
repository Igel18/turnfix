import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { TestUtils } from '../utils/testUtils';
import resultsGymnetEventIdRoutes from '../../src/routes/resultsGymnetEventId';

const app = express();
app.use(express.json());
app.use('/api/results', resultsGymnetEventIdRoutes);

describe('resultsGymnetEventId router', () => {
  let event: any;
  let mappingFile: string;

  beforeAll(() => {
    TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  beforeEach(async () => {
    event = await TestUtils.createTestEvent({ name: `GymNet mapping ${Date.now()}` });
    mappingFile = path.join(process.cwd(), 'uploads', 'gymnet-meta', `event-${event.int_veranstaltungenid}.json`);
  });

  afterEach(async () => {
    if (mappingFile && fs.existsSync(mappingFile)) fs.unlinkSync(mappingFile);
    await TestUtils.cleanupCreatedRecords();
  });

  function standardExport(rows: string[][]): Buffer {
    const worksheet = XLSX.utils.aoa_to_sheet([['evName', 'evStart', 'evStop', 'evID'], ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Meldungen');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  it('imports a Standardexport, exposes the service URL, and reads the mapping back', async () => {
    const upload = standardExport([['Test event', '2026-05-01', '2026-05-02', '654321']]);
    const imported = await request(app)
      .post(`/api/results/gymnet-event-id/${event.int_veranstaltungenid}`)
      .attach('xlsFile', upload, { filename: 'Standardexport.xlsx' })
      .expect(200);

    expect(imported.body.mapping.gymnetEventId).toBe('654321');
    expect(imported.body.resultsServiceUrl).toContain('eventID=654321');
    expect(imported.body.warning).toBeNull();

    const loaded = await request(app)
      .get(`/api/results/gymnet-event-id/${event.int_veranstaltungenid}`)
      .expect(200);
    expect(loaded.body.mapping.gymnetEventId).toBe('654321');
  });

  it('accepts a pre-parsed mapping and validates event ids and required values', async () => {
    await request(app)
      .put(`/api/results/gymnet-event-id/${event.int_veranstaltungenid}`)
      .send({ gymnetEventId: '123456', evName: 'Imported Event' })
      .expect(200);

    await request(app)
      .get('/api/results/gymnet-event-id/not-a-number')
      .expect(400);
    await request(app)
      .put(`/api/results/gymnet-event-id/${event.int_veranstaltungenid}`)
      .send({ evName: 'Missing ID' })
      .expect(400);
  });
});
