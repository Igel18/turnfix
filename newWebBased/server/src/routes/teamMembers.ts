import { Router } from 'express';
import prisma from '../lib/prisma';
import { lockTeam } from '../utils/teamLock';

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
    const team = await prisma.tfx_mannschaften.findUnique({
      where: { int_mannschaftenid: teamId },
      include: { tfx_wettkaempfe: { include: { tfx_veranstaltungen: true } } }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = await prisma.tfx_man_x_teilnehmer.findMany({
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
    const memberIds = members.map(m => m.int_teilnehmerid);
    const wertungen = await prisma.tfx_wertungen.findMany({
      where: {
        int_wettkaempfeid: team.int_wettkaempfeid,
        int_teilnehmerid: { in: memberIds },
        int_mannschaftenid: teamId
      },
      select: {
        int_teilnehmerid: true,
        int_runde: true,
        bol_ak: true,
        bol_startet_nicht: true
      }
    });

    // Create a map for quick lookup
    const wertungenMap = new Map(
      wertungen.map(w => [`${w.int_teilnehmerid}:${w.int_runde ?? 1}`, w])
    );

    // Transform members to include gender name and AK/SN flags
    const transformedMembers = members.map(member => {
      const round = member.int_runde ?? team.tfx_wettkaempfe.tfx_veranstaltungen.int_runde ?? 1;
      const wertung = wertungenMap.get(`${member.int_teilnehmerid}:${round}`);
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

    const member = await prisma.$transaction(async (tx) => {
      await lockTeam(tx, teamId);
      const existing = await tx.tfx_man_x_teilnehmer.findFirst({
        where: { int_mannschaftenid: teamId, int_teilnehmerid: parseInt(participantId) }
      });
      if (existing) return { error: 'duplicate' as const };
      const team = await tx.tfx_mannschaften.findUnique({
        where: { int_mannschaftenid: teamId },
        include: { tfx_wettkaempfe: { include: { tfx_veranstaltungen: true } } }
      });
      if (!team) {
        return { error: 'team' as const };
      }
      const participant = await tx.tfx_teilnehmer.findUnique({
        where: { int_teilnehmerid: parseInt(participantId) },
        select: { int_teilnehmerid: true }
      });
      if (!participant) {
        return { error: 'participant' as const };
      }

      const round = team.tfx_wettkaempfe.tfx_veranstaltungen.int_runde ?? 1;
      const member = await tx.tfx_man_x_teilnehmer.create({
        data: {
          int_mannschaftenid: teamId,
          int_teilnehmerid: parseInt(participantId),
          int_runde: round
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
      const existingScore = await tx.tfx_wertungen.findFirst({
        where: {
          int_mannschaftenid: teamId,
          int_teilnehmerid: parseInt(participantId),
          int_wettkaempfeid: team.int_wettkaempfeid,
          OR: [{ int_runde: round }, ...(round === 1 ? [{ int_runde: null }] : [])]
        }
      });
      if (!existingScore) {
        await tx.tfx_wertungen.create({
          data: {
            int_mannschaftenid: teamId,
            int_teilnehmerid: parseInt(participantId),
            int_wettkaempfeid: team.int_wettkaempfeid,
            int_runde: round,
            int_statusid: 1,
            var_riege: team.var_riege
          }
        });
      }
      return { member };
    });

    if (member.error === 'team') {
      return res.status(404).json({ error: 'Team not found' });
    }
    if (member.error === 'participant') {
      return res.status(400).json({ error: 'Invalid team or participant reference' });
    }
    if (member.error === 'duplicate') {
      return res.status(400).json({ error: 'Participant already in team' });
    }

    console.log('✅ Member added successfully');
    res.status(201).json(member.member);
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

    const result = await prisma.$transaction(async tx => {
      await lockTeam(tx, teamId);
      const assignment = await tx.tfx_man_x_teilnehmer.findFirst({
        where: { int_mannschaftenid: teamId, int_teilnehmerid: participantId }
      });
      if (!assignment) return 'not-found' as const;
      const scores = await tx.tfx_wertungen.findMany({
        where: { int_mannschaftenid: teamId, int_teilnehmerid: participantId },
        include: {
          _count: {
            select: {
              tfx_wertungen_details: true,
              tfx_jury_results: true,
              tfx_quali_leistungen: true,
              tfx_startreihenfolge: true,
              tfx_wertungen_x_disziplinen: true
            }
          }
        }
      });
      if (scores.some(score => Object.values(score._count).some(count => count > 0))) {
        return 'has-results' as const;
      }
      await tx.tfx_wertungen.deleteMany({
        where: { int_mannschaftenid: teamId, int_teilnehmerid: participantId }
      });
      await tx.tfx_man_x_teilnehmer.deleteMany({
        where: { int_mannschaftenid: teamId, int_teilnehmerid: participantId }
      });
      return 'ok' as const;
    });

    if (result === 'not-found') {
      return res.status(404).json({ error: 'Participant not in team' });
    }
    if (result === 'has-results') {
      return res.status(409).json({ error: 'Member has associated scoring data' });
    }

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

    const wertung = await prisma.$transaction(async tx => {
      await lockTeam(tx, teamId);
      const team = await tx.tfx_mannschaften.findUnique({
        where: { int_mannschaftenid: teamId },
        include: { tfx_wettkaempfe: { include: { tfx_veranstaltungen: true } } }
      });
      if (!team) return null;
      const round = team.tfx_wettkaempfe.tfx_veranstaltungen.int_runde ?? 1;
      const assignment = await tx.tfx_man_x_teilnehmer.findFirst({
        where: {
          int_mannschaftenid: teamId,
          int_teilnehmerid: participantId,
          OR: [{ int_runde: round }, { int_runde: null }]
        }
      });
      if (!assignment) return null;
      const existing = await tx.tfx_wertungen.findFirst({
        where: {
          int_wettkaempfeid: team.int_wettkaempfeid,
          int_teilnehmerid: participantId,
          int_mannschaftenid: teamId,
          OR: [{ int_runde: round }, ...(round === 1 ? [{ int_runde: null }] : [])]
        }
      });
      const updateData = {
        ...(bol_ak !== undefined && { bol_ak }),
        ...(bol_startet_nicht !== undefined && { bol_startet_nicht })
      };
      return existing
        ? tx.tfx_wertungen.update({ where: { int_wertungenid: existing.int_wertungenid }, data: updateData })
        : tx.tfx_wertungen.create({
            data: {
              int_wettkaempfeid: team.int_wettkaempfeid,
              int_teilnehmerid: participantId,
              int_mannschaftenid: teamId,
              int_runde: round,
              int_statusid: 1,
              var_riege: team.var_riege,
              ...updateData
            }
          });
    });

    if (!wertung) return res.status(404).json({ error: 'Participant not in team for this round' });

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
