/**
 * participant-status.ts
 * REST API for reading and manually updating participant statuses.
 *
 * Endpoints:
 *   GET  /api/participant-status?eventId=X
 *        Returns all participant statuses for an event.
 *
 *   PATCH /api/participant-status/:wertungenId
 *        Manually set a participant's status (e.g. "Keine Wertung verfügbar").
 *        Triggers squad-status propagation automatically.
 *
 *   GET  /api/participant-status/statuses
 *        Returns all available status options for the dropdown UI.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';
import { makeDbAdapter, setParticipantStatus } from '../utils/participantStatusService';

const router = Router();

// ─── GET /api/participant-status?eventId=X ────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const eventId = parseInt(req.query.eventId as string);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'eventId query parameter is required' });
    }

    const db = makeDbAdapter(prisma);
    const rows = await db.getParticipantStatusesForEvent(eventId);

    res.json({
      participants: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error('Error fetching participant statuses:', error);
    res.status(500).json({ error: 'Failed to fetch participant statuses' });
  }
});

// ─── GET /api/participant-status/statuses ─────────────────────────────────────

router.get('/statuses', async (_req, res) => {
  try {
    const statuses = await prisma.tfx_status.findMany({
      orderBy: { int_statusid: 'asc' },
      select:  { int_statusid: true, var_name: true, ary_colorcode: true },
    });
    res.json(statuses.map(s => ({
      id:        s.int_statusid,
      name:      s.var_name,
      colorCode: s.ary_colorcode,
    })));
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// ─── PATCH /api/participant-status/:wertungenId ───────────────────────────────

const patchSchema = z.object({
  statusId: z.number().int().positive(),
});

router.patch('/:wertungenId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const wertungenId = parseInt(req.params.wertungenId);
    if (isNaN(wertungenId)) {
      return res.status(400).json({ error: 'Invalid wertungenId' });
    }

    const validation = patchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid body', details: validation.error.issues });
    }

    const { statusId } = validation.data;

    // Verify status exists in DB
    const status = await prisma.tfx_status.findUnique({ where: { int_statusid: statusId } });
    if (!status) {
      return res.status(404).json({ error: `Status ${statusId} not found` });
    }

    const db = makeDbAdapter(prisma);
    const io = req.app.get('io');

    await setParticipantStatus(
      wertungenId,
      statusId,
      db,
      io ? (eventId, riege) => {
        io.to(`competition-${eventId}`).emit('participant-status-updated', { eventId, riege });
        io.to(`competition-${eventId}`).emit('squad-status-updated',       { eventId, riege });
      } : undefined,
    );

    res.json({ success: true, wertungenId, statusId });
  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
});

export default router;
