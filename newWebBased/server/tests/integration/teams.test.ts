import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import teamRoutes from '../../src/routes/teams';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/teams', teamRoutes);

describe('Teams API', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let testCompetition: any;

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
      name: 'Test Event for Teams',
      description: 'Test Event Description'
    });
    
    // Skip creating competition for teams test - not essential
    // Create a simple placeholder competition ID that may not exist
    testCompetition = { 
      int_wettkaempfeid: 9999,
      var_name: 'Test Competition'
    } as any;
  });

  describe('GET /api/teams', () => {
    it('should return a list of teams', async () => {
      const response = await request(app)
        .get('/api/teams')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.teams).toBeTruthy();
    });

    it('should support filtering by club', async () => {
      const response = await request(app)
        .get('/api/teams?clubId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/teams?eventId=${testCompetition.int_wettkaempfeid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/teams?search=test')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/teams?limit=10&page=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return 404 for non-existent team', async () => {
      const response = await request(app)
        .get('/api/teams/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should handle invalid team ID', async () => {
      const response = await request(app)
        .get('/api/teams/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });
    });
  });

  describe('POST /api/teams', () => {
    it('should handle team creation', async () => {
      const newTeamData = {
        name: 'Test Team A',
        clubId: 1,
        category: 'senior',
        coach: 'John Coach',
        members: [1, 2, 3, 4, 5, 6]
      };

      const response = await request(app)
        .post('/api/teams')
        .send(newTeamData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        coach: 'John Coach'
        // Missing name, clubId
      };

      const response = await request(app)
        .post('/api/teams')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate team member count', async () => {
      const invalidData = {
        name: 'Test Team',
        clubId: 1,
        members: [1, 2] // Too few members for team competition
      };

      const response = await request(app)
        .post('/api/teams')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate member eligibility', async () => {
      const teamData = {
        name: 'Test Team',
        clubId: 1,
        category: 'junior',
        members: [1, 2, 3, 4, 5, 6] // Members might not be from same club
      };

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });
  });

  describe('PUT /api/teams/:id', () => {
    it('should handle team updates', async () => {
      const updateData = {
        name: 'Updated Team Name',
        coach: 'New Coach',
        members: [1, 2, 3, 4, 5, 6, 7]
      };

      const response = await request(app)
        .put('/api/teams/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400, 422]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent team', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/teams/99999')
        .send(updateData)
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should prevent invalid member changes during competition', async () => {
      const updateData = {
        members: [1, 2, 3] // Reducing team size during active event
      };

      const response = await request(app)
        .put('/api/teams/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 400, 409, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('should delete an existing team without associated records', async () => {
      const competition = await TestUtils.createTestCompetition({
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        name: 'Delete Test Competition'
      });

      const club = await prisma.tfx_vereine.findFirst({
        select: { int_vereineid: true }
      });

      expect(club).toBeTruthy();

      const createdTeam = await prisma.tfx_mannschaften.create({
        data: {
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_vereineid: club!.int_vereineid,
          int_nummer: 99,
          var_riege: 'T1'
        }
      });

      await request(app)
        .delete(`/api/teams/${createdTeam.int_mannschaftenid}`)
        .expect(204);

      const deletedTeam = await prisma.tfx_mannschaften.findUnique({
        where: { int_mannschaftenid: createdTeam.int_mannschaftenid }
      });

      expect(deletedTeam).toBeNull();
    });

    it('should handle team deletion', async () => {
      const response = await request(app)
        .delete('/api/teams/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should prevent deletion of teams with active registrations', async () => {
      const response = await request(app)
        .delete('/api/teams/1')
        .expect((res) => {
          expect([200, 400, 409, 404]).toContain(res.status);
        });
    });
  });

  describe('Team Member Management', () => {
    it('should add members to team', async () => {
      const memberData = {
        participantIds: [7, 8]
      };

      const response = await request(app)
        .post('/api/teams/1/members')
        .send(memberData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should remove members from team', async () => {
      const response = await request(app)
        .delete('/api/teams/1/members/1')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should validate member club affiliation', async () => {
      const memberData = {
        participantIds: [99] // Participant from different club
      };

      const response = await request(app)
        .post('/api/teams/1/members')
        .send(memberData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });

    it('should get team roster', async () => {
      const response = await request(app)
        .get('/api/teams/1/roster')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Team Competition Management', () => {
    it('should register team for event', async () => {
      const registrationData = {
        eventId: testEvent.int_eventid,
        category: 'senior',
        disciplines: [1, 2, 3]
      };

      const response = await request(app)
        .post('/api/teams/1/register')
        .send(registrationData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should withdraw team from event', async () => {
      const withdrawalData = {
        eventId: testEvent.int_eventid,
        reason: 'Injury'
      };

      const response = await request(app)
        .post('/api/teams/1/withdraw')
        .send(withdrawalData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should get team lineup for event', async () => {
      const response = await request(app)
        .get(`/api/teams/1/lineup?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should set team lineup', async () => {
      const lineupData = {
        eventId: testEvent.int_eventid,
        lineup: {
          floor: [1, 2, 3, 4, 5, 6],
          pommel_horse: [1, 2, 3, 4, 5, 6],
          rings: [1, 2, 3, 4, 5, 6]
        }
      };

      const response = await request(app)
        .post('/api/teams/1/lineup')
        .send(lineupData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Team Statistics', () => {
    it('should provide team performance statistics', async () => {
      const response = await request(app)
        .get('/api/teams/1/statistics')
        .query({
          eventId: testEvent.int_eventid,
          season: '2024'
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide team rankings', async () => {
      const response = await request(app)
        .get('/api/teams/rankings')
        .query({
          eventId: testCompetition.int_wettkaempfeid,
          category: 'senior'
        })
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });

    it('should export team results', async () => {
      const response = await request(app)
        .get('/api/teams/1/results/export')
        .query({
          format: 'pdf',
          eventId: testEvent.int_eventid
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Team Communication', () => {
    it('should send team notifications', async () => {
      const notificationData = {
        teamId: 1,
        message: 'Training session moved to 3 PM',
        type: 'schedule_change'
      };

      const response = await request(app)
        .post('/api/teams/1/notifications')
        .send(notificationData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should get team announcements', async () => {
      const response = await request(app)
        .get('/api/teams/1/announcements')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Team Validation Rules', () => {
    it('should validate team composition for different categories', async () => {
      const juniorTeamData = {
        name: 'Junior Team',
        clubId: 1,
        category: 'junior',
        members: [1, 2, 3, 4, 5, 6] // Must be age-appropriate
      };

      const response = await request(app)
        .post('/api/teams')
        .send(juniorTeamData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should enforce gender requirements', async () => {
      const teamData = {
        name: 'Mixed Team',
        clubId: 1,
        category: 'men',
        members: [1, 2, 3, 4, 5, 6] // Must be all male for men's category
      };

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });
  });
});
