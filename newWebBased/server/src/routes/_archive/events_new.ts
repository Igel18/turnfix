import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createEventSchema = z.object({
  var_name: z.string().min(1, "Name is required"),
  dat_wkdatum: z.string().optional(),
  var_ort: z.string().optional(),
  var_beschreibung: z.string().optional(),
  int_status: z.number().int().default(1),
  int_vereinid: z.number().int().default(1)
});

const updateEventSchema = createEventSchema.partial();

// Get all events/competitions
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE LOWER(w.var_name) LIKE LOWER($${paramIndex}) OR LOWER(w.var_ort) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_wettkaempfe w
      LEFT JOIN tfx_vereine v ON w.int_vereinid = v.int_vereineid
      ${whereClause}
    `;
    
    const countResult = await (prisma as any).$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        w.int_wkid as id,
        w.var_name as name,
        w.dat_wkdatum as date,
        w.var_ort as location,
        w.var_beschreibung as description,
        w.int_status as status,
        w.int_vereinid as club_id,
        v.var_name as club_name,
        (SELECT COUNT(*) FROM tfx_teilnehmer t WHERE t.int_wkid = w.int_wkid) as participant_count
      FROM tfx_wettkaempfe w
      LEFT JOIN tfx_vereine v ON w.int_vereinid = v.int_vereineid
      ${whereClause}
      ORDER BY w.dat_wkdatum DESC, w.var_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit as string), parseInt(offset as string));
    const events = await (prisma as any).$queryRawUnsafe(dataQuery, ...params);
    
    // Convert dates and BigInt values for JSON serialization
    const formattedEvents = events.map((event: any) => ({
      ...event,
      id: Number(event.id),
      club_id: Number(event.club_id),
      status: Number(event.status),
      participant_count: Number(event.participant_count),
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : null
    }));
    
    res.json({
      events: formattedEvents,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const query = `
      SELECT 
        w.int_wkid as id,
        w.var_name as name,
        w.dat_wkdatum as date,
        w.var_ort as location,
        w.var_beschreibung as description,
        w.int_status as status,
        w.int_vereinid as club_id,
        v.var_name as club_name,
        (SELECT COUNT(*) FROM tfx_teilnehmer t WHERE t.int_wkid = w.int_wkid) as participant_count
      FROM tfx_wettkaempfe w
      LEFT JOIN tfx_vereine v ON w.int_vereinid = v.int_vereineid
      WHERE w.int_wkid = $1
    `;
    
    const events = await (prisma as any).$queryRawUnsafe(query, id);
    
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];
    // Convert dates and BigInt values for JSON serialization
    const formattedEvent = {
      ...event,
      id: Number(event.id),
      club_id: Number(event.club_id),
      status: Number(event.status),
      participant_count: Number(event.participant_count),
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : null
    };

    res.json(formattedEvent);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new event
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createEventSchema.parse(req.body);
    
    const query = `
      INSERT INTO tfx_wettkaempfe (var_name, dat_wkdatum, var_ort, var_beschreibung, int_status, int_vereinid)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING int_wkid as id, var_name as name, dat_wkdatum as date, var_ort as location
    `;
    
    const result = await (prisma as any).$queryRawUnsafe(
      query,
      validatedData.var_name,
      validatedData.dat_wkdatum || null,
      validatedData.var_ort || '',
      validatedData.var_beschreibung || '',
      validatedData.int_status,
      validatedData.int_vereinid
    );

    const event = result[0];
    const formattedEvent = {
      ...event,
      id: Number(event.id),
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : null
    };

    res.status(201).json(formattedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const validatedData = updateEventSchema.parse(req.body);
    
    let updates = [];
    let values = [];
    let paramIndex = 1;

    if (validatedData.var_name !== undefined) {
      updates.push(`var_name = $${paramIndex++}`);
      values.push(validatedData.var_name);
    }
    
    if (validatedData.dat_wkdatum !== undefined) {
      updates.push(`dat_wkdatum = $${paramIndex++}`);
      values.push(validatedData.dat_wkdatum);
    }
    
    if (validatedData.var_ort !== undefined) {
      updates.push(`var_ort = $${paramIndex++}`);
      values.push(validatedData.var_ort);
    }

    if (validatedData.var_beschreibung !== undefined) {
      updates.push(`var_beschreibung = $${paramIndex++}`);
      values.push(validatedData.var_beschreibung);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    
    const query = `
      UPDATE tfx_wettkaempfe 
      SET ${updates.join(', ')}
      WHERE int_wkid = $${paramIndex}
      RETURNING int_wkid as id, var_name as name, dat_wkdatum as date, var_ort as location
    `;
    
    const result = await (prisma as any).$queryRawUnsafe(query, ...values);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result[0];
    const formattedEvent = {
      ...event,
      id: Number(event.id),
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : null
    };

    res.json(formattedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    // Check if event has participants
    const participantCheckQuery = 'SELECT COUNT(*) as count FROM tfx_teilnehmer WHERE int_wkid = $1';
    const participantCheck = await (prisma as any).$queryRawUnsafe(participantCheckQuery, id) as any[];
    const participantCount = parseInt(participantCheck[0]?.count || '0');

    if (participantCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete event. It has ${participantCount} participant(s).` 
      });
    }

    const query = `DELETE FROM tfx_wettkaempfe WHERE int_wkid = $1 RETURNING int_wkid as id`;
    const result = await (prisma as any).$queryRawUnsafe(query, id);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get participants for an event
router.get('/:id/participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const query = `
      SELECT 
        t.int_teilnehmerid as id,
        t.var_vorname as first_name,
        t.var_nachname as last_name,
        t.dat_geburtstag as birth_date,
        t.int_vereinid as club_id,
        v.var_name as club_name
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereinid = v.int_vereineid
      WHERE t.int_wkid = $1
      ORDER BY t.var_nachname, t.var_vorname
    `;
    
    const participants = await (prisma as any).$queryRawUnsafe(query, id);
    
    // Convert BigInt values and dates for JSON serialization
    const formattedParticipants = participants.map((participant: any) => ({
      ...participant,
      id: Number(participant.id),
      club_id: Number(participant.club_id),
      birth_date: participant.birth_date ? new Date(participant.birth_date).toISOString().split('T')[0] : null
    }));

    res.json(formattedParticipants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
