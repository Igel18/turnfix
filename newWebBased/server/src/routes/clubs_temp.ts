import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all events
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const competitions = await prisma.competition.findMany({
      include: {
        _count: {
          select: {
            entries: true,
            results: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const events = competitions.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      startDate: comp.startDate.toISOString(),
      endDate: comp.endDate.toISOString(),
      location: comp.location,
      type: comp.type,
      status: comp.status,
      participantCount: comp._count.entries,
      resultCount: comp._count.results
    }));

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
