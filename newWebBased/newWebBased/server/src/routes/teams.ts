import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createTeamSchema = z.object({
  int_vereinid: z.number().int().positive(),
  int_wettkampfid: z.number().int().positive(),
  var_name: z.string().min(1).max(255),
  var_lang: z.string().optional(),
  bol_wirwertung: z.boolean().optional().default(true),
});

const updateTeamSchema = createTeamSchema.partial();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const vereinId = req.query.vereinId as string;
    const wettkampfId = req.query.wettkampfId as string;

    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        { var_name: { contains: search, mode: 'insensitive' } },
        { var_lang: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (vereinId) {
      whereConditions.int_vereinid = parseInt(vereinId);
    }

    if (wettkampfId) {
      whereConditions.int_wettkampfid = parseInt(wettkampfId);
    }

    const [teams, totalCount] = await Promise.all([
      (prisma as any).tfx_mannschaften.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        include: {
          tfx_vereine: {
            select: {
              var_name: true,
              var_lang: true
            }
          },
          tfx_wettkampf: {
            select: {
              var_name: true,
              var_ort: true,
              dat_von: true,
              dat_bis: true
            }
          }
        },
        orderBy: { var_name: 'asc' }
      }),
      (prisma as any).tfx_mannschaften.count({ where: whereConditions })
    ]);

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
      where: { int_mannschaftsid: id },
      include: {
        tfx_vereine: {
          select: {
            var_name: true,
            var_lang: true,
            var_strasse: true,
            var_plz: true,
            var_ort: true
          }
        },
        tfx_wettkampf: {
          select: {
            var_name: true,
            var_ort: true,
            dat_von: true,
            dat_bis: true
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
    const validatedData = createTeamSchema.parse(req.body);
    
    const team = await (prisma as any).tfx_mannschaften.create({
      data: validatedData,
      include: {
        tfx_vereine: {
          select: {
            var_name: true,
            var_lang: true
          }
        },
        tfx_wettkampf: {
          select: {
            var_name: true,
            var_ort: true
          }
        }
      }
    });

    res.status(201).json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid club or competition reference' });
    }
    console.error('Error creating team:', error);
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
      where: { int_mannschaftsid: id },
      data: validatedData,
      include: {
        tfx_vereine: {
          select: {
            var_name: true,
            var_lang: true
          }
        },
        tfx_wettkampf: {
          select: {
            var_name: true,
            var_ort: true
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
      where: { int_mannschaftsid: id }
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

export default router;
