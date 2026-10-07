import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { z } from 'zod';

const router = Router();

// --- Bahn (Lane) Management via Competitions ---

// Get all Bahnen (lanes) for an event (distinct int_bahn values in tfx_wettkaempfe)
router.get('/bahnen', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    // Get all competitions for the event and group by int_bahn
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: Number(eventId) },
      select: { int_bahn: true },
      orderBy: { int_bahn: 'asc' }
    });
    // Get unique, sorted Bahn numbers
    const bahnen = Array.from(new Set(competitions.map(c => c.int_bahn).filter(b => b != null))).sort((a, b) => (a ?? 0) - (b ?? 0));
    res.json({ bahnen });
  } catch (error) {
    console.error('Error fetching Bahnen:', error);
    res.status(500).json({ error: 'Failed to fetch Bahnen' });
  }
});

// Update a competition's Bahn (lane)
router.put('/competition/:competitionId/bahn', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const competitionId = Number(req.params.competitionId);
    console.log('[BAHN-UPDATE] Request received:', { competitionId, body: req.body });
    
    const schema = z.object({
      bahn: z.number().min(1)
    });
    const { bahn } = schema.parse(req.body);
    
    console.log('[BAHN-UPDATE] Parsed data:', { competitionId, bahn });
    
    // Check if competition exists first
    const existing = await prisma.tfx_wettkaempfe.findUnique({
      where: { int_wettkaempfeid: competitionId }
    });
    
    if (!existing) {
      console.error('[BAHN-UPDATE] Competition not found:', competitionId);
      return res.status(404).json({ error: 'Competition not found' });
    }
    
    console.log('[BAHN-UPDATE] Current int_bahn:', existing.int_bahn, '-> New:', bahn);
    
    const updated = await prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: competitionId },
      data: { int_bahn: bahn }
    });
    
    console.log('[BAHN-UPDATE] ✅ Successfully updated to Bahn:', updated.int_bahn);
    
    res.json({ competition: updated });
  } catch (error) {
    console.error('[BAHN-UPDATE] ❌ Error updating competition Bahn:', error);
    res.status(500).json({ error: 'Failed to update competition Bahn' });
  }
});


// --- Squad-to-Bahn Assignment (by updating competition's int_bahn) ---
// To assign a squad to a Bahn, update the int_bahn field of the relevant competition (tfx_wettkaempfe)
// Use the /competition/:competitionId/bahn endpoint above for this purpose.

// Create a new round (Durchgang) for the event
router.post('/round', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    // Find the current max round for this event
    const maxRound = await prisma.tfx_wettkaempfe.aggregate({
      where: { int_veranstaltungenid: Number(eventId) },
      _max: { int_durchgang: true }
    });
    const newRound = (maxRound._max.int_durchgang || 0) + 1;
    // No DB insert needed, just return the new round number (rounds are implicit)
    res.json({ round: newRound });
  } catch (error) {
    console.error('Error creating new round:', error);
    res.status(500).json({ error: 'Failed to create new round' });
  }
});

// Update a competition's round (for drag & drop)
router.put('/competition/:id/round', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const compId = Number(req.params.id);
    const { round } = req.body;
    if (!compId || !round) {
      return res.status(400).json({ error: 'Competition ID and round are required' });
    }
    const updated = await prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: compId },
      data: { int_durchgang: round }
    });
    res.json({ success: true, competition: updated });
  } catch (error) {
    console.error('Error updating competition round:', error);
    res.status(500).json({ error: 'Failed to update competition round' });
  }
});

// Update squad start device (bol_erstes_geraet)
router.put('/squad-start-device', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, squadName, round, disciplineId } = req.body;
    
    if (!eventId || !squadName || round === undefined || !disciplineId) {
      return res.status(400).json({ 
        error: 'Event ID, squad name, round, and discipline ID are required' 
      });
    }

    const eventIdNum = Number(eventId);
    const roundNum = Number(round);
    const disciplineIdNum = Number(disciplineId);

    // First, set all bol_erstes_geraet to false for this squad in this round
    await prisma.tfx_riegen_x_disziplinen.updateMany({
      where: {
        int_veranstaltungenid: eventIdNum,
        var_riege: squadName,
        int_runde: roundNum
      },
      data: {
        bol_erstes_geraet: false
      }
    });

    // Then, set the selected discipline to true
    const updated = await prisma.tfx_riegen_x_disziplinen.updateMany({
      where: {
        int_veranstaltungenid: eventIdNum,
        var_riege: squadName,
        int_runde: roundNum,
        int_disziplinenid: disciplineIdNum
      },
      data: {
        bol_erstes_geraet: true
      }
    });

    if (updated.count === 0) {
      return res.status(404).json({ 
        error: 'Squad-discipline combination not found' 
      });
    }

    res.json({ 
      success: true, 
      message: `Start device updated for squad ${squadName}`,
      updated: updated.count
    });

  } catch (error) {
    console.error('Error updating squad start device:', error);
    res.status(500).json({ error: 'Failed to update squad start device' });
  }
});

export default router;
