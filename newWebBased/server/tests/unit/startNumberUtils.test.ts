/**
 * Unit tests for startNumberUtils — Start number generation utilities.
 *
 * Tests:
 *   - getNextStartNumber() returns correct next number
 *   - getNextStartNumber() returns 1 for events with no participants
 *   - generateStartNumbersForEvent() assigns sequential numbers
 *   - generateStartNumbersForEvent() handles empty events
 *   - getNextStartNumberForCompetition() resolves event-scoped numbers
 */

import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';
import {
  getNextStartNumber,
  getNextStartNumberForCompetition,
  generateStartNumbersForEvent
} from '../../src/utils/startNumberUtils';

describe('Start Number Utilities', () => {
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

  describe('getNextStartNumber()', () => {
    it('should return 1 for an event with no participants', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Empty Event for Start Numbers' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Empty Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const nextNumber = await getNextStartNumber(event.int_veranstaltungenid);
      expect(nextNumber).toBe(1);
    });

    it('should return MAX + 1 when participants exist', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Event with Participants for Start Numbers' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Competition for Start Numbers',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      // Create participants and assign them with start numbers
      const participant1 = await TestUtils.createTestParticipant({ firstName: 'Start1', lastName: 'Test' });
      const participant2 = await TestUtils.createTestParticipant({ firstName: 'Start2', lastName: 'Test' });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant1.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_startnummer: 5,
          var_riege: '',
          int_statusid: 1
        }
      });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant2.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_startnummer: 10,
          var_riege: '',
          int_statusid: 1
        }
      });

      const nextNumber = await getNextStartNumber(event.int_veranstaltungenid);
      expect(nextNumber).toBe(11);
    });

    it('should ignore entries with start number 0 or null', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Event with Zero Start Numbers' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Competition for Zero Test',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({ firstName: 'Zero', lastName: 'Test' });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_startnummer: 0,
          var_riege: '',
          int_statusid: 1
        }
      });

      const nextNumber = await getNextStartNumber(event.int_veranstaltungenid);
      expect(nextNumber).toBe(1); // 0 should be ignored
    });

    it('should consider all competitions in the event', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Multi-Competition Event' });
      const comp1 = await TestUtils.createTestCompetition({
        name: 'Competition A',
        int_veranstaltungenid: event.int_veranstaltungenid
      });
      const comp2 = await TestUtils.createTestCompetition({
        name: 'Competition B',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant1 = await TestUtils.createTestParticipant({ firstName: 'MultiComp1', lastName: 'Test' });
      const participant2 = await TestUtils.createTestParticipant({ firstName: 'MultiComp2', lastName: 'Test' });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant1.int_teilnehmerid,
          int_wettkaempfeid: comp1.int_wettkaempfeid,
          int_startnummer: 3,
          var_riege: '',
          int_statusid: 1
        }
      });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant2.int_teilnehmerid,
          int_wettkaempfeid: comp2.int_wettkaempfeid,
          int_startnummer: 7,
          var_riege: '',
          int_statusid: 1
        }
      });

      const nextNumber = await getNextStartNumber(event.int_veranstaltungenid);
      expect(nextNumber).toBe(8); // Max across all competitions is 7
    });
  });

  describe('getNextStartNumberForCompetition()', () => {
    it('should resolve the event and return event-scoped next number', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Event for Competition Scope' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Competition for Scope Test',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({ firstName: 'Scope', lastName: 'Test' });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_startnummer: 42,
          var_riege: '',
          int_statusid: 1
        }
      });

      const nextNumber = await getNextStartNumberForCompetition(competition.int_wettkaempfeid);
      expect(nextNumber).toBe(43);
    });

    it('should return 1 for non-existent competition', async () => {
      const nextNumber = await getNextStartNumberForCompetition(999999);
      expect(nextNumber).toBe(1);
    });
  });

  describe('generateStartNumbersForEvent()', () => {
    it('should assign sequential start numbers to all participants', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Event for Sequential Numbers' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Competition for Sequential',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      // Create 3 participants with no start numbers
      const participants = [];
      for (let i = 0; i < 3; i++) {
        const p = await TestUtils.createTestParticipant({
          firstName: `Seq${i}`,
          lastName: 'Test'
        });
        participants.push(p);

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

      const count = await generateStartNumbersForEvent(event.int_veranstaltungenid);
      expect(count).toBe(3);

      // Verify each participant got a unique start number
      const entries = await prisma.tfx_wertungen.findMany({
        where: { int_wettkaempfeid: competition.int_wettkaempfeid },
        orderBy: { int_startnummer: 'asc' }
      });

      const startNumbers = entries.map(e => e.int_startnummer);
      expect(startNumbers).toEqual([1, 2, 3]);
    });

    it('should return 0 for an event with no participants', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Empty Event for Generate' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Empty Competition for Generate',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const count = await generateStartNumbersForEvent(event.int_veranstaltungenid);
      expect(count).toBe(0);
    });

    it('should assign same start number to participant in multiple competitions', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Multi-Comp Sequential' });
      const comp1 = await TestUtils.createTestCompetition({
        name: 'Multi Sequential A',
        int_veranstaltungenid: event.int_veranstaltungenid
      });
      const comp2 = await TestUtils.createTestCompetition({
        name: 'Multi Sequential B',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const participant = await TestUtils.createTestParticipant({
        firstName: 'MultiSeq',
        lastName: 'Test'
      });

      // Same participant in both competitions
      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: comp1.int_wettkaempfeid,
          int_startnummer: 0,
          var_riege: '',
          int_statusid: 1
        }
      });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: comp2.int_wettkaempfeid,
          int_startnummer: 0,
          var_riege: '',
          int_statusid: 1
        }
      });

      const count = await generateStartNumbersForEvent(event.int_veranstaltungenid);
      expect(count).toBe(1); // Only 1 unique participant

      // Both entries should have the same start number
      const entry1 = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: comp1.int_wettkaempfeid
        }
      });
      const entry2 = await prisma.tfx_wertungen.findFirst({
        where: {
          int_teilnehmerid: participant.int_teilnehmerid,
          int_wettkaempfeid: comp2.int_wettkaempfeid
        }
      });

      expect(entry1!.int_startnummer).toBe(1);
      expect(entry2!.int_startnummer).toBe(1);
    });

    it('should reassign start numbers when called multiple times', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Reassign Event' });
      const competition = await TestUtils.createTestCompetition({
        name: 'Reassign Competition',
        int_veranstaltungenid: event.int_veranstaltungenid
      });

      const p1 = await TestUtils.createTestParticipant({ firstName: 'Reassign1', lastName: 'Test' });
      const p2 = await TestUtils.createTestParticipant({ firstName: 'Reassign2', lastName: 'Test' });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: p1.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_startnummer: 99,
          var_riege: '',
          int_statusid: 1
        }
      });

      await prisma.tfx_wertungen.create({
        data: {
          int_teilnehmerid: p2.int_teilnehmerid,
          int_wettkaempfeid: competition.int_wettkaempfeid,
          int_startnummer: 42,
          var_riege: '',
          int_statusid: 1
        }
      });

      // Generate should reassign 1, 2
      await generateStartNumbersForEvent(event.int_veranstaltungenid);

      const entries = await prisma.tfx_wertungen.findMany({
        where: { int_wettkaempfeid: competition.int_wettkaempfeid },
        orderBy: { int_teilnehmerid: 'asc' }
      });

      const startNumbers = entries.map(e => e.int_startnummer).sort();
      expect(startNumbers).toEqual([1, 2]);
    });
  });
});
