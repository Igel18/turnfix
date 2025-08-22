import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createVenueSchema = z.object({
  var_name: z.string().min(1).max(255),
  var_strasse: z.string().optional(),
  var_plz: z.string().optional(),
  var_ort: z.string().optional(),
  var_land: z.string().optional(),
  var_telefon: z.string().optional(),
  var_fax: z.string().optional(),
  var_email: z.string().email().optional().or(z.literal('')),
  var_internet: z.string().optional(),
  var_notiz: z.string().optional(),
});

const updateVenueSchema = createVenueSchema.partial();

// Get all venues
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        { var_name: { contains: search, mode: 'insensitive' } },
        { var_ort: { contains: search, mode: 'insensitive' } },
        { var_strasse: { contains: search, mode: 'insensitive' } },
        { var_plz: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [venues, totalCount] = await Promise.all([
      (prisma as any).tfx_wettkampforte.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        orderBy: { var_name: 'asc' }
      }),
      (prisma as any).tfx_wettkampforte.count({ where: whereConditions })
    ]);

    res.json({
      venues,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get venue by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid venue ID' });
    }

    const venue = await (prisma as any).tfx_wettkampforte.findUnique({
      where: { int_wettkampfortid: id }
    });

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json(venue);
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new venue
router.post('/', async (req, res) => {
  try {
    const validatedData = createVenueSchema.parse(req.body);
    
    const venue = await (prisma as any).tfx_wettkampforte.create({
      data: validatedData
    });

    res.status(201).json(venue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating venue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update venue
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid venue ID' });
    }

    const validatedData = updateVenueSchema.parse(req.body);
    
    const venue = await (prisma as any).tfx_wettkampforte.update({
      where: { int_wettkampfortid: id },
      data: validatedData
    });

    res.json(venue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Venue not found' });
    }
    console.error('Error updating venue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete venue
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid venue ID' });
    }

    await (prisma as any).tfx_wettkampforte.delete({
      where: { int_wettkampfortid: id }
    });

    res.status(204).send();
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ error: 'Venue not found' });
    }
    if ((error as any)?.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete venue with associated records' });
    }
    console.error('Error deleting venue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
