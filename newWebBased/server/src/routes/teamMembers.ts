import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Get team members
router.get('/:id/members', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    console.log('👥 GET /api/teams/:id/members - Team ID:', teamId);

    // Get team to find competition
    const team = await (prisma as any).tfx_mannschaften.findUnique({
      where: { int_mannschaftenid: teamId }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = await (prisma as any).tfx_man_x_teilnehmer.findMany({
      where: { int_mannschaftenid: teamId },
      include: {
        tfx_teilnehmer: {
          include: {
            tfx_vereine: {
              select: {
                var_name: true
              }
            }
          }
        }
      },
      orderBy: {
        tfx_teilnehmer: {
          var_nachname: 'asc'
        }
      }
    });

    console.log('👥 Found members:', members.length);

    // Load wertungen for all members
    const memberIds = members.map((m: any) => m.int_teilnehmerid);
    const wertungen = await (prisma as any).tfx_wertungen.findMany({
      where: {
        int_wettkaempfeid: team.int_wettkaempfeid,
        int_teilnehmerid: { in: memberIds },
        int_mannschaftenid: teamId
      },
      select: {
        int_teilnehmerid: true,
        bol_ak: true,
        bol_startet_nicht: true
      }
    });

    // Create a map for quick lookup
    const wertungenMap = new Map(
      wertungen.map((w: any) => [w.int_teilnehmerid, w])
    );

    // Transform members to include gender name and AK/SN flags
    const transformedMembers = members.map((member: any) => {
      const wertung = wertungenMap.get(member.int_teilnehmerid) as any;
      return {
        ...member,
        tfx_teilnehmer: {
          ...member.tfx_teilnehmer,
          geschlecht_name: member.tfx_teilnehmer.int_geschlecht === 1 ? 'male' 
                         : member.tfx_teilnehmer.int_geschlecht === 2 ? 'female' 
                         : 'unknown'
        },
        bol_ak: wertung?.bol_ak || false,
        bol_startet_nicht: wertung?.bol_startet_nicht || false
      };
    });

    res.json({ members: transformedMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to team
router.post('/:id/members', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    const { participantId } = req.body;
    if (!participantId || isNaN(parseInt(participantId))) {
      return res.status(400).json({ error: 'Invalid participant ID' });
    }

    console.log('➕ POST /api/teams/:id/members - Team:', teamId, 'Participant:', participantId);

    // Check if already member
    const existing = await (prisma as any).tfx_man_x_teilnehmer.findFirst({
      where: {
        int_mannschaftenid: teamId,
        int_teilnehmerid: parseInt(participantId)
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Participant already in team' });
    }

    // Add member
    const member = await (prisma as any).tfx_man_x_teilnehmer.create({
      data: {
        int_mannschaftenid: teamId,
        int_teilnehmerid: parseInt(participantId)
      },
      include: {
        tfx_teilnehmer: {
          include: {
            tfx_vereine: {
              select: {
                var_name: true
              }
            }
          }
        }
      }
    });

    console.log('✅ Member added successfully');
    res.status(201).json(member);
  } catch (error) {
    console.error('Error adding team member:', error);
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid team or participant reference' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from team
router.delete('/:id/members/:participantId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const participantId = parseInt(req.params.participantId);
    
    if (isNaN(teamId) || isNaN(participantId)) {
      return res.status(400).json({ error: 'Invalid team or participant ID' });
    }

    console.log('➖ DELETE /api/teams/:id/members/:participantId - Team:', teamId, 'Participant:', participantId);

    // Find the assignment
    const assignment = await (prisma as any).tfx_man_x_teilnehmer.findFirst({
      where: {
        int_mannschaftenid: teamId,
        int_teilnehmerid: participantId
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Participant not in team' });
    }

    // Delete the assignment
    await (prisma as any).tfx_man_x_teilnehmer.delete({
      where: {
        int_man_x_teilnehmerid: assignment.int_man_x_teilnehmerid
      }
    });

    console.log('✅ Member removed successfully');
    res.status(204).send();
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update member flags (AK, Startet Nicht)
router.patch('/:id/members/:participantId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const participantId = parseInt(req.params.participantId);
    
    if (isNaN(teamId) || isNaN(participantId)) {
      return res.status(400).json({ error: 'Invalid team or participant ID' });
    }

    const { bol_ak, bol_startet_nicht } = req.body;

    console.log('🔄 PATCH /api/teams/:id/members/:participantId - Team:', teamId, 'Participant:', participantId, 'AK:', bol_ak, 'SN:', bol_startet_nicht);

    // Find the assignment to verify membership
    const assignment = await (prisma as any).tfx_man_x_teilnehmer.findFirst({
      where: {
        int_mannschaftenid: teamId,
        int_teilnehmerid: participantId
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Participant not in team' });
    }

    // Get team to find competition
    const team = await (prisma as any).tfx_mannschaften.findUnique({
      where: { int_mannschaftenid: teamId }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Find or create wertung for this participant in this competition and team
    let wertung = await (prisma as any).tfx_wertungen.findFirst({
      where: {
        int_wettkaempfeid: team.int_wettkaempfeid,
        int_teilnehmerid: participantId,
        int_mannschaftenid: teamId
      }
    });

    const updateData: any = {};
    if (bol_ak !== undefined) updateData.bol_ak = bol_ak;
    if (bol_startet_nicht !== undefined) updateData.bol_startet_nicht = bol_startet_nicht;

    if (wertung) {
      // Update existing wertung
      wertung = await (prisma as any).tfx_wertungen.update({
        where: { int_wertungenid: wertung.int_wertungenid },
        data: updateData
      });
      console.log('✅ Updated existing wertung');
    } else {
      // Create new wertung with default status
      wertung = await (prisma as any).tfx_wertungen.create({
        data: {
          int_wettkaempfeid: team.int_wettkaempfeid,
          int_teilnehmerid: participantId,
          int_mannschaftenid: teamId,
          int_statusid: 1, // Default status
          ...updateData
        }
      });
      console.log('✅ Created new wertung');
    }

    res.json({ 
      success: true,
      bol_ak: wertung.bol_ak,
      bol_startet_nicht: wertung.bol_startet_nicht
    });
  } catch (error) {
    console.error('Error updating member flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
