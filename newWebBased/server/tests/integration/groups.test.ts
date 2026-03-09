import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import groupRoutes from '../../src/routes/groups';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/groups', groupRoutes);

describe('Groups API', () => {
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
    await prisma.tfx_gruppen.deleteMany({
      where: {
        var_name: {
          startsWith: 'E2E_Group_Delete_'
        }
      }
    }).catch(() => {});

    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    testEvent = await TestUtils.createTestEvent({
      name: 'Test Event for Groups',
      description: 'Group delete flow test event'
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('should delete a group without associated scores', async () => {
      const club = await prisma.tfx_vereine.findFirst({
        select: { int_vereineid: true }
      });

      expect(club).toBeTruthy();

      const group = await prisma.tfx_gruppen.create({
        data: {
          int_vereineid: club!.int_vereineid,
          var_name: `E2E_Group_Delete_${Date.now()}`
        }
      });

      await request(app)
        .delete(`/api/groups/${group.int_gruppenid}`)
        .expect(204);

      const deleted = await prisma.tfx_gruppen.findUnique({
        where: { int_gruppenid: group.int_gruppenid }
      });

      expect(deleted).toBeNull();
    });

    it('should reject deleting a group with existing scores', async () => {
      const club = await prisma.tfx_vereine.findFirst({
        select: { int_vereineid: true }
      });

      expect(club).toBeTruthy();

      const group = await prisma.tfx_gruppen.create({
        data: {
          int_vereineid: club!.int_vereineid,
          var_name: `E2E_Group_Delete_${Date.now()}_WithScores`
        }
      });

      const competition = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Group Delete Protection Competition'
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'Group',
        lastName: 'Member'
      });

      await prisma.tfx_wertungen.create({
        data: {
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_teilnehmerid: participant.int_teilnehmerid,
          int_gruppenid: group.int_gruppenid,
          int_statusid: 1,
          int_startnummer: 401
        }
      });

      const response = await request(app)
        .delete(`/api/groups/${group.int_gruppenid}`)
        .expect(400);

      expect(response.body.error).toContain('Cannot delete group with existing scores');

      const stillExists = await prisma.tfx_gruppen.findUnique({
        where: { int_gruppenid: group.int_gruppenid }
      });

      expect(stillExists).toBeTruthy();
    });
  });
});
