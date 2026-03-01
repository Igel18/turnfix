// Data Synchronization Helper for TurnFix Score Management
// Ensures consistency between tfx_wertungen_details and tfx_jury_results tables

import prisma from '../lib/prisma';

/**
 * Synchronizes data between tfx_wertungen_details and tfx_jury_results
 * The Qt application expects both tables to have consistent entries for proper JOINs
 */
export class ScoreSynchronizer {
  
  /**
   * Ensures that when a jury result is saved, a corresponding entry exists in wertungen_details
   * This is required for the Qt app's complex JOIN query to work correctly.
   * Uses pg_advisory_xact_lock to prevent duplicate creation under concurrent access.
   */
  static async ensureWertungsDetailsEntry(
    wertungenId: number,
    disciplineId: number,
    attempt: number = 1,
    kp: number = 0
  ): Promise<void> {
    try {
      console.log(`🔄 Synchronizing: Ensuring wertungen_details entry for wertungenId=${wertungenId}, disciplineId=${disciplineId}`);
      
      await prisma.$transaction(async (tx) => {
        // Advisory lock prevents concurrent duplicate creation
        // Lock key: combination of wertungenId and disciplineId
        const lockKey = wertungenId * 100000 + disciplineId * 100 + (attempt || 0) * 10 + (kp || 0);
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', lockKey);
        
        const existing = await tx.$queryRawUnsafe(
          `SELECT int_wertungen_detailsid 
           FROM tfx_wertungen_details 
           WHERE int_wertungenid = $1 
             AND int_disziplinenid = $2 
             AND int_versuch = $3
             AND int_kp = $4`,
          wertungenId, disciplineId, attempt, kp
        ) as any[];
        
        if (existing.length === 0) {
          await tx.$queryRawUnsafe(
            `INSERT INTO tfx_wertungen_details 
               (int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp)
             VALUES ($1, $2, $3, $4, $5)`,
            wertungenId, disciplineId, attempt, null, kp
          );
          console.log(`✅ Created placeholder wertungen_details entry for Qt compatibility`);
        } else {
          console.log(`✅ Wertungen_details entry already exists`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error in ensureWertungsDetailsEntry:', error);
      throw error;
    }
  }
  
  /**
   * Updates the regular score in tfx_wertungen_details when saving normal discipline scores
   * Ensures that the entry is compatible with jury results.
   * Uses pg_advisory_xact_lock to prevent duplicate creation under concurrent access.
   */
  static async updateWertungsDetailsScore(
    wertungenId: number,
    disciplineId: number,
    score: number,
    attempt: number = 1,
    kp: number = 0
  ): Promise<void> {
    try {
      console.log(`🔄 Synchronizing: Updating wertungen_details score for wertungenId=${wertungenId}, disciplineId=${disciplineId}, score=${score}`);
      
      await prisma.$transaction(async (tx) => {
        // Advisory lock prevents concurrent duplicate creation (same key space as ensureWertungsDetailsEntry)
        const lockKey = wertungenId * 100000 + disciplineId * 100 + (attempt || 0) * 10 + (kp || 0);
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', lockKey);
        
        const existing = await tx.$queryRawUnsafe(
          `SELECT int_wertungen_detailsid 
           FROM tfx_wertungen_details 
           WHERE int_wertungenid = $1 
             AND int_disziplinenid = $2 
             AND int_versuch = $3
             AND int_kp = $4`,
          wertungenId, disciplineId, attempt, kp
        ) as any[];
        
        if (existing.length > 0) {
          // Update existing entry (use first match if duplicates somehow exist)
          await tx.$queryRawUnsafe(
            `UPDATE tfx_wertungen_details 
             SET rel_leistung = $1
             WHERE int_wertungen_detailsid = $2`,
            score, existing[0].int_wertungen_detailsid
          );
          
          // Clean up any duplicates (defensive: remove extras if they exist)
          if (existing.length > 1) {
            const extraIds = existing.slice(1).map((e: any) => e.int_wertungen_detailsid);
            console.warn(`⚠️ Found ${existing.length} duplicate wertungen_details entries, cleaning up ${extraIds.length} extras`);
            await tx.$queryRawUnsafe(
              `DELETE FROM tfx_wertungen_details WHERE int_wertungen_detailsid = ANY($1::int[])`,
              extraIds
            );
          }
          
          console.log(`✅ Updated existing wertungen_details score`);
        } else {
          // Create new entry
          await tx.$queryRawUnsafe(
            `INSERT INTO tfx_wertungen_details 
               (int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp)
             VALUES ($1, $2, $3, $4, $5)`,
            wertungenId, disciplineId, attempt, score, kp
          );
          
          console.log(`✅ Created new wertungen_details entry`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error in updateWertungsDetailsScore:', error);
      throw error;
    }
  }
  
  /**
   * Finds the correct competition ID for a participant based on their assigned competitions
   * Ensures consistent competition assignment logic across all APIs
   */
  static async findCorrectCompetitionId(
    participantId: number,
    disciplineId: number,
    eventId?: number,
    providedCompetitionId?: number
  ): Promise<number | null> {
    try {
      console.log(`🔍 Finding correct competition for participant=${participantId}, discipline=${disciplineId}, event=${eventId}`);
      
      // If competitionId is provided and valid, use it
      if (providedCompetitionId) {
        const competitionValidation = `
          SELECT wk.int_wettkaempfeid
          FROM tfx_wettkaempfe wk
          INNER JOIN tfx_wettkaempfe_x_disziplinen wxd ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
          WHERE wk.int_wettkaempfeid = $1
            AND wxd.int_disziplinenid = $2
            ${eventId ? 'AND wk.int_veranstaltungenid = $3' : ''}
        `;
        
        const params = eventId ? [providedCompetitionId, disciplineId, eventId] : [providedCompetitionId, disciplineId];
        const validation = await prisma.$queryRawUnsafe(competitionValidation, ...params) as any[];
        
        if (validation.length > 0) {
          console.log(`✅ Provided competition ID ${providedCompetitionId} is valid`);
          return providedCompetitionId;
        }
      }
      
      // Find competition that contains this discipline and participant
      const competitionQuery = `
        SELECT DISTINCT wk.int_wettkaempfeid
        FROM tfx_wertungen w
        INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
        INNER JOIN tfx_wettkaempfe_x_disziplinen wxd ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
        WHERE w.int_teilnehmerid = $1
          AND wxd.int_disziplinenid = $2
          ${eventId ? 'AND wk.int_veranstaltungenid = $3' : ''}
        ORDER BY wk.int_wettkaempfeid
        LIMIT 1
      `;
      
      const params = eventId ? [participantId, disciplineId, eventId] : [participantId, disciplineId];
      const result = await prisma.$queryRawUnsafe(competitionQuery, ...params) as any[];
      
      if (result.length > 0) {
        const competitionId = result[0].int_wettkaempfeid;
        console.log(`✅ Found competition ID ${competitionId} for participant/discipline combination`);
        return competitionId;
      }
      
      console.log(`❌ No valid competition found for participant=${participantId}, discipline=${disciplineId}`);
      return null;
      
    } catch (error) {
      console.error('❌ Error in findCorrectCompetitionId:', error);
      return null;
    }
  }
}