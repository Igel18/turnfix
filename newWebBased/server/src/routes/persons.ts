import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createPersonSchema = z.object({
  var_vorname: z.string().min(1).max(100),
  var_nachname: z.string().min(1).max(100),
  var_email: z.string().email().optional().or(z.literal('')),
  var_telefon: z.string().optional(),
  var_fax: z.string().optional(),
  var_adresse: z.string().optional(),
  var_plz: z.string().optional(),
  var_ort: z.string().optional()
});

const updatePersonSchema = createPersonSchema.partial();

// Get persons count
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.tfx_personen.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting persons:', error);
    res.status(500).json({ 
      error: 'Failed to count persons',
      details: process.env.DEBUG === 'true' ? error : undefined
    });
  }
});

// Get all persons
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
        LOWER(var_vorname) LIKE LOWER($${paramIndex}) OR 
        LOWER(var_nachname) LIKE LOWER($${paramIndex}) OR 
        LOWER(var_email) LIKE LOWER($${paramIndex}) OR 
        LOWER(var_ort) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_personen
      ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        int_personenid,
        var_vorname,
        var_nachname,
        var_email,
        var_telefon,
        var_fax,
        var_adresse,
        var_plz,
        var_ort
      FROM tfx_personen
      ${whereClause}
      ORDER BY var_nachname ASC, var_vorname ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const persons = await prisma.$queryRawUnsafe(dataQuery, ...params) as any[];

    // Convert BigInt values to numbers for JSON serialization
    const personsData = persons.map((person: any) => ({
      ...person,
      int_personenid: Number(person.int_personenid)
    }));

    res.json({
      persons: personsData,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching persons:', error);
    res.status(500).json({ error: 'Failed to fetch persons' });
  }
});

// Get person by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid person ID' });
    }

    const query = `
      SELECT 
        int_personenid,
        var_vorname,
        var_nachname,
        var_email,
        var_telefon,
        var_fax,
        var_adresse,
        var_plz,
        var_ort
      FROM tfx_personen
      WHERE int_personenid = $1
    `;

    const persons = await prisma.$queryRawUnsafe(query, id) as any[];
    
    if (persons.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const person = {
      ...persons[0],
      int_personenid: Number(persons[0].int_personenid)
    };

    res.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// Create new person
router.post('/', async (req, res) => {
  try {
    const validatedData = createPersonSchema.parse(req.body);

    const query = `
      INSERT INTO tfx_personen (
        var_vorname, var_nachname, var_email, var_telefon, var_fax,
        var_adresse, var_plz, var_ort
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING int_personenid
    `;

    const result = await prisma.$queryRawUnsafe(query,
      validatedData.var_vorname,
      validatedData.var_nachname,
      validatedData.var_email || null,
      validatedData.var_telefon || null,
      validatedData.var_fax || null,
      validatedData.var_adresse || null,
      validatedData.var_plz || null,
      validatedData.var_ort || null
    ) as any[];

    const newPersonId = Number(result[0].int_personenid);

    res.status(201).json({
      message: 'Person created successfully',
      person: { int_personenid: newPersonId, ...validatedData }
    });
  } catch (error) {
    console.error('Error creating person:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid person ID' });
    }

    const validatedData = updatePersonSchema.parse(req.body);

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE tfx_personen 
      SET ${updateFields.join(', ')}
      WHERE int_personenid = $${paramIndex}
      RETURNING int_personenid
    `;

    values.push(id);
    const result = await prisma.$queryRawUnsafe(query, ...values) as any[];

    if (result.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json({ message: 'Person updated successfully' });
  } catch (error) {
    console.error('Error updating person:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Delete person
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid person ID' });
    }

    const query = `
      DELETE FROM tfx_personen 
      WHERE int_personenid = $1
      RETURNING int_personenid
    `;

    const result = await prisma.$queryRawUnsafe(query, id) as any[];

    if (result.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

export default router;
