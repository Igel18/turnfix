import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const participantCreateSchema = z.object({
  var_vorname: z.string().min(1).max(150),
  var_nachname: z.string().min(1).max(150),
  dat_geburtstag: z.string().optional().transform(str => str ? new Date(str) : null),
  int_geschlecht: z.number().int().min(0).max(2),
  int_vereineid: z.number().int(),
  bool_nur_jahr: z.boolean().optional(),
  int_startpassnummer: z.number().int().optional(),
});

const participantUpdateSchema = participantCreateSchema.partial();

const participantQuerySchema = z.object({
  search: z.string().optional(),
  clubId: z.string().transform(Number).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  limit: z.string().transform(Number).default(50),
  offset: z.string().transform(Number).default(0)
});

// Get all participants with search and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = participantQuerySchema.parse(req.query);
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.search) {
      whereConditions.push(`(t.var_vorname ILIKE $${paramIndex} OR t.var_nachname ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }
    
    if (query.clubId) {
      whereConditions.push(`t.int_vereineid = $${paramIndex}`);
      params.push(query.clubId);
      paramIndex++;
    }
    
    if (query.gender) {
      const genderValue = query.gender === 'MALE' ? 1 : query.gender === 'FEMALE' ? 2 : 0;
      whereConditions.push(`t.int_geschlecht = $${paramIndex}`);
      params.push(genderValue);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_teilnehmer t
      ${whereClause}
    `;
    
    // Data query
    const dataQuery = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.bool_nur_jahr,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Unknown'
        END as geschlecht_name,
        CASE 
          WHEN t.dat_geburtstag IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(t.dat_geburtstag))
          ELSE NULL
        END as age,
        COALESCE(w.competition_count, 0) as competition_count
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      LEFT JOIN (
        SELECT int_teilnehmerid, COUNT(*) as competition_count 
        FROM tfx_wertungen 
        GROUP BY int_teilnehmerid
      ) w ON t.int_teilnehmerid = w.int_teilnehmerid
      ${whereClause}
      ORDER BY t.var_nachname ASC, t.var_vorname ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataParams = [...params, query.limit, query.offset];
    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...params),
      prisma.$queryRawUnsafe(dataQuery, ...dataParams)
    ]);
    
    const total = Number((countResult as any)[0]?.total || 0);
    
    // Convert BigInt values to numbers for JSON serialization
    const participantsData = (dataResult as any[]).map(participant => ({
      ...participant,
      int_teilnehmerid: Number(participant.int_teilnehmerid),
      int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
      int_geschlecht: Number(participant.int_geschlecht),
      int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null,
      age: participant.age ? Number(participant.age) : null,
      competition_count: Number(participant.competition_count)
    }));
    
    res.json({
      participants: participantsData,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid query parameters', errors: error.issues });
    }
    return res.status(500).json({ message: 'Failed to fetch participants' });
  }
});

// Get participant by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid participant ID' });
    }
    
    const query = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.bool_nur_jahr,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Unknown'
        END as geschlecht_name,
        CASE 
          WHEN t.dat_geburtstag IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(t.dat_geburtstag))
          ELSE NULL
        END as age
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE t.int_teilnehmerid = $1
    `;
    
    const result = await prisma.$queryRawUnsafe(query, id);
    const participant = (result as any[])[0];
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Convert BigInt values to numbers for JSON serialization
    const participantData = {
      ...participant,
      int_teilnehmerid: Number(participant.int_teilnehmerid),
      int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
      int_geschlecht: Number(participant.int_geschlecht),
      int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null,
      age: participant.age ? Number(participant.age) : null
    };
    
    res.json(participantData);
  } catch (error) {
    console.error('Error fetching participant:', error);
    return res.status(500).json({ message: 'Failed to fetch participant' });
  }
});

// Create new participant
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = participantCreateSchema.parse(req.body);
    
    const query = `
      INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, int_vereineid, int_geschlecht, dat_geburtstag, bool_nur_jahr, int_startpassnummer)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING int_teilnehmerid
    `;
    
    const result = await prisma.$queryRawUnsafe(
      query,
      data.var_vorname,
      data.var_nachname,
      data.int_vereineid,
      data.int_geschlecht,
      data.dat_geburtstag,
      data.bool_nur_jahr || false,
      data.int_startpassnummer || null
    );
    
    const participantId = (result as any[])[0]?.int_teilnehmerid;
    
    if (!participantId) {
      return res.status(500).json({ message: 'Failed to create participant' });
    }
    
    // Fetch the created participant with all details
    const fetchQuery = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.bool_nur_jahr,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Unknown'
        END as geschlecht_name
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE t.int_teilnehmerid = $1
    `;
    
    const createdParticipant = await prisma.$queryRawUnsafe(fetchQuery, participantId);
    const participantData = (createdParticipant as any[])[0];
    
    // Convert BigInt values to numbers for JSON serialization
    const responseData = {
      ...participantData,
      int_teilnehmerid: Number(participantData.int_teilnehmerid),
      int_vereineid: participantData.int_vereineid ? Number(participantData.int_vereineid) : null,
      int_geschlecht: Number(participantData.int_geschlecht),
      int_startpassnummer: participantData.int_startpassnummer ? Number(participantData.int_startpassnummer) : null
    };
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating participant:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid participant data', errors: error.issues });
    }
    return res.status(500).json({ message: 'Failed to create participant' });
  }
});

// Update participant
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid participant ID' });
    }
    
    const data = participantUpdateSchema.parse(req.body);
    
    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }
    
    params.push(id);
    
    const query = `
      UPDATE tfx_teilnehmer 
      SET ${updates.join(', ')}
      WHERE int_teilnehmerid = $${paramIndex}
    `;
    
    await prisma.$queryRawUnsafe(query, ...params);
    
    // Fetch updated participant
    const fetchQuery = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.bool_nur_jahr,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Unknown'
        END as geschlecht_name
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE t.int_teilnehmerid = $1
    `;
    
    const updatedParticipant = await prisma.$queryRawUnsafe(fetchQuery, id);
    const participant = (updatedParticipant as any[])[0];
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Convert BigInt values to numbers for JSON serialization
    const participantData = {
      ...participant,
      int_teilnehmerid: Number(participant.int_teilnehmerid),
      int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
      int_geschlecht: Number(participant.int_geschlecht),
      int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null
    };
    
    res.json(participantData);
  } catch (error) {
    console.error('Error updating participant:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid participant data', errors: error.issues });
    }
    return res.status(500).json({ message: 'Failed to update participant' });
  }
});

// Delete participant
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid participant ID' });
    }
    
    // Check if participant has scores/competitions
    const competitionCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM tfx_wertungen WHERE int_teilnehmerid = $1',
      id
    );
    
    if (Number((competitionCount as any[])[0]?.count) > 0) {
      return res.status(409).json({ 
        message: 'Cannot delete participant with existing competition entries. Please remove competition entries first.' 
      });
    }
    
    const result = await prisma.$queryRawUnsafe(
      'DELETE FROM tfx_teilnehmer WHERE int_teilnehmerid = $1',
      id
    );
    
    res.json({ message: 'Participant deleted successfully' });
  } catch (error) {
    console.error('Error deleting participant:', error);
    return res.status(500).json({ message: 'Failed to delete participant' });
  }
});

// Update participant status - DISABLED: int_statusid column doesn't exist in database yet
router.put('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  return res.status(501).json({ 
    message: 'Status management not available: int_statusid column does not exist in tfx_teilnehmer table',
    error: 'Database schema needs to be updated to support status management'
  });
});

export default router;
