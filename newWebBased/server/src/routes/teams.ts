import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

// Validation schemas
const createTeamSchema = z.object({
  int_vereineid: z.number().int().positive(),
  int_wettkaempfeid: z.number().int().positive(),
  int_nummer: z.number().int().positive().optional().default(1),
  var_riege: z.string().optional(),
  int_startnummer: z.number().int().positive().optional(),
});

const updateTeamSchema = createTeamSchema.partial();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const clubId = req.query.clubId as string;
    const eventId = req.query.eventId as string;

    console.log('📋 GET /api/teams - Query params:', { limit, offset, search, clubId, eventId });

    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        { tfx_vereine: { var_name: { contains: search, mode: 'insensitive' } } },
        { var_riege: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (clubId) {
      whereConditions.int_vereineid = parseInt(clubId);
    }

    // IMPORTANT: eventId filters by COMPETITION's event, not competition ID directly
    if (eventId) {
      whereConditions.tfx_wettkaempfe = {
        int_veranstaltungenid: parseInt(eventId)
      };
    }

    console.log('📋 WHERE conditions:', whereConditions);

    const [teams, totalCount] = await Promise.all([
      (prisma as any).tfx_mannschaften.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        include: {
          tfx_vereine: {
            select: {
              var_name: true,
              var_website: true
            }
          },
          tfx_wettkaempfe: {
            select: {
              var_name: true,
              var_nummer: true,
              yer_von: true,
              yer_bis: true
            }
          }
        },
        orderBy: { int_mannschaftenid: 'asc' }
      }),
      (prisma as any).tfx_mannschaften.count({ where: whereConditions })
    ]);

    console.log('📋 Found teams:', teams.length, 'Total count:', totalCount);

    res.json({
      teams,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    const team = await (prisma as any).tfx_mannschaften.findUnique({
      where: { int_mannschaftenid: id },
      include: {
        tfx_vereine: {
          select: {
            var_name: true,
            var_website: true,
            int_start_ort: true
          }
        },
        tfx_wettkaempfe: {
          select: {
            var_name: true,
            var_nummer: true,
            yer_von: true,
            yer_bis: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new team
router.post('/', async (req, res) => {
  try {
    console.log('🏆 POST /api/teams - Creating team:', req.body);
    const validatedData = createTeamSchema.parse(req.body);
    console.log('✅ Validation passed:', validatedData);
    
    const team = await (prisma as any).tfx_mannschaften.create({
      data: validatedData,
      include: {
        tfx_vereine: {
          select: {
            var_name: true,
            var_website: true
          }
        },
        tfx_wettkaempfe: {
          select: {
            var_name: true,
            var_nummer: true
          }
        }
      }
    });

    console.log('✅ Team created successfully:', team.int_mannschaftenid);
    res.status(201).json(team);
  } catch (error) {
    console.error('❌ Error creating team:', error);
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error details:', error.issues);
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2003') {
      console.error('❌ Foreign key constraint failed');
      return res.status(400).json({ error: 'Invalid club or competition reference' });
    }
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    const validatedData = updateTeamSchema.parse(req.body);
    
    const team = await (prisma as any).tfx_mannschaften.update({
      where: { int_mannschaftenid: id },
      data: validatedData,
      include: {
        tfx_vereine: {
          select: {
            var_name: true,
            var_website: true
          }
        },
        tfx_wettkaempfe: {
          select: {
            var_name: true,
            var_nummer: true
          }
        }
      }
    });

    res.json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Team not found' });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid club or competition reference' });
    }
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    await (prisma as any).tfx_mannschaften.delete({
      where: { int_mannschaftenid: id }
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Team not found' });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete team with associated records' });
    }
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get team penalties
router.get('/:id/penalties', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    console.log('📋 GET /api/teams/:id/penalties - Team ID:', id);

    // For now, return empty array (penalties feature to be implemented)
    res.json([]);
  } catch (error) {
    console.error('Error fetching team penalties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
