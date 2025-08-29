import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createStatusSchema = z.object({
  var_name: z.string().min(1).max(150),
  ary_colorcode: z.string().max(25).optional().default('{0,0,0}'),
  bol_bogen: z.boolean().optional().default(true),
  bol_karte: z.boolean().optional().default(true),
});

const updateStatusSchema = createStatusSchema.partial();

// Get all statuses
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

    const [statuses, totalCount] = await Promise.all([
      (prisma as any).tfx_status.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        orderBy: { var_name: 'asc' }
      }),
      (prisma as any).tfx_status.count({ where: whereConditions })
    ]);

    res.json({
      statuses,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get status by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }

    const status = await (prisma as any).tfx_status.findUnique({
      where: { int_statusid: id }
    });

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new status
router.post('/', async (req, res) => {
  try {
    const validatedData = createStatusSchema.parse(req.body);
    
    const status = await (prisma as any).tfx_status.create({
      data: validatedData
    });

    res.status(201).json(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update status
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }

    const validatedData = updateStatusSchema.parse(req.body);
    
    const status = await (prisma as any).tfx_status.update({
      where: { int_statusid: id },
      data: validatedData
    });

    res.json(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Status not found' });
    }
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete status
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid status ID' });
    }

    await (prisma as any).tfx_status.delete({
      where: { int_statusid: id }
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Status not found' });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete status with associated records' });
    }
    console.error('Error deleting status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
