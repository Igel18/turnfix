import { PrismaClient } from '@prisma/client';

/**
 * Test utilities for database operations.
 * 
 * IMPORTANT: All test data created via TestUtils is tracked by ID
 * and cleaned up in cleanup(). This prevents test data from polluting
 * the production database.
 * 
 * Tests MUST call TestUtils.cleanup() in afterAll() AND
 * TestUtils.cleanupCreatedRecords() in afterEach() to ensure
 * no test data is left behind.
 */
export class TestUtils {
  private static prisma: PrismaClient;

  // Track all records created during tests so we can clean them up precisely
  private static createdIds: {
    venues: number[];
    events: number[];
    participants: number[];
    clubs: number[];
    associations: number[];
    disciplines: number[];
    competitions: number[];
    bereiche: number[];
    layouts: number[];
    teams: number[];
  } = {
    venues: [],
    events: [],
    participants: [],
    clubs: [],
    associations: [],
    disciplines: [],
    competitions: [],
    bereiche: [],
    layouts: [],
    teams: [],
  };

  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
          },
        },
      });
    }
    return this.prisma;
  }

  /**
   * Track a created record ID for later cleanup.
   * Call this whenever you create a record directly via Prisma in a test.
   */
  static trackCreated(table: keyof typeof TestUtils.createdIds, id: number) {
    if (!this.createdIds[table].includes(id)) {
      this.createdIds[table].push(id);
    }
  }

  /**
   * Create a test event with valid data
   */
  static async createTestEvent(data: any = {}) {
    const prisma = this.getPrisma();
    
    // Ensure venue exists or create one
    let venueId = data.venueId;
    if (!venueId) {
      const venue = await prisma.tfx_wettkampforte.findFirst();
      if (venue) {
        venueId = venue.int_wettkampforteid;
      } else {
        // Create a test venue if none exists
        const newVenue = await prisma.tfx_wettkampforte.create({
          data: {
            var_name: 'Test Venue',
            var_adresse: 'Test Address',
            var_plz: '12345',
            var_ort: 'Test City'
          }
        });
        venueId = newVenue.int_wettkampforteid;
        this.createdIds.venues.push(newVenue.int_wettkampforteid);
      }
    }
    
    const event = await prisma.tfx_veranstaltungen.create({
      data: {
        var_name: data.name || 'Test Event',
        dat_von: data.startDate || new Date(),
        dat_bis: data.endDate || new Date(),
        txt_hinweise: data.description || 'Test Description',
        dat_meldeschluss: data.registrationDeadline || null,
        var_veranstalter: data.organizer || null,
        int_wettkampforteid: venueId,
        int_runde: data.round || 1 // Default round
      }
    });
    this.createdIds.events.push(event.int_veranstaltungenid);
    return event;
  }

  /**
   * Create a test participant with valid data
   */
  static async createTestParticipant(data: any = {}) {
    const prisma = this.getPrisma();
    const participant = await prisma.tfx_teilnehmer.create({
      data: {
        var_vorname: data.firstName || 'Test',
        var_nachname: data.lastName || 'Participant',
        dat_geburtstag: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('1990-01-01'),
        int_geschlecht: data.gender || 1, // 1 = male, 2 = female
        int_vereineid: data.clubId || 1 // Default club ID
      }
    });
    this.createdIds.participants.push(participant.int_teilnehmerid);
    return participant;
  }

  /**
   * Create a test competition with valid data.
   * Requires a valid int_veranstaltungenid and int_bereicheid.
   */
  static async createTestCompetition(data: any = {}) {
    const prisma = this.getPrisma();

    // Ensure we have a valid event
    let eventId = data.int_veranstaltungenid;
    if (!eventId) {
      const event = await this.createTestEvent({ name: 'Test Event for Competition' });
      eventId = event.int_veranstaltungenid;
    }

    // Ensure we have a valid bereich (area)
    let bereichId = data.int_bereicheid;
    if (!bereichId) {
      const bereich = await prisma.tfx_bereiche.findFirst();
      if (bereich) {
        bereichId = bereich.int_bereicheid;
      } else {
        // Create a test bereich if none exists
        const newBereich = await prisma.tfx_bereiche.create({
          data: {
            var_name: 'Test Bereich',
            bol_maennlich: true,
            bol_weiblich: true,
          }
        });
        bereichId = newBereich.int_bereicheid;
      }
    }

    const competition = await prisma.tfx_wettkaempfe.create({
      data: {
        var_name: data.name || 'Test Competition',
        int_veranstaltungenid: eventId,
        int_bereicheid: bereichId,
        yer_von: data.ageFrom || 16,
        yer_bis: data.ageTo || 99,
      }
    });
    this.createdIds.competitions.push(competition.int_wettkaempfeid);
    return competition;
  }

  /**
   * Clean up ALL tracked test records created during the test run.
   * Respects foreign key constraints by deleting in the correct order:
   * 1. Scores/results (reference competitions + participants)
   * 2. Competitions (reference events)
   * 3. Events (reference venues)
   * 4. Participants (reference clubs)
   * 5. Disciplines
   * 6. Clubs (reference associations)
   * 7. Associations
   * 8. Venues
   * 
   * Call this in afterEach() to clean up per-test data,
   * and in afterAll() as a safety net.
   */
  static async cleanupCreatedRecords() {
    const prisma = this.getPrisma();
    
    try {
      // 0. Delete test teams (and their members cascade via FK)
      if (this.createdIds.teams.length > 0) {
        // Members (tfx_man_x_teilnehmer) cascade-delete with tfx_mannschaften
        await prisma.tfx_mannschaften.deleteMany({
          where: { int_mannschaftenid: { in: this.createdIds.teams } }
        }).catch(() => {});
      }

      // 1. Delete scores/results referencing test competitions
      if (this.createdIds.competitions.length > 0) {
        await prisma.tfx_wertungen.deleteMany({
          where: { int_wettkaempfeid: { in: this.createdIds.competitions } }
        }).catch(() => {});
        
        await prisma.tfx_wettkaempfe.deleteMany({
          where: { int_wettkaempfeid: { in: this.createdIds.competitions } }
        }).catch(() => {});
      }

      // 2. Delete test events
      if (this.createdIds.events.length > 0) {
        await prisma.tfx_veranstaltungen.deleteMany({
          where: { int_veranstaltungenid: { in: this.createdIds.events } }
        }).catch(() => {});
      }

      // 3. Delete test participants
      if (this.createdIds.participants.length > 0) {
        await prisma.tfx_teilnehmer.deleteMany({
          where: { int_teilnehmerid: { in: this.createdIds.participants } }
        }).catch(() => {});
      }

      // 4. Delete test disciplines
      if (this.createdIds.disciplines.length > 0) {
        // Delete discipline fields first (FK constraint)
        await prisma.tfx_disziplinen_felder.deleteMany({
          where: { int_disziplinenid: { in: this.createdIds.disciplines } }
        }).catch(() => {});
        
        await prisma.tfx_disziplinen.deleteMany({
          where: { int_disziplinenid: { in: this.createdIds.disciplines } }
        }).catch(() => {});
      }

      // 5. Delete test clubs
      if (this.createdIds.clubs.length > 0) {
        await prisma.tfx_vereine.deleteMany({
          where: { int_vereineid: { in: this.createdIds.clubs } }
        }).catch(() => {});
      }

      // 6. Delete test associations
      if (this.createdIds.associations.length > 0) {
        await prisma.tfx_gaue.deleteMany({
          where: { int_gaueid: { in: this.createdIds.associations } }
        }).catch(() => {});
      }

      // 7. Delete test venues
      if (this.createdIds.venues.length > 0) {
        await prisma.tfx_wettkampforte.deleteMany({
          where: { int_wettkampforteid: { in: this.createdIds.venues } }
        }).catch(() => {});
      }

      // 8. Delete test bereiche (areas)
      if (this.createdIds.bereiche.length > 0) {
        await prisma.tfx_bereiche.deleteMany({
          where: { int_bereicheid: { in: this.createdIds.bereiche } }
        }).catch(() => {});
      }

      // 9. Delete test layouts (layout_felder cascade-deletes via FK)
      if (this.createdIds.layouts.length > 0) {
        await prisma.tfx_layouts.deleteMany({
          where: { int_layoutid: { in: this.createdIds.layouts } }
        }).catch(() => {});
      }

    } catch (error) {
      console.warn('Cleanup warning:', error);
    }

    // Reset all tracking arrays
    this.resetTracking();
  }

  /**
   * Legacy cleanup method — now delegates to cleanupCreatedRecords().
   * Kept for backward compatibility.
   */
  static async cleanup() {
    await this.cleanupCreatedRecords();
  }

  /**
   * Reset all ID tracking arrays (called automatically after cleanup)
   */
  private static resetTracking() {
    this.createdIds = {
      venues: [],
      events: [],
      participants: [],
      clubs: [],
      associations: [],
      disciplines: [],
      competitions: [],
      bereiche: [],
      layouts: [],
      teams: [],
    };
  }

  /**
   * Close database connection
   */
  static async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Wait for a short period (useful for timing-dependent tests)
   */
  static async wait(ms: number = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
