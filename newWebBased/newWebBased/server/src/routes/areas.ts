import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createAreaSchema = z.object({
  var_name: z.string().min(1).max(150),
  bol_maennlich: z.boolean().default(true),
  bol_weiblich: z.boolean().default(true),
});

const updateAreaSchema = createAreaSchema.partial();

// Get all areas
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

    const [areas, totalCount] = await Promise.all([
      prisma.tfx_bereiche.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        orderBy: { var_name: 'asc' }
      }),
      prisma.tfx_bereiche.count({ where: whereConditions })
    ]);

    res.json({
      areas,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get area by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid area ID' });
    }

    const area = await prisma.tfx_bereiche.findUnique({
      where: { int_bereicheid: id },
      include: {
        tfx_wettkaempfe: {
          select: { int_wettkaempfeid: true, var_name: true }
        }
      }
    });

    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }

    res.json(area);
  } catch (error) {
    console.error('Error fetching area:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new area
router.post('/', async (req, res) => {
  try {
    const validatedData = createAreaSchema.parse(req.body);
    
    const area = await prisma.tfx_bereiche.create({
      data: validatedData
    });

    res.status(201).json(area);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating area:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update area
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid area ID' });
    }

    const validatedData = updateAreaSchema.parse(req.body);
    
    const area = await prisma.tfx_bereiche.update({
      where: { int_bereicheid: id },
      data: validatedData
    });

    res.json(area);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Area not found' });
    }
    console.error('Error updating area:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete area
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid area ID' });
    }

    await prisma.tfx_bereiche.delete({
      where: { int_bereicheid: id }
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Area not found' });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete area with associated competitions' });
    }
    console.error('Error deleting area:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
