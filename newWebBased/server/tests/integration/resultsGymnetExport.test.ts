import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import resultsGymnetExportRoutes from '../../src/routes/resultsGymnetExport';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/results', resultsGymnetExportRoutes);

describe('resultsGymnetExport router', () => {
  let prisma: PrismaClient;
  let event: any;
  let competition: any;
  let outputFile: string | null = null;

  beforeAll(() => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    if (outputFile && fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    outputFile = null;
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    event = await TestUtils.createTestEvent({ name: `GymNet export ${Date.now()}` });
    competition = await TestUtils.createTestCompetition({
      name: 'GymNet export competition',
      int_veranstaltungenid: event.int_veranstaltungenid,
    });
  });

  it('returns a valid XML download containing the exported competition', async () => {
    const sport = await prisma.tfx_sport.findFirstOrThrow();
    const discipline = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport.int_sportid,
        var_name: `Boden ${Date.now()}`,
      },
    });
    TestUtils.trackCreated('disciplines', discipline.int_disziplinenid);

    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_disziplinenid: discipline.int_disziplinenid,
        int_sortierung: 1,
      },
    });

    const participant = await TestUtils.createTestParticipant({
      firstName: 'Export',
      lastName: 'Turner',
    });
    const status = await prisma.tfx_status.findFirstOrThrow();
    const score = await prisma.tfx_wertungen.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_teilnehmerid: participant.int_teilnehmerid,
        int_statusid: status.int_statusid,
        int_startnummer: 17,
      },
    });
    await prisma.tfx_wertungen_details.create({
      data: {
        int_wertungenid: score.int_wertungenid,
        int_disziplinenid: discipline.int_disziplinenid,
        int_versuch: 1,
        rel_leistung: 12.5,
      },
    });

    const response = await request(app)
      .get('/api/results/export-gymnet-xml')
      .query({ eventId: event.int_veranstaltungenid })
      .expect(200);

    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.headers['content-disposition']).toContain('.xml');
    expect(response.text).toContain('<Wettkämpfe>');
    expect(response.text).toContain('<perVorname>Export</perVorname>');
    expect(response.text).toContain('<perName>Turner</perName>');
    expect(response.text).toContain('<wtdWertung>12.500</wtdWertung>');
  });

  it('rejects an invalid event id and returns 404 when the event has no competitions', async () => {
    await request(app)
      .get('/api/results/export-gymnet-xml')
      .query({ eventId: 'not-a-number' })
      .expect(400);

    await request(app)
      .get('/api/results/export-gymnet-xml')
      .query({ eventId: 2147483000 })
      .expect(404);
  });

  it('rejects a template export without an uploaded XML file', async () => {
    await request(app)
      .post('/api/results/export-gymnet-xml-template')
      .field('eventId', String(event.int_veranstaltungenid))
      .expect(400)
      .expect(({ body }) => expect(body.error).toContain('Template XML file is required'));
  });

  it('returns a merged template download and match metadata', async () => {
    const template = `<?xml version="1.0" encoding="UTF-8"?><Wettkämpfe><Wettkampf><waNr>${competition.var_nummer || ''}</waNr><waBezeichnung>GymNet export competition</waBezeichnung><Mannschaften/></Wettkampf></Wettkämpfe>`;
    const response = await request(app)
      .post('/api/results/export-gymnet-xml-template')
      .field('eventId', String(event.int_veranstaltungenid))
      .attach('xmlFile', Buffer.from(template), { filename: 'results-template-test.xml', contentType: 'application/xml' })
      .expect(200);

    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.headers['x-gymnet-match-stats']).toBeDefined();
    expect(response.headers['x-gymnet-match-report-encoded']).toBeDefined();
    expect(response.text).toContain('<Wettkämpfe>');
    const downloadName = response.headers['content-disposition'].match(/filename="([^"]+)"/)?.[1];
    expect(downloadName).toBeDefined();
    const templatePath = path.join(process.cwd(), 'exports', 'gymnet-results', downloadName!);
    outputFile = templatePath;
    expect(fs.existsSync(templatePath)).toBe(true);
  });
});