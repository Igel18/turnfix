import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { z } from 'zod';
import multer = require('multer');
import { parseString } from 'xml2js';
import { promisify } from 'util';
import * as fs from 'fs';
import prisma from '../lib/prisma';
import { wedDisNrToTurnFixId, getDisciplinesForCompetition } from '../utils/gymnetMapping';

const router = Router();

// Generate start numbers for all participants in an event
router.put('/:id/generate-start-numbers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Get all participants for the event (from tfx_wertungen, joined with tfx_teilnehmer)
    const participants = await prisma.$queryRawUnsafe(
      `SELECT wr.int_wertungenid, wr.int_teilnehmerid
         FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
        WHERE w.int_veranstaltungenid = $1
        ORDER BY wr.int_teilnehmerid ASC`,
      eventId
    ) as Array<{ int_wertungenid: number, int_teilnehmerid: number }>;

    // Assign start numbers sequentially (starting from 1)
    let startNumber = 1;
    for (const p of participants) {
      await prisma.$queryRawUnsafe(
        `UPDATE tfx_wertungen SET int_startnummer = $1 WHERE int_wertungenid = $2`,
        startNumber,
        p.int_wertungenid
      );
      startNumber++;
    }

    return res.json({ success: true, count: participants.length });
  } catch (error) {
    console.error('Error generating start numbers:', error);
    return res.status(500).json({ error: 'Failed to generate start numbers' });
  }
});


// Validation schemas for event creation
const createEventSchema = z.object({
  var_eventname: z.string().min(1, 'Event name is required'),
  dat_eventstartdate: z.string().min(1, 'Start date is required'),
  dat_eventenddate: z.string().min(1, 'End date is required'),
  var_location: z.string().min(1, 'Location is required'),
  var_description: z.string().nullable().optional(),
  var_veranstalter: z.string().nullable().optional(),
  dat_meldeschluss: z.string().nullable().optional(),
  int_wettkampforteid: z.number().nullable().optional(),
  int_ansprechpartner: z.number().nullable().optional(),
  int_meldung_an: z.number().nullable().optional(),
  int_kampfrichter: z.number().nullable().optional(),
  int_helfer: z.number().nullable().optional(),
  int_edv: z.number().nullable().optional(),
  txt_hinweise: z.string().nullable().optional()
});

const updateEventSchema = createEventSchema.partial();

// Configure multer for XML file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = 'uploads/xml';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `gymnet-${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.toLowerCase().endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Nur XML-Dateien sind erlaubt'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Promisify xml2js parseString with proper typing
const parseXmlAsync = (xml: string, options?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    parseString(xml, options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Get all events - using legacy tfx_veranstaltungen table
router.get('/', async (req: Request, res: Response) => {
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
        COALESCE(wf.var_name, v.var_veranstalter, '') as var_location,
        COALESCE(v.txt_hinweise, '') as var_description,
        v.var_veranstalter,
        wf.var_name as venue_name,
        wf.var_adresse as venue_address,
        wf.var_plz as venue_postal_code,
        wf.var_ort as venue_city,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count,
        (SELECT COUNT(DISTINCT t.int_vereineid) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         JOIN tfx_teilnehmer t ON wr.int_teilnehmerid = t.int_teilnehmerid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid AND t.int_vereineid IS NOT NULL) as club_count
      FROM tfx_veranstaltungen v
      LEFT JOIN tfx_wettkampforte wf ON v.int_wettkampforteid = wf.int_wettkampforteid
      ${whereClause}
      ORDER BY v.dat_von DESC, v.var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit as string), parseInt(offset as string));
    const events = await (prisma as any).$queryRawUnsafe(dataQuery, ...params);
    
    // Convert BigInt values and dates for JSON serialization to match client expectations
    const formattedEvents = events.map((event: any) => {
      // Determine status based on dates
      const now = new Date();
      const startDate = new Date(event.dat_eventstartdate);
      const endDate = new Date(event.dat_eventenddate);
      
      let status = 'upcoming';
      if (now > endDate) {
        status = 'completed';
      } else if (now >= startDate && now <= endDate) {
        status = 'active';
      }
      
      return {
        ...event,
        int_eventid: Number(event.int_eventid),
        participant_count: Number(event.participant_count || 0),
        score_count: Number(event.score_count || 0),
        club_count: Number(event.club_count || 0),
        dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
        dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
        status
      };
    });
    
    console.log(`=== EVENTS: Sending ${formattedEvents.length} events to client ===`);
    console.log('First event sample:', formattedEvents[0]?.var_eventname || 'No events available');
    
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

// Get event by ID - MOVED TO END OF FILE
/*
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
*/

// Test route for XML import functionality
router.get('/import-gymnet-test', (req, res) => {
  res.json({
    success: true,
    message: 'XML import route is working',
    info: 'Use POST /api/events/import-gymnet with multipart form data containing xmlFile'
  });
});

// Create new event
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createEventSchema.parse(req.body);

    // Convert date strings to Date objects
    const startDate = new Date(validatedData.dat_eventstartdate);
    const endDate = new Date(validatedData.dat_eventenddate);
    const registrationDeadline = validatedData.dat_meldeschluss ? new Date(validatedData.dat_meldeschluss) : null;

    // Find the venue by name to get the venue ID
    let venueId = 1; // Default venue ID
    if (validatedData.var_location) {
      const venue = await prisma.tfx_wettkampforte.findFirst({
        where: { var_name: validatedData.var_location }
      });
      
      if (venue) {
        venueId = venue.int_wettkampforteid;
        console.log(`🏢 Found venue for new event: ${venue.var_name} (ID: ${venue.int_wettkampforteid})`);
      } else {
        console.log(`⚠️ Venue not found: ${validatedData.var_location}, using default venue ID 1`);
      }
    }

    // Create the event using Prisma
    const newEvent = await prisma.tfx_veranstaltungen.create({
      data: {
        var_name: validatedData.var_eventname,
        dat_von: startDate,
        dat_bis: endDate,
        txt_hinweise: validatedData.var_description || null,
        dat_meldeschluss: registrationDeadline,
        // Set venue ID and default values for required fields
        int_wettkampforteid: venueId,
        int_runde: 1
      }
    });

    // Get the venue name for the response
    const venue = newEvent.int_wettkampforteid !== null 
      ? await prisma.tfx_wettkampforte.findUnique({
          where: { int_wettkampforteid: newEvent.int_wettkampforteid }
        })
      : null;

    // Format the response to match the expected structure
    const response = {
      int_eventid: newEvent.int_veranstaltungenid,
      var_eventname: newEvent.var_name,
      dat_eventstartdate: newEvent.dat_von?.toISOString(),
      dat_eventenddate: newEvent.dat_bis?.toISOString(),
      var_location: venue?.var_name || '',
      var_description: newEvent.txt_hinweise || '',
      dat_meldeschluss: newEvent.dat_meldeschluss?.toISOString() || null,
      var_veranstalter: newEvent.var_veranstalter,
      participant_count: 0,
      score_count: 0
    };

    console.log('✅ Event created successfully:', {
      id: newEvent.int_veranstaltungenid,
      name: newEvent.var_name,
      dates: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`
    });

    res.status(201).json({ event: response });
  } catch (error: any) {
    console.error('Error creating event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update existing event
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const validatedData = updateEventSchema.parse(req.body);
    
    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.var_eventname !== undefined) {
      updateData.var_name = validatedData.var_eventname;
    }
    if (validatedData.dat_eventstartdate !== undefined) {
      updateData.dat_von = new Date(validatedData.dat_eventstartdate);
    }
    if (validatedData.dat_eventenddate !== undefined) {
      updateData.dat_bis = new Date(validatedData.dat_eventenddate);
    }
    if (validatedData.int_wettkampforteid !== undefined) {
      updateData.int_wettkampforteid = validatedData.int_wettkampforteid;
    }
    if (validatedData.var_location !== undefined && !validatedData.int_wettkampforteid) {
      // Find the venue by name to get the venue ID only if venue ID not provided
      const venue = await prisma.tfx_wettkampforte.findFirst({
        where: { var_name: validatedData.var_location }
      });
      
      if (venue) {
        updateData.int_wettkampforteid = venue.int_wettkampforteid;
        console.log(`🏢 Found venue: ${venue.var_name} (ID: ${venue.int_wettkampforteid})`);
      } else {
        console.log(`⚠️ Venue not found: ${validatedData.var_location}, keeping existing venue`);
      }
    }
    if (validatedData.var_description !== undefined) {
      updateData.txt_hinweise = validatedData.var_description || null;
    }
    if (validatedData.txt_hinweise !== undefined) {
      updateData.txt_hinweise = validatedData.txt_hinweise || null;
    }
    if (validatedData.var_veranstalter !== undefined) {
      updateData.var_veranstalter = validatedData.var_veranstalter;
    }
    if (validatedData.dat_meldeschluss !== undefined) {
      updateData.dat_meldeschluss = validatedData.dat_meldeschluss ? new Date(validatedData.dat_meldeschluss) : null;
    }
    if (validatedData.int_ansprechpartner !== undefined) {
      updateData.int_ansprechpartner = validatedData.int_ansprechpartner;
    }
    if (validatedData.int_meldung_an !== undefined) {
      updateData.int_meldung_an = validatedData.int_meldung_an;
    }
    if (validatedData.int_kampfrichter !== undefined) {
      updateData.int_kampfrichter = validatedData.int_kampfrichter;
    }
    if (validatedData.int_helfer !== undefined) {
      updateData.int_helfer = validatedData.int_helfer;
    }
    if (validatedData.int_edv !== undefined) {
      updateData.int_edv = validatedData.int_edv;
    }

    // Update the event
    const updatedEvent = await prisma.tfx_veranstaltungen.update({
      where: { int_veranstaltungenid: id },
      data: updateData
    });

    // Get the venue for the response
    const venue = updatedEvent.int_wettkampforteid ? await prisma.tfx_wettkampforte.findUnique({
      where: { int_wettkampforteid: updatedEvent.int_wettkampforteid }
    }) : null;

    // Get contact person information
    const contactPerson = updatedEvent.int_ansprechpartner ? await prisma.tfx_personen.findUnique({
      where: { int_personenid: updatedEvent.int_ansprechpartner }
    }) : null;

    // Get registration contact person information
    const registrationContact = updatedEvent.int_meldung_an ? await prisma.tfx_personen.findUnique({
      where: { int_personenid: updatedEvent.int_meldung_an }
    }) : null;

    // Format the response using only fields that exist in the database schema
    const response = {
      int_eventid: updatedEvent.int_veranstaltungenid,
      var_eventname: updatedEvent.var_name,
      dat_eventstartdate: updatedEvent.dat_von?.toISOString(),
      dat_eventenddate: updatedEvent.dat_bis?.toISOString(),
      var_location: venue?.var_name || '',
      var_description: updatedEvent.txt_hinweise || '',
      dat_meldeschluss: updatedEvent.dat_meldeschluss?.toISOString() || null,
      var_veranstalter: updatedEvent.var_veranstalter,
      int_wettkampforteid: updatedEvent.int_wettkampforteid,
      int_ansprechpartner: updatedEvent.int_ansprechpartner,
      int_meldung_an: updatedEvent.int_meldung_an,
      int_kampfrichter: updatedEvent.int_kampfrichter,
      int_helfer: updatedEvent.int_helfer,
      int_edv: updatedEvent.int_edv,
      txt_hinweise: updatedEvent.txt_hinweise,
      venue_name: venue?.var_name,
      venue_address: venue?.var_adresse,
      venue_postal_code: venue?.var_plz,
      venue_city: venue?.var_ort,
      contact_person_name: contactPerson ? `${contactPerson.var_vorname || ''} ${contactPerson.var_nachname || ''}`.trim() : null,
      registration_contact_name: registrationContact ? `${registrationContact.var_vorname || ''} ${registrationContact.var_nachname || ''}`.trim() : null
    };

    console.log('✅ Event updated successfully:', {
      id: updatedEvent.int_veranstaltungenid,
      name: updatedEvent.var_name
    });

    // Emit Socket.IO event for real-time update
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`competition-${updatedEvent.int_veranstaltungenid}`).emit('event-updated', {
          eventId: updatedEvent.int_veranstaltungenid,
          updated: true
        });
      }
    } catch (err) {
      // Socket.IO not available, skip notification
    }
    res.json({ event: response });
  } catch (error: any) {
    console.error('Error updating event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Import event from DTB Gymnet XML
router.post('/import-gymnet', authenticateToken, upload.single('xmlFile'), async (req: AuthRequest, res) => {
  let filePath: string | undefined;
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Keine XML-Datei hochgeladen' 
      });
    }

    filePath = req.file.path;
    console.log('🔍 XML Import Started:');
    console.log('  - File:', req.file.originalname);
    console.log('  - Size:', req.file.size, 'bytes');
    console.log('  - Path:', filePath);

    // Extract event information from form data
    const eventName = req.body.eventName;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const locationId = req.body.locationId; // Now expecting the venue ID instead of name
    const description = req.body.description;

    console.log('📅 Event Information:');
    console.log('  - Name:', eventName);
    console.log('  - Start Date:', startDate);
    console.log('  - End Date:', endDate);
    console.log('  - Location ID:', locationId);
    console.log('  - Description:', description);

    // Validate required event name
    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event name is required' 
      });
    }

    filePath = req.file.path;

    // Read and parse XML file
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        message: 'XML file path is undefined' 
      });
    }
    
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    console.log('📄 XML Content Preview (first 500 chars):');
    console.log(xmlContent.substring(0, 500) + '...');

    // Parse XML to JavaScript object
    const parsedXml: any = await parseXmlAsync(xmlContent, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });

    console.log('🎯 XML Structure Analysis:');
    console.log('📊 Root elements:', Object.keys(parsedXml || {}));
    
    // Deep analysis of XML structure
    const analyzeObject = (obj: any, path: string = '', depth: number = 0): any => {
      const analysis: any = {};
      
      if (depth > 5) return '... (max depth reached)';
      
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          analysis.type = 'array';
          analysis.length = obj.length;
          if (obj.length > 0) {
            analysis.firstElement = analyzeObject(obj[0], `${path}[0]`, depth + 1);
          }
        } else {
          analysis.type = 'object';
          analysis.keys = Object.keys(obj);
          analysis.properties = {};
          
          Object.keys(obj).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            analysis.properties[key] = analyzeObject(obj[key], currentPath, depth + 1);
          });
        }
      } else {
        analysis.type = typeof obj;
        analysis.value = String(obj).substring(0, 100);
      }
      
      return analysis;
    };

    const xmlAnalysis = analyzeObject(parsedXml);
    
    console.log('🔍 Detailed XML Analysis:');
    console.log(JSON.stringify(xmlAnalysis, null, 2));

    // Extract key data for debugging
    let debugData: any = {
      xmlStructure: xmlAnalysis,
      rawXmlPreview: xmlContent.substring(0, 1000),
      fileInfo: {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      parseTimestamp: new Date().toISOString()
    };

    // Try to find common GymNet XML structures
    const findInObject = (obj: any, searchKeys: string[]): any => {
      const results: any = {};
      
      const search = (current: any, path: string = '') => {
        if (typeof current === 'object' && current !== null) {
          Object.keys(current).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            
            // Check if this key matches any search key
            searchKeys.forEach(searchKey => {
              if (key.toLowerCase().includes(searchKey.toLowerCase()) || 
                  searchKey.toLowerCase().includes(key.toLowerCase())) {
                if (!results[searchKey]) results[searchKey] = [];
                results[searchKey].push({
                  path: currentPath,
                  value: current[key],
                  type: Array.isArray(current[key]) ? 'array' : typeof current[key]
                });
              }
            });
            
            // Recurse into objects and arrays
            if (Array.isArray(current[key])) {
              current[key].forEach((item: any, index: number) => {
                search(item, `${currentPath}[${index}]`);
              });
            } else if (typeof current[key] === 'object') {
              search(current[key], currentPath);
            }
          });
        }
      };
      
      search(obj);
      return results;
    };

    // Search for typical GymNet/gymnastics competition elements
    const searchTerms = [
      'competition', 'wettkampf', 'event', 'veranstaltung',
      'participant', 'teilnehmer', 'athlete', 'turner',
      'score', 'wertung', 'note', 'bewertung',
      'discipline', 'disziplin', 'apparatus', 'gerät',
      'club', 'verein', 'team', 'mannschaft',
      'category', 'kategorie', 'age', 'alter',
      'name', 'vorname', 'nachname', 'firstname', 'lastname',
      'result', 'ergebnis', 'ranking', 'platz'
    ];

    const foundElements = findInObject(parsedXml, searchTerms);
    debugData.potentialDataElements = foundElements;

    console.log('🎪 Potential Gymnastics Data Found:');
    Object.keys(foundElements).forEach(key => {
      if (foundElements[key].length > 0) {
        console.log(`  ${key}:`, foundElements[key].length, 'matches');
        foundElements[key].slice(0, 3).forEach((match: any) => {
          console.log(`    - ${match.path}: ${match.type}`);
        });
      }
    });

    // Enhanced data extraction for clubs, competitions, participants, and devices
    const extractData = (obj: any): any => {
      interface TeamData {
        clubName: string;
        competitionNumber: string | null;
        participants: { firstName: string; lastName: string; birthDate?: string }[];
      }

      interface ExtractedData {
        clubs: any[];
        competitions: any[];
        participants: any[];
        devices: any[];
        teams: TeamData[];
      }

      const result: ExtractedData = {
        clubs: [],
        competitions: [],
        participants: [],
        devices: [],
        teams: []
      };

      // Helper: Extract team data from a Mannschaft node
      const extractTeamFromMannschaft = (team: any, competitionCtx: any) => {
        let teamClubName: string | null = null;
        if (team.verKurzname) teamClubName = team.verKurzname;
        else if (team.verName) teamClubName = team.verName;
        else if (team.var_name) teamClubName = team.var_name;

        if (!teamClubName || !team.Teilnehmer) return;

        const teilnehmerData = team.Teilnehmer;
        if (!teilnehmerData.TN) return;

        const participants = Array.isArray(teilnehmerData.TN) ? teilnehmerData.TN : [teilnehmerData.TN];
        // Only create a team if there are multiple participants (team competition)
        if (participants.length > 1) {
          const teamEntry: TeamData = {
            clubName: teamClubName,
            competitionNumber: competitionCtx?.waNr || null,
            participants: participants.map((p: any) => ({
              firstName: p.perVorname?.trim() || '',
              lastName: p.perName?.trim() || '',
              birthDate: p.perGeburt || undefined
            }))
          };
          result.teams.push(teamEntry);
          console.log(`  🏅 Team detected: ${teamClubName} with ${participants.length} members (competition: ${competitionCtx?.waNr || 'unknown'})`);
        }
      };

      // Extract clubs/teams/vereins
      const extractClubs = (data: any, currentPath: string) => {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            if (item && typeof item === 'object') {
              const club: any = {};
              Object.keys(item).forEach(key => {
                if (key.toLowerCase().includes('name') || 
                    key.toLowerCase().includes('verein') || 
                    key.toLowerCase().includes('club') ||
                    key.toLowerCase().includes('kurzname') ||
                    key.toLowerCase().includes('team')) {
                  club.name = item[key];
                }
                if (key.toLowerCase().includes('id') || 
                    key.toLowerCase().includes('verid')) {
                  club.id = item[key];
                }
                if (key.toLowerCase().includes('code') || 
                    key.toLowerCase().includes('abbreviation') ||
                    key.toLowerCase().includes('kennung') ||
                    key.toLowerCase().includes('dtbkennung')) {
                  club.code = item[key];
                }
              });
              if (Object.keys(club).length > 0) {
                club._source = `${currentPath}[${index}]`;
                result.clubs.push(club);
              }
            }
          });
        } else if (data && typeof data === 'object') {
          // Handle single object case
          const club: any = {};
          Object.keys(data).forEach(key => {
            if (key.toLowerCase().includes('name') || 
                key.toLowerCase().includes('verein') || 
                key.toLowerCase().includes('club') ||
                key.toLowerCase().includes('kurzname') ||
                key.toLowerCase().includes('team')) {
              club.name = data[key];
            }
            if (key.toLowerCase().includes('id') || 
                key.toLowerCase().includes('verid')) {
              club.id = data[key];
            }
            if (key.toLowerCase().includes('code') || 
                key.toLowerCase().includes('abbreviation') ||
                key.toLowerCase().includes('kennung') ||
                key.toLowerCase().includes('dtbkennung')) {
              club.code = data[key];
            }
          });
          if (Object.keys(club).length > 0) {
            club._source = currentPath;
            result.clubs.push(club);
          }
        }
      };

      // Extract competitions/events/wettkämpfe
      const extractCompetitions = (data: any, currentPath: string) => {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            if (item && typeof item === 'object') {
              const competition: any = {};
              Object.keys(item).forEach(key => {
                // DTB GymNet specific field mappings (prioritize these)
                if (key === 'waName') {
                  competition.name = item[key];
                }
                else if (key === 'waID') {
                  competition.id = item[key];
                }
                else if (key === 'waNr') {
                  competition.waNr = item[key];
                  competition.number = item[key]; // Also set as number for compatibility
                }
                else if (key === 'waGeschlecht') {
                  const genderValue = String(item[key]);
                  if (genderValue === '1') {
                    competition.gender = 'männlich';
                  } else if (genderValue === '2') {
                    competition.gender = 'weiblich';
                  } else {
                    competition.gender = 'mixed';
                  }
                }
                else if (key === 'waAlterMin') {
                  if (!competition.ageInfo) competition.ageInfo = {};
                  competition.ageInfo.min = parseInt(item[key]) || 0;
                }
                else if (key === 'waAlterMax') {
                  if (!competition.ageInfo) competition.ageInfo = {};
                  competition.ageInfo.max = parseInt(item[key]) || 0;
                }
                else if (key === 'waAnzahlMin') {
                  if (!competition.teamInfo) competition.teamInfo = {};
                  competition.teamInfo.min = parseInt(item[key]) || 0;
                }
                else if (key === 'waAnzahlMax') {
                  if (!competition.teamInfo) competition.teamInfo = {};
                  competition.teamInfo.max = parseInt(item[key]) || 0;
                }
                // Generic field mappings (fallback)
                else if (key.toLowerCase().includes('name') || 
                    key.toLowerCase().includes('title') ||
                    key.toLowerCase().includes('bezeichnung') ||
                    key.toLowerCase().includes('wettkampf')) {
                  if (!competition.name) competition.name = item[key];
                }
                else if (key.toLowerCase().includes('id')) {
                  if (!competition.id) competition.id = item[key];
                }
                if (key.toLowerCase().includes('date') || 
                    key.toLowerCase().includes('datum')) {
                  competition.date = item[key];
                }
                if (key.toLowerCase().includes('category') || 
                    key.toLowerCase().includes('kategorie')) {
                  competition.category = item[key];
                }
                
                // Extract competition number/waNr
                if (key.toLowerCase().includes('wanr') || 
                    key.toLowerCase().includes('wageschlechtnr') ||
                    key.toLowerCase().includes('competitionnumber') ||
                    key.toLowerCase().includes('wettbewerbnr') ||
                    key.toLowerCase().includes('number')) {
                  competition.waNr = item[key];
                  competition.number = item[key]; // Also set as number for compatibility
                }
                
                // Extract gender from waGeschlecht attribute (DTB standard)
                if (key === 'waGeschlecht') {
                  const genderValue = String(item[key]);
                  if (genderValue === '1') {
                    competition.gender = 'männlich';
                  } else if (genderValue === '2') {
                    competition.gender = 'weiblich';
                  } else {
                    competition.gender = 'mixed';
                  }
                }
                
                // Extract age range from waAlterMin/waAlterMax attributes (DTB standard)
                if (key === 'waAlterMin') {
                  if (!competition.ageInfo) competition.ageInfo = {};
                  competition.ageInfo.min = parseInt(item[key]) || 0;
                }
                if (key === 'waAlterMax') {
                  if (!competition.ageInfo) competition.ageInfo = {};
                  competition.ageInfo.max = parseInt(item[key]) || 0;
                }

                // Extract team size info from waAnzahlMin/waAnzahlMax (DTB standard)
                if (key === 'waAnzahlMin') {
                  if (!competition.teamInfo) competition.teamInfo = {};
                  competition.teamInfo.min = parseInt(item[key]) || 0;
                }
                if (key === 'waAnzahlMax') {
                  if (!competition.teamInfo) competition.teamInfo = {};
                  competition.teamInfo.max = parseInt(item[key]) || 0;
                }
                
                // Fallback: Extract gender information from other fields
                if (!competition.gender && (key.toLowerCase().includes('geschlecht') || 
                    key.toLowerCase().includes('gender') ||
                    key.toLowerCase().includes('sex'))) {
                  competition.gender = item[key];
                }
                
                // Fallback: Enhanced age extraction from other fields
                if (key.toLowerCase().includes('alter') && key !== 'waAlterMin' && key !== 'waAlterMax') {
                  if (!competition.ageInfo) competition.ageInfo = {};
                  if (key.toLowerCase().includes('min') || key.toLowerCase().includes('von')) {
                    competition.ageInfo.min = parseInt(item[key]) || 0;
                  } else if (key.toLowerCase().includes('max') || key.toLowerCase().includes('bis')) {
                    competition.ageInfo.max = parseInt(item[key]) || 0;
                  } else {
                    // Try to parse age range from string like "17-18" or "17 - 18"
                    const ageStr = String(item[key]);
                    const ageMatch = ageStr.match(/(\d+)\s*[-–]\s*(\d+)/);
                    if (ageMatch) {
                      competition.ageInfo.min = parseInt(ageMatch[1]);
                      competition.ageInfo.max = parseInt(ageMatch[2]);
                    }
                  }
                }
              });
              
              if (Object.keys(competition).length > 0) {
                competition._source = `${currentPath}[${index}]`;
                result.competitions.push(competition);
              }
            }
          });
        } else if (data && typeof data === 'object') {
          // Handle single object case
          const competition: any = {};
          Object.keys(data).forEach(key => {
            if (key.toLowerCase().includes('name') || 
                key.toLowerCase().includes('title') ||
                key.toLowerCase().includes('bezeichnung') ||
                key.toLowerCase().includes('wettkampf')) {
              competition.name = data[key];
            }
            if (key.toLowerCase().includes('id') ||
                key.toLowerCase().includes('waid')) {
              competition.id = data[key];
            }
            if (key.toLowerCase().includes('date') || 
                key.toLowerCase().includes('datum')) {
              competition.date = data[key];
            }
            if (key.toLowerCase().includes('category') || 
                key.toLowerCase().includes('kategorie')) {
              competition.category = data[key];
            }
            
            // Extract competition number/waNr
            if (key.toLowerCase().includes('wanr') || 
                key.toLowerCase().includes('wageschlechtnr') ||
                key.toLowerCase().includes('competitionnumber') ||
                key.toLowerCase().includes('wettbewerbnr') ||
                key.toLowerCase().includes('number')) {
              competition.waNr = data[key];
              competition.number = data[key]; // Also set as number for compatibility
            }
            
            // Extract gender from waGeschlecht attribute (DTB standard)
            if (key === 'waGeschlecht') {
              const genderValue = String(data[key]);
              if (genderValue === '1') {
                competition.gender = 'männlich';
              } else if (genderValue === '2') {
                competition.gender = 'weiblich';
              } else {
                competition.gender = 'mixed';
              }
            }
            
            // Extract age range from waAlterMin/waAlterMax attributes (DTB standard)
            if (key === 'waAlterMin') {
              if (!competition.ageInfo) competition.ageInfo = {};
              competition.ageInfo.min = parseInt(data[key]) || 0;
            }
            if (key === 'waAlterMax') {
              if (!competition.ageInfo) competition.ageInfo = {};
              competition.ageInfo.max = parseInt(data[key]) || 0;
            }

            // Extract team size info from waAnzahlMin/waAnzahlMax (DTB standard)
            if (key === 'waAnzahlMin') {
              if (!competition.teamInfo) competition.teamInfo = {};
              competition.teamInfo.min = parseInt(data[key]) || 0;
            }
            if (key === 'waAnzahlMax') {
              if (!competition.teamInfo) competition.teamInfo = {};
              competition.teamInfo.max = parseInt(data[key]) || 0;
            }
            
            // Fallback: Extract gender information from other fields
            if (!competition.gender && (key.toLowerCase().includes('geschlecht') || 
                key.toLowerCase().includes('gender') ||
                key.toLowerCase().includes('sex'))) {
              competition.gender = data[key];
            }
            
            // Fallback: Enhanced age extraction from other fields
            if (key.toLowerCase().includes('alter') && key !== 'waAlterMin' && key !== 'waAlterMax') {
              if (!competition.ageInfo) competition.ageInfo = {};
              if (key.toLowerCase().includes('min') || key.toLowerCase().includes('von')) {
                competition.ageInfo.min = parseInt(data[key]) || 0;
              } else if (key.toLowerCase().includes('max') || key.toLowerCase().includes('bis')) {
                competition.ageInfo.max = parseInt(data[key]) || 0;
              } else {
                // Try to parse age range from string like "17-18" or "17 - 18"
                const ageStr = String(data[key]);
                const ageMatch = ageStr.match(/(\d+)\s*[-–]\s*(\d+)/);
                if (ageMatch) {
                  competition.ageInfo.min = parseInt(ageMatch[1]);
                  competition.ageInfo.max = parseInt(ageMatch[2]);
                }
              }
            }
          });
          
          if (Object.keys(competition).length > 0) {
            competition._source = currentPath;
            result.competitions.push(competition);
          }
        }
      };

      // Extract participants/athletes/teilnehmer
      const extractParticipants = (data: any, currentPath: string) => {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            if (item && typeof item === 'object') {
              const participant: any = {};
              Object.keys(item).forEach(key => {
                // DTB GymNet specific field mappings (prioritize these)
                if (key === 'perVorname') {
                  participant.firstName = item[key];
                }
                else if (key === 'perName') {
                  participant.lastName = item[key];
                }
                else if (key === 'perGeburt') {
                  participant.birthDate = item[key];
                }
                else if (key === 'perGeschlecht') {
                  participant.gender = item[key];
                }
                else if (key === 'perID') {
                  participant.id = item[key];
                }
                // Generic field mappings (fallback)
                else if (key.toLowerCase().includes('firstname') || 
                    key.toLowerCase().includes('vorname')) {
                  if (!participant.firstName) participant.firstName = item[key];
                }
                // Then check for lastName (excluding vorname patterns)
                else if ((key.toLowerCase().includes('name') || 
                         key.toLowerCase().includes('nachname') ||
                         key.toLowerCase().includes('lastname')) &&
                        !key.toLowerCase().includes('vorname') &&
                        !key.toLowerCase().includes('firstname')) {
                  participant.lastName = item[key];
                }
                if (key.toLowerCase().includes('id') ||
                    key.toLowerCase().includes('tnid') ||
                    key.toLowerCase().includes('perid')) {
                  participant.id = item[key];
                }
                if (key.toLowerCase().includes('birth') || 
                    key.toLowerCase().includes('geburt') ||
                    key.toLowerCase().includes('geburts')) {
                  participant.birthDate = item[key];
                }
                if (key.toLowerCase().includes('sex') || 
                    key.toLowerCase().includes('gender') ||
                    key.toLowerCase().includes('geschlecht')) {
                  participant.gender = item[key];
                }
                // Extract club/verein information
                if (key.toLowerCase().includes('club') || 
                    key.toLowerCase().includes('verein') ||
                    key.toLowerCase().includes('team') ||
                    key.toLowerCase().includes('organization') ||
                    key.toLowerCase().includes('organisation')) {
                  participant.club = item[key];
                }
                // Extract competition assignment information
                if (key.toLowerCase().includes('wanr') || 
                    key.toLowerCase().includes('wageschlechtnr') ||
                    key.toLowerCase().includes('competitionnumber') ||
                    key.toLowerCase().includes('wettbewerbnr') ||
                    key.toLowerCase().includes('competition')) {
                  participant.competitionNumber = item[key];
                }
              });
              if (Object.keys(participant).length > 0) {
                participant._source = `${currentPath}[${index}]`;
                result.participants.push(participant);
              }
            }
          });
        } else if (data && typeof data === 'object') {
          // Handle single object case
          const participant: any = {};
          Object.keys(data).forEach(key => {
            // First check for firstName (more specific patterns first)
            if (key.toLowerCase().includes('firstname') || 
                key.toLowerCase().includes('vorname') ||
                key.toLowerCase().includes('pervorname')) {
              participant.firstName = data[key];
            }
            // Then check for lastName (excluding vorname patterns)
            else if ((key.toLowerCase().includes('name') || 
                     key.toLowerCase().includes('nachname') ||
                     key.toLowerCase().includes('lastname') ||
                     key.toLowerCase().includes('pername')) &&
                    !key.toLowerCase().includes('vorname') &&
                    !key.toLowerCase().includes('firstname')) {
              participant.lastName = data[key];
            }
            if (key.toLowerCase().includes('id') ||
                key.toLowerCase().includes('tnid') ||
                key.toLowerCase().includes('perid')) {
              participant.id = data[key];
            }
            if (key.toLowerCase().includes('birth') || 
                key.toLowerCase().includes('geburt') ||
                key.toLowerCase().includes('geburts')) {
              participant.birthDate = data[key];
            }
            if (key.toLowerCase().includes('sex') || 
                key.toLowerCase().includes('gender') ||
                key.toLowerCase().includes('geschlecht')) {
              participant.gender = data[key];
            }
            // Extract club/verein information
            if (key.toLowerCase().includes('club') || 
                key.toLowerCase().includes('verein') ||
                key.toLowerCase().includes('team') ||
                key.toLowerCase().includes('organization') ||
                key.toLowerCase().includes('organisation')) {
              participant.club = data[key];
            }
            // Extract competition assignment information
            if (key.toLowerCase().includes('wanr') || 
                key.toLowerCase().includes('wageschlechtnr') ||
                key.toLowerCase().includes('competitionnumber') ||
                key.toLowerCase().includes('wettbewerbnr') ||
                key.toLowerCase().includes('competition')) {
              participant.competitionNumber = data[key];
            }
          });
          if (Object.keys(participant).length > 0) {
            participant._source = currentPath;
            result.participants.push(participant);
          }
        }
      };

      // Extract devices/apparatus/geräte
      const extractDevices = (data: any, currentPath: string, competitionCtx?: any) => {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            if (Array.isArray(item)) {
              // Nested array – flatten and recurse
              extractDevices(item, `${currentPath}[${index}]`, competitionCtx);
              return;
            }
            if (item && typeof item === 'object') {
              const device: any = {};
              Object.keys(item).forEach(key => {
                if (key.toLowerCase().includes('name') || 
                    key.toLowerCase().includes('gerät') ||
                    key.toLowerCase().includes('apparatus') ||
                    key.toLowerCase().includes('discipline') ||
                    key.toLowerCase().includes('disziplin') ||
                    key.toLowerCase().includes('bezeichnung') ||
                    key.toLowerCase().includes('weddisname')) {
                  device.name = item[key];
                }
                if (key.toLowerCase().includes('disid') ||
                    key.toLowerCase().includes('gerid') ||
                    key.toLowerCase().includes('weddisid')) {
                  device.id = item[key];
                }
                if (key.toLowerCase().includes('code') || 
                    key.toLowerCase().includes('abbreviation') ||
                    key.toLowerCase().includes('kuerzel') ||
                    key.toLowerCase().includes('kurz') ||
                    key.toLowerCase().includes('weddisnr')) {
                  device.code = item[key];
                }
                if (key.toLowerCase().includes('reihenfolge') ||
                    key.toLowerCase().includes('order') ||
                    key.toLowerCase().includes('folge') ||
                    key.toLowerCase().includes('position')) {
                  device.order = item[key];
                }
              });
              if (Object.keys(device).length > 0) {
                device._source = `${currentPath}[${index}]`;
                // Attach competition context so we know which competition this device belongs to
                if (competitionCtx) {
                  device.competitionWaNr = competitionCtx.waNr;
                  device.competitionName = competitionCtx.name;
                }
                result.devices.push(device);
              }
            }
          });
        } else if (data && typeof data === 'object') {
          // Handle single object case
          const device: any = {};
          Object.keys(data).forEach(key => {
            if (key.toLowerCase().includes('name') || 
                key.toLowerCase().includes('gerät') ||
                key.toLowerCase().includes('apparatus') ||
                key.toLowerCase().includes('discipline') ||
                key.toLowerCase().includes('disziplin') ||
                key.toLowerCase().includes('bezeichnung') ||
                key.toLowerCase().includes('weddisname')) {
              device.name = data[key];
            }
            if (key.toLowerCase().includes('disid') ||
                key.toLowerCase().includes('gerid') ||
                key.toLowerCase().includes('weddisid')) {
              device.id = data[key];
            }
            if (key.toLowerCase().includes('code') || 
                key.toLowerCase().includes('abbreviation') ||
                key.toLowerCase().includes('kuerzel') ||
                key.toLowerCase().includes('kurz') ||
                key.toLowerCase().includes('weddisnr')) {
              device.code = data[key];
            }
            if (key.toLowerCase().includes('reihenfolge') ||
                key.toLowerCase().includes('order') ||
                key.toLowerCase().includes('folge') ||
                key.toLowerCase().includes('position')) {
              device.order = data[key];
            }
          });
          if (Object.keys(device).length > 0) {
            device._source = currentPath;
            // Attach competition context so we know which competition this device belongs to
            if (competitionCtx) {
              device.competitionWaNr = competitionCtx.waNr;
              device.competitionName = competitionCtx.name;
            }
            result.devices.push(device);
          }
        }
      };

      const processNode = (node: any, path: string = '', competitionContext: any = null) => {
        if (!node || typeof node !== 'object') return;

        Object.keys(node).forEach(key => {
          const value = node[key];
          const currentPath = path ? `${path}.${key}` : key;

          // Check if we're entering a competition context (DTB GymNet structure)
          let currentCompetitionContext = competitionContext;
          if (node.waID && node.waNr) { // This node represents a DTB competition
            currentCompetitionContext = {
              waID: node.waID,
              waNr: node.waNr,
              name: node.waBezeichnung || node.waName || node.Name || '',
              path: currentPath
            };
            
            console.log(`🏆 Processing competition: ${currentCompetitionContext.name} (waNr: ${currentCompetitionContext.waNr})`);
            
            // Extract this competition
            extractCompetitions([node], currentPath);
          }

          // Handle DTB GymNet specific structures
          if (key.toLowerCase() === 'wettkampf' || key.toLowerCase() === 'wettkämpfe') {
            if (Array.isArray(value)) {
              value.forEach((comp: any, index: number) => {
                processNode(comp, `${currentPath}[${index}]`, null);
              });
            } else if (value && typeof value === 'object' && value.Wettkampf) {
              if (Array.isArray(value.Wettkampf)) {
                value.Wettkampf.forEach((comp: any, index: number) => {
                  processNode(comp, `${currentPath}.Wettkampf[${index}]`, null);
                });
              } else {
                processNode(value.Wettkampf, `${currentPath}.Wettkampf`, null);
              }
            } else {
              processNode(value, currentPath, null);
            }
          }

          else if (key.toLowerCase() === 'mannschaft' || key.toLowerCase() === 'mannschaften') {
            if (Array.isArray(value)) {
              // Extract clubs and continue processing for participants
              extractClubs(value, currentPath);
              value.forEach((team: any, index: number) => {
                // Track team data for Mannschaft import
                extractTeamFromMannschaft(team, currentCompetitionContext);
                // Extract club name from team/Mannschaft and pass it to participants
                let teamClubName = null;
                if (team.verKurzname) teamClubName = team.verKurzname;
                else if (team.verName) teamClubName = team.verName;
                else if (team.var_name) teamClubName = team.var_name;
                
                // Process Teilnehmer within this Mannschaft and assign club
                if (team.Teilnehmer) {
                  const teilnehmerData = team.Teilnehmer;
                  if (teilnehmerData.TN) {
                    const participants = Array.isArray(teilnehmerData.TN) ? teilnehmerData.TN : [teilnehmerData.TN];
                    participants.forEach((participant: any) => {
                      // Assign club from Mannschaft level
                      if (teamClubName && !participant.club) {
                        participant.club = teamClubName;
                      }
                      if (currentCompetitionContext) {
                        participant.competitionNumber = currentCompetitionContext.waNr;
                        participant.competitionID = currentCompetitionContext.waID;
                        participant._competitionContext = currentCompetitionContext;
                        console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}, club: ${teamClubName || 'unknown'}`);
                      }
                      extractParticipants([participant], currentPath);
                    });
                  }
                }
                processNode(team, `${currentPath}[${index}]`, currentCompetitionContext);
              });
            } else if (value && typeof value === 'object' && value.Mannschaft) {
              if (Array.isArray(value.Mannschaft)) {
                extractClubs(value.Mannschaft, `${currentPath}.Mannschaft`);
                value.Mannschaft.forEach((team: any, index: number) => {
                  // Track team data for Mannschaft import
                  extractTeamFromMannschaft(team, currentCompetitionContext);
                  // Extract club name from team/Mannschaft and pass it to participants
                  let teamClubName = null;
                  if (team.verKurzname) teamClubName = team.verKurzname;
                  else if (team.verName) teamClubName = team.verName;
                  else if (team.var_name) teamClubName = team.var_name;
                  
                  // Process Teilnehmer within this Mannschaft and assign club
                  if (team.Teilnehmer) {
                    const teilnehmerData = team.Teilnehmer;
                    if (teilnehmerData.TN) {
                      const participants = Array.isArray(teilnehmerData.TN) ? teilnehmerData.TN : [teilnehmerData.TN];
                      participants.forEach((participant: any) => {
                        // Assign club from Mannschaft level
                        if (teamClubName && !participant.club) {
                          participant.club = teamClubName;
                        }
                        if (currentCompetitionContext) {
                          participant.competitionNumber = currentCompetitionContext.waNr;
                          participant.competitionID = currentCompetitionContext.waID;
                          participant._competitionContext = currentCompetitionContext;
                          console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}, club: ${teamClubName || 'unknown'}`);
                        }
                        extractParticipants([participant], currentPath);
                      });
                    }
                  }
                  processNode(team, `${currentPath}.Mannschaft[${index}]`, currentCompetitionContext);
                });
              } else {
                extractClubs([value.Mannschaft], `${currentPath}.Mannschaft`);
                // Track team data for Mannschaft import
                extractTeamFromMannschaft(value.Mannschaft, currentCompetitionContext);
                // Extract club name from team/Mannschaft and pass it to participants
                let teamClubName = null;
                if (value.Mannschaft.verKurzname) teamClubName = value.Mannschaft.verKurzname;
                else if (value.Mannschaft.verName) teamClubName = value.Mannschaft.verName;
                else if (value.Mannschaft.var_name) teamClubName = value.Mannschaft.var_name;
                
                // Process Teilnehmer within this Mannschaft and assign club
                if (value.Mannschaft.Teilnehmer) {
                  const teilnehmerData = value.Mannschaft.Teilnehmer;
                  if (teilnehmerData.TN) {
                    const participants = Array.isArray(teilnehmerData.TN) ? teilnehmerData.TN : [teilnehmerData.TN];
                    participants.forEach((participant: any) => {
                      // Assign club from Mannschaft level
                      if (teamClubName && !participant.club) {
                        participant.club = teamClubName;
                      }
                      if (currentCompetitionContext) {
                        participant.competitionNumber = currentCompetitionContext.waNr;
                        participant.competitionID = currentCompetitionContext.waID;
                        participant._competitionContext = currentCompetitionContext;
                        console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}, club: ${teamClubName || 'unknown'}`);
                      }
                      extractParticipants([participant], currentPath);
                    });
                  }
                }
                processNode(value.Mannschaft, `${currentPath}.Mannschaft`, currentCompetitionContext);
              }
            } else {
              extractClubs([value], currentPath);
              // Track team data for Mannschaft import
              extractTeamFromMannschaft(value, currentCompetitionContext);
              // Extract club name from team/Mannschaft and pass it to participants
              let teamClubName = null;
              if (value.verKurzname) teamClubName = value.verKurzname;
              else if (value.verName) teamClubName = value.verName;
              else if (value.var_name) teamClubName = value.var_name;
              
              // Process Teilnehmer within this Mannschaft and assign club
              if (value.Teilnehmer) {
                const teilnehmerData = value.Teilnehmer;
                if (teilnehmerData.TN) {
                  const participants = Array.isArray(teilnehmerData.TN) ? teilnehmerData.TN : [teilnehmerData.TN];
                  participants.forEach((participant: any) => {
                    // Assign club from Mannschaft level
                    if (teamClubName && !participant.club) {
                      participant.club = teamClubName;
                    }
                    if (currentCompetitionContext) {
                      participant.competitionNumber = currentCompetitionContext.waNr;
                      participant.competitionID = currentCompetitionContext.waID;
                      participant._competitionContext = currentCompetitionContext;
                      console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}, club: ${teamClubName || 'unknown'}`);
                    }
                    extractParticipants([participant], currentPath);
                  });
                }
              }
              processNode(value, currentPath, currentCompetitionContext);
            }
          }

          else if (key.toLowerCase() === 'teilnehmer') {
            // Handle Teilnehmer container
            if (value && typeof value === 'object' && value.TN) {
              if (Array.isArray(value.TN)) {
                value.TN.forEach((participant: any) => {
                  if (currentCompetitionContext) {
                    participant.competitionNumber = currentCompetitionContext.waNr;
                    participant.competitionID = currentCompetitionContext.waID;
                    participant._competitionContext = currentCompetitionContext;
                    console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}`);
                  }
                  extractParticipants([participant], currentPath);
                });
              } else {
                const participant = value.TN;
                if (currentCompetitionContext) {
                  participant.competitionNumber = currentCompetitionContext.waNr;
                  participant.competitionID = currentCompetitionContext.waID;
                  participant._competitionContext = currentCompetitionContext;
                  console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}`);
                }
                extractParticipants([participant], currentPath);
              }
            }
          }

          else if (key.toLowerCase() === 'tn') {
            // Direct TN extraction (fallback)
            const participant = { ...value };
            if (currentCompetitionContext) {
              participant.competitionNumber = currentCompetitionContext.waNr;
              participant.competitionID = currentCompetitionContext.waID;
              participant._competitionContext = currentCompetitionContext;
              console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}`);
            }
            extractParticipants([participant], currentPath);
          }

          else if (key.toLowerCase() === 'disziplin') {
            // Handle both single discipline object and array of disciplines
            if (Array.isArray(value)) {
              // Multiple Disziplin elements → array of discipline objects
              extractDevices(value, currentPath, currentCompetitionContext);
            } else {
              // Single Disziplin element → wrap in array
              extractDevices([value], currentPath, currentCompetitionContext);
            }
          }

          else if (key.toLowerCase() === 'disziplinen') {
            // Container element: Disziplinen > Disziplin (array or single)
            if (value && typeof value === 'object') {
              if (value.Disziplin) {
                const disziplinen = Array.isArray(value.Disziplin) ? value.Disziplin : [value.Disziplin];
                extractDevices(disziplinen, `${currentPath}.Disziplin`, currentCompetitionContext);
              } else {
                // No nested Disziplin key - process children recursively
                processNode(value, currentPath, currentCompetitionContext);
              }
            }
          }

          // Continue recursive processing with competition context
          else if (Array.isArray(value)) {
            value.forEach((item: any, index: number) => {
              if (typeof item === 'object') {
                processNode(item, `${currentPath}[${index}]`, currentCompetitionContext);
              }
            });
          } else if (typeof value === 'object' && value !== null) {
            processNode(value, currentPath, currentCompetitionContext);
          }
        });
      };

      processNode(parsedXml);
      return result;
    };

    // Extract structured data
    const extractedData = extractData(parsedXml);
    debugData.extractedData = extractedData;

    console.log('📋 Extracted Data Summary:');
    console.log(`  🏢 Clubs: ${extractedData.clubs.length}`);
    console.log(`  🏆 Competitions: ${extractedData.competitions.length}`);
    console.log(`  👥 Participants: ${extractedData.participants.length}`);
    console.log(`  🏋️ Devices: ${extractedData.devices.length}`);
    console.log(`  🏅 Teams: ${extractedData.teams.length}`);

    // Debug: Show the device extraction details
    if (extractedData.devices.length === 0) {
      console.log('🔍 DEBUG: No devices found. This could indicate:');
      console.log('  - Disciplines are nested inside competitions');
      console.log('  - Different XML structure than expected');
      console.log('  - Different field names for disciplines');
      console.log('  - Searching for devices in unexpected XML structure...');
      
      // Let's try a more aggressive search for any apparatus/discipline-like content
      const searchForDevices = (obj: any, path: string = ''): any[] => {
        const foundDevices: any[] = [];
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('gerät') || 
                keyLower.includes('apparatus') || 
                keyLower.includes('disziplin') || 
                keyLower.includes('discipline') ||
                keyLower.includes('device') ||
                keyLower.includes('sport')) {
              console.log(`  🎯 Found potential device key: "${key}" at path: ${path}.${key}`);
              if (obj[key]) {
                foundDevices.push({ key, value: obj[key], path: `${path}.${key}` });
              }
            }
            
            // Recursively search
            if (Array.isArray(obj[key])) {
              obj[key].forEach((item: any, index: number) => {
                foundDevices.push(...searchForDevices(item, `${path}.${key}[${index}]`));
              });
            } else if (obj[key] && typeof obj[key] === 'object') {
              foundDevices.push(...searchForDevices(obj[key], `${path}.${key}`));
            }
          });
        }
        return foundDevices;
      };
      
      const foundDeviceData = searchForDevices(parsedXml, 'root');
      if (foundDeviceData.length > 0) {
        console.log(`  📊 Found ${foundDeviceData.length} potential device references:`);
        foundDeviceData.slice(0, 5).forEach((device, index) => {
          console.log(`    ${index + 1}. Key: "${device.key}" at ${device.path}`);
          console.log(`       Sample data:`, JSON.stringify(device.value).substring(0, 200));
        });
      } else {
        console.log('  ❌ No device/discipline references found in entire XML structure');
      }
    }

    // Log detailed findings
    if (extractedData.clubs.length > 0) {
      console.log('🏢 Found Clubs:');
      extractedData.clubs.slice(0, 5).forEach((club: any, index: number) => {
        console.log(`  ${index + 1}. ${club.name || 'Unnamed'} (ID: ${club.id || 'N/A'}) [${club._source}]`);
      });
    }

    if (extractedData.competitions.length > 0) {
      console.log('🏆 Found Competitions:');
      extractedData.competitions.slice(0, 5).forEach((comp: any, index: number) => {
        console.log(`  ${index + 1}. ${comp.name || 'Unnamed'} (ID: ${comp.id || 'N/A'}) [${comp._source}]`);
        if (comp.ageInfo && (comp.ageInfo.min || comp.ageInfo.max)) {
          console.log(`     Ages: ${comp.ageInfo.min || 'N/A'} - ${comp.ageInfo.max || 'N/A'}`);
        }
        if (comp.gender) {
          console.log(`     Gender: ${comp.gender}`);
        }
        if (comp.category) {
          console.log(`     Category: ${comp.category}`);
        }
      });
      if (extractedData.competitions.length > 5) {
        console.log(`  ... and ${extractedData.competitions.length - 5} more competitions`);
      }
    }

    if (extractedData.participants.length > 0) {
      console.log('👥 Found Participants:');
      extractedData.participants.slice(0, 5).forEach((participant: any, index: number) => {
        const fullName = [participant.firstName, participant.lastName].filter(Boolean).join(' ') || 'Unnamed';
        console.log(`  ${index + 1}. ${fullName} (ID: ${participant.id || 'N/A'}) [${participant._source}]`);
      });
    }

    if (extractedData.devices.length > 0) {
      console.log('🏋️ Found Devices:');
      extractedData.devices.slice(0, 5).forEach((device: any, index: number) => {
        console.log(`  ${index + 1}. ${device.name || 'Unnamed'} (ID: ${device.id || 'N/A'}) [${device._source}]`);
      });
    }

    // Parse dates if provided for use in both event creation and response
    // Ensure dates are never null - use current date as fallback
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedEndDate = endDate ? new Date(endDate) : new Date();

    // Create the event in the database with extracted data
    let createdEvent = null;
    let eventCreationError = null;
    
    // Fetch venue details if locationId is provided
    let venue = null;
    let venueIdToUse = 1; // Default venue ID
    let venueNameToUse = ''; // Default empty venue name
    
    if (locationId) {
      try {
        venue = await prisma.tfx_wettkampforte.findUnique({
          where: { int_wettkampforteid: parseInt(locationId) }
        });
        if (venue) {
          venueIdToUse = venue.int_wettkampforteid;
          venueNameToUse = venue.var_name || '';
          console.log(`🏢 Found venue: ${venue.var_name} (ID: ${venue.int_wettkampforteid})`);
        } else {
          console.log(`⚠️ Venue with ID ${locationId} not found, using default`);
        }
      } catch (error) {
        console.error('❌ Error fetching venue:', error);
      }
    }
    
    try {
      console.log('🎪 Creating Event in Database...');
      console.log('Event details to insert:');
      console.log(`  - Name: "${eventName.trim()}"`);
      console.log(`  - Start Date: ${parsedStartDate}`);
      console.log(`  - End Date: ${parsedEndDate}`);
      console.log(`  - Location ID: ${venueIdToUse}`);
      console.log(`  - Location Name: "${venueNameToUse}"`);
      
      // Use raw SQL to insert into tfx_veranstaltungen with ALL required fields including missing ones
      const insertQuery = `
        INSERT INTO tfx_veranstaltungen (
          var_name, 
          dat_von, 
          dat_bis, 
          var_veranstalter, 
          int_wettkampforteid,
          int_meldung_an,
          int_ansprechpartner,
          int_kontenid,
          int_hauptwettkampf,
          int_runde,
          dat_meldeschluss,
          bol_rundenwettkampf,
          int_edv,
          int_helfer,
          int_kampfrichter,
          rel_meldegeld,
          rel_nachmeldung,
          bol_faellig_nichtantritt,
          bol_ummeldung_moeglich,
          bol_nachmeldung_moeglich,
          var_meldung_website,
          var_verwendungszweck,
          txt_meldung_an,
          txt_startberechtigung,
          txt_teilnahmebedingungen,
          txt_siegerauszeichnung,
          txt_kampfrichter,
          txt_hinweise
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING int_veranstaltungenid, var_name
      `;
      
      const result = await prisma.$queryRawUnsafe(
        insertQuery,
        eventName.trim(),                // $1: var_name
        parsedStartDate,                 // $2: dat_von  
        parsedEndDate,                   // $3: dat_bis
        venueNameToUse,                  // $4: var_veranstalter - venue name
        venueIdToUse,                    // $5: int_wettkampforteid - venue ID
        1,                               // $6: int_meldung_an - Default to 1 (assuming contact person ID)
        1,                               // $7: int_ansprechpartner - Default to 1 (assuming contact person ID)
        1,                               // $8: int_kontenid - Default to 1 (assuming account ID)
        null,                            // $9: int_hauptwettkampf - NULL as it's optional foreign key
        1,                               // $10: int_runde - Default to 1
        parsedEndDate,                   // $11: dat_meldeschluss - Default to end date
        false,                           // $12: bol_rundenwettkampf - Default to false
        0,                               // $13: int_edv - Default to 0
        0,                               // $14: int_helfer - Default to 0
        0,                               // $15: int_kampfrichter - Default to 0
        0.0,                             // $16: rel_meldegeld - Default to 0
        0.0,                             // $17: rel_nachmeldung - Default to 0
        false,                           // $18: bol_faellig_nichtantritt - Default to false
        false,                           // $19: bol_ummeldung_moeglich - Default to false
        false,                           // $20: bol_nachmeldung_moeglich - Default to false
        '',                              // $21: var_meldung_website - Default to empty string
        '',                              // $22: var_verwendungszweck - Default to empty string
        '',                              // $23: txt_meldung_an - Default to empty string
        '',                              // $24: txt_startberechtigung - Default to empty string
        '',                              // $25: txt_teilnahmebedingungen - Default to empty string
        '',                              // $26: txt_siegerauszeichnung - Default to empty string
        '',                              // $27: txt_kampfrichter - Default to empty string
        ''                               // $28: txt_hinweise - Default to empty string
      ) as any[];
      
      createdEvent = result[0];

      console.log('✅ Event created successfully:');
      console.log(`  - ID: ${createdEvent.int_veranstaltungenid}`);
      console.log(`  - Name: ${createdEvent.var_name}`);

    } catch (eventError) {
      console.error('❌ Error creating event in database:');
      console.error('  - Error Message:', eventError instanceof Error ? eventError.message : String(eventError));
      console.error('  - Error Stack:', eventError instanceof Error ? eventError.stack : 'No stack trace');
      console.error('  - Parameters used:');
      console.error(`    * Name: "${eventName.trim()}"`);
      console.error(`    * Start Date: ${parsedStartDate}`);
      console.error(`    * End Date: ${parsedEndDate}`);
      console.error(`    * Location ID: ${venueIdToUse}`);
      console.error(`    * Location Name: "${venueNameToUse}"`);
      console.error(`    * All other fields: defaults (int_runde=1, booleans=false, numbers=0, strings='')`);
      
      eventCreationError = eventError;
      // Don't continue with the import if event creation fails - this is critical
    }

    // Database insertion for extracted data
    console.log('💾 Starting database insertion process...');
    
    let insertionResults = {
      clubs: { inserted: 0, updated: 0, errors: 0 },
      participants: { inserted: 0, updated: 0, errors: 0 },
      competitions: { inserted: 0, updated: 0, errors: 0 },
      devices: { inserted: 0, updated: 0, errors: 0 },
      teams: { inserted: 0, members: 0, errors: 0 }
    };

    // 1. Insert/Update Clubs
    console.log('🏢 Processing clubs...');
    for (const club of extractedData.clubs) {
      try {
        if (!club.name || club.name.trim() === '') {
          console.log('  ⚠️ Skipping club with empty name');
          continue;
        }

        // Check if club exists (only by name since var_vereinsnummer doesn't exist)
        const existingClub = await prisma.$queryRawUnsafe(`
          SELECT int_vereineid FROM tfx_vereine 
          WHERE LOWER(var_name) = LOWER($1)
          LIMIT 1
        `, club.name.trim());

        if ((existingClub as any[]).length > 0) {
          // Update existing club (just the name since that's what we have)
          await prisma.$queryRawUnsafe(`
            UPDATE tfx_vereine 
            SET var_name = $1
            WHERE int_vereineid = $2
          `, club.name.trim(), (existingClub as any[])[0].int_vereineid);
          
          insertionResults.clubs.updated++;
          console.log(`  ✅ Updated club: ${club.name}`);
        } else {
          // Insert new club (with required int_gaueid field)
          await prisma.$queryRawUnsafe(`
            INSERT INTO tfx_vereine (var_name, int_gaueid)
            VALUES ($1, $2)
          `, club.name.trim(), 1); // Default gaueid = 1
          
          insertionResults.clubs.inserted++;
          console.log(`  ✅ Inserted club: ${club.name}`);
        }
      } catch (error) {
        console.log(`  ❌ Error processing club ${club.name}:`, error);
        insertionResults.clubs.errors++;
      }
    }

    // 2. Insert/Update Participants (only if event was created successfully)
    if (createdEvent) {
      console.log('👥 Processing participants...');
      for (const participant of extractedData.participants) {
        try {
          if (!participant.firstName && !participant.lastName) {
            console.log('  ⚠️ Skipping participant with no name');
            continue;
          }

        const firstName = participant.firstName?.trim() || '';
        const lastName = participant.lastName?.trim() || '';
        
        // Get club ID if club name exists
        let clubId = null;
        if (participant.club) {
          console.log(`  🔍 Looking for club: "${participant.club.trim()}"`);
          const clubResult = await prisma.$queryRawUnsafe(`
            SELECT int_vereineid FROM tfx_vereine 
            WHERE LOWER(var_name) = LOWER($1)
            LIMIT 1
          `, participant.club.trim());
          
          if ((clubResult as any[]).length > 0) {
            clubId = (clubResult as any[])[0].int_vereineid;
            console.log(`  ✅ Found club ID: ${clubId} for "${participant.club}"`);
          } else {
            console.log(`  ⚠️ Club not found: "${participant.club}"`);
            // Try to find similar club names
            const similarClubs = await prisma.$queryRawUnsafe(`
              SELECT var_name FROM tfx_vereine 
              WHERE LOWER(var_name) LIKE LOWER('%' || $1 || '%')
              LIMIT 3
            `, participant.club.trim());
            if ((similarClubs as any[]).length > 0) {
              console.log(`  💡 Similar clubs found:`, (similarClubs as any[]).map(c => c.var_name));
            }
          }
        }

        // Parse birth date - handle null values properly for raw SQL
        let birthDate: string | null = null;
        if (participant.birthDate) {
          try {
            let date: Date;
            const birthDateStr = participant.birthDate.toString();
            
            // Check if it's German format DD.MM.YYYY
            if (birthDateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
              const [day, month, year] = birthDateStr.split('.');
              // Use UTC to avoid timezone issues
              date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
            } else {
              // Try standard JavaScript date parsing
              date = new Date(participant.birthDate);
            }
            
            if (!isNaN(date.getTime())) {
              birthDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
            } else {
              console.log(`  ⚠️ Invalid birth date for ${firstName} ${lastName}: ${participant.birthDate}`);
            }
          } catch (e) {
            console.log(`  ⚠️ Invalid birth date for ${firstName} ${lastName}: ${participant.birthDate}`);
          }
        }

        // Determine gender (int_geschlecht is required in schema)
        let gender = 1; // Default to male (1)
        if (participant.gender) {
          // Handle DTB GymNet format: 1 = male, 2 = female
          if (participant.gender === '2' || participant.gender === 2) {
            gender = 2; // Female
            console.log(`    🚺 Participant ${firstName} ${lastName}: DTB gender '${participant.gender}' → Female (2)`);
          } else if (participant.gender === '1' || participant.gender === 1) {
            gender = 1; // Male
            console.log(`    🚹 Participant ${firstName} ${lastName}: DTB gender '${participant.gender}' → Male (1)`);
          } else {
            // Handle text-based gender (fallback for other formats)
            gender = participant.gender.toLowerCase() === 'w' || participant.gender.toLowerCase() === 'f' ? 2 : 1;
            console.log(`    ⚪ Participant ${firstName} ${lastName}: Text gender '${participant.gender}' → ${gender === 2 ? 'Female' : 'Male'} (${gender})`);
          }
        }

        // Check if participant exists (same first name, last name)
        // Also update participants with null birth dates if we have a valid birth date
        const existingParticipant = await prisma.$queryRawUnsafe(`
          SELECT int_teilnehmerid, dat_geburtstag FROM tfx_teilnehmer 
          WHERE LOWER(var_vorname) = LOWER($1) 
            AND LOWER(var_nachname) = LOWER($2)
            AND (
              (dat_geburtstag IS NULL AND $3::text IS NULL) OR
              (dat_geburtstag IS NOT NULL AND $3::text IS NOT NULL AND dat_geburtstag = $3::date) OR
              (dat_geburtstag IS NULL AND $3::text IS NOT NULL)
            )
          LIMIT 1
        `, firstName, lastName, birthDate);

        if ((existingParticipant as any[]).length > 0) {
          // Update existing participant - handle birth date properly
          // Only update club if we found a valid club ID (don't override with null)
          const participantId = (existingParticipant as any[])[0].int_teilnehmerid;
          const existingBirthDate = (existingParticipant as any[])[0].dat_geburtstag;
          const clubInfo = clubId ? `(club ID: ${clubId})` : '(keeping existing club)';
          const birthDateInfo = (!existingBirthDate && birthDate) ? ' [FIXED BIRTH DATE]' : '';
          
          if (birthDate) {
            await prisma.$queryRawUnsafe(`
              UPDATE tfx_teilnehmer 
              SET var_vorname = $1, var_nachname = $2, dat_geburtstag = $3::date, 
                  int_vereineid = COALESCE($4, int_vereineid), int_geschlecht = $5
              WHERE int_teilnehmerid = $6
            `, firstName, lastName, birthDate, clubId, gender, participantId);
          } else {
            await prisma.$queryRawUnsafe(`
              UPDATE tfx_teilnehmer 
              SET var_vorname = $1, var_nachname = $2, dat_geburtstag = NULL, 
                  int_vereineid = COALESCE($3, int_vereineid), int_geschlecht = $4
              WHERE int_teilnehmerid = $5
            `, firstName, lastName, clubId, gender, participantId);
          }
          
          insertionResults.participants.updated++;
          console.log(`  ✅ Updated participant: ${firstName} ${lastName} ${clubInfo}${birthDateInfo}`);
        } else {
          // Insert new participant - clubId is required (NOT NULL constraint)
          if (!clubId) {
            console.log(`  ⚠️ Skipping participant ${firstName} ${lastName}: No valid club ID (club: ${participant.club})`);
            insertionResults.participants.errors++;
            continue;
          }
          
          // Insert new participant (int_geschlecht is required)
          if (birthDate) {
            await prisma.$queryRawUnsafe(`
              INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, dat_geburtstag, int_vereineid, int_geschlecht)
              VALUES ($1, $2, $3::date, $4, $5)
            `, firstName, lastName, birthDate, clubId, gender);
          } else {
            await prisma.$queryRawUnsafe(`
              INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, dat_geburtstag, int_vereineid, int_geschlecht)
              VALUES ($1, $2, NULL, $3, $4)
            `, firstName, lastName, clubId, gender);
          }
          
          insertionResults.participants.inserted++;
          const clubInfo = clubId ? `(club ID: ${clubId})` : '(no club)';
          console.log(`  ✅ Inserted participant: ${firstName} ${lastName} ${clubInfo}`);
        }

        // Note: Participants will be added to events after competitions are processed
      } catch (error) {
        const name = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
        console.log(`  ❌ Error processing participant ${name}:`, error);
        insertionResults.participants.errors++;
      }
    }
    } else {
      console.log('⚠️ Skipping participant processing - event creation failed');
    }

    // Helper function to get or create tfx_bereiche based on gender
    const getOrCreateBereich = async (gender: string): Promise<number> => {
      let boolMaennlich = true;
      let boolWeiblich = true;
      let bereichName = 'Mixed';
      
      if (gender === 'männlich' || gender === 'male') {
        boolMaennlich = true;
        boolWeiblich = false;
        bereichName = 'Männlich';
      } else if (gender === 'weiblich' || gender === 'female') {
        boolMaennlich = false;
        boolWeiblich = true;
        bereichName = 'Weiblich';
      }
      
      // Try to find existing bereich
      const existingBereich = await prisma.tfx_bereiche.findFirst({
        where: {
          bol_maennlich: boolMaennlich,
          bol_weiblich: boolWeiblich
        }
      });
      
      if (existingBereich) {
        return existingBereich.int_bereicheid;
      }
      
      // Create new bereich if not found
      const newBereich = await prisma.tfx_bereiche.create({
        data: {
          var_name: bereichName,
          bol_maennlich: boolMaennlich,
          bol_weiblich: boolWeiblich
        }
      });
      
      console.log(`  📍 Created new bereich: ${bereichName} (ID: ${newBereich.int_bereicheid})`);
      return newBereich.int_bereicheid;
    };

    // 3. Insert/Update Competitions (if event was created successfully)
    if (createdEvent && extractedData.competitions.length > 0) {
      console.log('🏆 Processing competitions...');
      
      // Get event year for age-to-birth-year conversion
      const eventYear = createdEvent.dat_von 
        ? new Date(createdEvent.dat_von).getFullYear() 
        : new Date().getFullYear();
      
      for (const competition of extractedData.competitions) {
        try {
          if (!competition.name || competition.name.trim() === '') {
            console.log('  ⚠️ Skipping competition with empty name');
            continue;
          }

          // Extract gender
          const gender = competition.gender || 'mixed';
          
          // Convert ages from XML to birth years for database storage
          // Database fields yer_von and yer_bis store BIRTH YEARS, not ages!
          // IMPORTANT: waAlterMin = minimum age (youngest), waAlterMax = maximum age (oldest)
          let birthYearFrom: number | null = null;
          let birthYearTo: number | null = null;
          
          // waAlterMin = minimum age (e.g., 18) → youngest participant → born eventYear - 18
          // waAlterMax = maximum age (e.g., 100) → oldest participant → born eventYear - 100
          if (competition.ageInfo?.min && competition.ageInfo.min > 0) {
            birthYearFrom = eventYear - competition.ageInfo.min;  // Youngest (min age)
          }
          if (competition.ageInfo?.max && competition.ageInfo.max > 0 && competition.ageInfo.max < 999) {
            birthYearTo = eventYear - competition.ageInfo.max;    // Oldest (max age)
          }
          
          // If no age information at all, use a sensible default birth year range
          // Default age range: 1-100 Jahre (breiteste Altersgruppe)
          if (!birthYearFrom && !birthYearTo) {
            console.log(`  ⚠️ No age information for competition "${competition.name}" - using default range (age 1-100)`);
            birthYearFrom = eventYear - 1;   // Youngest: age 1
            birthYearTo = eventYear - 100;    // Oldest: age 100
          } else if (!birthYearFrom && birthYearTo) {
            // Only max age specified, assume min age is 1
            birthYearFrom = eventYear - 1;
          } else if (birthYearFrom && !birthYearTo) {
            // Only min age specified, assume max age is 100
            birthYearTo = eventYear - 100;
          }
          
          // Calculate display ages for logging (reverse conversion)
          const displayAgeFrom = birthYearFrom ? eventYear - birthYearFrom : null;
          const displayAgeTo = birthYearTo ? eventYear - birthYearTo : null;
          
          console.log(`  🔍 Processing: ${competition.name}`);
          console.log(`     - Event year: ${eventYear}`);
          console.log(`     - Ages from XML: ${competition.ageInfo?.min ?? 'none'} - ${competition.ageInfo?.max ?? 'none'}`);
          console.log(`     - Birth years (DB): ${birthYearFrom} - ${birthYearTo}`);
          console.log(`     - Display ages: ${displayAgeFrom} - ${displayAgeTo}`);
          console.log(`     - Gender: ${gender}`);
          
          // Use birth years for database operations
          const ageFrom = birthYearFrom;
          const ageTo = birthYearTo;
          
          // Get or create appropriate bereich based on gender
          const bereichId = await getOrCreateBereich(gender);
          
          // Check if competition exists for this event
          const existingCompetition = await prisma.$queryRawUnsafe(`
            SELECT int_wettkaempfeid FROM tfx_wettkaempfe 
            WHERE int_veranstaltungenid = $1 AND LOWER(var_name) = LOWER($2)
            LIMIT 1
          `, createdEvent.int_veranstaltungenid, competition.name.trim());

          if ((existingCompetition as any[]).length > 0) {
            // Determine competition type: 1 = Mannschaft (team), 0 = Einzel (individual)
            // Team if waAnzahlMax > 1 OR if extracted teams reference this competition number
            const isTeamCompetition = (competition.teamInfo?.max > 1) || 
              extractedData.teams.some((t: any) => t.competitionNumber === (competition.waNr || competition.number));
            const competitionType = isTeamCompetition ? 1 : 0;

            // Update existing competition with birth year ranges, bereich, competition number, and type
            await prisma.$queryRawUnsafe(`
              UPDATE tfx_wettkaempfe 
              SET var_name = $1, yer_von = $2, yer_bis = $3, int_bereicheid = $4, var_nummer = $5, int_typ = $6
              WHERE int_wettkaempfeid = $7
            `, competition.name.trim(), ageFrom, ageTo, bereichId, competition.waNr || competition.number || null, competitionType, (existingCompetition as any[])[0].int_wettkaempfeid);
            
            insertionResults.competitions.updated++;
            console.log(`  ✅ Updated: ${competition.name} (Birth years: ${ageFrom}-${ageTo}, Ages: ${displayAgeFrom}-${displayAgeTo}, Number: ${competition.waNr || competition.number || 'none'}, Type: ${isTeamCompetition ? 'Mannschaft' : 'Einzel'})`);
          } else {
            // Determine competition type: 1 = Mannschaft (team), 0 = Einzel (individual)
            const isTeamCompetition = (competition.teamInfo?.max > 1) || 
              extractedData.teams.some((t: any) => t.competitionNumber === (competition.waNr || competition.number));
            const competitionType = isTeamCompetition ? 1 : 0;

            // Insert new competition with birth year ranges, bereich, competition number, and type
            await prisma.$queryRawUnsafe(`
              INSERT INTO tfx_wettkaempfe (int_veranstaltungenid, int_bereicheid, var_name, yer_von, yer_bis, var_nummer, int_typ)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, createdEvent.int_veranstaltungenid, bereichId, competition.name.trim(), ageFrom, ageTo, competition.waNr || competition.number || null, competitionType);
            
            insertionResults.competitions.inserted++;
            console.log(`  ✅ Inserted: ${competition.name} (Birth years: ${ageFrom}-${ageTo}, Ages: ${displayAgeFrom}-${displayAgeTo}, Number: ${competition.waNr || competition.number || 'none'}, Type: ${isTeamCompetition ? 'Mannschaft' : 'Einzel'})`);
          }
        } catch (error) {
          console.log(`  ❌ Error processing competition ${competition.name}:`, error);
          insertionResults.competitions.errors++;
        }
      }
    }

    // 3.5. Now assign all participants to the event (after competitions are created)
    if (createdEvent && extractedData.participants.length > 0) {
      console.log(`🔗 Assigning ${extractedData.participants.length} participants to event...`);
      let assignedCount = 0;
      
      for (const participant of extractedData.participants) {
        try {
          const firstName = participant.firstName?.trim() || '';
          const lastName = participant.lastName?.trim() || '';
          
          if (!firstName || !lastName) {
            console.log(`  ⚠️ Skipping participant with empty name: '${firstName}' '${lastName}'`);
            continue;
          }

          console.log(`  🔍 Processing participant: ${firstName} ${lastName}`);

          // Get the participant ID
          const participantResult = await prisma.$queryRawUnsafe(`
            SELECT int_teilnehmerid FROM tfx_teilnehmer 
            WHERE var_vorname = $1 AND var_nachname = $2 
            ORDER BY int_teilnehmerid DESC LIMIT 1
          `, firstName, lastName);

          if ((participantResult as any[]).length > 0) {
            const participantId = (participantResult as any[])[0].int_teilnehmerid;
            console.log(`    ✅ Found participant in DB with ID: ${participantId}`);
            
            // Try to find competition by XML assignment first
            let targetCompetition = null;
            if (participant.competitionNumber) {
              // Extract just the waNr if it's an object
              const competitionNumber = typeof participant.competitionNumber === 'object' 
                ? participant.competitionNumber.waNr 
                : participant.competitionNumber;
              
              console.log(`    🎯 Looking for competition with number: ${competitionNumber} (type: ${typeof participant.competitionNumber})`);
              targetCompetition = await prisma.tfx_wettkaempfe.findFirst({
                where: { 
                  int_veranstaltungenid: createdEvent.int_veranstaltungenid,
                  var_nummer: competitionNumber
                }
              });
              
              if (targetCompetition) {
                console.log(`    ✅ Found XML-assigned competition: ${targetCompetition.var_name} (Number: ${targetCompetition.var_nummer})`);
              } else {
                console.log(`    ⚠️ Competition with number ${competitionNumber} not found, using fallback`);
              }
            }
            
            // Fall back to first competition if no XML assignment or not found
            if (!targetCompetition) {
              targetCompetition = await prisma.tfx_wettkaempfe.findFirst({
                where: { int_veranstaltungenid: createdEvent.int_veranstaltungenid },
                orderBy: { int_wettkaempfeid: 'asc' }
              });
              
              if (targetCompetition) {
                console.log(`    🔄 Using fallback competition: ${targetCompetition.var_name} (ID: ${targetCompetition.int_wettkaempfeid})`);
              }
            }

            if (targetCompetition) {
              // Check if participant is already in the event
              const existingEntry = await prisma.tfx_wertungen.findFirst({
                where: {
                  int_teilnehmerid: participantId,
                  int_wettkaempfeid: targetCompetition.int_wettkaempfeid
                }
              });

              if (!existingEntry) {
                // Create score entry to add participant to event (using the same logic as /event-participants/add)
                await prisma.tfx_wertungen.create({
                  data: {
                    int_teilnehmerid: participantId,
                    int_wettkaempfeid: targetCompetition.int_wettkaempfeid,
                    int_startnummer: 0, // Will be assigned later
                    var_riege: '', // Will be assigned later
                    int_statusid: 1 // Default status
                  }
                });
                
                assignedCount++;
                console.log(`    🔗 Automatically added participant ${firstName} ${lastName} to event (${assignedCount}/${extractedData.participants.length})`);
                insertionResults.participants.updated++; // Count as updated since they're now in event
              } else {
                console.log(`    📝 Participant ${firstName} ${lastName} already in event`);
              }
            } else {
              console.log(`    ⚠️ No competitions found for event - participant ${firstName} ${lastName} not added to event`);
            }
          } else {
            console.log(`    ❌ Participant ${firstName} ${lastName} not found in database`);
          }
        } catch (associationError) {
          console.error(`    ❌ Failed to add participant ${participant.firstName} ${participant.lastName} to event:`, associationError);
        }
      }
      
      console.log(`🎯 Participant assignment complete: ${assignedCount}/${extractedData.participants.length} participants assigned to event`);
    }

    // 4. Insert/Update Devices/Disciplines and link them to competitions
    // Strategy: Use wedDisNr from extracted XML devices when available (precise matching),
    // fall back to name-based guessing via getDisciplinesForCompetition() when no devices found.
    console.log('🤸 Starting comprehensive discipline processing...');
    
    if (createdEvent) {
      // Get all competitions created for this event
      const eventCompetitions = await prisma.$queryRawUnsafe(`
        SELECT int_wettkaempfeid, var_name, var_nummer FROM tfx_wettkaempfe 
        WHERE int_veranstaltungenid = $1
      `, createdEvent.int_veranstaltungenid) as any[];

      console.log(`  📊 Found ${eventCompetitions.length} competitions for this event`);

      // Group extracted devices by competition waNr
      const devicesByCompetition = new Map<string, any[]>();
      for (const device of extractedData.devices) {
        if (device.competitionWaNr) {
          const key = String(device.competitionWaNr);
          if (!devicesByCompetition.has(key)) devicesByCompetition.set(key, []);
          devicesByCompetition.get(key)!.push(device);
        }
      }

      console.log(`  📋 Devices grouped by competition: ${devicesByCompetition.size} competitions have device data`);
      devicesByCompetition.forEach((devices, waNr) => {
        console.log(`    waNr=${waNr}: ${devices.map((d: any) => `${d.name || 'unnamed'}(code=${d.code || 'none'})`).join(', ')}`);
      });

      let linkedCount = 0;

      for (const competition of eventCompetitions) {
        const compWaNr = competition.var_nummer || null;
        const compDevices = compWaNr ? devicesByCompetition.get(String(compWaNr)) : null;

        console.log(`  🔍 Processing competition: "${competition.var_name}" (waNr: ${compWaNr || 'none'})`);

        if (compDevices && compDevices.length > 0) {
          // === PRECISE MATCHING: Use wedDisNr from XML devices ===
          console.log(`    📦 Found ${compDevices.length} devices from XML for this competition`);
          
          let sortOrder = 0;
          for (const device of compDevices) {
            sortOrder++;
            const wedDisNr = device.code;
            if (!wedDisNr) {
              console.log(`    ⚠️ Device "${device.name}" has no wedDisNr code, skipping`);
              continue;
            }

            const turnfixId = wedDisNrToTurnFixId(wedDisNr);
            if (turnfixId === null) {
              console.log(`    ⚠️ No TurnFix mapping for wedDisNr=${wedDisNr} ("${device.name}") - code not in mapping table`);
              insertionResults.devices.errors++;
              continue;
            }

            // Verify the discipline ID exists in the database
            const disciplineCheck = await prisma.$queryRawUnsafe(`
              SELECT int_disziplinenid, var_name FROM tfx_disziplinen 
              WHERE int_disziplinenid = $1
              LIMIT 1
            `, turnfixId) as any[];

            if (disciplineCheck.length === 0) {
              console.log(`    ⚠️ TurnFix discipline ID ${turnfixId} (from wedDisNr=${wedDisNr}) not found in DB`);
              insertionResults.devices.errors++;
              continue;
            }

            const disciplineName = disciplineCheck[0].var_name;

            // Check if already linked
            const existingLink = await prisma.$queryRawUnsafe(`
              SELECT int_wettkaempfe_x_disziplinenid FROM tfx_wettkaempfe_x_disziplinen 
              WHERE int_wettkaempfeid = $1 AND int_disziplinenid = $2
              LIMIT 1
            `, competition.int_wettkaempfeid, turnfixId) as any[];

            if (existingLink.length === 0) {
              await prisma.$queryRawUnsafe(`
                INSERT INTO tfx_wettkaempfe_x_disziplinen (int_wettkaempfeid, int_disziplinenid, int_sortierung)
                VALUES ($1, $2, $3)
              `, competition.int_wettkaempfeid, turnfixId, sortOrder);
              console.log(`    🔗 Linked "${disciplineName}" (wedDisNr=${wedDisNr} → ID=${turnfixId}) to competition`);
              linkedCount++;
              insertionResults.devices.updated++;
            } else {
              console.log(`    ✅ "${disciplineName}" already linked to competition`);
            }
          }
        } else {
          // === FALLBACK: Name-based guessing (no XML device data for this competition) ===
          console.log(`    ⚠️ No XML device data found, falling back to name-based discipline matching`);
          const disciplinesToLink = await getDisciplinesForCompetition(competition.var_name, prisma);
          console.log(`    📝 Name-based guess: ${disciplinesToLink.join(', ')}`);
          
          let sortOrder = 0;
          for (const disciplineName of disciplinesToLink) {
            sortOrder++;
            try {
              const existingDiscipline = await prisma.$queryRawUnsafe(`
                SELECT int_disziplinenid FROM tfx_disziplinen 
                WHERE LOWER(var_name) = LOWER($1)
                LIMIT 1
              `, disciplineName) as any[];
              if (existingDiscipline.length > 0) {
                const disciplineId = existingDiscipline[0].int_disziplinenid;
                const existingLink = await prisma.$queryRawUnsafe(`
                  SELECT int_wettkaempfe_x_disziplinenid FROM tfx_wettkaempfe_x_disziplinen 
                  WHERE int_wettkaempfeid = $1 AND int_disziplinenid = $2
                  LIMIT 1
                `, competition.int_wettkaempfeid, disciplineId) as any[];
                if (existingLink.length === 0) {
                  await prisma.$queryRawUnsafe(`
                    INSERT INTO tfx_wettkaempfe_x_disziplinen (int_wettkaempfeid, int_disziplinenid, int_sortierung)
                    VALUES ($1, $2, $3)
                  `, competition.int_wettkaempfeid, disciplineId, sortOrder);
                  console.log(`    🔗 Linked discipline "${disciplineName}" to competition (name-based)`);
                  linkedCount++;
                  insertionResults.devices.updated++;
                } else {
                  console.log(`    ✅ Discipline "${disciplineName}" already linked`);
                }
              } else {
                console.log(`    ⚠️ Discipline "${disciplineName}" not found in database`);
                insertionResults.devices.errors++;
              }
            } catch (linkError) {
              console.log(`    ❌ Error linking discipline ${disciplineName}:`, linkError);
              insertionResults.devices.errors++;
            }
          }
        }
      }

      console.log(`  🎯 Discipline linking complete: ${linkedCount} new links created`);
    } else {
      console.log('⚠️ Skipping discipline processing - event creation failed');
    }

    // 5. Create Teams (Mannschaften) from extracted team data
    if (createdEvent && extractedData.teams.length > 0) {
      console.log(`🏅 Processing ${extractedData.teams.length} teams...`);
      
      // Group teams by competition number + club to handle numbering
      const teamCounterByCompClub = new Map<string, number>();
      
      for (const teamData of extractedData.teams) {
        try {
          // Find the club in DB
          const clubResult = await prisma.$queryRawUnsafe(`
            SELECT int_vereineid FROM tfx_vereine 
            WHERE LOWER(var_name) = LOWER($1)
            LIMIT 1
          `, teamData.clubName.trim()) as any[];

          if (clubResult.length === 0) {
            console.log(`  ⚠️ Skipping team: Club "${teamData.clubName}" not found in DB`);
            insertionResults.teams.errors++;
            continue;
          }
          const clubId = clubResult[0].int_vereineid;

          // Find the competition
          let competitionId: number | null = null;
          if (teamData.competitionNumber) {
            const compResult = await prisma.tfx_wettkaempfe.findFirst({
              where: {
                int_veranstaltungenid: createdEvent.int_veranstaltungenid,
                var_nummer: teamData.competitionNumber
              }
            });
            if (compResult) {
              competitionId = compResult.int_wettkaempfeid;
            }
          }
          // Fallback: first competition for this event
          if (!competitionId) {
            const fallbackComp = await prisma.tfx_wettkaempfe.findFirst({
              where: { int_veranstaltungenid: createdEvent.int_veranstaltungenid },
              orderBy: { int_wettkaempfeid: 'asc' }
            });
            if (fallbackComp) {
              competitionId = fallbackComp.int_wettkaempfeid;
            }
          }

          if (!competitionId) {
            console.log(`  ⚠️ Skipping team: No competition found for event`);
            insertionResults.teams.errors++;
            continue;
          }

          // Determine team number (auto-increment per competition+club)
          const counterKey = `${competitionId}_${clubId}`;
          const teamNumber = (teamCounterByCompClub.get(counterKey) || 0) + 1;
          teamCounterByCompClub.set(counterKey, teamNumber);

          // Check if this team already exists
          const existingTeam = await (prisma as any).tfx_mannschaften.findFirst({
            where: {
              int_wettkaempfeid: competitionId,
              int_vereineid: clubId,
              int_nummer: teamNumber
            }
          });

          let mannschaftId: number;
          if (existingTeam) {
            mannschaftId = existingTeam.int_mannschaftenid;
            console.log(`  📝 Team already exists: ${teamData.clubName} #${teamNumber} (ID: ${mannschaftId})`);
          } else {
            // Create the team
            const newTeam = await (prisma as any).tfx_mannschaften.create({
              data: {
                int_wettkaempfeid: competitionId,
                int_vereineid: clubId,
                int_nummer: teamNumber,
                var_riege: '',
                int_startnummer: null
              }
            });
            mannschaftId = newTeam.int_mannschaftenid;
            insertionResults.teams.inserted++;
            console.log(`  ✅ Created team: ${teamData.clubName} #${teamNumber} (ID: ${mannschaftId})`);
          }

          // Add members to the team
          for (const member of teamData.participants) {
            try {
              if (!member.firstName || !member.lastName) continue;

              // Find participant in DB
              const participantResult = await prisma.$queryRawUnsafe(`
                SELECT int_teilnehmerid FROM tfx_teilnehmer 
                WHERE var_vorname = $1 AND var_nachname = $2 
                ORDER BY int_teilnehmerid DESC LIMIT 1
              `, member.firstName, member.lastName) as any[];

              if (participantResult.length === 0) {
                console.log(`    ⚠️ Participant ${member.firstName} ${member.lastName} not found in DB`);
                continue;
              }
              const participantId = participantResult[0].int_teilnehmerid;

              // Check if already a member
              const existingMember = await (prisma as any).tfx_man_x_teilnehmer.findFirst({
                where: {
                  int_mannschaftenid: mannschaftId,
                  int_teilnehmerid: participantId
                }
              });

              if (!existingMember) {
                await (prisma as any).tfx_man_x_teilnehmer.create({
                  data: {
                    int_mannschaftenid: mannschaftId,
                    int_teilnehmerid: participantId
                  }
                });
                insertionResults.teams.members++;
                console.log(`    👤 Added member: ${member.firstName} ${member.lastName} → Team ${teamData.clubName} #${teamNumber}`);
              } else {
                console.log(`    📝 Member already in team: ${member.firstName} ${member.lastName}`);
              }

              // Link wertung to team (update existing score entry)
              await prisma.$queryRawUnsafe(`
                UPDATE tfx_wertungen 
                SET int_mannschaftenid = $1
                WHERE int_teilnehmerid = $2 AND int_wettkaempfeid = $3 AND (int_mannschaftenid IS NULL OR int_mannschaftenid = 0)
              `, mannschaftId, participantId, competitionId);
            } catch (memberError) {
              console.log(`    ❌ Error adding member ${member.firstName} ${member.lastName}:`, memberError);
            }
          }
        } catch (teamError) {
          console.log(`  ❌ Error creating team for ${teamData.clubName}:`, teamError);
          insertionResults.teams.errors++;
        }
      }
      console.log(`  🏅 Team import complete: ${insertionResults.teams.inserted} teams created, ${insertionResults.teams.members} members assigned`);
    }

    console.log('💾 Database insertion completed:');
    console.log(`  🏢 Clubs: ${insertionResults.clubs.inserted} inserted, ${insertionResults.clubs.updated} updated, ${insertionResults.clubs.errors} errors`);
    console.log(`  👥 Participants: ${insertionResults.participants.inserted} inserted, ${insertionResults.participants.updated} updated, ${insertionResults.participants.errors} errors`);
    console.log(`  🏆 Competitions: ${insertionResults.competitions.inserted} inserted, ${insertionResults.competitions.updated} updated, ${insertionResults.competitions.errors} errors`);
    console.log(`  🤸 Disciplines: ${insertionResults.devices.inserted} inserted, ${insertionResults.devices.updated} found/linked, ${insertionResults.devices.errors} errors`);
    console.log(`  🏅 Teams: ${insertionResults.teams.inserted} created, ${insertionResults.teams.members} members, ${insertionResults.teams.errors} errors`);

    // Return structured response with extracted data
    const responseData = {
      success: createdEvent !== null, // Only successful if event was actually created
      message: createdEvent 
        ? `Event "${createdEvent.var_name}" created successfully and data imported to database`
        : eventCreationError 
          ? `XML import failed: Could not create event in database. Error: ${eventCreationError instanceof Error ? eventCreationError.message : String(eventCreationError)}`
          : 'XML erfolgreich geparst und analysiert, aber kein Event wurde erstellt',
      createdEvent: createdEvent ? {
        id: createdEvent.int_veranstaltungenid,
        name: createdEvent.var_name,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        locationId: venueIdToUse,
        locationName: venueNameToUse,
        description: description?.trim() || null
      } : null,
      eventCreationError: eventCreationError ? {
        message: eventCreationError instanceof Error ? eventCreationError.message : String(eventCreationError),
        details: 'Check server logs for detailed error information'
      } : null,
      insertionResults: insertionResults,
      extractedData: {
        clubs: extractedData.clubs,
        competitions: extractedData.competitions,
        participants: extractedData.participants,
        devices: extractedData.devices,
        teams: extractedData.teams,
        summary: {
          clubsCount: extractedData.clubs.length,
          competitionsCount: extractedData.competitions.length,
          participantsCount: extractedData.participants.length,
          devicesCount: extractedData.devices.length,
          teamsCount: extractedData.teams.length
        }
      },
      debug: debugData,
      summary: {
        rootElements: Object.keys(parsedXml || {}),
        potentialDataFound: Object.keys(foundElements).length,
        fileProcessed: req.file.originalname,
        importLog: [
          `📄 Datei: ${req.file.originalname} (${req.file.size} bytes)`,
          `📊 Extrahierte Daten:`,
          `   - ${extractedData.clubs.length} Vereine`,
          `   - ${extractedData.competitions.length} Wettkämpfe`,
          `   - ${extractedData.participants.length} Teilnehmer`,
          `   - ${extractedData.devices.length} Disziplinen`,
          `   - ${extractedData.teams.length} Mannschaften`,
          `💾 Datenbank-Import:`,
          `   - Vereine: ${insertionResults.clubs.inserted} neu, ${insertionResults.clubs.updated} aktualisiert`,
          `   - Teilnehmer: ${insertionResults.participants.inserted} neu, ${insertionResults.participants.updated} aktualisiert`,
          `   - Wettkämpfe: ${insertionResults.competitions.inserted} neu`,
          `   - Disziplinen: ${insertionResults.devices.inserted} neu, ${insertionResults.devices.updated} verknüpft`,
          `   - Mannschaften: ${insertionResults.teams.inserted} erstellt, ${insertionResults.teams.members} Mitglieder zugewiesen`,
          createdEvent ? `✅ Event "${createdEvent.var_name}" (ID: ${createdEvent.int_veranstaltungenid}) erfolgreich erstellt` : '❌ Event-Erstellung fehlgeschlagen'
        ],
        nextSteps: createdEvent ? [
          'Event created successfully',
          'Review the extracted and imported data',
          'Verify the data accuracy and completeness in the database'
        ] : [
          'Event creation failed - check server logs for details',
          'Review the extracted data below for debugging',
          'Verify database connection and constraints',
          'Ensure all required fields are provided and valid'
        ]
      }
    };
    
    // Return appropriate HTTP status
    res.status(createdEvent ? 200 : 400).json(responseData);

  } catch (error: any) {
    console.error('❌ XML Import Error:', error);
    
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('🗑️ Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'XML Import Error', 
      message: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

//
// ===== SPECIFIC ROUTES (must be before /:id) =====
//

// Get event statistics (MUST be before /:id route)
router.get('/:id/statistics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Extract query parameters for filtering
    const { squadName, gender, club } = req.query;
    
    console.log(`📊 Getting statistics for event ${eventId}`, { squadName, gender, club });

    // Build WHERE conditions based on query parameters
    let whereConditions = ['wk.int_veranstaltungenid = $1'];
    let queryParams: any[] = [eventId];
    let paramIndex = 1;

    // Add squad name filter (Riege) - only for detail filtering, not main statistics
    let squadFilter = '';
    if (squadName && typeof squadName === 'string') {
      paramIndex++;
      if (squadName === 'm') {
        // Filter for male squads (starting with 'm')
        squadFilter = `AND w.var_riege LIKE $${paramIndex}`;
        queryParams.push('m%');
      } else if (squadName === 'w') {
        // Filter for female squads (starting with 'w')
        squadFilter = `AND w.var_riege LIKE $${paramIndex}`;
        queryParams.push('w%');
      } else {
        // Exact squad name match
        squadFilter = `AND w.var_riege = $${paramIndex}`;
        queryParams.push(squadName);
      }
    }

    // Add gender filter
    if (gender && typeof gender === 'string') {
      paramIndex++;
      if (gender === 'male' || gender === 'm' || gender === '1') {
        whereConditions.push(`t.int_geschlecht = $${paramIndex}`);
        queryParams.push(1);
      } else if (gender === 'female' || gender === 'w' || gender === '2') {
        whereConditions.push(`t.int_geschlecht = $${paramIndex}`);
        queryParams.push(2);
      }
    }

    // Add club filter
    if (club && typeof club === 'string') {
      paramIndex++;
      whereConditions.push(`t.int_vereineid = $${paramIndex}`);
      queryParams.push(parseInt(club));
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total participants for this event - ALWAYS show complete event statistics
    // Squad filter should not affect the main participant count
    const participantStatsQuery = `
      SELECT 
        COUNT(DISTINCT w.int_teilnehmerid) as total_participants,
        COUNT(DISTINCT CASE WHEN t.int_geschlecht = 1 THEN w.int_teilnehmerid END) as male_participants,
        COUNT(DISTINCT CASE WHEN t.int_geschlecht = 2 THEN w.int_teilnehmerid END) as female_participants,
        COUNT(DISTINCT t.int_vereineid) as total_clubs
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1
    `;

    const participantStats = await prisma.$queryRawUnsafe(participantStatsQuery, eventId) as any[];
    const stats = participantStats[0] || {
      total_participants: 0,
      male_participants: 0,
      female_participants: 0,
      total_clubs: 0
    };

    // Get competitions count (no squad filter for competitions)
    let competitionsQuery = `
      SELECT COUNT(*) as total_competitions
      FROM tfx_wettkaempfe
      WHERE int_veranstaltungenid = $1
    `;
    
    const competitionsCount = await prisma.$queryRawUnsafe(competitionsQuery, eventId) as any[];
    const competitions = competitionsCount[0] || { total_competitions: 0 };

    // Get discipline stats - apply filters here for detailed breakdown
    const disciplineStatsQuery = `
      SELECT 
        d.var_name as discipline_name,
        COUNT(DISTINCT w.int_teilnehmerid) as participant_count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_wettkaempfe_x_disziplinen wxd ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
      INNER JOIN tfx_disziplinen d ON wxd.int_disziplinenid = d.int_disziplinenid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE ${whereClause} ${squadFilter}
      GROUP BY d.int_disziplinenid, d.var_name
      ORDER BY participant_count DESC
    `;

    const disciplineStats = await prisma.$queryRawUnsafe(disciplineStatsQuery, ...queryParams) as any[];

    // Get age group stats - calculate from birthdate, apply filters for breakdown
    const ageGroupStatsQuery = `
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 1 AND 6 
          THEN w.int_teilnehmerid 
        END) as "1_6",
        COUNT(DISTINCT CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 7 AND 8 
          THEN w.int_teilnehmerid 
        END) as "7_8",
        COUNT(DISTINCT CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 9 AND 10 
          THEN w.int_teilnehmerid 
        END) as "9_10",
        COUNT(DISTINCT CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 11 AND 12 
          THEN w.int_teilnehmerid 
        END) as "11_12",
        COUNT(DISTINCT CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 13 AND 14 
          THEN w.int_teilnehmerid 
        END) as "13_14",
        COUNT(DISTINCT CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 15 AND 16 
          THEN w.int_teilnehmerid 
        END) as "15_16",
        COUNT(DISTINCT CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.dat_geburtstag)) BETWEEN 17 AND 18 
          THEN w.int_teilnehmerid 
        END) as "17_18"
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE ${whereClause} ${squadFilter} AND t.dat_geburtstag IS NOT NULL
    `;

    const ageGroupStats = await prisma.$queryRawUnsafe(ageGroupStatsQuery, ...queryParams) as any[];
    const ageGroups = ageGroupStats[0] || {
      "1_6": 0,
      "7_8": 0,
      "9_10": 0,
      "11_12": 0,
      "13_14": 0,
      "15_16": 0,
      "17_18": 0
    };

    // Get club breakdown - apply filters for detailed breakdown
    const clubBreakdownQuery = `
      SELECT 
        v.var_name as club_name,
        COUNT(DISTINCT w.int_teilnehmerid) as participant_count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      INNER JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE ${whereClause} ${squadFilter}
      GROUP BY v.int_vereineid, v.var_name
      ORDER BY participant_count DESC
    `;

    const clubBreakdown = await prisma.$queryRawUnsafe(clubBreakdownQuery, ...queryParams) as any[];

    // Get Riegen (squads/starting groups) count - apply filters for detailed breakdown
    const riegenCountQuery = `
      SELECT COUNT(DISTINCT w.var_riege) as total_groups
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE ${whereClause} ${squadFilter}
        AND w.var_riege IS NOT NULL 
        AND w.var_riege != ''
    `;

    const riegenCount = await prisma.$queryRawUnsafe(riegenCountQuery, ...queryParams) as any[];
    const groups = riegenCount[0] || { total_groups: 0 };

    const result = {
      totalParticipants: Number(stats.total_participants),
      maleParticipants: Number(stats.male_participants),
      femaleParticipants: Number(stats.female_participants),
      totalClubs: Number(stats.total_clubs),
      totalCompetitions: Number(competitions.total_competitions),
      totalGroups: Number(groups.total_groups),
      filters: {
        squadName: squadName || null,
        gender: gender || null,
        club: club || null
      },
      disciplines: disciplineStats.map((d: any) => ({
        name: d.discipline_name,
        count: Number(d.participant_count)
      })),
      ageGroups: {
        "1-6": Number(ageGroups["1_6"]),
        "7-8": Number(ageGroups["7_8"]),
        "9-10": Number(ageGroups["9_10"]),
        "11-12": Number(ageGroups["11_12"]),
        "13-14": Number(ageGroups["13_14"]),
        "15-16": Number(ageGroups["15_16"]),
        "17-18": Number(ageGroups["17_18"])
      },
      clubBreakdown: clubBreakdown.map((c: any) => ({
        clubName: c.club_name,
        count: Number(c.participant_count)
      }))
    };

    console.log(`📊 Event ${eventId} statistics:`, result);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching event statistics:', error);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

//
// ===== GENERIC ROUTE (must be last) =====
//

// Get event by ID (moved to end to avoid catching other routes)
router.get('/:id', async (req: Request, res: Response) => {
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
        COALESCE(wf.var_name, v.var_veranstalter, '') as var_location,
        COALESCE(v.txt_hinweise, '') as var_description,
        v.dat_meldeschluss,
        v.var_veranstalter,
        v.int_wettkampforteid,
        v.int_ansprechpartner,
        v.int_meldung_an,
        v.int_kampfrichter,
        v.int_helfer,
        v.int_edv,
        v.txt_hinweise,
        wf.var_name as venue_name,
        wf.var_adresse as venue_address,
        wf.var_plz as venue_postal_code,
        wf.var_ort as venue_city,
        cp.var_vorname as contact_person_firstname,
        cp.var_nachname as contact_person_lastname,
        cp.var_email as contact_person_email,
        cp.var_telefon as contact_person_phone,
        rcp.var_vorname as registration_contact_firstname,
        rcp.var_nachname as registration_contact_lastname,
        rcp.var_email as registration_contact_email,
        rcp.var_telefon as registration_contact_phone,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      LEFT JOIN tfx_wettkampforte wf ON v.int_wettkampforteid = wf.int_wettkampforteid
      LEFT JOIN tfx_personen cp ON v.int_ansprechpartner = cp.int_personenid
      LEFT JOIN tfx_personen rcp ON v.int_meldung_an = rcp.int_personenid
      WHERE v.int_veranstaltungenid = $1
    `;

    const events = await prisma.$queryRawUnsafe(query, id);
    
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];
    
    // Determine status based on dates
    const now = new Date();
    const startDate = new Date(event.dat_eventstartdate);
    const endDate = new Date(event.dat_eventenddate);
    
    let status = 'upcoming';
    if (now > endDate) {
      status = 'completed';
    } else if (now >= startDate && now <= endDate) {
      status = 'active';
    }
    
    const formattedEvent = {
      ...event,
      int_eventid: Number(event.int_eventid),
      int_wettkampforteid: event.int_wettkampforteid ? Number(event.int_wettkampforteid) : null,
      int_ansprechpartner: event.int_ansprechpartner ? Number(event.int_ansprechpartner) : null,
      int_meldung_an: event.int_meldung_an ? Number(event.int_meldung_an) : null,
      int_kampfrichter: event.int_kampfrichter ? Number(event.int_kampfrichter) : null,
      int_helfer: event.int_helfer ? Number(event.int_helfer) : null,
      int_edv: event.int_edv ? Number(event.int_edv) : null,
      txt_hinweise: event.txt_hinweise,
      participant_count: Number(event.participant_count || 0),
      score_count: Number(event.score_count || 0),
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
      dat_meldeschluss: event.dat_meldeschluss ? event.dat_meldeschluss.toISOString() : null,
      contact_person_name: event.contact_person_firstname && event.contact_person_lastname 
        ? `${event.contact_person_lastname}, ${event.contact_person_firstname}` 
        : null,
      registration_contact_name: event.registration_contact_firstname && event.registration_contact_lastname 
        ? `${event.registration_contact_lastname}, ${event.registration_contact_firstname}` 
        : null,
      status
    };

    res.json(formattedEvent);
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/:id/participants - Compatibility endpoint
router.get('/:id/participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Check if event exists
    const existingEvent = await prisma.tfx_veranstaltungen.findUnique({
      where: { int_veranstaltungenid: eventId }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Return a redirect or forward the request to the correct endpoint
    // For now, return a simple message pointing to the correct endpoint
    res.status(200).json({ 
      message: 'This endpoint is deprecated. Use /api/event-participants?eventId=' + eventId,
      redirect: `/api/event-participants?eventId=${eventId}`,
      participants: []
    });

  } catch (error: any) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/events/:id - Delete an event
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const forceDelete = req.query.force === 'true';
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Check if event exists
    const existingEvent = await prisma.tfx_veranstaltungen.findUnique({
      where: { int_veranstaltungenid: eventId }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event has associated data (scores/participants)
    const scoresCount = await prisma.tfx_wertungen.count({
      where: { 
        tfx_wettkaempfe: {
          int_veranstaltungenid: eventId
        }
      }
    });

    if (scoresCount > 0 && !forceDelete) {
      return res.status(409).json({ 
        error: 'Cannot delete event with existing scores. Delete scores first.',
        hasScores: true,
        scoresCount,
        hint: 'Use ?force=true to delete event with all associated data'
      });
    }

    // If force delete, remove all associated data first
    if (forceDelete && scoresCount > 0) {
      console.log(`🗑️ Force deleting event ${existingEvent.var_name} with ${scoresCount} scores...`);
      
      // Delete wertungen_details first (FK child of wertungen)
      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_wertungen_details
        WHERE int_wertungenid IN (
          SELECT w.int_wertungenid FROM tfx_wertungen w
          JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
        )
      `, eventId);
      
      // Delete jury_results (FK child of wertungen via int_wertungenid)
      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_jury_results
        WHERE int_wertungenid IN (
          SELECT w.int_wertungenid FROM tfx_wertungen w
          JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
        )
      `, eventId);
      
      // Delete all scores for this event
      await prisma.tfx_wertungen.deleteMany({
        where: { 
          tfx_wettkaempfe: {
            int_veranstaltungenid: eventId
          }
        }
      });
      
      console.log(`🗑️ Deleted ${scoresCount} scores for event ${eventId}`);
    }

    // Delete associated competitions and their child records
    const competitionsCount = await prisma.tfx_wettkaempfe.count({
      where: { int_veranstaltungenid: eventId }
    });

    if (competitionsCount > 0) {
      // Delete mannschaften (teams) associated with competitions
      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_mannschaften
        WHERE int_wettkaempfeid IN (
          SELECT int_wettkaempfeid FROM tfx_wettkaempfe
          WHERE int_veranstaltungenid = $1
        )
      `, eventId);
      
      // Delete wettkaempfe_dispos via wettkaempfe_x_disziplinen
      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_wettkaempfe_dispos
        WHERE int_wettkaempfe_x_disziplinenid IN (
          SELECT wxd.int_wettkaempfe_x_disziplinenid 
          FROM tfx_wettkaempfe_x_disziplinen wxd
          JOIN tfx_wettkaempfe wk ON wxd.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
        )
      `, eventId);
      
      // Delete wettkaempfe_x_disziplinen
      await prisma.$executeRawUnsafe(`
        DELETE FROM tfx_wettkaempfe_x_disziplinen
        WHERE int_wettkaempfeid IN (
          SELECT int_wettkaempfeid FROM tfx_wettkaempfe
          WHERE int_veranstaltungenid = $1
        )
      `, eventId);
      
      // Now delete the competitions themselves
      await prisma.tfx_wettkaempfe.deleteMany({
        where: { int_veranstaltungenid: eventId }
      });
    }

    // Delete riegen_x_disziplinen associated with the event
    await prisma.$executeRawUnsafe(`
      DELETE FROM tfx_riegen_x_disziplinen
      WHERE int_veranstaltungenid = $1
    `, eventId);

    // Delete the event
    await prisma.tfx_veranstaltungen.delete({
      where: { int_veranstaltungenid: eventId }
    });

    console.log(`🗑️ Event ${existingEvent.var_name} (ID: ${eventId}) deleted successfully`);
    
    res.json({ 
      message: 'Event deleted successfully',
      eventId,
      eventName: existingEvent.var_name,
      deletedScores: forceDelete ? scoresCount : 0,
      deletedCompetitions: competitionsCount
    });

  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple test route for XML import (no auth)
router.post('/import-test', upload.single('xmlFile'), async (req: any, res) => {
  console.log('🧪 TEST: XML import started');
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    
    console.log('📄 XML file received, length:', xmlContent.length);
    res.json({
      success: true,
      message: 'XML import test completed',
      xmlSize: xmlContent.length,
      preview: xmlContent.substring(0, 200)
    });
    
    // Clean up
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
  } catch (error: any) {
    console.error('❌ Test import error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export timeplan (placeholder for now)
router.post('/:id/export-timeplan', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const { sessionGroups, timeSettings, deviceSchedule } = req.body;

    console.log('[EXPORT-TIMEPLAN] Export requested for event:', eventId);
    console.log('[EXPORT-TIMEPLAN] Session groups:', sessionGroups?.length || 0);
    console.log('[EXPORT-TIMEPLAN] Time settings:', timeSettings);
    console.log('[EXPORT-TIMEPLAN] Device schedule items:', deviceSchedule?.length || 0);

    // TODO: Implement actual export logic (PDF, Excel, etc.)
    // For now, just return success
    res.json({
      success: true,
      message: 'Timeplan export functionality coming soon',
      data: {
        eventId,
        sessionGroupsCount: sessionGroups?.length || 0,
        deviceScheduleCount: deviceSchedule?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Export timeplan error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

