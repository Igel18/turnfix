/**
 * Integration tests for Start Number assignment across all routes.
 *
 * Tests:
 *   - PUT /api/events/:id/generate-start-numbers — manual regeneration
 *   - POST /api/event-participants/add — auto-assigns unique start number
 *   - POST /api/event-participants/ — auto-assigns unique start number (default handler)
 *   - POST /api/event-participants/assign — auto-assigns unique start number
 *   - Multiple participants get sequential unique start numbers
 *   - Start numbers are event-scoped (unique across competitions)
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import eventsRouter from '../../src/routes/events';
import eventParticipantRoutes from '../../src/routes/eventParticipants';
import { TestUtils } from '../utils/testUtils';

// Create test apps
const eventsApp = express();
eventsApp.use(express.json());
eventsApp.use('/api/events', eventsRouter);

const participantsApp = express();
participantsApp.use(express.json());
participantsApp.use('/api/event-participants', eventParticipantRoutes);

describe('Start Number Integration', () => {
  let prisma: PrismaClient;

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

  describe('PUT /api/events/:id/generate-start-numbers', () => {
    it('should assign sequential start numbers to all participants', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Start Number Gen Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Start Number Gen Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      // Create participants with no start numbers
      for (let i = 0; i < 3; i++) {
        const p = await TestUtils.createTestParticipant({
          firstName: `Gen${i}`,
          lastName: 'StartNum'
        });

        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: p.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_startnummer: 0,
            var_riege: '',
            int_statusid: 1
          }
        });
      }

      const response = await request(eventsApp)
        .put(`/api/events/${event.int_veranstaltungenid}/generate-start-numbers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);

      // Verify in database
      const entries = await prisma.tfx_wertungen.findMany({
        where: { int_wettkaempfeid: competition.int_wettkaempfeid },
        orderBy: { int_startnummer: 'asc' }
      });

      const startNumbers = entries.map(e => e.int_startnummer);
      expect(startNumbers).toEqual([1, 2, 3]);
    });

    it('should return 0 count for event with no participants', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Empty Start Num Event' });

      const response = await request(eventsApp)
        .put(`/api/events/${event.int_veranstaltungenid}/generate-start-numbers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
    });

    it('should return 400 for invalid event ID', async () => {
      await request(eventsApp)
        .put('/api/events/invalid/generate-start-numbers')
        .expect(400);
    });
  });

  describe('POST /api/event-participants/add — Auto Start Number', () => {
    it('should auto-assign start number 1 for first participant', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Auto Start Num Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Auto Start Num Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'First',
        lastName: 'AutoNum'
      });

      const response = await request(participantsApp)
        .post('/api/event-participants/add')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: participant.int_teilnehmerid
        })
        .expect(201);

      expect(response.body.startNumber).toBe(1);
    });

    it('should auto-assign sequential start numbers for multiple participants', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Sequential Auto Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Sequential Auto Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const startNumbers: number[] = [];

      for (let i = 0; i < 3; i++) {
        const participant = await TestUtils.createTestParticipant({
          firstName: `SeqAuto${i}`,
          lastName: 'Test'
        });

        const response = await request(participantsApp)
          .post('/api/event-participants/add')
          .send({
            eventId: event.int_veranstaltungenid,
            participantId: participant.int_teilnehmerid
          })
          .expect(201);

        startNumbers.push(response.body.startNumber);
      }

      expect(startNumbers).toEqual([1, 2, 3]);
    });

    it('should continue numbering after manually assigned numbers', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Continue After Manual' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Continue Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      // Manually insert a participant with start number 10
      const existingParticipant = await TestUtils.createTestParticipant({
        firstName: 'Existing',
        lastName: 'Manual'
      });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: existingParticipant.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_startnummer: 10,
          var_riege: '',
          int_statusid: 1
        }
      });

      // Add a new participant — should get start number 11
      const newParticipant = await TestUtils.createTestParticipant({
        firstName: 'New',
        lastName: 'AfterManual'
      });

      const response = await request(participantsApp)
        .post('/api/event-participants/add')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: newParticipant.int_teilnehmerid
        })
        .expect(201);

      expect(response.body.startNumber).toBe(11);
    });

    it('should reject duplicate participant registration', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Duplicate Check Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Duplicate Check Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'Duplicate',
        lastName: 'Check'
      });

      // First registration
      await request(participantsApp)
        .post('/api/event-participants/add')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: participant.int_teilnehmerid
        })
        .expect(201);

      // Second registration — should fail
      await request(participantsApp)
        .post('/api/event-participants/add')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: participant.int_teilnehmerid
        })
        .expect(400);
    });
  });

  describe('POST /api/event-participants/ — Default Handler Auto Start Number', () => {
    it('should auto-assign unique start number via default POST', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Default Handler Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Default Handler Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'Default',
        lastName: 'Handler'
      });

      const response = await request(participantsApp)
        .post('/api/event-participants/')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: participant.int_teilnehmerid
        })
        .expect(201);

      // Verify the start number was assigned (not hardcoded 1)
      const entry = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid
        }
      });

      expect(entry).not.toBeNull();
      expect(entry!.int_startnummer).toBeGreaterThan(0);
    });

    it('should assign sequential start numbers via default POST', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Default Sequential Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Default Sequential Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const p1 = await TestUtils.createTestParticipant({ firstName: 'DefSeq1', lastName: 'Test' });
      const p2 = await TestUtils.createTestParticipant({ firstName: 'DefSeq2', lastName: 'Test' });

      await request(participantsApp)
        .post('/api/event-participants/')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: p1.int_teilnehmerid
        })
        .expect(201);

      await request(participantsApp)
        .post('/api/event-participants/')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: p2.int_teilnehmerid
        })
        .expect(201);

      // Verify unique sequential start numbers
      const entries = await prisma.tfx_wertungen.findMany({
        where: { int_wettkaempfeid: competition.int_wettkaempfeid },
        orderBy: { int_startnummer: 'asc' }
      });

      expect(entries.length).toBe(2);
      expect(entries[0].int_startnummer).not.toBe(entries[1].int_startnummer);
    });
  });

  describe('POST /api/event-participants/assign — Auto Start Number', () => {
    it('should auto-assign start number when assigning participant to competition', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Assign Start Num Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Assign Start Num Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'Assign',
        lastName: 'StartNum'
      });

      const response = await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({
          participantId: participant.int_teilnehmerid,
          competitionId: competition.int_wettkaempfeid
        })
        .expect(201);

      // Verify start number was assigned (not 0)
      const entry = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid
        }
      });

      expect(entry).not.toBeNull();
      expect(entry!.int_startnummer).toBeGreaterThan(0);
    });

    it('should auto-assign sequential start numbers when assigning multiple participants', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Multi Assign Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Multi Assign Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const p1 = await TestUtils.createTestParticipant({ firstName: 'AssignSeq1', lastName: 'Test' });
      const p2 = await TestUtils.createTestParticipant({ firstName: 'AssignSeq2', lastName: 'Test' });
      const p3 = await TestUtils.createTestParticipant({ firstName: 'AssignSeq3', lastName: 'Test' });

      await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({ participantId: p1.int_teilnehmerid, competitionId: competition.int_wettkaempfeid })
        .expect(201);

      await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({ participantId: p2.int_teilnehmerid, competitionId: competition.int_wettkaempfeid })
        .expect(201);

      await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({ participantId: p3.int_teilnehmerid, competitionId: competition.int_wettkaempfeid })
        .expect(201);

      // Verify unique sequential start numbers
      const entries = await prisma.tfx_wertungen.findMany({
        where: { int_wettkaempfeid: competition.int_wettkaempfeid },
        orderBy: { int_startnummer: 'asc' }
      });

      expect(entries.length).toBe(3);
      const startNumbers = entries.map(e => e.int_startnummer);
      expect(startNumbers).toEqual([1, 2, 3]);
    });
  });

  describe('Cross-competition start number uniqueness', () => {
    it('should maintain unique start numbers across multiple competitions in same event', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Cross-Comp Uniqueness' });
      const comp1 = await TestUtils.createTestCompetition({
        name: 'Cross Comp A',
        int_veranstaltungenid: event.int_veranstaltungenid
      });
      const comp2 = await TestUtils.createTestCompetition({
        name: 'Cross Comp B',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      // Add participant to comp1
      const p1 = await TestUtils.createTestParticipant({ firstName: 'CrossComp1', lastName: 'Test' });
      await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({ participantId: p1.int_teilnehmerid, competitionId: comp1.int_wettkaempfeid })
        .expect(201);

      // Add different participant to comp2
      const p2 = await TestUtils.createTestParticipant({ firstName: 'CrossComp2', lastName: 'Test' });
      await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({ participantId: p2.int_teilnehmerid, competitionId: comp2.int_wettkaempfeid })
        .expect(201);

      // p1 in comp1 should be 1, p2 in comp2 should be 2
      const entry1 = await prisma.tfx_wertungen.findFirst({
        where: { int_teilnehmerid: p1.int_teilnehmerid, int_wettkaempfeid: comp1.int_wettkaempfeid }
      });
      const entry2 = await prisma.tfx_wertungen.findFirst({
        where: { int_teilnehmerid: p2.int_teilnehmerid, int_wettkaempfeid: comp2.int_wettkaempfeid }
      });

      expect(entry1!.int_startnummer).toBe(1);
      expect(entry2!.int_startnummer).toBe(2);
    });

    it('should not affect start numbers in other events', async () => {
      const event1 = await TestUtils.createTestEvent({ name: 'Isolated Event A' });
      const event2 = await TestUtils.createTestEvent({ name: 'Isolated Event B' });

      const comp1 = await TestUtils.createTestCompetition({
        name: 'Isolated Comp A',
        int_veranstaltungenid: event1.int_veranstaltungenid
      });
      const comp2 = await TestUtils.createTestCompetition({
        name: 'Isolated Comp B',
        int_veranstaltungenid: event2.int_veranstaltungenid
      });

      // Add participant to event1
      const p1 = await TestUtils.createTestParticipant({ firstName: 'IsolatedA', lastName: 'Test' });
      await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({ participantId: p1.int_teilnehmerid, competitionId: comp1.int_wettkaempfeid })
        .expect(201);

      // Add participant to event2 — should start from 1 (independent)
      const p2 = await TestUtils.createTestParticipant({ firstName: 'IsolatedB', lastName: 'Test' });
      await request(participantsApp)
        .post('/api/event-participants/assign')
        .send({ participantId: p2.int_teilnehmerid, competitionId: comp2.int_wettkaempfeid })
        .expect(201);

      const entry1 = await prisma.tfx_wertungen.findFirst({
        where: { int_teilnehmerid: p1.int_teilnehmerid, int_wettkaempfeid: comp1.int_wettkaempfeid }
      });
      const entry2 = await prisma.tfx_wertungen.findFirst({
        where: { int_teilnehmerid: p2.int_teilnehmerid, int_wettkaempfeid: comp2.int_wettkaempfeid }
      });

      // Both should be 1 — numbering is per-event
      expect(entry1!.int_startnummer).toBe(1);
      expect(entry2!.int_startnummer).toBe(1);
    });
  });

  describe('Regeneration after removal', () => {
    it('should allow regeneration after participant removal to close gaps', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Gap Close Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Gap Close Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      // Add 3 participants
      const participants = [];
      for (let i = 0; i < 3; i++) {
        const p = await TestUtils.createTestParticipant({ firstName: `Gap${i}`, lastName: 'Test' });
        participants.push(p);

        await request(participantsApp)
          .post('/api/event-participants/assign')
          .send({ participantId: p.int_teilnehmerid, competitionId: competition.int_wettkaempfeid })
          .expect(201);
      }

      // Remove the middle participant
      await prisma.tfx_wertungen.deleteMany({
        where: {
          int_teilnehmerid: participants[1].int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid
        }
      });

      // Regenerate start numbers
      const response = await request(eventsApp)
        .put(`/api/events/${event.int_veranstaltungenid}/generate-start-numbers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);

      // Verify sequential numbers without gaps
      const entries = await prisma.tfx_wertungen.findMany({
        where: { int_wettkaempfeid: competition.int_wettkaempfeid },
        orderBy: { int_startnummer: 'asc' }
      });

      const startNumbers = entries.map(e => e.int_startnummer);
      expect(startNumbers).toEqual([1, 2]);
    });
  });

  describe('PUT /api/event-participants/update-details — Start Number on competition reassignment (Point 68)', () => {
    it('should assign start number when adding new competition via update-details', async () => {
      const event = await TestUtils.createTestEvent({ name: 'UpdateDetails StartNum Event' });
      const comp1 = await TestUtils.createTestCompetition({
        name: 'UpdateDetails Comp A',
        int_veranstaltungenid: event.int_veranstaltungenid
      });
      const comp2 = await TestUtils.createTestCompetition({
        name: 'UpdateDetails Comp B',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'UpdateDetail',
        lastName: 'StartNum'
      });

      // Add participant to comp1 via /add (gets start number 1)
      await request(participantsApp)
        .post('/api/event-participants/add')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: participant.int_teilnehmerid
        })
        .expect(201);

      // Now use update-details to also assign to comp2
      await request(participantsApp)
        .put('/api/event-participants/update-details')
        .send({
          participantId: participant.int_teilnehmerid,
          eventId: event.int_veranstaltungenid,
          assignedCompetitions: [comp1.int_wettkaempfeid, comp2.int_wettkaempfeid]
        })
        .expect(200);

      // Verify the new entry in comp2 has a start number
      const comp2Entry = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: comp2.int_wettkaempfeid
        }
      });

      expect(comp2Entry).not.toBeNull();
      expect(comp2Entry!.int_startnummer).not.toBeNull();
      expect(comp2Entry!.int_startnummer).toBeGreaterThan(0);
    });

    it('should reuse existing start number when reassigning to new competition', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Reuse StartNum Event' });
      const comp1 = await TestUtils.createTestCompetition({
        name: 'Reuse Comp A',
        int_veranstaltungenid: event.int_veranstaltungenid
      });
      const comp2 = await TestUtils.createTestCompetition({
        name: 'Reuse Comp B',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'Reuse',
        lastName: 'StartNum'
      });

      // Add participant to comp1 via /add (gets start number 1)
      const addResponse = await request(participantsApp)
        .post('/api/event-participants/add')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: participant.int_teilnehmerid
        })
        .expect(201);

      const originalStartNumber = addResponse.body.startNumber;

      // Use update-details to also assign to comp2
      await request(participantsApp)
        .put('/api/event-participants/update-details')
        .send({
          participantId: participant.int_teilnehmerid,
          eventId: event.int_veranstaltungenid,
          assignedCompetitions: [comp1.int_wettkaempfeid, comp2.int_wettkaempfeid]
        })
        .expect(200);

      // The comp2 entry should have the SAME start number (event-scoped, same participant)
      const comp2Entry = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: comp2.int_wettkaempfeid
        }
      });

      expect(comp2Entry).not.toBeNull();
      expect(comp2Entry!.int_startnummer).toBe(originalStartNumber);
    });

    it('should assign new start number if participant has no existing start number in event', async () => {
      const event = await TestUtils.createTestEvent({ name: 'New StartNum via UpdateDetails' });
      const comp1 = await TestUtils.createTestCompetition({
        name: 'New StartNum Comp A',
        int_veranstaltungenid: event.int_veranstaltungenid
      });
      const comp2 = await TestUtils.createTestCompetition({
        name: 'New StartNum Comp B',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      // Add a first participant to get start number 1
      const p1 = await TestUtils.createTestParticipant({ firstName: 'First', lastName: 'P' });
      await request(participantsApp)
        .post('/api/event-participants/add')
        .send({
          eventId: event.int_veranstaltungenid,
          participantId: p1.int_teilnehmerid
        })
        .expect(201);

      // Create another participant directly with a wertung entry that has no start number
      const p2 = await TestUtils.createTestParticipant({ firstName: 'NoStartNum', lastName: 'P' });
      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: p2.int_teilnehmerid,
          int_wettkaempfeid: comp1.int_wettkaempfeid,
          int_startnummer: null,
          var_riege: '',
          int_statusid: 1
        }
      });

      // Use update-details to also assign p2 to comp2
      await request(participantsApp)
        .put('/api/event-participants/update-details')
        .send({
          participantId: p2.int_teilnehmerid,
          eventId: event.int_veranstaltungenid,
          assignedCompetitions: [comp1.int_wettkaempfeid, comp2.int_wettkaempfeid]
        })
        .expect(200);

      // The comp2 entry should have a valid start number (next available = 2)
      const comp2Entry = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: p2.int_teilnehmerid,
          int_wettkaempfeid: comp2.int_wettkaempfeid
        }
      });

      expect(comp2Entry).not.toBeNull();
      expect(comp2Entry!.int_startnummer).not.toBeNull();
      expect(comp2Entry!.int_startnummer).toBeGreaterThan(0);
    });
  });
});
