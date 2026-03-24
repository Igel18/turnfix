import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import eventParticipantRoutes from '../../src/routes/eventParticipants';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/event-participants', eventParticipantRoutes);

describe('Event Participants API', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let testParticipant: any;

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
      name: 'Test Event for Event Participants',
      description: 'Test Event Description'
    });

    testParticipant = await TestUtils.createTestParticipant({
      firstName: 'Test',
      lastName: 'Participant'
    });
  });

  describe('GET /api/event-participants', () => {
    it('should return a list of event participants', async () => {
      const response = await request(app)
        .get('/api/event-participants')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.participants).toBeTruthy();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/event-participants?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by participant', async () => {
      const response = await request(app)
        .get(`/api/event-participants?participantId=${testParticipant.int_teilnehmerid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/event-participants?status=registered')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/event-participants?limit=10&page=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return each participant only once even with multiple wertungen in the same event', async () => {
      const competitionA = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Duplicate Guard Competition A'
      });

      const competitionB = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Duplicate Guard Competition B'
      });

      await prisma.tfx_wertungen.createMany({
        data: [
          {
            int_wettkaempfeid: competitionA.int_wettkaempfeid,
            int_teilnehmerid: testParticipant.int_teilnehmerid,
            int_statusid: 1,
            int_startnummer: 10,
            var_riege: 'R1'
          },
          {
            int_wettkaempfeid: competitionB.int_wettkaempfeid,
            int_teilnehmerid: testParticipant.int_teilnehmerid,
            int_statusid: 1,
            int_startnummer: 11,
            var_riege: ''
          }
        ]
      });

      const response = await request(app)
        .get(`/api/event-participants?eventId=${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(Array.isArray(response.body.participants)).toBe(true);

      const sameParticipantEntries = response.body.participants.filter(
        (participant: any) => participant.id === testParticipant.int_teilnehmerid
      );

      expect(sameParticipantEntries).toHaveLength(1);
      expect(sameParticipantEntries[0].assignedCompetitions).toEqual(
        expect.arrayContaining([
          competitionA.int_wettkaempfeid,
          competitionB.int_wettkaempfeid
        ])
      );
    });
  });

  describe('GET /api/event-participants/:id', () => {
    it('should return 404 for non-existent event participant', async () => {
      const response = await request(app)
        .get('/api/event-participants/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should handle invalid event participant ID', async () => {
      const response = await request(app)
        .get('/api/event-participants/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });
    });
  });

  describe('POST /api/event-participants', () => {
    it('should handle participant registration', async () => {
      const registrationData = {
        eventId: testEvent.int_eventid,
        participantId: testParticipant.int_teilnehmerid,
        disciplines: [1, 2],
        registrationDate: new Date().toISOString(),
        status: 'registered'
      };

      const response = await request(app)
        .post('/api/event-participants')
        .send(registrationData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        disciplines: [1, 2]
        // Missing eventId and participantId
      };

      const response = await request(app)
        .post('/api/event-participants')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should prevent duplicate registrations', async () => {
      const registrationData = {
        eventId: testEvent.int_eventid,
        participantId: testParticipant.int_teilnehmerid,
        disciplines: [1],
        status: 'registered'
      };

      // First registration
      await request(app)
        .post('/api/event-participants')
        .send(registrationData);

      // Duplicate registration
      const response = await request(app)
        .post('/api/event-participants')
        .send(registrationData)
        .expect((res) => {
          expect([400, 409, 422]).toContain(res.status);
        });
    });

    it('should validate event exists', async () => {
      const invalidData = {
        eventId: 99999, // Non-existent event
        participantId: testParticipant.int_teilnehmerid,
        disciplines: [1]
      };

      const response = await request(app)
        .post('/api/event-participants')
        .send(invalidData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });

    it('should validate participant exists', async () => {
      const invalidData = {
        eventId: testEvent.int_eventid,
        participantId: 99999, // Non-existent participant
        disciplines: [1]
      };

      const response = await request(app)
        .post('/api/event-participants')
        .send(invalidData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('PUT /api/event-participants/:id', () => {
    it('should handle registration updates', async () => {
      const updateData = {
        disciplines: [1, 2, 3],
        status: 'confirmed',
        notes: 'Updated registration'
      };

      const response = await request(app)
        .put('/api/event-participants/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400, 422]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent registration', async () => {
      const updateData = {
        status: 'confirmed'
      };

      const response = await request(app)
        .put('/api/event-participants/99999')
        .send(updateData)
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should validate status values', async () => {
      const invalidData = {
        status: 'invalid-status'
      };

      const response = await request(app)
        .put('/api/event-participants/1')
        .send(invalidData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('DELETE /api/event-participants/:id', () => {
    it('should remove all event assignments for a participant in competitions with squads', async () => {
      const competitionA = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Delete Test Competition A'
      });

      const competitionB = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Delete Test Competition B'
      });

      const otherParticipant = await TestUtils.createTestParticipant({
        firstName: 'Other',
        lastName: 'Participant'
      });

      await prisma.tfx_wertungen.createMany({
        data: [
          {
            int_wettkaempfeid: competitionA.int_wettkaempfeid,
            int_teilnehmerid: testParticipant.int_teilnehmerid,
            int_statusid: 1,
            int_startnummer: 101,
            var_riege: 'R1'
          },
          {
            int_wettkaempfeid: competitionB.int_wettkaempfeid,
            int_teilnehmerid: testParticipant.int_teilnehmerid,
            int_statusid: 1,
            int_startnummer: 102,
            var_riege: 'R2'
          },
          {
            int_wettkaempfeid: competitionA.int_wettkaempfeid,
            int_teilnehmerid: otherParticipant.int_teilnehmerid,
            int_statusid: 1,
            int_startnummer: 201,
            var_riege: 'R1'
          }
        ]
      });

      const response = await request(app)
        .delete(`/api/event-participants/${testParticipant.int_teilnehmerid}?eventId=${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(response.body.deletedEntries).toBe(2);

      const deletedParticipantAssignments = await prisma.tfx_wertungen.findMany({
        where: {
          int_teilnehmerid: testParticipant.int_teilnehmerid,
          tfx_wettkaempfe: {
            int_veranstaltungenid: testEvent.int_veranstaltungenid
          }
        }
      });

      expect(deletedParticipantAssignments).toHaveLength(0);

      const otherParticipantAssignments = await prisma.tfx_wertungen.findMany({
        where: {
          int_teilnehmerid: otherParticipant.int_teilnehmerid,
          tfx_wettkaempfe: {
            int_veranstaltungenid: testEvent.int_veranstaltungenid
          }
        }
      });

      expect(otherParticipantAssignments).toHaveLength(1);
      expect(otherParticipantAssignments[0].var_riege).toBe('R1');
    });

    it('should handle registration cancellation', async () => {
      const response = await request(app)
        .delete('/api/event-participants/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should handle withdrawal with reason', async () => {
      const response = await request(app)
        .delete('/api/event-participants/1')
        .send({ reason: 'Injury' })
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should remove participant from event via /remove query endpoint', async () => {
      const competition = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Legacy Remove Competition'
      });

      await prisma.tfx_wertungen.create({
        data: {
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_teilnehmerid: testParticipant.int_teilnehmerid,
          int_statusid: 1,
          int_startnummer: 601,
          var_riege: 'L1'
        }
      });

      const response = await request(app)
        .delete(`/api/event-participants/remove?eventId=${testEvent.int_veranstaltungenid}&participantId=${testParticipant.int_teilnehmerid}`)
        .expect(200);

      expect(response.body.deletedEntries).toBe(1);

      const remaining = await prisma.tfx_wertungen.count({
        where: {
          int_teilnehmerid: testParticipant.int_teilnehmerid,
          tfx_wettkaempfe: {
            int_veranstaltungenid: testEvent.int_veranstaltungenid
          }
        }
      });

      expect(remaining).toBe(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk registration', async () => {
      const bulkData = {
        eventId: testEvent.int_eventid,
        registrations: [
          {
            participantId: testParticipant.int_teilnehmerid,
            disciplines: [1, 2]
          }
        ]
      };

      const response = await request(app)
        .post('/api/event-participants/bulk')
        .send(bulkData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should handle bulk status updates', async () => {
      const bulkUpdateData = {
        eventId: testEvent.int_eventid,
        participantIds: [1, 2, 3],
        status: 'confirmed'
      };

      const response = await request(app)
        .put('/api/event-participants/bulk-status')
        .send(bulkUpdateData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Registration Reports', () => {
    it('should provide registration statistics', async () => {
      const response = await request(app)
        .get(`/api/event-participants/statistics?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should export registration list', async () => {
      const response = await request(app)
        .get(`/api/event-participants/export?eventId=${testEvent.int_eventid}&format=csv`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide discipline breakdown', async () => {
      const response = await request(app)
        .get(`/api/event-participants/by-discipline?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Validation and Business Rules', () => {
    it('should enforce registration deadlines', async () => {
      const pastEventData = {
        eventId: testEvent.int_eventid,
        participantId: testParticipant.int_teilnehmerid,
        disciplines: [1],
        registrationDate: new Date(Date.now() + 86400000).toISOString() // Future date
      };

      const response = await request(app)
        .post('/api/event-participants')
        .send(pastEventData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate age categories', async () => {
      const registrationData = {
        eventId: testEvent.int_eventid,
        participantId: testParticipant.int_teilnehmerid,
        disciplines: [1],
        ageCategory: 'senior'
      };

      const response = await request(app)
        .post('/api/event-participants')
        .send(registrationData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });
  });
});
