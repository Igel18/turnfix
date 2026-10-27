import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { effectiveDisciplineScore, rankCompetition } from '@turnfix/shared';
import resultsGymnetExportRoutes from '../../src/routes/resultsGymnetExport';
import scoresRoutes from '../../src/routes/scores';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/results', resultsGymnetExportRoutes);
app.use('/api/scores', scoresRoutes);

/**
 * The GymNet XML must show the same discipline points, totals and placements as the
 * Results page, which builds them from /api/scores with the shared calculation.
 */
describe('GymNet XML and Results view show the same values', () => {
  let prisma: PrismaClient;
  let event: any;
  let competition: any;
  let formulaIds: number[] = [];

  // Order and names of the TurnFix devices differ from the GymNet template on purpose
  const DEVICES = ['Sprung', 'Stufenbarren', 'Balken', 'Boden'] as const;
  type Device = (typeof DEVICES)[number];

  const disciplineIds = {} as Record<Device, number>;

  beforeAll(() => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    const exportFile = path.join(process.cwd(), 'exports', 'gymnet-results', `parity-template_Results_${new Date().toISOString().split('T')[0]}.xml`);
    if (fs.existsSync(exportFile)) fs.unlinkSync(exportFile);
    await TestUtils.cleanupCreatedRecords();
    if (formulaIds.length > 0) {
      await prisma.tfx_formeln.deleteMany({ where: { int_formelid: { in: formulaIds } } }).catch(() => {});
      formulaIds = [];
    }
  });

  beforeEach(async () => {
    event = await TestUtils.createTestEvent({ name: `Parity ${Date.now()}` });
    competition = await TestUtils.createTestCompetition({ name: 'Parity competition', int_veranstaltungenid: event.int_veranstaltungenid });

    const sport = await prisma.tfx_sport.findFirstOrThrow();
    const formula = await prisma.tfx_formeln.create({ data: { var_name: `Parity ${Date.now()}`, var_formel: 'A+B-C' } });
    formulaIds.push(formula.int_formelid);

    for (const [index, name] of DEVICES.entries()) {
      const discipline = await prisma.tfx_disziplinen.create({
        data: { int_sportid: sport.int_sportid, var_name: name, var_formel: '1*x', int_formelid: formula.int_formelid },
      });
      TestUtils.trackCreated('disciplines', discipline.int_disziplinenid);
      disciplineIds[name] = discipline.int_disziplinenid;
      await prisma.tfx_wettkaempfe_x_disziplinen.create({
        data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_disziplinenid: discipline.int_disziplinenid, int_sortierung: index + 1 },
      });
      for (const [fieldIndex, fieldName] of ['D/A-Note', 'E/B-Note', 'C'].entries()) {
        await prisma.tfx_disziplinen_felder.create({
          data: { int_disziplinenid: discipline.int_disziplinenid, var_name: fieldName, int_sortierung: fieldIndex + 1, bol_endwert: false, bol_ausgangswert: false },
        });
      }
      await prisma.tfx_disziplinen_felder.create({
        data: { int_disziplinenid: discipline.int_disziplinenid, var_name: 'Endwert', int_sortierung: 4, bol_endwert: true, bol_ausgangswert: false },
      });
    }
  });

  type Fields = { a: number; b: number; c?: number; stored: number };
  type Athlete = Record<Device, Fields>;

  const addAthlete = async (firstName: string, athlete: Athlete) => {
    const status = await prisma.tfx_status.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ firstName, lastName: 'Parity' });
    const wertung = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_statusid: status.int_statusid },
    });

    for (const device of DEVICES) {
      const { a, b, c, stored } = athlete[device];
      const fields = await prisma.tfx_disziplinen_felder.findMany({
        where: { int_disziplinenid: disciplineIds[device] },
        orderBy: { int_sortierung: 'asc' },
      });
      const values = [a, b, c, stored];
      for (const [index, field] of fields.entries()) {
        if (values[index] === undefined) continue;
        await prisma.tfx_jury_results.create({
          data: { int_wertungenid: wertung.int_wertungenid, int_disziplinen_felderid: field.int_disziplinen_felderid, int_versuch: 1, rel_leistung: values[index] },
        });
      }
      await prisma.tfx_wertungen_details.create({
        data: { int_wertungenid: wertung.int_wertungenid, int_disziplinenid: disciplineIds[device], int_versuch: 1, rel_leistung: stored },
      });
    }
    return participant;
  };

  // Emilia: Balken 10.50 differs from Boden 12.30; Marie: stale stored Balken 4.1, fields give 11.9
  const emilia: Athlete = {
    Sprung: { a: 4, b: 8.95, stored: 12.95 },
    Stufenbarren: { a: 3, b: 9, stored: 12 },
    Balken: { a: 3, b: 7.5, stored: 10.5 },
    Boden: { a: 3, b: 9.3, stored: 12.3 },
  };
  const marie: Athlete = {
    Sprung: { a: 6, b: 6.85, stored: 12.85 },
    Stufenbarren: { a: 5, b: 5.6, stored: 10.6 },
    Balken: { a: 5, b: 6.9, stored: 4.1 },
    Boden: { a: 5, b: 7, stored: 12 },
  };
  const ida: Athlete = {
    Sprung: { a: 4, b: 7.8, stored: 11.8 },
    Stufenbarren: { a: 4, b: 7.3, stored: 11.3 },
    Balken: { a: 4, b: 9.4, c: 0.5, stored: 12.9 },
    Boden: { a: 4, b: 9.4, stored: 13.4 },
  };

  /** What the Results page computes from /api/scores */
  const resultsViewValues = async () => {
    const { body } = await request(app).get('/api/scores').query({ eventId: event.int_veranstaltungenid, competitionId: competition.int_wettkaempfeid, limit: 1000 }).expect(200);
    const byParticipant = new Map<number, Record<string, number>>();
    for (const row of body.results) {
      const scores = byParticipant.get(row.participantId) ?? {};
      scores[row.discipline.name] = effectiveDisciplineScore({
        storedScore: row.score,
        juryResults: row.juryResults,
        linkedFormula: row.formula ?? row.disciplineFormula,
        builtInFormula: row.disciplineFormula,
      });
      byParticipant.set(row.participantId, scores);
    }
    const ranking = rankCompetition([...byParticipant].map(([key, scores]) => ({ key, scores: Object.values(scores) })));
    return { byParticipant, ranking };
  };

  const fmt = (value: number) => value.toFixed(3);

  const parseXml = (xml: string) => {
    const entries = new Map<string, { total: string; place: string; wertung: Record<string, string>; punkte: Record<string, string> }>();
    // Plain export puts everything into <TN>, the template merge keeps the <Mannschaft> layout
    const separator = xml.includes('<Mannschaft>') ? '<Mannschaft>' : '<TN>';
    for (const block of xml.split(separator).slice(1)) {
      const name = block.match(/<perVorname>([^<]*)<\/perVorname>/)?.[1] ?? '';
      const wertung: Record<string, string> = {};
      const punkte: Record<string, string> = {};
      for (const disc of block.split('<Disziplin>').slice(1)) {
        const discName = disc.match(/<wedDisName>([^<]*)<\/wedDisName>/)?.[1] ?? '';
        wertung[discName] = disc.match(/<wtdWertung>([^<]*)<\/wtdWertung>/)?.[1] ?? '';
        punkte[discName] = disc.match(/<wtdPunkte>([^<]*)<\/wtdPunkte>/)?.[1] ?? '';
      }
      entries.set(name, {
        total: block.match(/<etPunkte>([^<]*)<\/etPunkte>/)?.[1] ?? '',
        place: block.match(/<etPlatzierung>([^<]*)<\/etPlatzierung>/)?.[1] ?? '',
        wertung,
        punkte,
      });
    }
    return entries;
  };

  // GymNet P-level template: other order, GymNet names
  const TEMPLATE_NAMES: Record<Device, string> = {
    Sprung: 'Sprung w. P1-P9',
    Stufenbarren: 'Stu.-Barren w. P1-P9',
    Boden: 'Boden w. P1-P9',
    Balken: 'Sch.-Balken w. P1-P9',
  };
  const TEMPLATE_ORDER: Device[] = ['Sprung', 'Stufenbarren', 'Boden', 'Balken'];

  const templateFor = (names: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<Wettkämpfe><Wettkampf><waNr>${competition.var_nummer || ''}</waNr><waBezeichnung>${competition.var_name}</waBezeichnung><Mannschaften>${names.map(name => `
  <Mannschaft><etErfasst>0</etErfasst><etPunkte></etPunkte><etPlatzierung>0</etPlatzierung>
    <Teilnehmer><TN><perName>Parity</perName><perVorname>${name}</perVorname><perGeburt>01.01.1990</perGeburt></TN></Teilnehmer>
    <Disziplinen>${TEMPLATE_ORDER.map((device, index) => `<Disziplin><wedDisName>${TEMPLATE_NAMES[device]}</wedDisName><wtdPosition>${index + 1}</wtdPosition><wtdWertung></wtdWertung><wtdPunkte></wtdPunkte></Disziplin>`).join('')}</Disziplinen>
  </Mannschaft>`).join('')}</Mannschaften></Wettkampf></Wettkämpfe>`;

  const exportPlain = async () => parseXml((await request(app).get('/api/results/export-gymnet-xml').query({ eventId: event.int_veranstaltungenid }).expect(200)).text);

  const exportTemplate = async (names: string[]) =>
    parseXml((await request(app)
      .post('/api/results/export-gymnet-xml-template')
      .field('eventId', String(event.int_veranstaltungenid))
      .attach('xmlFile', Buffer.from(templateFor(names)), { filename: 'parity-template.xml', contentType: 'application/xml' })
      .expect(200)).text);

  const setup = async () => {
    const participants = {
      Emilia: await addAthlete('Emilia', emilia),
      Marie: await addAthlete('Marie', marie),
      Ida: await addAthlete('Ida', ida),
    };
    return participants;
  };

  const expectParity = async (exported: ReturnType<typeof parseXml>, nameForDevice: (device: Device) => string, participants: Record<string, { int_teilnehmerid: number }>) => {
    const { byParticipant, ranking } = await resultsViewValues();

    for (const [name, participant] of Object.entries(participants)) {
      const view = byParticipant.get(participant.int_teilnehmerid)!;
      const xml = exported.get(name)!;
      expect(xml).toBeDefined();

      for (const device of DEVICES) {
        expect({ name, device, points: xml.punkte[nameForDevice(device)] }).toEqual({ name, device, points: fmt(view[device]) });
      }
      expect({ name, total: xml.total }).toEqual({ name, total: fmt(ranking.get(participant.int_teilnehmerid)!.totalScore!) });
      expect({ name, place: xml.place }).toEqual({ name, place: String(ranking.get(participant.int_teilnehmerid)!.rank) });
    }
  };

  it('plain export: points, totals and placements equal the Results view', async () => {
    const participants = await setup();
    await expectParity(await exportPlain(), device => device, participants);
  });

  it('template export: every apparatus gets its own value (Balken is not Boden)', async () => {
    const participants = await setup();
    const exported = await exportTemplate(Object.keys(participants));

    await expectParity(exported, device => TEMPLATE_NAMES[device], participants);
    expect(exported.get('Emilia')!.punkte[TEMPLATE_NAMES.Balken]).toBe('10.500');
    expect(exported.get('Emilia')!.punkte[TEMPLATE_NAMES.Boden]).toBe('12.300');
  });

  it('exports the recalculated final score as Wertung, not the stale stored value', async () => {
    const participants = await setup();
    const plain = await exportPlain();
    const template = await exportTemplate(Object.keys(participants));

    expect(plain.get('Marie')!.wertung.Balken).toBe('11.900');
    expect(plain.get('Marie')!.punkte.Balken).toBe('11.900');
    expect(template.get('Marie')!.wertung[TEMPLATE_NAMES.Balken]).toBe('11.900');
  });

  it('applies the C deduction of the formula in the points, like the Results view', async () => {
    const participants = await setup();
    const plain = await exportPlain();

    // Ida Balken: 4 + 9.4 - 0.5
    expect(plain.get('Ida')!.punkte.Balken).toBe('12.900');
    await expectParity(plain, device => device, participants);
  });
});
