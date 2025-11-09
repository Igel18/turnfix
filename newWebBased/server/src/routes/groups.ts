import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const DEBUG = process.env.DEBUG === 'true';
const debugLog = (...args: any[]) => { if (DEBUG) console.log('🔍 DEBUG:', ...args); };

// GET /api/groups - Get all groups
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : undefined;

    let groups;
    let total;

    if (eventId) {
      // Filter groups by event - get groups that have members participating in competitions of this event
      const groupsWithMembers = await prisma.$queryRaw`
        SELECT DISTINCT g.int_gruppenid
        FROM tfx_gruppen g
        INNER JOIN tfx_wertungen w ON w.int_gruppenid = g.int_gruppenid
        INNER JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = w.int_wettkaempfeid
        WHERE wk.int_veranstaltungenid = ${eventId}
      ` as any[];

      const groupIds = groupsWithMembers.map((g: any) => g.int_gruppenid);

      if (groupIds.length === 0) {
        // No groups found for this event
        return res.json({
          data: [],
          total: 0,
          limit,
          offset
        });
      }

      groups = await prisma.tfx_gruppen.findMany({
        where: {
          int_gruppenid: {
            in: groupIds
          }
        },
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

      total = groupIds.length;
    } else {
      // No event filter - return all groups
      groups = await prisma.tfx_gruppen.findMany({
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

      total = await prisma.tfx_gruppen.count();
    }

    // Map to client-friendly format
    const mappedGroups = groups.map((group: any) => ({
      id: group.int_gruppenid,
      clubId: group.int_vereineid,
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
