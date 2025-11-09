import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const DEBUG = process.env.DEBUG === 'true';
const debugLog = (...args: any[]) => { if (DEBUG) console.log('🔍 DEBUG:', ...args); };

// GET /api/groups/:id/members - Get group members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);

    // Verify group exists
    const group = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = await prisma.tfx_gruppen_x_teilnehmer.findMany({
      where: { int_gruppenid: groupId },
      include: {
        tfx_teilnehmer: {
          include: {
            tfx_vereine: true
          }
        }
      }
    });

    // Map to client-friendly format
    const mappedMembers = members.map((member: any) => ({
      id: member.int_teilnehmerid,
      groupMemberId: member.int_gruppen_x_teilnehmerid,
      firstName: member.tfx_teilnehmer.var_vorname,
      lastName: member.tfx_teilnehmer.var_nachname,
      clubId: member.tfx_teilnehmer.int_vereineid,
      clubName: member.tfx_teilnehmer.tfx_vereine?.var_name,
      birthdate: member.tfx_teilnehmer.dat_geburtstag
    }));

    debugLog('Group members fetched:', mappedMembers.length);
    res.json(mappedMembers);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

// POST /api/groups/:id/members - Add member to group
router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }

    // Verify group exists
    const group = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify participant exists
    const participant = await prisma.tfx_teilnehmer.findUnique({
      where: { int_teilnehmerid: participantId },
      include: {
        tfx_vereine: true
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Check if participant is already in the group
    const existingMember = await prisma.tfx_gruppen_x_teilnehmer.findFirst({
      where: {
        int_gruppenid: groupId,
        int_teilnehmerid: participantId
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Participant is already in this group' });
    }

    // Add participant to group
    const member = await prisma.tfx_gruppen_x_teilnehmer.create({
      data: {
        int_gruppenid: groupId,
        int_teilnehmerid: participantId
      }
    });

    debugLog('Member added to group:', groupId, participantId);
    res.status(201).json({
      id: participantId,
      groupMemberId: member.int_gruppen_x_teilnehmerid,
      firstName: participant.var_vorname,
      lastName: participant.var_nachname,
      clubId: participant.int_vereineid,
      clubName: (participant as any).tfx_vereine?.var_name,
      birthdate: participant.dat_geburtstag
    });
  } catch (error) {
    console.error('Error adding member to group:', error);
    res.status(500).json({ error: 'Failed to add member to group' });
  }
});

// POST /api/groups/:id/members/bulk - Add multiple members to group
router.post('/:id/members/bulk', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const { participantIds } = req.body;

    if (!participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'participantIds array is required' });
    }

    // Verify group exists
    const group = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get existing members to avoid duplicates
    const existingMembers = await prisma.tfx_gruppen_x_teilnehmer.findMany({
      where: { int_gruppenid: groupId },
      select: { int_teilnehmerid: true }
    });

    const existingIds = new Set(existingMembers.map(m => m.int_teilnehmerid));

    // Filter out already existing members
    const newParticipantIds = participantIds.filter(id => !existingIds.has(id));

    if (newParticipantIds.length === 0) {
      return res.status(400).json({ error: 'All participants are already in this group' });
    }

    // Create memberships
    const members = await prisma.tfx_gruppen_x_teilnehmer.createMany({
      data: newParticipantIds.map(participantId => ({
        int_gruppenid: groupId,
        int_teilnehmerid: participantId
      }))
    });

    debugLog('Bulk members added to group:', groupId, newParticipantIds.length);
    res.status(201).json({
      added: members.count,
      skipped: participantIds.length - newParticipantIds.length
    });
  } catch (error) {
    console.error('Error adding bulk members to group:', error);
    res.status(500).json({ error: 'Failed to add bulk members to group' });
  }
});

// DELETE /api/groups/:groupId/members/:participantId - Remove member from group
router.delete('/:groupId/members/:participantId', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const participantId = parseInt(req.params.participantId);

    // Find the membership record
    const member = await prisma.tfx_gruppen_x_teilnehmer.findFirst({
      where: {
        int_gruppenid: groupId,
        int_teilnehmerid: participantId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    // Delete membership
    await prisma.tfx_gruppen_x_teilnehmer.delete({
      where: { int_gruppen_x_teilnehmerid: member.int_gruppen_x_teilnehmerid }
    });

    debugLog('Member removed from group:', groupId, participantId);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing member from group:', error);
    res.status(500).json({ error: 'Failed to remove member from group' });
  }
});

export default router;
