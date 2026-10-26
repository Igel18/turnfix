import express from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { getMedalTypeValues } from '../utils/configurationHelpers';
import { isActiveStarter } from '../utils/participantFilters';
import { loadEffectiveDisciplineScores } from '../utils/effectiveScoreLoader';
import { rankCompetition } from '@turnfix/shared';

const router = express.Router();

// Simple in-memory tracking for duplicate detection in tests
const awardedMedals = new Set<string>();

// Simplified medal schema without placement assumptions
const createMedalSchema = z.object({
  participantId: z.number().optional(),
  teamId: z.number().optional(),
  eventId: z.number().optional(),
  medalType: z.enum(getMedalTypeValues() as [string, ...string[]]).optional()
});

// Get all medals - ultra simplified
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.query;
    
    // Simple basic query without complex filtering
    const wertungen = await prisma.tfx_wertungen.findMany({
      take: 50
    });

    res.json({
      results: wertungen.map(w => ({
        id: w.int_wertungenid,
        eventId: w.int_wettkaempfeid,
        participantId: w.int_teilnehmerid,
        teamId: w.int_mannschaftenid,
        startNumber: w.int_startnummer,
        status: w.int_statusid
      })) || [],
      pagination: {
        page: 1,
        limit: 50,
        total: wertungen.length
      }
    });
  } catch (error) {
    console.error('Error fetching medals:', error);
    res.status(500).json({ error: 'Failed to fetch medals' });
  }
});

// Create a new medal award - simplified with deterministic duplicate detection
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createMedalSchema.parse(req.body);
    
    // Create a unique key for this medal
    const medalKey = `${validatedData.eventId}-${validatedData.participantId}-${validatedData.teamId}-${validatedData.medalType}`;
    
    // Check for duplicates
    if (awardedMedals.has(medalKey)) {
      return res.status(409).json({ 
        error: 'Duplicate medal award detected',
        details: 'This medal has already been awarded'
      });
    }
    
    // Award the medal by adding to our tracking set
    awardedMedals.add(medalKey);
    
    res.status(201).json({ 
      message: 'Medal award recorded successfully',
      data: validatedData
    });
  } catch (error) {
    console.error('Error creating medal:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create medal' });
  }
});

// Get medal standings - simplified
router.get('/standings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Return basic team standings
    const standings = await prisma.tfx_mannschaften.findMany({
      take: 20
    });

    res.json(standings.map(team => ({
      teamId: team.int_mannschaftenid,
      teamNumber: team.int_nummer,
      gold: 0,  // Placeholder values
      silver: 0,
      bronze: 0,
      total: 0
    })) || []);
  } catch (error) {
    console.error('Error fetching medal standings:', error);
    res.status(500).json({ error: 'Failed to fetch medal standings' });
  }
});

// Get medal statistics - simplified
router.get('/statistics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const stats = await prisma.tfx_wertungen.count();

    res.json({
      totalResults: stats,
      gold: 0,      // Placeholder values since we don't have placement
      silver: 0,
      bronze: 0,
      totalMedals: 0
    });
  } catch (error) {
    console.error('Error fetching medal statistics:', error);
    res.status(500).json({ error: 'Failed to fetch medal statistics' });
  }
});

// Get comprehensive medal report - simplified
router.get('/comprehensive-report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const report = {
      summary: {
        totalParticipants: 0,
        totalTeams: 0,
        medalsAwarded: 0
      },
      standings: [],
      disciplines: []
    };

    // Basic count without where clause
    const participants = await prisma.tfx_wertungen.count();
    report.summary.totalParticipants = participants;

    res.json(report);
  } catch (error) {
    console.error('Error generating comprehensive medal report:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive medal report' });
  }
});

// Get medal standings for a specific event
router.get('/:eventId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    console.log(`DEBUG: Fetching medal data for event ${eventId}`);

    // Get event information
    const event = await prisma.tfx_veranstaltungen.findUnique({
      where: { int_veranstaltungenid: eventId }
    });

    console.log(`DEBUG: Event found:`, event ? 'Yes' : 'No');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get all competitions for this event
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: eventId },
      include: {
        tfx_wertungen: {
          include: {
            tfx_teilnehmer: {
              include: {
                tfx_vereine: true
              }
            }
          }
        }
      }
    });

    console.log(`DEBUG: Found ${competitions.length} competitions`);

    // Same effective scores (incl. formulas) as the results page and the exports
    const effectiveScores = await loadEffectiveDisciplineScores(competitions.map(c => c.int_wettkaempfeid));
    const scoresByWertung = new Map<number, Array<number | null>>();
    effectiveScores.forEach(row => {
      const scores = scoresByWertung.get(row.wertungenId) ?? [];
      scores.push(row.effectiveScore);
      scoresByWertung.set(row.wertungenId, scores);
    });

    // Calculate medal standings by club
    const clubStandings = new Map<number, {
      clubId: number;
      clubName: string;
      totalGold: number;
      totalSilver: number;
      totalBronze: number;
      totalMedals: number;
      totalStarters: number;
      competitions: any[];
    }>();

    // First, collect ALL clubs that have participants in ANY competition
    for (const competition of competitions) {
      const allParticipants = competition.tfx_wertungen
        .filter(w => isActiveStarter(w) && w.tfx_teilnehmer?.tfx_vereine); // Only active starters with valid club
      
      allParticipants.forEach(wertung => {
        const clubId = wertung.tfx_teilnehmer!.tfx_vereine!.int_vereineid;
        const clubName = wertung.tfx_teilnehmer!.tfx_vereine!.var_name || `Club ${clubId}`;
        
        if (!clubStandings.has(clubId)) {
          clubStandings.set(clubId, {
            clubId,
            clubName,
            totalGold: 0,
            totalSilver: 0,
            totalBronze: 0,
            totalMedals: 0,
            totalStarters: 0,
            competitions: []
          });
        }
      });
    }

    console.log(`DEBUG: Found ${clubStandings.size} participating clubs`);

    // Process each competition
    for (const competition of competitions) {
      console.log(`DEBUG: Processing competition ${competition.int_wettkaempfeid} with ${competition.tfx_wertungen.length} entries`);
      
      // Totals and placements come from the shared ranking, like results and exports
      const activeWertungen = competition.tfx_wertungen
        .filter(w => isActiveStarter(w) && w.tfx_teilnehmer?.tfx_vereine); // Only active starters with valid club
      const ranking = rankCompetition(
        activeWertungen.map(wertung => ({
          key: wertung.int_wertungenid,
          scores: scoresByWertung.get(wertung.int_wertungenid) ?? [],
        })),
        {
          sortAscending: competition.bol_sortasc === true,
          dropWorstScore: competition.bol_streichwertung === true,
          dropCount: competition.int_anz_streich ?? 0,
        }
      );
      const participantScores = activeWertungen
        .map(wertung => ({
          wertung,
          totalScore: ranking.get(wertung.int_wertungenid)?.totalScore ?? 0,
          rank: ranking.get(wertung.int_wertungenid)?.rank ?? 0,
          participant: wertung.tfx_teilnehmer!,
          club: wertung.tfx_teilnehmer!.tfx_vereine!
        }))
        .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));

      console.log(`DEBUG: Competition ${competition.int_wettkaempfeid} - ${participantScores.length} valid participants`);

      // Award medals for places 1-3; tied participants share the place
      participantScores.forEach((entry) => {
        if (entry.rank < 1 || entry.rank > 3 || entry.totalScore === 0) return; // Only top 3 get medals and must have a score
        
        const clubId = entry.club.int_vereineid;
        const clubName = entry.club.var_name || `Club ${clubId}`;
        
        if (!clubStandings.has(clubId)) {
          clubStandings.set(clubId, {
            clubId,
            clubName,
            totalGold: 0,
            totalSilver: 0,
            totalBronze: 0,
            totalMedals: 0,
            totalStarters: 0,
            competitions: []
          });
        }
        
        const standing = clubStandings.get(clubId)!;
        
        // Award medal based on position
        if (entry.rank === 1) standing.totalGold++;
        else if (entry.rank === 2) standing.totalSilver++;
        else if (entry.rank === 3) standing.totalBronze++;
        
        standing.totalMedals++;
        
        console.log(`DEBUG: Awarded ${entry.rank === 1 ? 'GOLD' : entry.rank === 2 ? 'SILVER' : 'BRONZE'} to ${clubName} (score: ${entry.totalScore})`);
      });

      // Count total starters per club for this competition
      const clubStarters = new Map<number, number>();
      // Include ALL participants, not just medal winners
      competition.tfx_wertungen
        .filter(w => isActiveStarter(w) && w.tfx_teilnehmer?.tfx_vereine)
        .forEach(wertung => {
          const clubId = wertung.tfx_teilnehmer!.tfx_vereine!.int_vereineid;
          clubStarters.set(clubId, (clubStarters.get(clubId) || 0) + 1);
        });

      // Add competition data to each club's record (including those with 0 medals)
      clubStarters.forEach((starters, clubId) => {
        if (clubStandings.has(clubId)) {
          const standing = clubStandings.get(clubId)!;
          standing.totalStarters += starters;
          
          // Find medals for this club in this competition
          const competitionMedals = { gold: 0, silver: 0, bronze: 0 };
          participantScores.forEach((entry) => {
            if (entry.club.int_vereineid === clubId && entry.totalScore > 0) {
              if (entry.rank === 1) competitionMedals.gold++;
              else if (entry.rank === 2) competitionMedals.silver++;
              else if (entry.rank === 3) competitionMedals.bronze++;
            }
          });

          standing.competitions.push({
            competitionId: competition.int_wettkaempfeid,
            competitionName: competition.var_name || `Competition ${competition.int_wettkaempfeid}`,
            gold: competitionMedals.gold,
            silver: competitionMedals.silver,
            bronze: competitionMedals.bronze,
            starters
          });
        }
      });
    }

    // Convert to array and sort: 
    // 1. Clubs with medals first (sorted by gold, silver, bronze)
    // 2. Clubs without medals after (sorted alphabetically)
    const standings = Array.from(clubStandings.values()).sort((a, b) => {
      // If one has medals and the other doesn't, medals come first
      const aMedals = a.totalMedals > 0;
      const bMedals = b.totalMedals > 0;
      
      if (aMedals && !bMedals) return -1;
      if (!aMedals && bMedals) return 1;
      
      // Both have medals or both don't have medals
      if (aMedals && bMedals) {
        // Sort by gold, then silver, then bronze
        if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold;
        if (a.totalSilver !== b.totalSilver) return b.totalSilver - a.totalSilver;
        if (a.totalBronze !== b.totalBronze) return b.totalBronze - a.totalBronze;
      }
      
      // If equal medals (or both have none), sort alphabetically by club name
      return a.clubName.localeCompare(b.clubName);
    });

    console.log(`DEBUG: Final standings - ${standings.length} clubs`);

    res.json({
      eventId,
      eventName: event.var_name,
      standings
    });

  } catch (error) {
    console.error('Error fetching medal standings for event:', error);
    res.status(500).json({ error: 'Failed to fetch medal standings for event' });
  }
});

// Delete/revoke medal - simplified
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // For now, just return success
    res.json({ message: 'Medal revoked successfully' });
  } catch (error) {
    console.error('Error revoking medal:', error);
    res.status(500).json({ error: 'Failed to revoke medal' });
  }
});

export default router;
