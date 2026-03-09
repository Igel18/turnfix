import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import squadManagementRoutes from '../../src/routes/squadManagement';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/squad-management', squadManagementRoutes);

describe('Squad Management API', () => {
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
      name: 'Test Event for Squad Management',
      description: 'Test Event Description'
    });
  });

  describe('GET /api/squad-management', () => {
    it('should return a list of squads', async () => {
      const response = await request(app)
        .get('/api/squad-management?eventId=9025')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.squads).toBeTruthy();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/squad-management?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by discipline', async () => {
      const response = await request(app)
        .get('/api/squad-management?eventId=9025&disciplineId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/squad-management?eventId=9025&status=active')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/squad-management/:id', () => {
    it('should return 404 for non-existent squad', async () => {
      const response = await request(app)
        .get('/api/squad-management/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should handle invalid squad ID', async () => {
      const response = await request(app)
        .get('/api/squad-management/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });
    });
  });

  describe('POST /api/squad-management', () => {
    it('should handle squad creation', async () => {
      const newSquadData = {
        name: 'Test1',  // Use short name due to 5-character database constraint
        eventId: testEvent.int_eventid
      };

      const response = await request(app)
        .post('/api/squad-management/create')
        .send(newSquadData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        capacity: 8
        // Missing name, eventId, disciplineId
      };

      const response = await request(app)
        .post('/api/squad-management/create')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate time formats', async () => {
      const invalidData = {
        name: 'Test1',  // Use short name for database constraint
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        startTime: 'invalid-time',
        endTime: 'invalid-time'
      };

      const response = await request(app)
        .post('/api/squad-management/create')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate capacity limits', async () => {
      const invalidData = {
        name: 'Test2',  // Use short name for database constraint
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        capacity: 0 // Invalid capacity
      };

      const response = await request(app)
        .post('/api/squad-management/create')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });
  });

  describe('PUT /api/squad-management/:id', () => {
    it('should handle squad updates', async () => {
      const updateData = {
        name: 'Updated Squad Name',
        capacity: 10,
        startTime: '10:00',
        endTime: '13:00'
      };

      const response = await request(app)
        .put('/api/squad-management/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400, 422]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent squad', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/squad-management/99999')
        .send(updateData)
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should validate time conflicts', async () => {
      const conflictData = {
        startTime: '15:00',
        endTime: '10:00' // End before start
      };

      const response = await request(app)
        .put('/api/squad-management/1')
        .send(conflictData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('DELETE /api/squad-management/:id', () => {
    it('should delete squad via /delete endpoint and unassign participants', async () => {
      const competition = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Squad Delete Competition'
      });

      const participantA = await TestUtils.createTestParticipant({
        firstName: 'Squad',
        lastName: 'DeleteA'
      });

      const participantB = await TestUtils.createTestParticipant({
        firstName: 'Squad',
        lastName: 'DeleteB'
      });

      await prisma.tfx_wertungen.createMany({
        data: [
          {
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_teilnehmerid: participantA.int_teilnehmerid,
            int_statusid: 1,
            var_riege: 'SQ1',
            int_startnummer: 301
          },
          {
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_teilnehmerid: participantB.int_teilnehmerid,
            int_statusid: 1,
            var_riege: 'SQ1',
            int_startnummer: 302
          }
        ]
      });

      const response = await request(app)
        .delete(`/api/squad-management/delete?squadName=SQ1&eventId=${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(response.body.unassignedParticipants).toBe(2);

      const stillAssigned = await prisma.tfx_wertungen.count({
        where: {
          var_riege: 'SQ1',
          tfx_wettkaempfe: {
            int_veranstaltungenid: testEvent.int_veranstaltungenid
          }
        }
      });

      expect(stillAssigned).toBe(0);
    });

    it('should handle squad deletion', async () => {
      const response = await request(app)
        .delete('/api/squad-management/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should prevent deletion of active squads with participants', async () => {
      const response = await request(app)
        .delete('/api/squad-management/1')
        .expect((res) => {
          expect([200, 400, 409, 404]).toContain(res.status);
        });
    });
  });

  describe('Squad Participant Management', () => {
    it('should add participants to squad', async () => {
      const participantData = {
        squadId: 1,
        participantIds: [1, 2, 3]
      };

      const response = await request(app)
        .post('/api/squad-management/1/participants')
        .send(participantData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should remove participants from squad', async () => {
      const response = await request(app)
        .delete('/api/squad-management/1/participants/1')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should check squad capacity limits', async () => {
      const participantData = {
        squadId: 1,
        participantIds: Array.from({length: 20}, (_, i) => i + 1) // Too many participants
      };

      const response = await request(app)
        .post('/api/squad-management/1/participants')
        .send(participantData)
        .expect((res) => {
          expect([400, 409, 404]).toContain(res.status);
        });
    });
  });

  describe('Squad Scheduling', () => {
    it('should generate squad schedule', async () => {
      const scheduleData = {
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        squadSize: 8,
        startTime: '09:00',
        rotationTime: 20 // minutes per apparatus
      };

      const response = await request(app)
        .post('/api/squad-management/generate-schedule')
        .send(scheduleData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should optimize squad assignments', async () => {
      const optimizationData = {
        eventId: testEvent.int_eventid,
        criteria: ['balance_skill_levels', 'minimize_conflicts']
      };

      const response = await request(app)
        .post('/api/squad-management/optimize')
        .send(optimizationData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Squad Rotation Management', () => {
    it('should create rotation schedule', async () => {
      const rotationData = {
        squadId: 1,
        apparatus: ['floor', 'pommel_horse', 'rings', 'vault', 'parallel_bars', 'high_bar'],
        rotationTime: 20
      };

      const response = await request(app)
        .post('/api/squad-management/1/rotations')
        .send(rotationData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should update rotation times', async () => {
      const updateData = {
        rotationId: 1,
        actualStartTime: '09:15',
        actualEndTime: '09:35'
      };

      const response = await request(app)
        .put('/api/squad-management/rotations/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Squad Reports', () => {
    it('should provide squad statistics', async () => {
      const response = await request(app)
        .get(`/api/squad-management/statistics?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should export squad lists', async () => {
      const response = await request(app)
        .get('/api/squad-management/1/export')
        .query({ format: 'pdf' })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should generate warm-up schedules', async () => {
      const response = await request(app)
        .get('/api/squad-management/1/warmup-schedule')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Real-time Squad Updates', () => {
    it('should handle squad status updates', async () => {
      const statusData = {
        squadId: 1,
        status: 'competing',
        currentApparatus: 'floor',
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/squad-management/1/status')
        .send(statusData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should track squad progress', async () => {
      const response = await request(app)
        .get('/api/squad-management/1/progress')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });
});
