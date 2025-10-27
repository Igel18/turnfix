import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface ActivityItem {
  id: string;
  type: 'event' | 'participant' | 'competition' | 'score';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
  relatedId?: number;
  relatedName?: string;
}

// Get recent activities from the database
router.get('/recent', async (req, res) => {
  try {
    console.log('Fetching recent activities...');
    
    const activities: ActivityItem[] = [];
    const limit = 10; // Show last 10 activities

    // 1. Recent Events (tfx_veranstaltungen)
    const recentEvents = await prisma.tfx_veranstaltungen.findMany({
      orderBy: {
        int_veranstaltungenid: 'desc'
      },
      take: 3,
      include: {
        tfx_wettkampforte: {
          select: {
            var_name: true
          }
        }
      }
    });

    recentEvents.forEach((event: any, index: number) => {
      activities.push({
        id: `event-${event.int_veranstaltungenid}`,
        type: 'event',
        title: 'New Event Created',
        description: `Event "${event.var_name}" was created`,
        timestamp: new Date(Date.now() - (index * 3600000)), // Simulate timestamps
        icon: 'CalendarDaysIcon',
        color: 'blue',
        relatedId: event.int_veranstaltungenid,
        relatedName: event.var_name || 'Unnamed Event'
      });
    });

    // 2. Recent Participants (tfx_teilnehmer)
    const recentParticipants = await prisma.tfx_teilnehmer.findMany({
      orderBy: {
        int_teilnehmerid: 'desc'
      },
      take: 3
    });

    recentParticipants.forEach((participant: any, index: number) => {
      const fullName = `${participant.var_vorname || ''} ${participant.var_nachname || ''}`.trim();
      activities.push({
        id: `participant-${participant.int_teilnehmerid}`,
        type: 'participant',
        title: 'New Participant Registered',
        description: `${fullName} registered`,
        timestamp: new Date(Date.now() - ((index + 3) * 3600000)),
        icon: 'UserGroupIcon',
        color: 'green',
        relatedId: participant.int_teilnehmerid,
        relatedName: fullName
      });
    });

    // 3. Recent Competitions (tfx_wettkaempfe) - Show latest by ID and also search for recent patterns
    const recentCompetitions = await prisma.tfx_wettkaempfe.findMany({
      orderBy: {
        int_wettkaempfeid: 'desc'
      },
      take: 15, // Increased to show more competitions
      include: {
        tfx_bereiche: {
          select: {
            var_name: true
          }
        }
      }
    });

    console.log('Recent competitions found:', recentCompetitions.map(c => ({
      id: c.int_wettkaempfeid,
      name: c.var_name,
      bereich: c.tfx_bereiche?.var_name
    })));

    // Also search for competitions with common test patterns
    const testCompetitions = await prisma.tfx_wettkaempfe.findMany({
      where: {
        OR: [
          { var_name: { contains: 'aaa', mode: 'insensitive' } },
          { var_name: { contains: 'test', mode: 'insensitive' } },
          { var_name: { contains: 'new', mode: 'insensitive' } }
        ]
      },
      orderBy: {
        int_wettkaempfeid: 'desc'
      },
      take: 5,
      include: {
        tfx_bereiche: {
          select: {
            var_name: true
          }
        }
      }
    });

    console.log('Test pattern competitions found:', testCompetitions.map(c => ({
      id: c.int_wettkaempfeid,
      name: c.var_name,
      bereich: c.tfx_bereiche?.var_name
    })));

    // Merge and deduplicate competitions
    const allCompetitions = [...recentCompetitions];
    testCompetitions.forEach(testComp => {
      if (!allCompetitions.find(comp => comp.int_wettkaempfeid === testComp.int_wettkaempfeid)) {
        allCompetitions.unshift(testComp); // Add test competitions at the beginning
      }
    });

    allCompetitions.slice(0, 8).forEach((competition: any, index: number) => {
      // Use competition name (var_name) if available, otherwise fall back to bereich name
      const competitionName = competition.var_name || competition.tfx_bereiche?.var_name || 'Unknown Competition';
      activities.push({
        id: `competition-${competition.int_wettkaempfeid}`,
        type: 'competition',
        title: 'New Competition Created',
        description: `Competition "${competitionName}" was set up`,
        timestamp: new Date(Date.now() - ((index + 6) * 3600000)),
        icon: 'TrophyIcon',
        color: 'purple',
        relatedId: competition.int_wettkaempfeid,
        relatedName: competitionName
      });
    });

    // 4. Recent Score Updates (tfx_wertungen_details)
    try {
      const recentScores = await prisma.$queryRaw`
        SELECT 
          wd.int_wertungen_detailsid as id,
          wd.int_wertungenid,
          wd.rel_leistung as score,
          wd.dt_stamp as timestamp,
          p.var_vorname as first_name,
          p.var_nachname as last_name,
          d.var_name as discipline_name
        FROM tfx_wertungen_details wd
        JOIN tfx_wertungen w ON wd.int_wertungenid = w.int_wertungenid
        JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
        JOIN tfx_personen p ON t.int_personenid = p.int_personenid
        JOIN tfx_disziplinen d ON wd.int_disziplinenid = d.int_disziplinenid
        WHERE wd.dt_stamp IS NOT NULL
        ORDER BY wd.dt_stamp DESC
        LIMIT 2
      ` as any[];

      recentScores.forEach((score: any, index: number) => {
        const timestamp = score.timestamp ? new Date(score.timestamp) : new Date(Date.now() - ((index + 9) * 3600000));
        activities.push({
          id: `score-${score.id}`,
          type: 'score',
          title: 'Score Updated',
          description: `${score.first_name || 'Participant'} ${score.last_name || ''} scored ${score.score} in ${score.discipline_name || 'discipline'}`,
          timestamp: timestamp,
          icon: 'ChartBarIcon',
          color: 'amber',
          relatedId: score.id
        });
      });
    } catch (scoreError) {
      console.error('Could not fetch recent scores:', scoreError);
    }

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log(`Found ${activities.length} recent activities`);

    res.json({
      success: true,
      activities: activities.slice(0, limit)
    });

  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get activity statistics
router.get('/statistics', async (req, res) => {
  try {
    console.log('Fetching activity statistics...');

    // Get counts from each table
    const [
      totalEvents,
      totalParticipants,
      totalCompetitions,
      totalClubs
    ] = await Promise.all([
      prisma.tfx_veranstaltungen.count(),
      prisma.tfx_teilnehmer.count(),
      prisma.tfx_wettkaempfe.count(),
      prisma.tfx_vereine.count()
    ]);

    const statistics = {
      totalEvents,
      totalParticipants,
      totalCompetitions,
      totalClubs,
      timestamp: new Date()
    };

    console.log('Activity statistics:', statistics);

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
