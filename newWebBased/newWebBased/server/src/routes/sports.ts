import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createSportSchema = z.object({
  var_name: z.string().min(1).max(150),
});

const updateSportSchema = createSportSchema.partial();

// Get all sports
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    const whereConditions: any = {};
    
    if (search) {
      whereConditions.var_name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [sports, totalCount] = await Promise.all([
      prisma.tfx_sport.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        orderBy: { var_name: 'asc' }
      }),
      prisma.tfx_sport.count({ where: whereConditions })
    ]);

    res.json({
      sports,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sport by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sport ID' });
    }

    const sport = await prisma.tfx_sport.findUnique({
      where: { int_sportid: id },
      include: {
        tfx_disziplinen: {
          select: { int_disziplinenid: true, var_name: true }
        }
      }
    });

    if (!sport) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    res.json(sport);
  } catch (error) {
    console.error('Error fetching sport:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new sport
router.post('/', async (req, res) => {
  try {
    const validatedData = createSportSchema.parse(req.body);
    
    const sport = await prisma.tfx_sport.create({
      data: validatedData
    });

    res.status(201).json(sport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating sport:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update sport
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sport ID' });
    }

    const validatedData = updateSportSchema.parse(req.body);
    
    const sport = await prisma.tfx_sport.update({
      where: { int_sportid: id },
      data: validatedData
    });

    res.json(sport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Sport not found' });
    }
    console.error('Error updating sport:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete sport
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sport ID' });
    }

    await prisma.tfx_sport.delete({
      where: { int_sportid: id }
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Sport not found' });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete sport with associated disciplines' });
    }
    console.error('Error deleting sport:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
