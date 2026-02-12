import { PrismaClient } from '@prisma/client';

/**
 * Test utilities for database operations
 */
export class TestUtils {
  private static prisma: PrismaClient;

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
      }
    }
    
    return await prisma.tfx_veranstaltungen.create({
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
  }

  /**
   * Create a test participant with valid data
   */
  static async createTestParticipant(data: any = {}) {
    const prisma = this.getPrisma();
    return await prisma.tfx_teilnehmer.create({
      data: {
        var_vorname: data.firstName || 'Test',
        var_nachname: data.lastName || 'Participant',
        dat_geburtstag: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('1990-01-01'),
        int_geschlecht: data.gender || 1, // 1 = male, 2 = female
        int_vereineid: data.clubId || 1 // Default club ID
      }
    });
  }

  /**
   * Create a test competition with valid data
   */
  static async createTestCompetition(data: any = {}) {
    const prisma = this.getPrisma();
    return await prisma.tfx_wettkaempfe.create({
      data: {
        var_bezeichnung: data.name || 'Test Competition',
        var_geschlecht: data.gender || 'M',
        int_altersklassevon: data.ageFrom || 16,
        int_altersklassebis: data.ageTo || 99,
        ...data
      }
    });
  }

  /**
   * Clean up test data - only delete records created during testing
   */
  static async cleanup() {
    const prisma = this.getPrisma();
    
    try {
      // Only clean up test data by using specific test identifiers
      // Don't clean up existing production data
      
      // Delete test competitions (those with test names)
      await prisma.tfx_wertungen.deleteMany({
        where: {
          tfx_wettkaempfe: {
            var_name: {
              contains: 'Test'
            }
          }
        }
      });
      
      await prisma.tfx_wettkaempfe.deleteMany({
        where: {
          var_name: {
            contains: 'Test'
          }
        }
      });
      
      // Delete test events (those with test names)
      await prisma.tfx_veranstaltungen.deleteMany({
        where: {
          var_name: {
            contains: 'Test'
          }
        }
      });
      
      // Don't delete participants as they may be referenced by existing data
      
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
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
