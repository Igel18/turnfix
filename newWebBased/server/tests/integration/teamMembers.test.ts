import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import teamMemberRoutes from '../../src/routes/teamMembers';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/teams', teamMemberRoutes);

describe('Team member registration', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = TestUtils.getPrisma();
  });

  afterEach(async () => {
    await TestUtils.cleanupCreatedRecords();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('creates a team-specific score in the event round without changing individual scores', async () => {
    const event = await TestUtils.createTestEvent({ round: 2 });
    const competition = await TestUtils.createTestCompetition({
      int_veranstaltungenid: event.int_veranstaltungenid
    });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_vereineid: club.int_vereineid,
        var_riege: 'T1'
      }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    const individualScore = await prisma.tfx_wertungen.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_teilnehmerid: participant.int_teilnehmerid,
        int_statusid: 1,
        var_riege: 'E1'
      }
    });

    await request(app)
      .post(`/api/teams/${team.int_mannschaftenid}/members`)
      .send({ participantId: participant.int_teilnehmerid })
      .expect(201);

    const score = await prisma.tfx_wertungen.findFirst({
      where: {
        int_mannschaftenid: team.int_mannschaftenid,
        int_teilnehmerid: participant.int_teilnehmerid
      }
    });
    expect(score).toMatchObject({
      int_wettkaempfeid: competition.int_wettkaempfeid,
      int_runde: 2,
      int_statusid: 1,
      var_riege: 'T1'
    });
    const individualAfter = await prisma.tfx_wertungen.findUniqueOrThrow({
      where: { int_wertungenid: individualScore.int_wertungenid }
    });
    expect(individualAfter.var_riege).toBe('E1');
    expect(individualAfter.int_mannschaftenid).toBeNull();
  });

  it.each([1, null])('reuses an existing team score with round %s when a member is added again', async (round) => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({
      int_veranstaltungenid: event.int_veranstaltungenid
    });

    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_vereineid: club.int_vereineid,
        var_riege: 'T1'
      }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    const existing = await prisma.tfx_wertungen.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_teilnehmerid: participant.int_teilnehmerid,
        int_mannschaftenid: team.int_mannschaftenid,
        int_runde: round,
        int_statusid: 1,
        var_riege: 'T1',
        bol_ak: true
      }
    });

    await request(app)
      .post(`/api/teams/${team.int_mannschaftenid}/members`)
      .send({ participantId: participant.int_teilnehmerid })
      .expect(201);

    const scores = await prisma.tfx_wertungen.findMany({
      where: {
        int_mannschaftenid: team.int_mannschaftenid,
        int_teilnehmerid: participant.int_teilnehmerid
      }
    });
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({ int_wertungenid: existing.int_wertungenid, bol_ak: true });
  });

  it('creates a score with the team squad when updating flags for a legacy member', async () => {
    const event = await TestUtils.createTestEvent({ round: 2 });
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: 'A' }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    await prisma.tfx_man_x_teilnehmer.create({
      data: { int_mannschaftenid: team.int_mannschaftenid, int_teilnehmerid: participant.int_teilnehmerid, int_runde: 2 }
    });
    await request(app).patch(`/api/teams/${team.int_mannschaftenid}/members/${participant.int_teilnehmerid}`)
      .send({ bol_ak: true }).expect(200);
    expect(await prisma.tfx_wertungen.findFirst({ where: { int_mannschaftenid: team.int_mannschaftenid } }))
      .toMatchObject({ int_runde: 2, var_riege: 'A', bol_ak: true });
  });

  it('reads member flags from the matching round instead of another round', async () => {
    const event = await TestUtils.createTestEvent({ round: 2 });
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    await prisma.tfx_man_x_teilnehmer.create({
      data: { int_mannschaftenid: team.int_mannschaftenid, int_teilnehmerid: participant.int_teilnehmerid, int_runde: 2 }
    });
    await prisma.tfx_wertungen.createMany({ data: [
      { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_mannschaftenid: team.int_mannschaftenid, int_statusid: 1, int_runde: 2, bol_ak: true },
      { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_mannschaftenid: team.int_mannschaftenid, int_statusid: 1, int_runde: 1, bol_ak: false }
    ] });
    const response = await request(app).get(`/api/teams/${team.int_mannschaftenid}/members`).expect(200);
    expect(response.body.members[0]).toMatchObject({ int_runde: 2, bol_ak: true });
  });

  it('does not create a membership when the participant does not exist', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({
      int_veranstaltungenid: event.int_veranstaltungenid
    });

    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const team = await prisma.tfx_mannschaften.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_vereineid: club.int_vereineid
      }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);

    await request(app)
      .post(`/api/teams/${team.int_mannschaftenid}/members`)
      .send({ participantId: 2147483647 })
      .expect(400);

    expect(await prisma.tfx_man_x_teilnehmer.count({
      where: { int_mannschaftenid: team.int_mannschaftenid }
    })).toBe(0);
    expect(await prisma.tfx_wertungen.count({
      where: { int_mannschaftenid: team.int_mannschaftenid }
    })).toBe(0);
  });

  it('does not create duplicate members or scores for concurrent registrations', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: null }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    const responses = await Promise.all([1, 2].map(() => request(app)
      .post(`/api/teams/${team.int_mannschaftenid}/members`).send({ participantId: participant.int_teilnehmerid })));
    expect(responses.map(response => response.status).sort()).toEqual([201, 400]);
    expect(await prisma.tfx_man_x_teilnehmer.count({ where: { int_mannschaftenid: team.int_mannschaftenid } })).toBe(1);
    expect(await prisma.tfx_wertungen.count({ where: { int_mannschaftenid: team.int_mannschaftenid } })).toBe(1);
  });

  it('removes an unscored member and its team score while retaining individual scores', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: 'A' }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    const individual = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_statusid: 1 }
    });
    await request(app).post(`/api/teams/${team.int_mannschaftenid}/members`).send({ participantId: participant.int_teilnehmerid }).expect(201);
    await request(app).delete(`/api/teams/${team.int_mannschaftenid}/members/${participant.int_teilnehmerid}`).expect(204);
    expect(await prisma.tfx_wertungen.count({ where: { int_mannschaftenid: team.int_mannschaftenid } })).toBe(0);
    expect(await prisma.tfx_wertungen.findUnique({ where: { int_wertungenid: individual.int_wertungenid } })).not.toBeNull();
  });

  it('refuses to remove a member with recorded scores', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const discipline = await prisma.tfx_disziplinen.findFirstOrThrow();
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: 'A' }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    await request(app).post(`/api/teams/${team.int_mannschaftenid}/members`).send({ participantId: participant.int_teilnehmerid }).expect(201);
    const score = await prisma.tfx_wertungen.findFirstOrThrow({ where: { int_mannschaftenid: team.int_mannschaftenid } });
    await prisma.tfx_wertungen_details.create({
      data: { int_wertungenid: score.int_wertungenid, int_disziplinenid: discipline.int_disziplinenid, rel_leistung: 12 }
    });
    await request(app).delete(`/api/teams/${team.int_mannschaftenid}/members/${participant.int_teilnehmerid}`).expect(409);
    expect(await prisma.tfx_wertungen.findUnique({ where: { int_wertungenid: score.int_wertungenid } })).not.toBeNull();
    expect(await prisma.tfx_man_x_teilnehmer.count({ where: { int_mannschaftenid: team.int_mannschaftenid } })).toBe(1);
  });
});
