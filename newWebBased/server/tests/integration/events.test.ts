import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import eventsRouter from '../../src/routes/events';
import { TestUtils } from '../utils/testUtils';

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/events', eventsRouter);

describe('Events API', () => {
  let prisma: PrismaClient;
  let testEvent: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  beforeEach(async () => {
    // Create a test event for each test
    testEvent = await TestUtils.createTestEvent({
      name: 'Test Event',
      organizer: 'Test Location',
      description: 'Test Description'
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (testEvent) {
      await prisma.tfx_veranstaltungen.delete({
        where: { int_veranstaltungenid: testEvent.int_veranstaltungenid }
      }).catch(() => {
        // Ignore if already deleted
      });
    }
  });

  describe('GET /api/events', () => {
    it('should return a list of events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body.events).toBeInstanceOf(Array);
      expect(response.body.events.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      
      const event = response.body.events.find((e: any) => 
        e.int_eventid === testEvent.int_veranstaltungenid
      );
      expect(event).toBeDefined();
      expect(event.var_eventname).toBe('Test Event');
    });

    it('should support pagination with limit parameter', async () => {
      const response = await request(app)
        .get('/api/events?limit=5')
        .expect(200);

      expect(response.body.events).toBeInstanceOf(Array);
      expect(response.body.events.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support search by event name', async () => {
      const response = await request(app)
        .get('/api/events?search=Test Event')
        .expect(200);

      expect(response.body.events).toBeInstanceOf(Array);
      const foundEvent = response.body.events.find((e: any) => 
        e.var_eventname.includes('Test Event')
      );
      expect(foundEvent).toBeDefined();
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return a specific event by ID', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(response.body.int_eventid).toBe(testEvent.int_veranstaltungenid);
      expect(response.body.var_eventname).toBe('Test Event');
      expect(response.body.var_location).toBe('Test Location');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/99999')
        .expect(404);

      expect(response.body.error).toBe('Event not found');
    });

    it('should return 400 for invalid event ID', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid ID');
    });
  });

  describe('POST /api/events', () => {
    it('should create a new event with valid data', async () => {
      const newEventData = {
        var_eventname: 'New Test Event',
        dat_eventstartdate: '2024-12-01T00:00:00.000Z',
        dat_eventenddate: '2024-12-01T00:00:00.000Z',
        var_location: 'New Test Location',
        var_description: 'New Test Description'
      };

      const response = await request(app)
        .post('/api/events')
        .send(newEventData)
        .expect(201);

      expect(response.body.event).toBeDefined();
      expect(response.body.event.var_eventname).toBe(newEventData.var_eventname);
      expect(response.body.event.int_eventid).toBeDefined();

      // Cleanup created event
      await prisma.tfx_veranstaltungen.delete({
        where: { int_veranstaltungenid: response.body.event.int_eventid }
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        var_eventname: '', // Empty name should fail validation
        var_location: 'Test Location'
      };

      const response = await request(app)
        .post('/api/events')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 for invalid date format', async () => {
      const invalidData = {
        var_eventname: 'Test Event',
        dat_eventstartdate: 'invalid-date',
        dat_eventenddate: '2024-12-01T00:00:00.000Z',
        var_location: 'Test Location'
      };

      const response = await request(app)
        .post('/api/events')
        .send(invalidData)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update an existing event', async () => {
      const updateData = {
        var_eventname: 'Updated Test Event',
        var_location: 'Updated Location'
      };

      const response = await request(app)
        .put(`/api/events/${testEvent.int_veranstaltungenid}`)
        .send(updateData)
        .expect(200);

      expect(response.body.event).toBeDefined();
      expect(response.body.event.var_eventname).toBe(updateData.var_eventname);
    });

    it('should return 404 for non-existent event', async () => {
      const updateData = {
        var_eventname: 'Updated Event'
      };

      const response = await request(app)
        .put('/api/events/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Event not found');
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete an existing event', async () => {
      const response = await request(app)
        .delete(`/api/events/${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(response.body.message).toBe('Event deleted successfully');

      // Verify the event is actually deleted
      const deletedEvent = await prisma.tfx_veranstaltungen.findUnique({
        where: { int_veranstaltungenid: testEvent.int_veranstaltungenid }
      });
      expect(deletedEvent).toBeNull();

      // Prevent cleanup from trying to delete again
      testEvent = null;
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .delete('/api/events/99999')
        .expect(404);

      expect(response.body.error).toBe('Event not found');
    });
  });
});
