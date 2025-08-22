import { Router } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'turnfix',
  password: 'postgres',
  port: 5432,
});

// Validation schemas
const createEventSchema = z.object({
  var_eventname: z.string().min(1),
  dat_eventstartdate: z.string(),
  dat_eventenddate: z.string(),
  var_location: z.string().min(1),
  var_description: z.string().optional()
});

const updateEventSchema = createEventSchema.partial();

// Get all events with pagination
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    let query = `
      SELECT 
        e.int_eventid,
        e.var_eventname,
        e.dat_eventstartdate,
        e.dat_eventenddate,
        e.var_location,
        e.var_description,
        COUNT(DISTINCT ep.int_teilnehmerid) as participant_count,
        COUNT(DISTINCT s.int_wertungid) as score_count
      FROM tfx_events e
      LEFT JOIN tfx_event_participants ep ON e.int_eventid = ep.int_eventid
      LEFT JOIN tfx_wertungen s ON e.int_eventid = s.int_eventid
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      query += ` WHERE LOWER(e.var_eventname) LIKE LOWER($${++paramCount}) OR LOWER(e.var_location) LIKE LOWER($${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY e.int_eventid, e.var_eventname, e.dat_eventstartdate, e.dat_eventenddate, e.var_location, e.var_description
      ORDER BY e.dat_eventstartdate DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM tfx_events e';
    const countParams: any[] = [];
    
    if (search) {
      countQuery += ' WHERE LOWER(e.var_eventname) LIKE LOWER($1) OR LOWER(e.var_location) LIKE LOWER($2)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      events: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
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
    const eventId = parseInt(req.params.id);

    const result = await pool.query(`
      SELECT 
        e.int_eventid,
        e.var_eventname,
        e.dat_eventstartdate,
        e.dat_eventenddate,
        e.var_location,
        e.var_description
      FROM tfx_events e
      WHERE e.int_eventid = $1
    `, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new event
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createEventSchema.parse(req.body);

    const result = await pool.query(`
      INSERT INTO tfx_events (var_eventname, dat_eventstartdate, dat_eventenddate, var_location, var_description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      validatedData.var_eventname,
      validatedData.dat_eventstartdate,
      validatedData.dat_eventenddate,
      validatedData.var_location,
      validatedData.var_description
    ]);

    res.status(201).json({ event: result.rows[0] });
  } catch (error) {
    console.error('Error creating event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const validatedData = updateEventSchema.parse(req.body);

    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key} = $${++paramCount}`);
        values.push(value);
      }
    });

    if (setParts.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(eventId);
    const query = `
      UPDATE tfx_events 
      SET ${setParts.join(', ')}
      WHERE int_eventid = $${++paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Error updating event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);

    const result = await pool.query(`
      DELETE FROM tfx_events 
      WHERE int_eventid = $1
      RETURNING *
    `, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get participants for an event
router.get('/:id/participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);

    const result = await pool.query(`
      SELECT 
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.dat_geburtsdatum,
        t.var_geschlecht,
        v.var_name as vereins_name
      FROM tfx_event_participants ep
      JOIN tfx_teilnehmer t ON ep.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_vereine v ON t.int_vereinsid = v.int_vereinsid
      WHERE ep.int_eventid = $1
      ORDER BY t.var_nachname, t.var_vorname
    `, [eventId]);

    res.json({ participants: result.rows });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
