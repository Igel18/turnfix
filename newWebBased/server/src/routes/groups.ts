import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

const DEBUG = process.env.DEBUG === 'true';
const debugLog = (...args: any[]) => { if (DEBUG) console.log('🔍 DEBUG:', ...args); };

// GET /api/groups - Get all groups
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    // Note: Groups are event-independent and can be used across multiple events
    // Therefore, eventId parameter is ignored
    
    // Get all groups (no event filtering)
    const groups = await prisma.tfx_gruppen.findMany({
      take: limit,
      skip: offset,
      include: {
        tfx_gruppen_x_teilnehmer: {
          include: {
            tfx_teilnehmer: {
              include: {
                tfx_vereine: true
              }
            }
          }
        }
      },
      orderBy: {
        var_name: 'asc'
      }
    });

    const total = await prisma.tfx_gruppen.count();

    // Get unique club IDs
    const clubIds = [...new Set(groups.map((g: any) => g.int_vereineid).filter(Boolean))];
    
    // Fetch club names
    const clubs = await prisma.tfx_vereine.findMany({
      where: {
        int_vereineid: {
          in: clubIds
        }
      },
      select: {
        int_vereineid: true,
        var_name: true
      }
    });

    // Create club name lookup
    const clubNames = new Map(clubs.map(c => [c.int_vereineid, c.var_name]));

    // Map to client-friendly format
    const mappedGroups = groups.map((group: any) => ({
      id: group.int_gruppenid,
      clubId: group.int_vereineid,
      clubName: clubNames.get(group.int_vereineid) || 'Unknown Club',
      name: group.var_name,
      memberCount: group.tfx_gruppen_x_teilnehmer.length,
      members: group.tfx_gruppen_x_teilnehmer.map((gxt: any) => ({
        id: gxt.tfx_teilnehmer.int_teilnehmerid,
        firstName: gxt.tfx_teilnehmer.var_vorname,
        lastName: gxt.tfx_teilnehmer.var_nachname,
        clubId: gxt.tfx_teilnehmer.int_vereineid,
        clubName: gxt.tfx_teilnehmer.tfx_vereine?.var_name
      }))
    }));

    debugLog('Groups fetched:', mappedGroups.length);
    res.json({
      data: mappedGroups,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /api/groups/available-participants - Get event-filtered participants for group assignment
// Matches C++ GroupDialog behavior: filter participants by event and exclude already assigned
router.get('/available-participants', async (req: Request, res: Response) => {
  try {
    const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
    const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;
    const hidePlanned = req.query.hidePlanned === 'true';
    const hideOtherClubs = req.query.hideOtherClubs === 'true';

    if (!clubId || !eventId) {
      return res.status(400).json({ error: 'clubId and eventId are required' });
    }

    debugLog('Fetching available participants for club:', clubId, 'event:', eventId, 'group:', groupId);
    debugLog('Filters:', { hidePlanned, hideOtherClubs });

    // C++ SQL pattern from groupdialog.cpp:
    // WHERE int_veranstaltungenid=? 
    // AND int_teilnehmerid NOT IN (
    //   SELECT int_teilnehmerid FROM tfx_wertungen 
    //   INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid)
    //   WHERE int_veranstaltungenid=? AND int_teilnehmerid IS NOT NULL AND int_gruppenid != ?
    // )

    // Get all participants from event or from specific club
    const whereClause: any = hideOtherClubs ? {
      int_vereineid: clubId  // Only same club
    } : {};  // All clubs

    const clubParticipants = await prisma.tfx_teilnehmer.findMany({
      where: whereClause,
      include: {
        tfx_vereine: true
      }
    });

    debugLog('Club participants found:', clubParticipants.length);

    // Get participants already assigned to scores in this event (excluding current group)
    // Only apply if hidePlanned is true
    let assignedParticipantIds = new Set<number>();
    
    if (hidePlanned) {
      const assignedScoresQuery = groupId 
        ? `
          SELECT DISTINCT w.int_teilnehmerid
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
            AND w.int_teilnehmerid IS NOT NULL
            AND (w.int_gruppenid IS NULL OR w.int_gruppenid != $2)
        `
        : `
          SELECT DISTINCT w.int_teilnehmerid
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
            AND w.int_teilnehmerid IS NOT NULL
        `;

      const assignedScores = await prisma.$queryRawUnsafe<any[]>(
        assignedScoresQuery,
        eventId,
        ...(groupId ? [groupId] : [])
      );

      assignedParticipantIds = new Set(assignedScores.map((s: any) => s.int_teilnehmerid));
      debugLog('Already assigned participant IDs:', Array.from(assignedParticipantIds));
    }

    // Filter out assigned participants
    const availableParticipants = clubParticipants
      .filter((p: any) => !assignedParticipantIds.has(p.int_teilnehmerid))
      .map((p: any) => {
        const club = p.tfx_vereine;
        
        // Calculate age
        let age = null;
        if (p.dat_geburtstag) {
          const birthDate = new Date(p.dat_geburtstag);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return {
          int_teilnehmerid: p.int_teilnehmerid,
          var_vorname: p.var_vorname,
          var_nachname: p.var_nachname,
          int_vereineid: p.int_vereineid,
          verein_name: club?.var_name || null,
          dat_geburtstag: p.dat_geburtstag,
          age,
          geschlecht_name: p.int_geschlecht === 1 ? 'male' : p.int_geschlecht === 2 ? 'female' : 'unknown'
        };
      });

    debugLog('Available participants (after filtering):', availableParticipants.length);
    res.json(availableParticipants);
  } catch (error) {
    console.error('Error fetching available participants:', error);
    res.status(500).json({ error: 'Failed to fetch available participants' });
  }
});

// GET /api/groups/:id - Get single group
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const group = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: id },
      include: {
        tfx_gruppen_x_teilnehmer: {
          include: {
            tfx_teilnehmer: {
              include: {
                tfx_vereine: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Map to client-friendly format
    const mappedGroup = {
      id: group.int_gruppenid,
      clubId: group.int_vereineid,
      name: group.var_name,
      memberCount: (group as any).tfx_gruppen_x_teilnehmer.length,
      members: (group as any).tfx_gruppen_x_teilnehmer.map((gxt: any) => ({
        id: gxt.tfx_teilnehmer.int_teilnehmerid,
        firstName: gxt.tfx_teilnehmer.var_vorname,
        lastName: gxt.tfx_teilnehmer.var_nachname,
        clubId: gxt.tfx_teilnehmer.int_vereineid,
        clubName: gxt.tfx_teilnehmer.tfx_vereine?.var_name
      }))
    };

    debugLog('Group fetched:', mappedGroup.id);
    res.json(mappedGroup);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// GET /api/groups/club/:clubId - Get groups by club
router.get('/club/:clubId', async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId);

    const groups = await prisma.tfx_gruppen.findMany({
      where: { int_vereineid: clubId },
      include: {
        tfx_gruppen_x_teilnehmer: {
          include: {
            tfx_teilnehmer: true
          }
        }
      },
      orderBy: {
        var_name: 'asc'
      }
    });

    // Map to client-friendly format
    const mappedGroups = groups.map((group: any) => ({
      id: group.int_gruppenid,
      clubId: group.int_vereineid,
      name: group.var_name,
      memberCount: group.tfx_gruppen_x_teilnehmer.length,
      members: group.tfx_gruppen_x_teilnehmer.map((gxt: any) => ({
        id: gxt.tfx_teilnehmer.int_teilnehmerid,
        firstName: gxt.tfx_teilnehmer.var_vorname,
        lastName: gxt.tfx_teilnehmer.var_nachname
      }))
    }));

    debugLog('Groups for club fetched:', mappedGroups.length);
    res.json(mappedGroups);
  } catch (error) {
    console.error('Error fetching groups by club:', error);
    res.status(500).json({ error: 'Failed to fetch groups by club' });
  }
});

// POST /api/groups - Create new group
router.post('/', async (req: Request, res: Response) => {
  try {
    const { clubId, name } = req.body;

    // Validation
    if (!clubId || !name) {
      return res.status(400).json({ error: 'clubId and name are required' });
    }

    // Verify club exists
    const club = await prisma.tfx_vereine.findUnique({
      where: { int_vereineid: clubId }
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    const group = await prisma.tfx_gruppen.create({
      data: {
        int_vereineid: clubId,
        var_name: name
      }
    });

    debugLog('Group created:', group.int_gruppenid);
    res.status(201).json({
      id: group.int_gruppenid,
      clubId: group.int_vereineid,
      name: group.var_name,
      memberCount: 0,
      members: []
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT /api/groups/:id - Update group
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { clubId, name } = req.body;

    // Validation
    if (!clubId || !name) {
      return res.status(400).json({ error: 'clubId and name are required' });
    }

    // Verify group exists
    const existingGroup = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: id }
    });

    if (!existingGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify club exists
    const club = await prisma.tfx_vereine.findUnique({
      where: { int_vereineid: clubId }
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    const group = await prisma.tfx_gruppen.update({
      where: { int_gruppenid: id },
      data: {
        int_vereineid: clubId,
        var_name: name
      },
      include: {
        tfx_gruppen_x_teilnehmer: true
      }
    });

    debugLog('Group updated:', group.int_gruppenid);
    res.json({
      id: group.int_gruppenid,
      clubId: group.int_vereineid,
      name: group.var_name,
      memberCount: group.tfx_gruppen_x_teilnehmer.length
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE /api/groups/:id - Delete group
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Check if group has associated scores (wertungen)
    const scoresCount = await prisma.tfx_wertungen.count({
      where: { int_gruppenid: id }
    });

    if (scoresCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete group with existing scores. Remove scores first.' 
      });
    }

    // Delete group (cascade will handle members)
    await prisma.tfx_gruppen.delete({
      where: { int_gruppenid: id }
    });

    debugLog('Group deleted:', id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
