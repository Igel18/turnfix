import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import multer from 'multer';
import { parseString } from 'xml2js';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Get all events - using tfx_veranstaltungen (the actual events table)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE LOWER(v.var_name) LIKE LOWER($${paramIndex}) OR LOWER(v.var_veranstalter) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_veranstaltungen v
      ${whereClause}
    `;
    
    const countResult = await (prisma as any).$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        v.var_veranstalter as var_location,
        '' as var_description,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      ${whereClause}
      ORDER BY v.dat_von DESC, v.var_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit as string), parseInt(offset as string));
    const events = await (prisma as any).$queryRawUnsafe(dataQuery, ...params);
    
    // Convert BigInt values and dates for JSON serialization to match client expectations
    const formattedEvents = events.map((event: any) => ({
      ...event,
      int_eventid: Number(event.int_eventid),
      participant_count: Number(event.participant_count),
      score_count: Number(event.score_count),
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null
    }));
    
    console.log(`=== EVENTS: Sending ${formattedEvents.length} events to client ===`);
    console.log('First event sample:', JSON.stringify(formattedEvents[0], null, 2));
    
    const response = {
      events: formattedEvents,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      }
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        v.var_veranstalter as var_location,
        COALESCE(v.txt_hinweise, '') as var_description,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      WHERE v.int_veranstaltungenid = $1
    `;
    
    const events = await (prisma as any).$queryRawUnsafe(query, id);
    
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];
    const formattedEvent = {
      ...event,
      int_eventid: Number(event.int_eventid),
      participant_count: Number(event.participant_count),
      score_count: Number(event.score_count),
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null
    };

    res.json(formattedEvent);
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import event from DTB Gymnet XML - Packages Ready
const upload = multer({ dest: 'uploads/' });

// Define interfaces for XML structure
interface GymnetParticipant {
  firstName: string;
  lastName: string;
  club: string;
  birthYear: number;
  registration: string;
}

interface GymnetCompetition {
  name: string;
  discipline: string;
  participants: GymnetParticipant[];
}

interface GymnetEvent {
  name: string;
  organizer: string;
  date: string;
  location: string;
  competitions: GymnetCompetition[];
}

router.post('/import-gymnet', authenticateToken, upload.single('xmlFile'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Keine XML-Datei hochgeladen' });
    }

    // Read the uploaded file
    const xmlContent = fs.readFileSync(req.file.path, 'utf-8');
    
    // Parse XML
    parseString(xmlContent, async (err: any, result: any) => {
      try {
        if (err) {
          console.error('XML parse error:', err);
          return res.status(400).json({ success: false, message: 'Ungültiges XML-Format' });
        }

        // Extract data from parsed XML (structure depends on DTB Gymnet format)
        // This is a placeholder - actual structure will need to be determined from sample XML
        const gymnetData = result;
        console.log('Parsed XML structure:', JSON.stringify(gymnetData, null, 2));

        // TODO: Implement actual parsing based on DTB Gymnet XML structure
        // For now, return success with parsed data structure
        
        // Clean up uploaded file
        fs.unlinkSync(req.file!.path);
        
        res.json({ 
          success: true, 
          message: 'XML-Datei erfolgreich analysiert',
          data: {
            structure: 'XML parsing completed - implement actual DTB Gymnet structure parsing',
            xmlKeys: Object.keys(gymnetData || {}),
            filename: req.file!.originalname
          }
        });
      } catch (parseError) {
        console.error('Processing error:', parseError);
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Fehler beim Verarbeiten der XML-Datei' });
      }
    });

  } catch (error: any) {
    console.error('Import error:', error);
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Fehler beim Importieren der XML-Datei' });
  }
});

export default router;