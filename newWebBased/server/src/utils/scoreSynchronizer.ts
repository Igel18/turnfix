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
   * This is required for the Qt app's complex JOIN query to work correctly
   */
  static async ensureWertungsDetailsEntry(
    wertungenId: number,
    disciplineId: number,
    attempt: number = 1,
    kp: number = 0
  ): Promise<void> {
    try {
      console.log(`🔄 Synchronizing: Ensuring wertungen_details entry for wertungenId=${wertungenId}, disciplineId=${disciplineId}`);
      
      // Check if entry already exists in tfx_wertungen_details
      const existingQuery = `
        SELECT int_wertungen_detailsid 
        FROM tfx_wertungen_details 
        WHERE int_wertungenid = $1 
          AND int_disziplinenid = $2 
          AND int_versuch = $3
          AND int_kp = $4
      `;
      
      const existing = await prisma.$queryRawUnsafe(
        existingQuery,
        wertungenId,
        disciplineId,
        attempt,
        kp
      ) as any[];
      
      if (existing.length === 0) {
        // Create placeholder entry in tfx_wertungen_details with null score
        // This ensures the Qt JOIN will work even if only jury results exist
        const insertQuery = `
          INSERT INTO tfx_wertungen_details 
            (int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        await prisma.$queryRawUnsafe(
          insertQuery,
          wertungenId,
          disciplineId,
          attempt,
          null, // null score as placeholder
          kp
        );
        
        console.log(`✅ Created placeholder wertungen_details entry for Qt compatibility`);
      } else {
        console.log(`✅ Wertungen_details entry already exists`);
      }
      
    } catch (error) {
      console.error('❌ Error in ensureWertungsDetailsEntry:', error);
      throw error;
    }
  }
  
  /**
   * Updates the regular score in tfx_wertungen_details when saving normal discipline scores
   * Ensures that the entry is compatible with jury results
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
      
      // Check if entry exists
      const existingQuery = `
        SELECT int_wertungen_detailsid 
        FROM tfx_wertungen_details 
        WHERE int_wertungenid = $1 
          AND int_disziplinenid = $2 
          AND int_versuch = $3
          AND int_kp = $4
      `;
      
      const existing = await prisma.$queryRawUnsafe(
        existingQuery,
        wertungenId,
        disciplineId,
        attempt,
        kp
      ) as any[];
      
      if (existing.length > 0) {
        // Update existing entry
        const updateQuery = `
          UPDATE tfx_wertungen_details 
          SET rel_leistung = $1
          WHERE int_wertungen_detailsid = $2
        `;
        
        await prisma.$queryRawUnsafe(
          updateQuery,
          score,
          existing[0].int_wertungen_detailsid
        );
        
        console.log(`✅ Updated existing wertungen_details score`);
      } else {
        // Create new entry
        const insertQuery = `
          INSERT INTO tfx_wertungen_details 
            (int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        await prisma.$queryRawUnsafe(
          insertQuery,
          wertungenId,
          disciplineId,
          attempt,
          score,
          kp
        );
        
        console.log(`✅ Created new wertungen_details entry`);
      }
      
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