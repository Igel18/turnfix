import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Simple test route
router.get('/test', async (req, res) => {
  try {
    console.log('Medal test route called');
    res.json({ success: true, message: 'Medal routes working' });
  } catch (error) {
    console.error('Error in medal test route:', error);
    res.status(500).json({ success: false, error: 'Test failed' });
  }
});

// Get medal standings for an event (simplified version)
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(`Medal API called for event ${eventId}`);
    
    if (!eventId || isNaN(Number(eventId))) {
      return res.status(400).json({
        success: false,
        error: 'Valid event ID is required'
      });
    }

    // Simple test response first
    res.json({
      success: true,
      eventId: Number(eventId),
      eventName: `Test Event ${eventId}`,
      standings: [
        {
          clubId: 1,
          clubName: "Test Club 1",
          totalGold: 2,
          totalSilver: 1,
          totalBronze: 3,
          totalMedals: 6,
          totalStarters: 10,
          competitions: [
            {
              competitionId: 1,
              competitionName: "Test Competition",
              gold: 2,
              silver: 1,
              bronze: 3,
              starters: 10
            }
          ]
        }
      ]
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
