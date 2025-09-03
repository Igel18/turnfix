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
    
    // Get all clubs that have participants in this event
    const clubsQuery = `
      SELECT DISTINCT
        v.int_vereineid as id,
        v.var_name as name
      FROM tfx_vereine v
      INNER JOIN tfx_teilnehmer t ON v.int_vereineid = t.int_vereineid
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
      ORDER BY v.var_name ASC
    `;
    
    const clubs = await prisma.$queryRawUnsafe(clubsQuery, parseInt(eventId));

    // Get all competitions for this event
    const competitionsQuery = `
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
      WHERE wk.int_veranstaltungenid = $1
      ORDER BY wk.var_nummer ASC, wk.var_name ASC
    `;
    
    const competitions = await prisma.$queryRawUnsafe(competitionsQuery, parseInt(eventId));

    // Get registration matrix data (club vs competition participant counts)
    const matrixQuery = `
      SELECT 
        t.int_vereineid as club_id,
        wk.int_wettkaempfeid as competition_id,
        COUNT(DISTINCT t.int_teilnehmerid) as participant_count
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
      GROUP BY t.int_vereineid, wk.int_wettkaempfeid
      ORDER BY t.int_vereineid, wk.int_wettkaempfeid
    `;
    
    const matrixData = await prisma.$queryRawUnsafe(matrixQuery, parseInt(eventId));

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

export default router;
