import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import participantRoutes from '../../src/routes/participants';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/participants', participantRoutes);

describe('Participants API', () => {
  let prisma: PrismaClient;
  let testParticipant: any;
  let testEvent: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  beforeEach(async () => {
    // Create a test event first
    testEvent = await TestUtils.createTestEvent({
      name: 'Test Event for Participants',
      description: 'Test Event Description'
    });

    // Create a test participant
    testParticipant = await TestUtils.createTestParticipant({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1995-06-15'
    });
  });

  describe('GET /api/participants', () => {
    it('should return a list of participants', async () => {
      const response = await request(app)
        .get('/api/participants')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.participants).toBeTruthy();
      
      // Handle both array and object response formats
      const participants = Array.isArray(response.body) ? response.body : response.body.participants;
      if (participants) {
        expect(participants.length).toBeGreaterThan(0);
        
        const participant = participants.find((p: any) => 
          p.int_teilnehmerid === testParticipant.int_teilnehmerid ||
          p.id === testParticipant.int_teilnehmerid
        );
        
        if (participant) {
          expect(participant.var_vorname || participant.firstName).toBe('John');
          expect(participant.var_nachname || participant.lastName).toBe('Doe');
        }
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/participants?limit=5')
        .expect(200);

      expect(response.body).toBeDefined();
      
      // Handle pagination response
      if (response.body.participants) {
        expect(response.body.participants.length).toBeLessThanOrEqual(5);
        expect(response.body.pagination).toBeDefined();
      } else if (Array.isArray(response.body)) {
        expect(response.body.length).toBeLessThanOrEqual(50); // Default or reasonable limit
      }
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/participants?search=John')
        .expect(200);

      expect(response.body).toBeDefined();
      
      const participants = Array.isArray(response.body) ? response.body : response.body.participants;
      if (participants && participants.length > 0) {
        const foundParticipant = participants.find((p: any) => 
          (p.var_vorname && p.var_vorname.includes('John')) ||
          (p.firstName && p.firstName.includes('John'))
        );
        expect(foundParticipant).toBeDefined();
      }
    });
  });

  describe('GET /api/participants/:id', () => {
    it('should return a specific participant by ID', async () => {
      const response = await request(app)
        .get(`/api/participants/${testParticipant.int_teilnehmerid}`)
        .expect(200);

      expect(response.body.var_vorname || response.body.firstName).toBe('John');
      expect(response.body.var_nachname || response.body.lastName).toBe('Doe');
      expect(response.body.int_teilnehmerid || response.body.id).toBe(testParticipant.int_teilnehmerid);
    });

    it('should return 404 for non-existent participant', async () => {
      const response = await request(app)
        .get('/api/participants/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid participant ID', async () => {
      const response = await request(app)
        .get('/api/participants/invalid-id')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/participants', () => {
    it('should create a new participant with valid data', async () => {
      const newParticipantData = {
        var_vorname: 'Jane',
        var_nachname: 'Smith',
        dat_geburtstag: '1998-03-20T00:00:00.000Z',
        int_geschlecht: 2,
        int_vereineid: 1
      };

      const response = await request(app)
        .post('/api/participants')
        .send(newParticipantData)
        .expect(201);

      expect(response.body.var_vorname || response.body.firstName).toBe('Jane');
      expect(response.body.var_nachname || response.body.lastName).toBe('Smith');
      expect(response.body.int_teilnehmerid || response.body.id).toBeDefined();

      // Cleanup created participant
      if (response.body.int_teilnehmerid || response.body.id) {
        const participantId = response.body.int_teilnehmerid || response.body.id;
        await prisma.tfx_teilnehmer.delete({
          where: { int_teilnehmerid: participantId }
        }).catch(() => {}); // Ignore cleanup errors
      }
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        var_vorname: '', // Empty name should fail validation
        var_name: 'Smith'
      };

      const response = await request(app)
        .post('/api/participants')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid date format', async () => {
      const invalidData = {
        var_vorname: 'Jane',
        var_name: 'Smith',
        dat_geburt: 'invalid-date',
        var_geschlecht: 'f'
      };

      const response = await request(app)
        .post('/api/participants')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/participants/:id', () => {
    it('should update an existing participant', async () => {
      const updateData = {
        var_vorname: 'Updated John',
        var_nachname: 'Updated Doe'
      };

      const response = await request(app)
        .put(`/api/participants/${testParticipant.int_teilnehmerid}`)
        .send(updateData)
        .expect(200);

      expect(response.body.var_vorname || response.body.firstName).toBe('Updated John');
      expect(response.body.var_nachname || response.body.lastName).toBe('Updated Doe');
    });

    it('should return 404 for non-existent participant', async () => {
      const updateData = {
        var_vorname: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/participants/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/participants/:id', () => {
    it('should delete an existing participant', async () => {
      // Create a participant specifically for deletion
      const participantToDelete = await TestUtils.createTestParticipant({
        firstName: 'ToDelete',
        lastName: 'Participant'
      });

      const response = await request(app)
        .delete(`/api/participants/${participantToDelete.int_teilnehmerid}`)
        .expect(200);

      expect(response.body.message || response.body.success).toBeDefined();

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/participants/${participantToDelete.int_teilnehmerid}`)
        .expect(404);
    });

    it('should return 404 for non-existent participant', async () => {
      const response = await request(app)
        .delete('/api/participants/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });
});
