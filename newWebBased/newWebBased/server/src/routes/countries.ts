import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createCountrySchema = z.object({
  var_name: z.string().min(1).max(255),
  var_kurz: z.string().min(1).max(10),
});

const updateCountrySchema = createCountrySchema.partial();

// Get all countries
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        { var_name: { contains: search, mode: 'insensitive' } },
        { var_kurz: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [countries, totalCount] = await Promise.all([
      (prisma as any).tfx_laender.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        orderBy: { var_name: 'asc' }
      }),
      (prisma as any).tfx_laender.count({ where: whereConditions })
    ]);

    res.json({
      countries,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get country by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid country ID' });
    }

    const country = await (prisma as any).tfx_laender.findUnique({
      where: { int_landid: id }
    });

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json(country);
  } catch (error) {
    console.error('Error fetching country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new country
router.post('/', async (req, res) => {
  try {
    const validatedData = createCountrySchema.parse(req.body);
    
    const country = await (prisma as any).tfx_laender.create({
      data: validatedData
    });

    res.status(201).json(country);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update country
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid country ID' });
    }

    const validatedData = updateCountrySchema.parse(req.body);
    
    const country = await (prisma as any).tfx_laender.update({
      where: { int_landid: id },
      data: validatedData
    });

    res.json(country);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Country not found' });
    }
    console.error('Error updating country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete country
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid country ID' });
    }

    await (prisma as any).tfx_laender.delete({
      where: { int_landid: id }
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Country not found' });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete country with associated records' });
    }
    console.error('Error deleting country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
