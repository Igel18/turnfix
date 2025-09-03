import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createVenueSchema = z.object({
  var_name: z.string().min(1).max(150),
  var_adresse: z.string().max(200).optional(),
  var_plz: z.string().max(5).optional(),
  var_ort: z.string().max(150).optional(),
});

const updateVenueSchema = createVenueSchema.partial();

// Get all venues
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE 
        LOWER(var_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(var_adresse) LIKE LOWER($${paramIndex}) OR 
        LOWER(var_ort) LIKE LOWER($${paramIndex}) OR 
        LOWER(var_plz) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_wettkampforte
      ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        int_wettkampforteid,
        var_name,
        var_adresse,
        var_plz,
        var_ort
      FROM tfx_wettkampforte
      ${whereClause}
      ORDER BY var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const venues = await prisma.$queryRawUnsafe(dataQuery, ...params) as any[];

    // Convert BigInt values to numbers for JSON serialization
    const venuesData = venues.map((venue: any) => ({
      ...venue,
      int_wettkampforteid: Number(venue.int_wettkampforteid)
    }));

    res.json({
      venues: venuesData,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
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

    const query = `
      SELECT 
        int_wettkampforteid,
        var_name,
        var_adresse,
        var_plz,
        var_ort
      FROM tfx_wettkampforte
      WHERE int_wettkampforteid = $1
    `;

    const venues = await prisma.$queryRawUnsafe(query, id) as any[];

    if (!venues.length) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Convert BigInt values to numbers for JSON serialization
    const venue = {
      ...venues[0],
      int_wettkampforteid: Number(venues[0].int_wettkampforteid)
    };

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
    
    const query = `
      INSERT INTO tfx_wettkampforte (
        var_name, var_adresse, var_plz, var_ort
      ) 
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const venues = await prisma.$queryRawUnsafe(
      query,
      validatedData.var_name,
      validatedData.var_adresse || null,
      validatedData.var_plz || null,
      validatedData.var_ort || null
    ) as any[];

    // Convert BigInt values to numbers for JSON serialization
    const venue = {
      ...venues[0],
      int_wettkampforteid: Number(venues[0].int_wettkampforteid)
    };

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
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramIndex}`);
      params.push(value || null);
      paramIndex++;
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE tfx_wettkampforte 
      SET ${updateFields.join(', ')}
      WHERE int_wettkampforteid = $${paramIndex}
      RETURNING *
    `;

    params.push(id);
    const venues = await prisma.$queryRawUnsafe(query, ...params) as any[];

    if (!venues.length) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Convert BigInt values to numbers for JSON serialization
    const venue = {
      ...venues[0],
      int_wettkampforteid: Number(venues[0].int_wettkampforteid)
    };

    res.json(venue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
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

    const query = `
      DELETE FROM tfx_wettkampforte 
      WHERE int_wettkampforteid = $1
      RETURNING int_wettkampforteid
    `;

    const result = await prisma.$queryRawUnsafe(query, id) as any[];

    if (!result.length) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.status(204).send();
  } catch (error) {
    // Check for foreign key constraint violations
    if ((error as any)?.code === '23503') {
      return res.status(400).json({ error: 'Cannot delete venue with associated records' });
    }
    console.error('Error deleting venue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
