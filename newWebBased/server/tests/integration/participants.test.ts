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

  afterEach(async () => {
    // Clean up the test participant and event created in beforeEach
    await TestUtils.cleanupCreatedRecords();
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

  describe('Birthdate (dat_geburtstag) full date preservation - Point 76', () => {
    it('should preserve full date (day + month + year) when creating a participant via POST', async () => {
      // TDD: The user reports that only the year is saved, not day & month
      const newParticipant = {
        var_vorname: 'BirthdateTest',
        var_nachname: 'CreateFullDate',
        dat_geburtstag: '2012-05-15',  // May 15, 2012 — the format from <input type="date">
        int_geschlecht: 2,
        int_vereineid: 1
      };

      const createResponse = await request(app)
        .post('/api/participants')
        .send(newParticipant)
        .expect(201);

      const createdId = createResponse.body.int_teilnehmerid || createResponse.body.id;
      expect(createdId).toBeDefined();

      // Read back via GET and verify full date is preserved
      const getResponse = await request(app)
        .get(`/api/participants/${createdId}`)
        .expect(200);

      const returnedDate = getResponse.body.dat_geburtstag;
      expect(returnedDate).toBeDefined();

      const parsedDate = new Date(returnedDate);
      expect(parsedDate.getUTCFullYear()).toBe(2012);
      expect(parsedDate.getUTCMonth() + 1).toBe(5);  // May = month 5
      expect(parsedDate.getUTCDate()).toBe(15);        // Day 15

      // Also verify bool_nur_jahr is explicitly false (not the DB default of true)
      expect(getResponse.body.bool_nur_jahr).toBe(false);

      // Cleanup
      await request(app).delete(`/api/participants/${createdId}`);
    });

    it('should preserve full date when creating with ISO format string', async () => {
      const newParticipant = {
        var_vorname: 'BirthdateTest',
        var_nachname: 'ISOFormat',
        dat_geburtstag: '1998-03-20T00:00:00.000Z',  // ISO format from Date.toISOString()
        int_geschlecht: 1,
        int_vereineid: 1
      };

      const createResponse = await request(app)
        .post('/api/participants')
        .send(newParticipant)
        .expect(201);

      const createdId = createResponse.body.int_teilnehmerid || createResponse.body.id;

      const getResponse = await request(app)
        .get(`/api/participants/${createdId}`)
        .expect(200);

      const parsedDate = new Date(getResponse.body.dat_geburtstag);
      expect(parsedDate.getUTCFullYear()).toBe(1998);
      expect(parsedDate.getUTCMonth() + 1).toBe(3);   // March
      expect(parsedDate.getUTCDate()).toBe(20);

      // Cleanup
      await request(app).delete(`/api/participants/${createdId}`);
    });

    it('should preserve full date when updating birthdate via PUT', async () => {
      // Create participant first
      const createResponse = await request(app)
        .post('/api/participants')
        .send({
          var_vorname: 'BirthdateTest',
          var_nachname: 'UpdateDate',
          dat_geburtstag: '2010-01-01',
          int_geschlecht: 1,
          int_vereineid: 1
        })
        .expect(201);

      const createdId = createResponse.body.int_teilnehmerid || createResponse.body.id;

      // Update with a new full date
      const updateResponse = await request(app)
        .put(`/api/participants/${createdId}`)
        .send({
          dat_geburtstag: '2012-11-23'  // November 23, 2012
        })
        .expect(200);

      // Read back and verify
      const getResponse = await request(app)
        .get(`/api/participants/${createdId}`)
        .expect(200);

      const parsedDate = new Date(getResponse.body.dat_geburtstag);
      expect(parsedDate.getUTCFullYear()).toBe(2012);
      expect(parsedDate.getUTCMonth() + 1).toBe(11);  // November
      expect(parsedDate.getUTCDate()).toBe(23);

      // Cleanup
      await request(app).delete(`/api/participants/${createdId}`);
    });

    it('should set bool_nur_jahr=false when creating with full date from form', async () => {
      // When a user enters a full date in the <input type="date"> field,
      // bool_nur_jahr must be set to false, not the DB default of true
      const newParticipant = {
        var_vorname: 'BirthdateTest',
        var_nachname: 'NurJahrFalse',
        dat_geburtstag: '2015-08-03',
        int_geschlecht: 2,
        int_vereineid: 1
        // Note: bool_nur_jahr is NOT sent from the frontend form
      };

      const createResponse = await request(app)
        .post('/api/participants')
        .send(newParticipant)
        .expect(201);

      const createdId = createResponse.body.int_teilnehmerid || createResponse.body.id;

      // Verify bool_nur_jahr is false (not the DB default of true)
      const getResponse = await request(app)
        .get(`/api/participants/${createdId}`)
        .expect(200);

      expect(getResponse.body.bool_nur_jahr).toBe(false);

      // Also verify the date survived with correct month and day
      const parsedDate = new Date(getResponse.body.dat_geburtstag);
      expect(parsedDate.getUTCMonth() + 1).toBe(8);  // August
      expect(parsedDate.getUTCDate()).toBe(3);

      // Cleanup
      await request(app).delete(`/api/participants/${createdId}`);
    });

    it('should correctly format date for HTML date input when editing', async () => {
      // Create participant with specific date
      const createResponse = await request(app)
        .post('/api/participants')
        .send({
          var_vorname: 'BirthdateTest',
          var_nachname: 'EditRoundTrip',
          dat_geburtstag: '2009-12-25',  // Dec 25 2009
          int_geschlecht: 1,
          int_vereineid: 1
        })
        .expect(201);

      const createdId = createResponse.body.int_teilnehmerid || createResponse.body.id;

      // Fetch participant (simulating what the frontend edit form does)
      const getResponse = await request(app)
        .get(`/api/participants/${createdId}`)
        .expect(200);

      // Simulate frontend formatDateForInput
      const dateString = getResponse.body.dat_geburtstag;
      const date = new Date(dateString);
      const formattedForInput = date.toISOString().split('T')[0];

      expect(formattedForInput).toBe('2009-12-25');

      // Simulate full edit round-trip: form value → API → DB → API → form
      const updateResponse = await request(app)
        .put(`/api/participants/${createdId}`)
        .send({ dat_geburtstag: formattedForInput })
        .expect(200);

      const verifyResponse = await request(app)
        .get(`/api/participants/${createdId}`)
        .expect(200);

      const verifyDate = new Date(verifyResponse.body.dat_geburtstag);
      expect(verifyDate.getUTCFullYear()).toBe(2009);
      expect(verifyDate.getUTCMonth() + 1).toBe(12);  // December
      expect(verifyDate.getUTCDate()).toBe(25);

      // Cleanup
      await request(app).delete(`/api/participants/${createdId}`);
    });

    it('should preserve various dates across all months', async () => {
      // Test dates from different months to ensure no month-specific issues
      const testDates = [
        { input: '2010-01-15', year: 2010, month: 1, day: 15 },
        { input: '2011-02-28', year: 2011, month: 2, day: 28 },
        { input: '2012-06-30', year: 2012, month: 6, day: 30 },
        { input: '2013-09-01', year: 2013, month: 9, day: 1 },
        { input: '2014-12-31', year: 2014, month: 12, day: 31 },
      ];

      for (const testDate of testDates) {
        const createResponse = await request(app)
          .post('/api/participants')
          .send({
            var_vorname: 'MonthTest',
            var_nachname: `Month${testDate.month}`,
            dat_geburtstag: testDate.input,
            int_geschlecht: 1,
            int_vereineid: 1
          })
          .expect(201);

        const createdId = createResponse.body.int_teilnehmerid || createResponse.body.id;

        const getResponse = await request(app)
          .get(`/api/participants/${createdId}`)
          .expect(200);

        const parsedDate = new Date(getResponse.body.dat_geburtstag);
        expect(parsedDate.getUTCFullYear()).toBe(testDate.year);
        expect(parsedDate.getUTCMonth() + 1).toBe(testDate.month);
        expect(parsedDate.getUTCDate()).toBe(testDate.day);

        // Cleanup
        await request(app).delete(`/api/participants/${createdId}`);
      }
    });

    it('should store date directly in database with full precision', async () => {
      // Direct database verification - bypasses any API formatting issues
      const prisma = TestUtils.getPrisma();
      
      const participant = await prisma.tfx_teilnehmer.create({
        data: {
          var_vorname: 'DBDirect',
          var_nachname: 'DateCheck',
          dat_geburtstag: new Date('2012-07-04'),
          int_geschlecht: 1,
          int_vereineid: 1,
          bool_nur_jahr: false
        }
      });

      // Read back directly from DB
      const dbResult = await prisma.$queryRawUnsafe(
        `SELECT dat_geburtstag FROM tfx_teilnehmer WHERE int_teilnehmerid = $1`,
        participant.int_teilnehmerid
      ) as any[];

      const storedDate = new Date(dbResult[0].dat_geburtstag);
      expect(storedDate.getUTCFullYear()).toBe(2012);
      expect(storedDate.getUTCMonth() + 1).toBe(7);  // July
      expect(storedDate.getUTCDate()).toBe(4);

      // Cleanup
      await prisma.tfx_teilnehmer.delete({
        where: { int_teilnehmerid: participant.int_teilnehmerid }
      });
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
