import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Get all participants with pagination
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE LOWER(t.var_vorname) LIKE LOWER($${paramIndex}) OR LOWER(t.var_nachname) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_teilnehmer t
      ${whereClause}
    `;
    
    const countResult = await (prisma as any).$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.dat_geburtstag,
        t.int_geschlecht,
        t.int_vereineid,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Other'
        END as geschlecht_name,
        CASE 
          WHEN t.dat_geburtstag IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(t.dat_geburtstag))
          ELSE NULL
        END as age
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      ${whereClause}
      ORDER BY t.var_nachname, t.var_vorname
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit as string), parseInt(offset as string));
    const participants = await (prisma as any).$queryRawUnsafe(dataQuery, ...params);
    
    // Convert BigInt values and dates for JSON serialization
    const formattedParticipants = participants.map((participant: any) => ({
      ...participant,
      int_teilnehmerid: Number(participant.int_teilnehmerid),
      int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
      int_geschlecht: Number(participant.int_geschlecht),
      int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null,
      dat_geburtstag: participant.dat_geburtstag ? participant.dat_geburtstag.toISOString().split('T')[0] : null,
      age: participant.age ? Number(participant.age) : null
    }));
    
    res.json({
      participants: formattedParticipants,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      }
    });
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get participant by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const query = `
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.dat_geburtstag,
        t.int_geschlecht,
        t.int_vereineid,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'Male'
          WHEN t.int_geschlecht = 2 THEN 'Female'
          ELSE 'Other'
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
    
    const participants = await (prisma as any).$queryRawUnsafe(query, id);
    
    if (participants.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const participant = participants[0];
    const formattedParticipant = {
      ...participant,
      int_teilnehmerid: Number(participant.int_teilnehmerid),
      int_vereineid: participant.int_vereineid ? Number(participant.int_vereineid) : null,
      int_geschlecht: Number(participant.int_geschlecht),
      int_startpassnummer: participant.int_startpassnummer ? Number(participant.int_startpassnummer) : null,
      dat_geburtstag: participant.dat_geburtstag ? participant.dat_geburtstag.toISOString().split('T')[0] : null,
      age: participant.age ? Number(participant.age) : null
    };

    res.json(formattedParticipant);
  } catch (error: any) {
    console.error('Error fetching participant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
