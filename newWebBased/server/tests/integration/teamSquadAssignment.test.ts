import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import squadRoutes from '../../src/routes/squadManagement';
import teamRoutes from '../../src/routes/teams';
import scoringRoutes from '../../src/routes/scoresScoring';
import juryResultsRoutes from '../../src/routes/juryResults';
import eventParticipantsRoutes from '../../src/routes/eventParticipants';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/squad-management', squadRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/scores', scoringRoutes);
app.use('/api/jury-results', juryResultsRoutes);
app.use('/api/event-participants', eventParticipantsRoutes);

describe('Team squad assignment', () => {
  let prisma: PrismaClient;

  beforeAll(() => { prisma = TestUtils.getPrisma(); });
  afterEach(async () => { await TestUtils.cleanupCreatedRecords(); });
  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('assigns a whole legacy team, repairs missing team scores and leaves individual scores alone', async () => {
    const event = await TestUtils.createTestEvent();
    const otherEvent = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const otherCompetition = await TestUtils.createTestCompetition({ int_veranstaltungenid: otherEvent.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const second = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: null }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    await prisma.tfx_man_x_teilnehmer.createMany({
      data: [participant, second].map(p => ({
        int_mannschaftenid: team.int_mannschaftenid, int_teilnehmerid: p.int_teilnehmerid, int_runde: 1
      }))
    });
    const existing = await prisma.tfx_wertungen.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid, int_mannschaftenid: team.int_mannschaftenid,
        int_teilnehmerid: participant.int_teilnehmerid, int_statusid: 1, var_riege: null, bol_ak: true
      }
    });
    const individual = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_statusid: 1, var_riege: 'I1' }
    });
    const other = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: otherCompetition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_statusid: 1, var_riege: 'O1' }
    });

    const teams = await request(app).get(`/api/squad-management/teams?eventId=${event.int_veranstaltungenid}`).expect(200);
    expect(teams.body.teams).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: team.int_mannschaftenid, needsSync: true, members: expect.arrayContaining([expect.objectContaining({ id: second.int_teilnehmerid })]) })
    ]));
    await request(app).post('/api/squad-management/create').send({ eventId: event.int_veranstaltungenid, name: 'T1' }).expect(201);
    await request(app).put('/api/squad-management/team').send({ eventId: otherEvent.int_veranstaltungenid, teamId: team.int_mannschaftenid, squadName: 'T1' }).expect(404);
    await request(app).put('/api/squad-management/team').send({ eventId: event.int_veranstaltungenid, teamId: team.int_mannschaftenid, squadName: 'T1' }).expect(200);

    expect(await prisma.tfx_mannschaften.findUniqueOrThrow({ where: { int_mannschaftenid: team.int_mannschaftenid } }))
      .toMatchObject({ var_riege: 'T1' });
    const scores = await prisma.tfx_wertungen.findMany({ where: { int_mannschaftenid: team.int_mannschaftenid } });
    expect(scores).toHaveLength(2);
    expect(scores.find(s => s.int_wertungenid === existing.int_wertungenid)).toMatchObject({ var_riege: 'T1', bol_ak: true });
    expect(scores.find(s => s.int_teilnehmerid === second.int_teilnehmerid)).toMatchObject({ var_riege: 'T1', int_runde: 1 });
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: individual.int_wertungenid } })).var_riege).toBe('I1');
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: other.int_wertungenid } })).var_riege).toBe('O1');
    const squads = await request(app).get(`/api/squad-management?eventId=${event.int_veranstaltungenid}`).expect(200);
    const updatedTeams = await request(app).get(`/api/squad-management/teams?eventId=${event.int_veranstaltungenid}`).expect(200);
    expect(updatedTeams.body.teams).toEqual(expect.arrayContaining([expect.objectContaining({ id: team.int_mannschaftenid, needsSync: false })]));
    expect(squads.body.squads.find((s: { name: string }) => s.name === 'T1').participants)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: second.int_teilnehmerid })]));
    await request(app).delete(`/api/squad-management/unassign?eventId=${event.int_veranstaltungenid}&participantId=${participant.int_teilnehmerid}`).expect(200);
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: existing.int_wertungenid } })).var_riege).toBe('T1');
    await request(app).post('/api/squad-management/auto-assign/apply').send({
      eventId: event.int_veranstaltungenid,
      clearExisting: true,
      squads: [{ name: 'I2', participantIds: [participant.int_teilnehmerid] }]
    }).expect(200);
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: existing.int_wertungenid } })).var_riege).toBe('T1');
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: individual.int_wertungenid } })).var_riege).toBe('I2');

    await request(app).put('/api/squad-management/update').send({
      eventId: event.int_veranstaltungenid, oldSquadName: 'T1', newSquadName: 'T2'
    }).expect(200);
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: existing.int_wertungenid } })).var_riege).toBe('T2');
    expect((await prisma.tfx_mannschaften.findUniqueOrThrow({ where: { int_mannschaftenid: team.int_mannschaftenid } })).var_riege).toBe('T2');

    await request(app).put('/api/squad-management/team').send({ eventId: event.int_veranstaltungenid, teamId: team.int_mannschaftenid, squadName: null }).expect(200);
    expect((await prisma.tfx_mannschaften.findUniqueOrThrow({ where: { int_mannschaftenid: team.int_mannschaftenid } })).var_riege).toBeNull();
    expect(await prisma.tfx_wertungen.count({ where: { int_mannschaftenid: team.int_mannschaftenid, var_riege: null } })).toBe(2);
  });

  it('persists a squad assigned to an empty team and synchronizes rename and deletion', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: null }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    await request(app).post('/api/squad-management/create').send({ eventId: event.int_veranstaltungenid, name: 'A' }).expect(201);
    await request(app).put('/api/squad-management/team').send({ eventId: event.int_veranstaltungenid, teamId: team.int_mannschaftenid, squadName: 'A' }).expect(200);
    const squads = await request(app).get(`/api/squad-management?eventId=${event.int_veranstaltungenid}`).expect(200);
    expect(squads.body.squads).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'A', isVirtual: false })]));
    await request(app).put('/api/squad-management/update').send({ eventId: event.int_veranstaltungenid, oldSquadName: 'A', newSquadName: 'B' }).expect(200);
    expect((await prisma.tfx_mannschaften.findUniqueOrThrow({ where: { int_mannschaftenid: team.int_mannschaftenid } })).var_riege).toBe('B');
    await request(app).delete(`/api/squad-management/delete?eventId=${event.int_veranstaltungenid}&squadName=B`).expect(200);
    expect((await prisma.tfx_mannschaften.findUniqueOrThrow({ where: { int_mannschaftenid: team.int_mannschaftenid } })).var_riege).toBeNull();
  });

  it('keeps team scores synchronized when a team is updated through the teams API', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, int_nummer: 5, var_riege: 'A' }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    const score = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_mannschaftenid: team.int_mannschaftenid,
        int_teilnehmerid: participant.int_teilnehmerid, int_statusid: 1, var_riege: 'A' }
    });
    await request(app).put(`/api/teams/${team.int_mannschaftenid}`).send({ riege: 'B' }).expect(200);
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: score.int_wertungenid } })).var_riege).toBe('B');
    expect((await prisma.tfx_mannschaften.findUniqueOrThrow({ where: { int_mannschaftenid: team.int_mannschaftenid } })).int_nummer).toBe(5);
    const otherCompetition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    await request(app).put(`/api/teams/${team.int_mannschaftenid}`).send({ competitionId: otherCompetition.int_wettkaempfeid }).expect(409);
    expect((await prisma.tfx_wertungen.findUniqueOrThrow({ where: { int_wertungenid: score.int_wertungenid } })).int_wettkaempfeid).toBe(competition.int_wettkaempfeid);
  });

  it('can enter a score for a team member after assigning its squad', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const discipline = await prisma.tfx_disziplinen.findFirstOrThrow();
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_disziplinenid: discipline.int_disziplinenid }
    });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: null }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    await request(app).post(`/api/teams/${team.int_mannschaftenid}/members`).send({ participantId: participant.int_teilnehmerid }).expect(201);
    await request(app).post('/api/squad-management/create').send({ eventId: event.int_veranstaltungenid, name: 'S1' }).expect(201);
    await request(app).put('/api/squad-management/team').send({ eventId: event.int_veranstaltungenid, teamId: team.int_mannschaftenid, squadName: 'S1' }).expect(200);
    await request(app).post('/api/scores/save-value').send({
      competitionId: competition.int_wettkaempfeid, participantId: participant.int_teilnehmerid,
      disciplineId: discipline.int_disziplinenid, score: 12.5
    }).expect(200);
    const score = await prisma.tfx_wertungen.findFirstOrThrow({
      where: { int_mannschaftenid: team.int_mannschaftenid, int_teilnehmerid: participant.int_teilnehmerid },
      include: { tfx_wertungen_details: true }
    });
    expect(score.var_riege).toBe('S1');
    expect(score.tfx_wertungen_details).toEqual(expect.arrayContaining([expect.objectContaining({ rel_leistung: 12.5 })]));
  });

  it('requires an explicit evaluation when individual and team evaluations share a competition', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const discipline = await prisma.tfx_disziplinen.findFirstOrThrow();
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_disziplinenid: discipline.int_disziplinenid }
    });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const other = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    const individual = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_statusid: 1, var_riege: 'I1' }
    });
    const teamScore = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_mannschaftenid: team.int_mannschaftenid, int_statusid: 1, var_riege: 'T1' }
    });
    const otherScore = await prisma.tfx_wertungen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: other.int_teilnehmerid, int_statusid: 1 }
    });
    const payload = {
      competitionId: competition.int_wettkaempfeid, participantId: participant.int_teilnehmerid,
      disciplineId: discipline.int_disziplinenid
    };
    await request(app).post('/api/scores/save-value').send({ ...payload, score: 11 }).expect(409);
    await request(app).post('/api/scores/create-wertung').send(payload).expect(409);
    await request(app).post('/api/scores/calculate-final').send(payload).expect(409);
    await request(app).post('/api/scores/save-value').send({ ...payload, wertungenId: otherScore.int_wertungenid, score: 11 }).expect(400);
    await request(app).post('/api/scores/save-value').send({ ...payload, wertungenId: teamScore.int_wertungenid, score: 12.5 }).expect(200);
    await request(app).post('/api/scores/save-value').send({ ...payload, wertungenId: individual.int_wertungenid, score: 9.5 }).expect(200);
    await request(app).post('/api/scores/create-wertung').send({ ...payload, wertungenId: teamScore.int_wertungenid })
      .expect(200).expect(res => expect(res.body.wertungenId).toBe(teamScore.int_wertungenid));
    const details = await prisma.tfx_wertungen_details.findMany({
      where: { int_wertungenid: { in: [individual.int_wertungenid, teamScore.int_wertungenid] } }
    });
    expect(details).toEqual(expect.arrayContaining([
      expect.objectContaining({ int_wertungenid: individual.int_wertungenid, rel_leistung: 9.5 }),
      expect.objectContaining({ int_wertungenid: teamScore.int_wertungenid, rel_leistung: 12.5 })
    ]));
    const field = await prisma.tfx_disziplinen_felder.findFirstOrThrow({
      where: { int_disziplinenid: discipline.int_disziplinenid, bol_endwert: false }
    });
    const fieldPayload = {
      participantId: participant.int_teilnehmerid, eventId: event.int_veranstaltungenid,
      competitionId: competition.int_wettkaempfeid, disciplineFieldId: field.int_disziplinen_felderid,
      performance: 4, attempt: 1
    };
    await request(app).post('/api/jury-results/save-field-score').send(fieldPayload).expect(409);
    await request(app).post('/api/jury-results/save-field-score').send({ ...fieldPayload, wertungenId: otherScore.int_wertungenid }).expect(400);
    await request(app).post('/api/jury-results/save-field-score').send({ ...fieldPayload, wertungenId: teamScore.int_wertungenid }).expect(200);
    await prisma.tfx_jury_results.create({
      data: { int_wertungenid: individual.int_wertungenid, int_disziplinen_felderid: field.int_disziplinen_felderid, int_versuch: 1, rel_leistung: 2 }
    });
    const juryResults = await prisma.tfx_jury_results.findMany({ where: { int_wertungenid: { in: [individual.int_wertungenid, teamScore.int_wertungenid] } } });
    expect(juryResults).toEqual(expect.arrayContaining([expect.objectContaining({ int_wertungenid: teamScore.int_wertungenid, rel_leistung: 4 })]));
    const readFields = await request(app).get(`/api/jury-results?eventId=${event.int_veranstaltungenid}&wertungenId=${teamScore.int_wertungenid}`).expect(200);
    expect(readFields.body.results).toHaveLength(1);
    expect(readFields.body.results[0]).toMatchObject({ wertungenId: teamScore.int_wertungenid, performance: 4 });
    const participants = await request(app).get(`/api/event-participants?eventId=${event.int_veranstaltungenid}`).expect(200);
    expect(participants.body.participants.find((p: { id: number }) => p.id === participant.int_teilnehmerid).evaluations)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: individual.int_wertungenid, squadName: 'I1', teamId: null }),
        expect.objectContaining({ id: teamScore.int_wertungenid, squadName: 'T1', teamId: team.int_mannschaftenid })
      ]));
  });

  it('does not duplicate a participant who has both an individual and a team score in one squad', async () => {
    const event = await TestUtils.createTestEvent();
    const competition = await TestUtils.createTestCompetition({ int_veranstaltungenid: event.int_veranstaltungenid });
    const club = await prisma.tfx_vereine.findFirstOrThrow();
    const participant = await TestUtils.createTestParticipant({ clubId: club.int_vereineid });
    const team = await prisma.tfx_mannschaften.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_vereineid: club.int_vereineid, var_riege: 'A' }
    });
    TestUtils.trackCreated('teams', team.int_mannschaftenid);
    await prisma.tfx_wertungen.createMany({
      data: [
        { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_statusid: 1, var_riege: 'A', int_startnummer: 11 },
        { int_wettkaempfeid: competition.int_wettkaempfeid, int_teilnehmerid: participant.int_teilnehmerid, int_mannschaftenid: team.int_mannschaftenid, int_statusid: 1, var_riege: 'A', int_startnummer: 12 }
      ]
    });
    const response = await request(app).get(`/api/squad-management?eventId=${event.int_veranstaltungenid}`).expect(200);
    const matching = response.body.squads.find((s: { name: string }) => s.name === 'A').participants
      .filter((p: { id: number }) => p.id === participant.int_teilnehmerid);
    expect(matching).toHaveLength(1);
    expect(matching[0].teamOnly).toBe(false);
    expect(matching[0].evaluations).toEqual(expect.arrayContaining([
      expect.objectContaining({ competitionId: competition.int_wettkaempfeid, teamId: null }),
      expect.objectContaining({ competitionId: competition.int_wettkaempfeid, teamId: team.int_mannschaftenid })
    ]));
  });
});
