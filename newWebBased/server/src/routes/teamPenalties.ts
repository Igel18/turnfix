import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const DEBUG = process.env.DEBUG === 'true';
const debugLog = (...args: any[]) => { if (DEBUG) console.log('🔍 DEBUG:', ...args); };

// GET /api/team-penalties - Get all available team penalties
router.get('/', async (req: Request, res: Response) => {
  try {
    const penalties = await prisma.tfx_mannschaften_abzug.findMany({
      orderBy: {
        var_name: 'asc'
      }
    });

    // Map to client-friendly format
    const mappedPenalties = penalties.map((penalty: any) => ({
      id: penalty.int_mannschaften_abzugid,
      name: penalty.var_name,
      value: penalty.rel_abzug
    }));

    debugLog('Team penalties fetched:', mappedPenalties.length);
    res.json(mappedPenalties);
  } catch (error) {
    console.error('Error fetching team penalties:', error);
    res.status(500).json({ error: 'Failed to fetch team penalties' });
  }
});

// POST /api/team-penalties - Create new team penalty
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, value } = req.body;

    // Validation
    if (!name || value === undefined) {
      return res.status(400).json({ error: 'name and value are required' });
    }

    const penalty = await prisma.tfx_mannschaften_abzug.create({
      data: {
        var_name: name,
        rel_abzug: value
      }
    });

    debugLog('Team penalty created:', penalty.int_mannschaften_abzugid);
    res.status(201).json({
      id: penalty.int_mannschaften_abzugid,
      name: penalty.var_name,
      value: penalty.rel_abzug
    });
  } catch (error) {
    console.error('Error creating team penalty:', error);
    res.status(500).json({ error: 'Failed to create team penalty' });
  }
});

// PUT /api/team-penalties/:id - Update team penalty
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, value } = req.body;

    // Validation
    if (!name || value === undefined) {
      return res.status(400).json({ error: 'name and value are required' });
    }

    const penalty = await prisma.tfx_mannschaften_abzug.update({
      where: { int_mannschaften_abzugid: id },
      data: {
        var_name: name,
        rel_abzug: value
      }
    });

    debugLog('Team penalty updated:', penalty.int_mannschaften_abzugid);
    res.json({
      id: penalty.int_mannschaften_abzugid,
      name: penalty.var_name,
      value: penalty.rel_abzug
    });
  } catch (error) {
    console.error('Error updating team penalty:', error);
    res.status(500).json({ error: 'Failed to update team penalty' });
  }
});

// DELETE /api/team-penalties/:id - Delete team penalty
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Check if penalty is used by any teams
    const usageCount = await prisma.tfx_man_x_man_ab.count({
      where: { int_mannschaften_abzugid: id }
    });

    if (usageCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete penalty that is assigned to teams' 
      });
    }

    await prisma.tfx_mannschaften_abzug.delete({
      where: { int_mannschaften_abzugid: id }
    });

    debugLog('Team penalty deleted:', id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting team penalty:', error);
    res.status(500).json({ error: 'Failed to delete team penalty' });
  }
});

// GET /api/teams/:teamId/penalties - Get penalties assigned to a team
router.get('/teams/:teamId/penalties', async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);

    const teamPenalties = await prisma.tfx_man_x_man_ab.findMany({
      where: { int_mannschaftenid: teamId },
      include: {
        tfx_mannschaften_abzug: true
      }
    });

    // Map to client-friendly format
    const mappedPenalties = teamPenalties.map((tp: any) => ({
      id: tp.tfx_mannschaften_abzug.int_mannschaften_abzugid,
      assignmentId: tp.int_man_x_man_abid,
      name: tp.tfx_mannschaften_abzug.var_name,
      value: tp.tfx_mannschaften_abzug.rel_abzug
    }));

    const totalPenalty = mappedPenalties.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    debugLog('Team penalties fetched for team:', teamId, mappedPenalties.length);
    res.json({
      penalties: mappedPenalties,
      totalPenalty
    });
  } catch (error) {
    console.error('Error fetching team penalties:', error);
    res.status(500).json({ error: 'Failed to fetch team penalties' });
  }
});

// POST /api/teams/:teamId/penalties - Assign penalty to team
router.post('/teams/:teamId/penalties', async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { penaltyId } = req.body;

    if (!penaltyId) {
      return res.status(400).json({ error: 'penaltyId is required' });
    }

    // Verify team exists
    const team = await prisma.tfx_mannschaften.findUnique({
      where: { int_mannschaftenid: teamId }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Verify penalty exists
    const penalty = await prisma.tfx_mannschaften_abzug.findUnique({
      where: { int_mannschaften_abzugid: penaltyId }
    });

    if (!penalty) {
      return res.status(404).json({ error: 'Penalty not found' });
    }

    // Check if already assigned
    const existing = await prisma.tfx_man_x_man_ab.findFirst({
      where: {
        int_mannschaftenid: teamId,
        int_mannschaften_abzugid: penaltyId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Penalty already assigned to this team' });
    }

    // Assign penalty
    const assignment = await prisma.tfx_man_x_man_ab.create({
      data: {
        int_mannschaftenid: teamId,
        int_mannschaften_abzugid: penaltyId
      }
    });

    debugLog('Penalty assigned to team:', teamId, penaltyId);
    res.status(201).json({
      id: penaltyId,
      assignmentId: assignment.int_man_x_man_abid,
      name: penalty.var_name,
      value: penalty.rel_abzug
    });
  } catch (error) {
    console.error('Error assigning penalty to team:', error);
    res.status(500).json({ error: 'Failed to assign penalty to team' });
  }
});

// DELETE /api/teams/:teamId/penalties/:penaltyId - Remove penalty from team
router.delete('/teams/:teamId/penalties/:penaltyId', async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const penaltyId = parseInt(req.params.penaltyId);

    // Find the assignment
    const assignment = await prisma.tfx_man_x_man_ab.findFirst({
      where: {
        int_mannschaftenid: teamId,
        int_mannschaften_abzugid: penaltyId
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Penalty assignment not found' });
    }

    // Delete assignment
    await prisma.tfx_man_x_man_ab.delete({
      where: { int_man_x_man_abid: assignment.int_man_x_man_abid }
    });

    debugLog('Penalty removed from team:', teamId, penaltyId);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing penalty from team:', error);
    res.status(500).json({ error: 'Failed to remove penalty from team' });
  }
});

export default router;
