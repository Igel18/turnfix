import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { buildSquadRotation } from '../utils/squadRotation';

const router = Router();

// GET /time-planning/squad-rotation?eventId=X&squad=NAME
// Devices of one squad in rotation order (tfx_riegen_x_disziplinen). Used by the Jury Portal
// to show which device the squad has done, is at now and comes next.
router.get('/squad-rotation', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, squad } = req.query;
    if (!eventId) return res.status(400).json({ error: 'Event ID is required' });
    const eventIdNum = parseInt(eventId as string, 10);
    if (Number.isNaN(eventIdNum)) return res.status(400).json({ error: 'Event ID is required' });
    if (!squad || typeof squad !== 'string') return res.status(400).json({ error: 'squad is required' });

    const rows = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: eventIdNum, var_riege: squad },
      select: {
        int_runde: true,
        int_disziplinenid: true,
        tfx_disziplinen: { select: { var_name: true, var_kurz1: true, var_icon: true } },
      },
      orderBy: [{ int_runde: 'asc' }, { int_riegen_x_disziplinenid: 'asc' }],
    });

    const devices = buildSquadRotation(
      rows.map(r => ({
        round: r.int_runde,
        disciplineId: r.int_disziplinenid,
        name: r.tfx_disziplinen?.var_name ?? null,
        shortName: r.tfx_disziplinen?.var_kurz1 ?? null,
        icon: r.tfx_disziplinen?.var_icon ?? null,
      }))
    );

    res.json({ devices });
  } catch (error) {
    console.error('Error fetching squad rotation:', error);
    res.status(500).json({ error: 'Failed to fetch squad rotation' });
  }
});

export default router;
