import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { buildDurchgangSummaries } from '../utils/durchgangSummary';

const router = Router();

// GET /time-planning/durchgaenge?eventId=X
// Durchgänge (competition rounds) of an event with their start time, competitions and squads.
// Used by the Jury Portal to choose a Durchgang before choosing a squad.
router.get('/durchgaenge', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: 'Event ID is required' });
    const eventIdNum = parseInt(eventId as string, 10);
    if (Number.isNaN(eventIdNum)) return res.status(400).json({ error: 'Event ID is required' });

    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: eventIdNum },
      select: {
        int_wettkaempfeid: true,
        var_name: true,
        var_nummer: true,
        int_durchgang: true,
        tim_startzeit: true,
      },
      orderBy: [{ var_nummer: 'asc' }, { var_name: 'asc' }],
    });

    const wertungen = await prisma.tfx_wertungen.findMany({
      where: {
        int_wettkaempfeid: { in: competitions.map(c => c.int_wettkaempfeid) },
        var_riege: { not: null },
      },
      select: { int_wettkaempfeid: true, var_riege: true, bol_startet_nicht: true },
    });

    const durchgaenge = buildDurchgangSummaries(
      competitions.map(c => ({
        id: c.int_wettkaempfeid,
        name: c.var_name,
        number: c.var_nummer,
        durchgang: c.int_durchgang,
        startTime: c.tim_startzeit,
      })),
      wertungen.map(w => ({
        competitionId: w.int_wettkaempfeid,
        squadName: w.var_riege,
        doesNotStart: w.bol_startet_nicht,
      }))
    );

    res.json({ durchgaenge });
  } catch (error) {
    console.error('Error fetching durchgaenge:', error);
    res.status(500).json({ error: 'Failed to fetch durchgaenge' });
  }
});

export default router;
