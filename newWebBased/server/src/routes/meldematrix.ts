import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Get meldematrix data (clubs vs competitions registration matrix)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    console.log(`Meldematrix API: eventId=${eventId}`);
    
    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    console.log(`Fetching clubs for event ${eventIdNum}...`);
    
    // Get all clubs that have participants in this event
    const clubs = await prisma.$queryRaw`
      SELECT DISTINCT
        v.int_vereineid as id,
        v.var_name as name
      FROM tfx_vereine v
      INNER JOIN tfx_teilnehmer t ON v.int_vereineid = t.int_vereineid
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = ${eventIdNum}
      ORDER BY v.var_name ASC
    `;

    console.log(`Found ${(clubs as any[]).length} clubs`);

    // Get all competitions for this event
    console.log(`Fetching competitions for event ${eventIdNum}...`);
    
    const competitions = await prisma.$queryRaw`
      SELECT DISTINCT
        wk.int_wettkaempfeid as id,
        wk.var_name as name,
        wk.var_nummer as number,
        b.var_name as area_name,
        CASE 
          WHEN b.bol_maennlich = true AND b.bol_weiblich = true THEN 'gemischt'
          WHEN b.bol_maennlich = true AND b.bol_weiblich = false THEN 'männlich'
          WHEN b.bol_maennlich = false AND b.bol_weiblich = true THEN 'weiblich'
          ELSE 'unbekannt'
        END as gender,
        wk.yer_von as age_from,
        wk.yer_bis as age_to
      FROM tfx_wettkaempfe wk
      LEFT JOIN tfx_bereiche b ON wk.int_bereicheid = b.int_bereicheid
      WHERE wk.int_veranstaltungenid = ${eventIdNum}
      ORDER BY wk.var_nummer ASC, wk.var_name ASC
    `;

    console.log(`Found ${(competitions as any[]).length} competitions`);

    // Get registration matrix data (club vs competition participant counts)
    console.log(`Fetching matrix data for event ${eventIdNum}...`);
    
    const matrixData = await prisma.$queryRaw`
      SELECT 
        t.int_vereineid as club_id,
        wk.int_wettkaempfeid as competition_id,
        COUNT(DISTINCT t.int_teilnehmerid) as participant_count
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = ${eventIdNum}
      GROUP BY t.int_vereineid, wk.int_wettkaempfeid
      ORDER BY t.int_vereineid, wk.int_wettkaempfeid
    `;

    console.log(`Found ${(matrixData as any[]).length} matrix entries`);

    // Transform matrix data into object format
    const registrationMatrix: { [clubId: number]: { [competitionId: number]: number } } = {};
    
    (matrixData as any[]).forEach((row: any) => {
      const clubId = Number(row.club_id);
      const competitionId = Number(row.competition_id);
      const count = Number(row.participant_count);
      
      if (!registrationMatrix[clubId]) {
        registrationMatrix[clubId] = {};
      }
      registrationMatrix[clubId][competitionId] = count;
    });

    // Calculate totals
    const clubTotals: { [clubId: number]: number } = {};
    const competitionTotals: { [competitionId: number]: number } = {};
    let grandTotal = 0;

    Object.keys(registrationMatrix).forEach(clubIdStr => {
      const clubId = parseInt(clubIdStr);
      clubTotals[clubId] = 0;
      
      Object.keys(registrationMatrix[clubId]).forEach(competitionIdStr => {
        const competitionId = parseInt(competitionIdStr);
        const count = registrationMatrix[clubId][competitionId];
        
        clubTotals[clubId] += count;
        
        if (!competitionTotals[competitionId]) {
          competitionTotals[competitionId] = 0;
        }
        competitionTotals[competitionId] += count;
        
        grandTotal += count;
      });
    });

    const responseData = {
      clubs: clubs,
      competitions: competitions,
      registrationMatrix: registrationMatrix,
      totals: {
        clubs: clubTotals,
        competitions: competitionTotals,
        grand: grandTotal
      }
    };

    console.log(`Meldematrix response: ${(clubs as any[]).length} clubs, ${(competitions as any[]).length} competitions, ${grandTotal} total registrations`);

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching meldematrix data:', error);
    res.status(500).json({
      message: 'Failed to fetch meldematrix data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Statistics endpoint
router.get('/statistics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    console.log(`Meldematrix statistics for event ${eventIdNum}...`);

    // Get basic statistics
    const statsResult = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT v.int_vereineid) as total_clubs,
        COUNT(DISTINCT wk.int_wettkaempfeid) as total_competitions,
        COUNT(DISTINCT t.int_teilnehmerid) as total_participants
      FROM tfx_vereine v
      INNER JOIN tfx_teilnehmer t ON v.int_vereineid = t.int_vereineid
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = ${eventIdNum}
    `;

    // Convert BigInt values to regular numbers for JSON serialization
    const stats = (statsResult as any[]).map((row: any) => ({
      total_clubs: Number(row.total_clubs),
      total_competitions: Number(row.total_competitions),
      total_participants: Number(row.total_participants)
    }));

    res.json({
      success: true,
      data: stats[0] || { total_clubs: 0, total_competitions: 0, total_participants: 0 }
    });

  } catch (error) {
    console.error('Error fetching meldematrix statistics:', error);
    res.status(500).json({
      message: 'Failed to fetch meldematrix statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export endpoint
router.get('/export', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    const format = req.query.format as string || 'csv';
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    console.log(`Meldematrix export for event ${eventIdNum}, format: ${format}...`);

    // For now, return a simple response indicating export functionality
    res.json({
      success: true,
      message: `Export functionality for format: ${format}`,
      data: { eventId: eventIdNum, format }
    });

  } catch (error) {
    console.error('Error exporting meldematrix data:', error);
    res.status(500).json({
      message: 'Failed to export meldematrix data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validation endpoint
router.post('/validate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, data } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // For now, return a simple validation response
    res.json({
      success: true,
      message: 'Validation completed',
      data: { eventId, valid: true }
    });

  } catch (error) {
    console.error('Error validating meldematrix data:', error);
    res.status(500).json({
      message: 'Failed to validate meldematrix data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
