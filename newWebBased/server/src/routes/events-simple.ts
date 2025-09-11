import { Router, Request, Response } from 'express';

const router = Router();

// Simple test route
router.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Events API is working' });
});

// Simple events list
router.get('/list', (req: Request, res: Response) => {
  const mockEvents = [
    {
      id: 38,
      name: 'Test Wettkampf 2025',
      date: '2025-10-15',
      location: 'Musterstadt'
    }
  ];
  res.json(mockEvents);
});

// Simple statistics route
router.get('/:id/statistics', (req: Request, res: Response) => {
  const eventId = req.params.id;
  const stats = {
    eventId: parseInt(eventId),
    totalParticipants: 245,
    totalClubs: 18,
    totalCompetitions: 12
  };
  res.json(stats);
});

export default router;
