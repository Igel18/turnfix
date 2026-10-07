import { afterAll, afterEach, beforeAll, beforeEach } from '@jest/globals';
import type { Router } from 'express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';

export function createTimePlanningTestContext(router: Router) {
  const app = express();
  app.use(express.json());
  app.use('/api/time-planning', router);

  let prisma: PrismaClient;
  let event: any;
  let competition: any;

  beforeAll(() => {
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
    event = await TestUtils.createTestEvent({ name: `Test Event TP ${Date.now()}` });
    competition = await TestUtils.createTestCompetition({
      name: `Test Competition TP ${Date.now()}`,
      int_veranstaltungenid: event.int_veranstaltungenid,
    });
  });

  async function createDiscipline(name: string) {
    const sport = await prisma.tfx_sport.findFirstOrThrow();
    const discipline = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport.int_sportid,
        var_name: `${name} ${Date.now()}`,
        var_kurz1: name.slice(0, 6),
      },
    });
    TestUtils.trackCreated('disciplines', discipline.int_disziplinenid);
    return discipline;
  }

  async function createSquadScore(squadName: string, round = 1) {
    const status = await prisma.tfx_status.findFirstOrThrow();
    return prisma.tfx_wertungen.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_statusid: status.int_statusid,
        var_riege: squadName,
        int_runde: round,
      },
    });
  }

  return {
    app,
    get prisma() { return prisma; },
    get event() { return event; },
    get competition() { return competition; },
    createDiscipline,
    createSquadScore,
  };
}