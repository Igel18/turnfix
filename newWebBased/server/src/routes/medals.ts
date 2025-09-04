import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get medal standings for an event (path parameter version)
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    if (!eventId || isNaN(Number(eventId))) {
      return res.status(400).json({
        success: false,
        error: 'Valid event ID is required'
      });
    }

    console.log(`Fetching medal standings for event ${eventId}`);

    // First get the event details using Prisma ORM
    const event = await prisma.tfx_veranstaltungen.findUnique({
      where: {
        int_veranstaltungenid: Number(eventId)
      },
      select: {
        int_veranstaltungenid: true,
        var_name: true
      }
    });

    console.log(`Event query result:`, event);

    if (!event) {
      console.log(`Event ${eventId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    console.log(`Event info:`, event);

    // Get competitions for this event using Prisma ORM
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: {
        int_veranstaltungenid: Number(eventId)
      },
      select: {
        int_wettkaempfeid: true,
        var_name: true,
        var_nummer: true
      }
    });

    console.log(`Found ${competitions.length} competitions for event ${eventId}`);

    if (!competitions || competitions.length === 0) {
      console.log(`No competitions found for event ${eventId}`);
      return res.json({
        success: true,
        eventId: Number(eventId),
        eventName: event.var_name || `Event ${eventId}`,
        standings: []
      });
    }

    // Extract competition IDs for the query
    const competitionIds = competitions.map(c => c.int_wettkaempfeid);
    console.log(`Competition IDs for medal query:`, competitionIds);

    // Get medal results using raw SQL for better performance
    const medalResults = await prisma.$queryRaw`
      WITH RankedResults AS (
        SELECT 
          w.int_wettkaempfeid,
          w.int_teilnehmerid,
          t.int_vereineid,
          ve.var_name as club_name,
          SUM(wd.rel_leistung) as total_score,
          ROW_NUMBER() OVER (
            PARTITION BY w.int_wettkaempfeid 
            ORDER BY SUM(wd.rel_leistung) DESC
          ) as rank
        FROM tfx_wertungen w
        JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
        JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
        JOIN tfx_vereine ve ON t.int_vereineid = ve.int_vereineid
        WHERE w.int_wettkaempfeid = ANY(${competitionIds}::int[])
        GROUP BY w.int_wettkaempfeid, w.int_teilnehmerid, t.int_vereineid, ve.var_name
      ),
      AllParticipants AS (
        SELECT 
          t.int_vereineid,
          ve.var_name as club_name,
          COUNT(DISTINCT w.int_teilnehmerid) as total_starters
        FROM tfx_wertungen w
        JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
        JOIN tfx_vereine ve ON t.int_vereineid = ve.int_vereineid
        WHERE w.int_wettkaempfeid = ANY(${competitionIds}::int[])
        GROUP BY t.int_vereineid, ve.var_name
      )
      SELECT 
        rr.int_wettkaempfeid as competition_id,
        rr.int_vereineid as club_id,
        rr.club_name,
        COUNT(CASE WHEN rr.rank = 1 THEN 1 END) as gold_medals,
        COUNT(CASE WHEN rr.rank = 2 THEN 1 END) as silver_medals,
        COUNT(CASE WHEN rr.rank = 3 THEN 1 END) as bronze_medals,
        COUNT(CASE WHEN rr.rank <= 3 THEN 1 END) as total_medals,
        COALESCE(ap.total_starters, 0) as total_starters
      FROM RankedResults rr
      LEFT JOIN AllParticipants ap ON rr.int_vereineid = ap.int_vereineid
      WHERE rr.rank <= 3
      GROUP BY rr.int_wettkaempfeid, rr.int_vereineid, rr.club_name, ap.total_starters
    ` as any[];

    console.log(`Medal query returned ${Array.isArray(medalResults) ? medalResults.length : 'non-array'} results`);

    // Aggregate results by club
    const clubMedals = new Map();
    const competitionDetails = new Map();

    // Initialize competition details
    competitions.forEach(comp => {
      competitionDetails.set(comp.int_wettkaempfeid, {
        id: comp.int_wettkaempfeid,
        name: comp.var_name || 'Unknown Competition',
        number: comp.var_nummer || ''
      });
    });

    // Process medal results
    if (Array.isArray(medalResults)) {
      medalResults.forEach((result: any) => {
        const clubId = Number(result.club_id);
        const competitionId = Number(result.competition_id);
        const goldCount = Number(result.gold_medals) || 0;
        const silverCount = Number(result.silver_medals) || 0;
        const bronzeCount = Number(result.bronze_medals) || 0;
        const totalCount = Number(result.total_medals) || 0;
        const starterCount = Number(result.total_starters) || 0;

        // Get or create club entry
        if (!clubMedals.has(clubId)) {
          clubMedals.set(clubId, {
            clubId: clubId,
            clubName: result.club_name || `Club ${clubId}`,
            totalGold: 0,
            totalSilver: 0,
            totalBronze: 0,
            totalMedals: 0,
            totalStarters: starterCount, // Set once per club (all participants)
            competitions: []
          });
        }

        const club = clubMedals.get(clubId);
        
        // Add to club totals (medals from this competition)
        club.totalGold += goldCount;
        club.totalSilver += silverCount;
        club.totalBronze += bronzeCount;
        club.totalMedals += totalCount;
        // Don't add starter count multiple times - it's already the total for the club

        // Add competition details
        club.competitions.push({
          competitionId: competitionId,
          competitionName: competitionDetails.get(competitionId)?.name || `Competition ${competitionId}`,
          gold: goldCount,
          silver: silverCount,
          bronze: bronzeCount,
          starters: starterCount // This represents total starters for the club, not per competition
        });
      });
    }

    // Convert to standings array
    const standings = Array.from(clubMedals.values());

    console.log(`Final standings: ${standings.length} clubs with medals`);

    res.json({
      success: true,
      eventId: Number(eventId),
      eventName: event.var_name || `Event ${eventId}`,
      standings: standings
    });

  } catch (error) {
    console.error('Error fetching medal standings:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medal standings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get medal standings for an event (query parameter version - kept for compatibility)
router.get('/standings', async (req, res) => {
  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required'
      });
    }

    console.log(`Fetching medal standings for event ${eventId}`);

    // Get all competitions for the event
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: {
        int_veranstaltungenid: parseInt(eventId as string)
      },
      include: {
        tfx_bereiche: {
          select: {
            var_name: true
          }
        }
      }
    });

    const competitionIds = competitions.map(c => c.int_wettkaempfeid);

    if (competitionIds.length === 0) {
      return res.json({
        success: true,
        data: {
          clubStandings: [],
          competitionDetails: {},
          summary: {
            totalClubs: 0,
            totalMedals: 0,
            totalGold: 0,
            totalSilver: 0,
            totalBronze: 0
          }
        }
      });
    }

    // Get medal results using raw SQL for better performance
    const medalResults = await prisma.$queryRaw`
      WITH RankedResults AS (
        SELECT 
          w.int_wettkaempfeid,
          w.int_teilnehmerid,
          v.int_vereineid,
          ve.var_name as club_name,
          SUM(wd.rel_leistung) as total_score,
          ROW_NUMBER() OVER (
            PARTITION BY w.int_wettkaempfeid 
            ORDER BY SUM(wd.rel_leistung) DESC
          ) as rank
        FROM tfx_wertungen w
        JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
        JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
        JOIN tfx_vereine ve ON t.int_vereineid = ve.int_vereineid
        WHERE w.int_wettkaempfeid = ANY(${competitionIds}::int[])
        GROUP BY w.int_wettkaempfeid, w.int_teilnehmerid, v.int_vereineid, ve.var_name
      )
      SELECT 
        int_wettkaempfeid as competition_id,
        int_vereineid as club_id,
        club_name,
        COUNT(CASE WHEN rank = 1 THEN 1 END) as gold_medals,
        COUNT(CASE WHEN rank = 2 THEN 1 END) as silver_medals,
        COUNT(CASE WHEN rank = 3 THEN 1 END) as bronze_medals,
        COUNT(CASE WHEN rank <= 3 THEN 1 END) as total_medals
      FROM RankedResults
      WHERE rank <= 3
      GROUP BY int_wettkaempfeid, int_vereineid, club_name
    ` as any[];

    // Aggregate results by club
    const clubMedals = new Map();
    const competitionDetails = new Map();

    // Initialize competition details
    competitions.forEach(comp => {
      competitionDetails.set(comp.int_wettkaempfeid, {
        id: comp.int_wettkaempfeid,
        name: comp.var_name || comp.tfx_bereiche?.var_name || 'Unknown Competition',
        number: comp.var_nummer || '',
        clubs: []
      });
    });

    // Process medal results
    medalResults.forEach((result: any) => {
      const clubKey = `${result.club_id}-${result.club_name}`;
      
      if (!clubMedals.has(clubKey)) {
        clubMedals.set(clubKey, {
          clubId: result.club_id,
          clubName: result.club_name,
          totalGold: 0,
          totalSilver: 0,
          totalBronze: 0,
          totalMedals: 0,
          competitionMedals: new Map()
        });
      }

      const club = clubMedals.get(clubKey);
      club.totalGold += result.gold_medals;
      club.totalSilver += result.silver_medals;
      club.totalBronze += result.bronze_medals;
      club.totalMedals += result.total_medals;

      // Store competition-specific medals
      club.competitionMedals.set(result.competition_id, {
        gold: result.gold_medals,
        silver: result.silver_medals,
        bronze: result.bronze_medals,
        total: result.total_medals
      });

      // Add to competition details
      const compDetail = competitionDetails.get(result.competition_id);
      if (compDetail) {
        compDetail.clubs.push({
          clubName: result.club_name,
          gold: result.gold_medals,
          silver: result.silver_medals,
          bronze: result.bronze_medals,
          total: result.total_medals
        });
      }
    });

    // Convert to array and sort by total medals (then by gold, silver, bronze)
    const clubStandings = Array.from(clubMedals.values())
      .map(club => ({
        ...club,
        competitionMedals: Object.fromEntries(club.competitionMedals)
      }))
      .sort((a, b) => {
        if (b.totalMedals !== a.totalMedals) return b.totalMedals - a.totalMedals;
        if (b.totalGold !== a.totalGold) return b.totalGold - a.totalGold;
        if (b.totalSilver !== a.totalSilver) return b.totalSilver - a.totalSilver;
        return b.totalBronze - a.totalBronze;
      });

    // Calculate summary statistics
    const summary = {
      totalClubs: clubStandings.length,
      totalMedals: clubStandings.reduce((sum, club) => sum + club.totalMedals, 0),
      totalGold: clubStandings.reduce((sum, club) => sum + club.totalGold, 0),
      totalSilver: clubStandings.reduce((sum, club) => sum + club.totalSilver, 0),
      totalBronze: clubStandings.reduce((sum, club) => sum + club.totalBronze, 0)
    };

    console.log(`Found medal standings: ${clubStandings.length} clubs, ${summary.totalMedals} total medals`);

    res.json({
      success: true,
      data: {
        clubStandings,
        competitionDetails: Object.fromEntries(competitionDetails),
        competitions: competitions.map(c => ({
          id: c.int_wettkaempfeid,
          name: c.var_name || c.tfx_bereiche?.var_name || 'Unknown Competition',
          number: c.var_nummer || ''
        })),
        summary
      }
    });

  } catch (error) {
    console.error('Error fetching medal standings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medal standings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
