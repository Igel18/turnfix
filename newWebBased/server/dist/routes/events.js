"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authBypass_1 = require("../middleware/authBypass");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const xml2js_1 = require("xml2js");
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas for event creation
const createEventSchema = zod_1.z.object({
    var_eventname: zod_1.z.string().min(1, 'Event name is required'),
    dat_eventstartdate: zod_1.z.string().min(1, 'Start date is required'),
    dat_eventenddate: zod_1.z.string().min(1, 'End date is required'),
    var_location: zod_1.z.string().min(1, 'Location is required'),
    var_description: zod_1.z.string().nullable().optional(),
    var_veranstalter: zod_1.z.string().nullable().optional(),
    dat_meldeschluss: zod_1.z.string().nullable().optional()
});
const updateEventSchema = createEventSchema.partial();
// Configure multer for XML file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = 'uploads/xml';
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `gymnet-${timestamp}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.toLowerCase().endsWith('.xml')) {
            cb(null, true);
        }
        else {
            cb(new Error('Nur XML-Dateien sind erlaubt'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});
// Promisify xml2js parseString with proper typing
const parseXmlAsync = (xml, options) => {
    return new Promise((resolve, reject) => {
        (0, xml2js_1.parseString)(xml, options, (err, result) => {
            if (err)
                reject(err);
            else
                resolve(result);
        });
    });
};
// Get all events - using legacy tfx_veranstaltungen table
router.get('/', async (req, res) => {
    try {
        const { search, limit = '50', offset = '0' } = req.query;
        let whereClause = '';
        const params = [];
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
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
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
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      LEFT JOIN tfx_wettkampforte wf ON v.int_wettkampforteid = wf.int_wettkampforteid
      ${whereClause}
      ORDER BY v.dat_von DESC, v.var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(parseInt(limit), parseInt(offset));
        const events = await prisma.$queryRawUnsafe(dataQuery, ...params);
        // Convert BigInt values and dates for JSON serialization to match client expectations
        const formattedEvents = events.map((event) => {
            // Determine status based on dates
            const now = new Date();
            const startDate = new Date(event.dat_eventstartdate);
            const endDate = new Date(event.dat_eventenddate);
            let status = 'upcoming';
            if (now > endDate) {
                status = 'completed';
            }
            else if (now >= startDate && now <= endDate) {
                status = 'active';
            }
            return {
                ...event,
                int_eventid: Number(event.int_eventid),
                participant_count: Number(event.participant_count || 0),
                score_count: Number(event.score_count || 0),
                dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
                dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
                status
            };
        });
        console.log(`=== EVENTS: Sending ${formattedEvents.length} events to client ===`);
        console.log('First event sample:', JSON.stringify(formattedEvents[0], null, 2));
        const response = {
            events: formattedEvents,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        };
        res.json(response);
    }
    catch (error) {
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
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = createEventSchema.parse(req.body);
        // Convert date strings to Date objects
        const startDate = new Date(validatedData.dat_eventstartdate);
        const endDate = new Date(validatedData.dat_eventenddate);
        const registrationDeadline = validatedData.dat_meldeschluss ? new Date(validatedData.dat_meldeschluss) : null;
        // Create the event using Prisma
        const newEvent = await prisma.tfx_veranstaltungen.create({
            data: {
                var_name: validatedData.var_eventname,
                dat_von: startDate,
                dat_bis: endDate,
                var_veranstalter: validatedData.var_location,
                txt_hinweise: validatedData.var_description || null,
                dat_meldeschluss: registrationDeadline,
                // Set default values for required fields
                int_wettkampforteid: 1, // Default venue ID - you may need to adjust this
                int_runde: 1
            }
        });
        // Format the response to match the expected structure
        const response = {
            int_eventid: newEvent.int_veranstaltungenid,
            var_eventname: newEvent.var_name,
            dat_eventstartdate: newEvent.dat_von?.toISOString(),
            dat_eventenddate: newEvent.dat_bis?.toISOString(),
            var_location: newEvent.var_veranstalter,
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
    }
    catch (error) {
        console.error('Error creating event:', error);
        if (error instanceof zod_1.z.ZodError) {
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
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }
        const validatedData = updateEventSchema.parse(req.body);
        // Prepare update data
        const updateData = {};
        if (validatedData.var_eventname !== undefined) {
            updateData.var_name = validatedData.var_eventname;
            updateData.var_bezeichnung = validatedData.var_eventname;
        }
        if (validatedData.dat_eventstartdate !== undefined) {
            updateData.dat_von = new Date(validatedData.dat_eventstartdate);
        }
        if (validatedData.dat_eventenddate !== undefined) {
            updateData.dat_bis = new Date(validatedData.dat_eventenddate);
        }
        if (validatedData.var_location !== undefined) {
            updateData.var_veranstalter = validatedData.var_location;
        }
        if (validatedData.var_description !== undefined) {
            updateData.txt_hinweise = validatedData.var_description || null;
        }
        if (validatedData.var_veranstalter !== undefined) {
            updateData.var_veranstalter = validatedData.var_veranstalter;
        }
        if (validatedData.dat_meldeschluss !== undefined) {
            updateData.dat_meldeschluss = validatedData.dat_meldeschluss ? new Date(validatedData.dat_meldeschluss) : null;
        }
        // Update the event
        const updatedEvent = await prisma.tfx_veranstaltungen.update({
            where: { int_veranstaltungenid: id },
            data: updateData
        });
        // Format the response
        const response = {
            int_eventid: updatedEvent.int_veranstaltungenid,
            var_eventname: updatedEvent.var_name,
            dat_eventstartdate: updatedEvent.dat_von?.toISOString(),
            dat_eventenddate: updatedEvent.dat_bis?.toISOString(),
            var_location: updatedEvent.var_veranstalter,
            var_description: updatedEvent.txt_hinweise || '',
            dat_meldeschluss: updatedEvent.dat_meldeschluss?.toISOString() || null,
            var_veranstalter: updatedEvent.var_veranstalter
        };
        console.log('✅ Event updated successfully:', {
            id: updatedEvent.int_veranstaltungenid,
            name: updatedEvent.var_name
        });
        res.json({ event: response });
    }
    catch (error) {
        console.error('Error updating event:', error);
        if (error instanceof zod_1.z.ZodError) {
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
router.post('/import-gymnet', authBypass_1.authenticateToken, upload.single('xmlFile'), async (req, res) => {
    let filePath;
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
        const location = req.body.location;
        const description = req.body.description;
        console.log('📅 Event Information:');
        console.log('  - Name:', eventName);
        console.log('  - Start Date:', startDate);
        console.log('  - End Date:', endDate);
        console.log('  - Location:', location);
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
        const xmlContent = fs_1.default.readFileSync(filePath, 'utf-8');
        console.log('📄 XML Content Preview (first 500 chars):');
        console.log(xmlContent.substring(0, 500) + '...');
        // Parse XML to JavaScript object
        const parsedXml = await parseXmlAsync(xmlContent, {
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: true
        });
        console.log('🎯 XML Structure Analysis:');
        console.log('📊 Root elements:', Object.keys(parsedXml || {}));
        // Deep analysis of XML structure
        const analyzeObject = (obj, path = '', depth = 0) => {
            const analysis = {};
            if (depth > 5)
                return '... (max depth reached)';
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    analysis.type = 'array';
                    analysis.length = obj.length;
                    if (obj.length > 0) {
                        analysis.firstElement = analyzeObject(obj[0], `${path}[0]`, depth + 1);
                    }
                }
                else {
                    analysis.type = 'object';
                    analysis.keys = Object.keys(obj);
                    analysis.properties = {};
                    Object.keys(obj).forEach(key => {
                        const currentPath = path ? `${path}.${key}` : key;
                        analysis.properties[key] = analyzeObject(obj[key], currentPath, depth + 1);
                    });
                }
            }
            else {
                analysis.type = typeof obj;
                analysis.value = String(obj).substring(0, 100);
            }
            return analysis;
        };
        const xmlAnalysis = analyzeObject(parsedXml);
        console.log('🔍 Detailed XML Analysis:');
        console.log(JSON.stringify(xmlAnalysis, null, 2));
        // Extract key data for debugging
        let debugData = {
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
        const findInObject = (obj, searchKeys) => {
            const results = {};
            const search = (current, path = '') => {
                if (typeof current === 'object' && current !== null) {
                    Object.keys(current).forEach(key => {
                        const currentPath = path ? `${path}.${key}` : key;
                        // Check if this key matches any search key
                        searchKeys.forEach(searchKey => {
                            if (key.toLowerCase().includes(searchKey.toLowerCase()) ||
                                searchKey.toLowerCase().includes(key.toLowerCase())) {
                                if (!results[searchKey])
                                    results[searchKey] = [];
                                results[searchKey].push({
                                    path: currentPath,
                                    value: current[key],
                                    type: Array.isArray(current[key]) ? 'array' : typeof current[key]
                                });
                            }
                        });
                        // Recurse into objects and arrays
                        if (Array.isArray(current[key])) {
                            current[key].forEach((item, index) => {
                                search(item, `${currentPath}[${index}]`);
                            });
                        }
                        else if (typeof current[key] === 'object') {
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
                foundElements[key].slice(0, 3).forEach((match) => {
                    console.log(`    - ${match.path}: ${match.type}`);
                });
            }
        });
        // Enhanced data extraction for clubs, competitions, participants, and devices
        const extractData = (obj) => {
            const result = {
                clubs: [],
                competitions: [],
                participants: [],
                devices: []
            };
            // Extract clubs/teams/vereins
            const extractClubs = (data, currentPath) => {
                if (Array.isArray(data)) {
                    data.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            const club = {};
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
                }
                else if (data && typeof data === 'object') {
                    // Handle single object case
                    const club = {};
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
            const extractCompetitions = (data, currentPath) => {
                if (Array.isArray(data)) {
                    data.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            const competition = {};
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
                                    }
                                    else if (genderValue === '2') {
                                        competition.gender = 'weiblich';
                                    }
                                    else {
                                        competition.gender = 'mixed';
                                    }
                                }
                                else if (key === 'waAlterMin') {
                                    if (!competition.ageInfo)
                                        competition.ageInfo = {};
                                    competition.ageInfo.min = parseInt(item[key]) || 0;
                                }
                                else if (key === 'waAlterMax') {
                                    if (!competition.ageInfo)
                                        competition.ageInfo = {};
                                    competition.ageInfo.max = parseInt(item[key]) || 0;
                                }
                                // Generic field mappings (fallback)
                                else if (key.toLowerCase().includes('name') ||
                                    key.toLowerCase().includes('title') ||
                                    key.toLowerCase().includes('bezeichnung') ||
                                    key.toLowerCase().includes('wettkampf')) {
                                    if (!competition.name)
                                        competition.name = item[key];
                                }
                                else if (key.toLowerCase().includes('id')) {
                                    if (!competition.id)
                                        competition.id = item[key];
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
                                    }
                                    else if (genderValue === '2') {
                                        competition.gender = 'weiblich';
                                    }
                                    else {
                                        competition.gender = 'mixed';
                                    }
                                }
                                // Extract age range from waAlterMin/waAlterMax attributes (DTB standard)
                                if (key === 'waAlterMin') {
                                    if (!competition.ageInfo)
                                        competition.ageInfo = {};
                                    competition.ageInfo.min = parseInt(item[key]) || 0;
                                }
                                if (key === 'waAlterMax') {
                                    if (!competition.ageInfo)
                                        competition.ageInfo = {};
                                    competition.ageInfo.max = parseInt(item[key]) || 0;
                                }
                                // Fallback: Extract gender information from other fields
                                if (!competition.gender && (key.toLowerCase().includes('geschlecht') ||
                                    key.toLowerCase().includes('gender') ||
                                    key.toLowerCase().includes('sex'))) {
                                    competition.gender = item[key];
                                }
                                // Fallback: Enhanced age extraction from other fields
                                if (key.toLowerCase().includes('alter') && key !== 'waAlterMin' && key !== 'waAlterMax') {
                                    if (!competition.ageInfo)
                                        competition.ageInfo = {};
                                    if (key.toLowerCase().includes('min') || key.toLowerCase().includes('von')) {
                                        competition.ageInfo.min = parseInt(item[key]) || 0;
                                    }
                                    else if (key.toLowerCase().includes('max') || key.toLowerCase().includes('bis')) {
                                        competition.ageInfo.max = parseInt(item[key]) || 0;
                                    }
                                    else {
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
                }
                else if (data && typeof data === 'object') {
                    // Handle single object case
                    const competition = {};
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
                            }
                            else if (genderValue === '2') {
                                competition.gender = 'weiblich';
                            }
                            else {
                                competition.gender = 'mixed';
                            }
                        }
                        // Extract age range from waAlterMin/waAlterMax attributes (DTB standard)
                        if (key === 'waAlterMin') {
                            if (!competition.ageInfo)
                                competition.ageInfo = {};
                            competition.ageInfo.min = parseInt(data[key]) || 0;
                        }
                        if (key === 'waAlterMax') {
                            if (!competition.ageInfo)
                                competition.ageInfo = {};
                            competition.ageInfo.max = parseInt(data[key]) || 0;
                        }
                        // Fallback: Extract gender information from other fields
                        if (!competition.gender && (key.toLowerCase().includes('geschlecht') ||
                            key.toLowerCase().includes('gender') ||
                            key.toLowerCase().includes('sex'))) {
                            competition.gender = data[key];
                        }
                        // Fallback: Enhanced age extraction from other fields
                        if (key.toLowerCase().includes('alter') && key !== 'waAlterMin' && key !== 'waAlterMax') {
                            if (!competition.ageInfo)
                                competition.ageInfo = {};
                            if (key.toLowerCase().includes('min') || key.toLowerCase().includes('von')) {
                                competition.ageInfo.min = parseInt(data[key]) || 0;
                            }
                            else if (key.toLowerCase().includes('max') || key.toLowerCase().includes('bis')) {
                                competition.ageInfo.max = parseInt(data[key]) || 0;
                            }
                            else {
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
            const extractParticipants = (data, currentPath) => {
                if (Array.isArray(data)) {
                    data.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            const participant = {};
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
                                    if (!participant.firstName)
                                        participant.firstName = item[key];
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
                }
                else if (data && typeof data === 'object') {
                    // Handle single object case
                    const participant = {};
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
            const extractDevices = (data, currentPath) => {
                if (Array.isArray(data)) {
                    data.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            const device = {};
                            Object.keys(item).forEach(key => {
                                if (key.toLowerCase().includes('name') ||
                                    key.toLowerCase().includes('gerät') ||
                                    key.toLowerCase().includes('apparatus') ||
                                    key.toLowerCase().includes('discipline') ||
                                    key.toLowerCase().includes('disziplin') ||
                                    key.toLowerCase().includes('bezeichnung') ||
                                    key.toLowerCase().includes('wedDisName')) {
                                    device.name = item[key];
                                }
                                if (key.toLowerCase().includes('id') ||
                                    key.toLowerCase().includes('disid') ||
                                    key.toLowerCase().includes('gerid') ||
                                    key.toLowerCase().includes('wedDisID')) {
                                    device.id = item[key];
                                }
                                if (key.toLowerCase().includes('code') ||
                                    key.toLowerCase().includes('abbreviation') ||
                                    key.toLowerCase().includes('kuerzel') ||
                                    key.toLowerCase().includes('kurz') ||
                                    key.toLowerCase().includes('wedDisNr')) {
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
                                result.devices.push(device);
                            }
                        }
                    });
                }
                else if (data && typeof data === 'object') {
                    // Handle single object case
                    const device = {};
                    Object.keys(data).forEach(key => {
                        if (key.toLowerCase().includes('name') ||
                            key.toLowerCase().includes('gerät') ||
                            key.toLowerCase().includes('apparatus') ||
                            key.toLowerCase().includes('discipline') ||
                            key.toLowerCase().includes('disziplin') ||
                            key.toLowerCase().includes('bezeichnung') ||
                            key.toLowerCase().includes('wedDisName')) {
                            device.name = data[key];
                        }
                        if (key.toLowerCase().includes('id') ||
                            key.toLowerCase().includes('disid') ||
                            key.toLowerCase().includes('gerid') ||
                            key.toLowerCase().includes('wedDisID')) {
                            device.id = data[key];
                        }
                        if (key.toLowerCase().includes('code') ||
                            key.toLowerCase().includes('abbreviation') ||
                            key.toLowerCase().includes('kuerzel') ||
                            key.toLowerCase().includes('kurz') ||
                            key.toLowerCase().includes('wedDisNr')) {
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
                        result.devices.push(device);
                    }
                }
            };
            const processNode = (node, path = '', competitionContext = null) => {
                if (!node || typeof node !== 'object')
                    return;
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
                            value.forEach((comp, index) => {
                                processNode(comp, `${currentPath}[${index}]`, null);
                            });
                        }
                        else if (value && typeof value === 'object' && value.Wettkampf) {
                            if (Array.isArray(value.Wettkampf)) {
                                value.Wettkampf.forEach((comp, index) => {
                                    processNode(comp, `${currentPath}.Wettkampf[${index}]`, null);
                                });
                            }
                            else {
                                processNode(value.Wettkampf, `${currentPath}.Wettkampf`, null);
                            }
                        }
                        else {
                            processNode(value, currentPath, null);
                        }
                    }
                    else if (key.toLowerCase() === 'mannschaft' || key.toLowerCase() === 'mannschaften') {
                        if (Array.isArray(value)) {
                            // Extract clubs and continue processing for participants
                            extractClubs(value, currentPath);
                            value.forEach((team, index) => {
                                processNode(team, `${currentPath}[${index}]`, currentCompetitionContext);
                            });
                        }
                        else if (value && typeof value === 'object' && value.Mannschaft) {
                            if (Array.isArray(value.Mannschaft)) {
                                extractClubs(value.Mannschaft, `${currentPath}.Mannschaft`);
                                value.Mannschaft.forEach((team, index) => {
                                    processNode(team, `${currentPath}.Mannschaft[${index}]`, currentCompetitionContext);
                                });
                            }
                            else {
                                extractClubs([value.Mannschaft], `${currentPath}.Mannschaft`);
                                processNode(value.Mannschaft, `${currentPath}.Mannschaft`, currentCompetitionContext);
                            }
                        }
                        else {
                            extractClubs([value], currentPath);
                            processNode(value, currentPath, currentCompetitionContext);
                        }
                    }
                    else if (key.toLowerCase() === 'teilnehmer') {
                        // Handle Teilnehmer container
                        if (value && typeof value === 'object' && value.TN) {
                            if (Array.isArray(value.TN)) {
                                value.TN.forEach((participant) => {
                                    if (currentCompetitionContext) {
                                        participant.competitionNumber = currentCompetitionContext.waNr;
                                        participant.competitionID = currentCompetitionContext.waID;
                                        participant._competitionContext = currentCompetitionContext;
                                        console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}`);
                                    }
                                    extractParticipants([participant], currentPath);
                                });
                            }
                            else {
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
                        extractDevices([value], currentPath);
                    }
                    // Continue recursive processing with competition context
                    else if (Array.isArray(value)) {
                        value.forEach((item, index) => {
                            if (typeof item === 'object') {
                                processNode(item, `${currentPath}[${index}]`, currentCompetitionContext);
                            }
                        });
                    }
                    else if (typeof value === 'object' && value !== null) {
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
        // Debug: Show the device extraction details
        if (extractedData.devices.length === 0) {
            console.log('🔍 DEBUG: No devices found. This could indicate:');
            console.log('  - Disciplines are nested inside competitions');
            console.log('  - Different XML structure than expected');
            console.log('  - Different field names for disciplines');
            console.log('  - Searching for devices in unexpected XML structure...');
            // Let's try a more aggressive search for any apparatus/discipline-like content
            const searchForDevices = (obj, path = '') => {
                const foundDevices = [];
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
                            obj[key].forEach((item, index) => {
                                foundDevices.push(...searchForDevices(item, `${path}.${key}[${index}]`));
                            });
                        }
                        else if (obj[key] && typeof obj[key] === 'object') {
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
            }
            else {
                console.log('  ❌ No device/discipline references found in entire XML structure');
            }
        }
        // Log detailed findings
        if (extractedData.clubs.length > 0) {
            console.log('🏢 Found Clubs:');
            extractedData.clubs.slice(0, 5).forEach((club, index) => {
                console.log(`  ${index + 1}. ${club.name || 'Unnamed'} (ID: ${club.id || 'N/A'}) [${club._source}]`);
            });
        }
        if (extractedData.competitions.length > 0) {
            console.log('🏆 Found Competitions:');
            extractedData.competitions.slice(0, 5).forEach((comp, index) => {
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
            extractedData.participants.slice(0, 5).forEach((participant, index) => {
                const fullName = [participant.firstName, participant.lastName].filter(Boolean).join(' ') || 'Unnamed';
                console.log(`  ${index + 1}. ${fullName} (ID: ${participant.id || 'N/A'}) [${participant._source}]`);
            });
        }
        if (extractedData.devices.length > 0) {
            console.log('🏋️ Found Devices:');
            extractedData.devices.slice(0, 5).forEach((device, index) => {
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
        try {
            console.log('🎪 Creating Event in Database...');
            console.log('Event details to insert:');
            console.log(`  - Name: "${eventName.trim()}"`);
            console.log(`  - Start Date: ${parsedStartDate}`);
            console.log(`  - End Date: ${parsedEndDate}`);
            console.log(`  - Location: "${location?.trim() || ''}"`);
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
            const result = await prisma.$queryRawUnsafe(insertQuery, eventName.trim(), // $1: var_name
            parsedStartDate, // $2: dat_von  
            parsedEndDate, // $3: dat_bis
            location?.trim() || '', // $4: var_veranstalter
            1, // $5: int_wettkampforteid - Default wettkampforteid
            1, // $6: int_meldung_an - Default to 1 (assuming contact person ID)
            1, // $7: int_ansprechpartner - Default to 1 (assuming contact person ID)
            1, // $8: int_kontenid - Default to 1 (assuming account ID)
            null, // $9: int_hauptwettkampf - NULL as it's optional foreign key
            1, // $10: int_runde - Default to 1
            parsedEndDate, // $11: dat_meldeschluss - Default to end date
            false, // $12: bol_rundenwettkampf - Default to false
            0, // $13: int_edv - Default to 0
            0, // $14: int_helfer - Default to 0
            0, // $15: int_kampfrichter - Default to 0
            0.0, // $16: rel_meldegeld - Default to 0
            0.0, // $17: rel_nachmeldung - Default to 0
            false, // $18: bol_faellig_nichtantritt - Default to false
            false, // $19: bol_ummeldung_moeglich - Default to false
            false, // $20: bol_nachmeldung_moeglich - Default to false
            '', // $21: var_meldung_website - Default to empty string
            '', // $22: var_verwendungszweck - Default to empty string
            '', // $23: txt_meldung_an - Default to empty string
            '', // $24: txt_startberechtigung - Default to empty string
            '', // $25: txt_teilnahmebedingungen - Default to empty string
            '', // $26: txt_siegerauszeichnung - Default to empty string
            '', // $27: txt_kampfrichter - Default to empty string
            '' // $28: txt_hinweise - Default to empty string
            );
            createdEvent = result[0];
            console.log('✅ Event created successfully:');
            console.log(`  - ID: ${createdEvent.int_veranstaltungenid}`);
            console.log(`  - Name: ${createdEvent.var_name}`);
        }
        catch (eventError) {
            console.error('❌ Error creating event in database:');
            console.error('  - Error Message:', eventError instanceof Error ? eventError.message : String(eventError));
            console.error('  - Error Stack:', eventError instanceof Error ? eventError.stack : 'No stack trace');
            console.error('  - Parameters used:');
            console.error(`    * Name: "${eventName.trim()}"`);
            console.error(`    * Start Date: ${parsedStartDate}`);
            console.error(`    * End Date: ${parsedEndDate}`);
            console.error(`    * Location: "${location?.trim() || ''}"`);
            console.error(`    * Wettkampforteid: 1`);
            console.error(`    * All other fields: defaults (int_runde=1, booleans=false, numbers=0, strings='')`);
            eventCreationError = eventError;
            // Don't continue with the import if event creation fails - this is critical
        }
        // Database insertion for extracted data
        console.log('💾 Starting database insertion process...');
        // Discipline mapping from GymNet IDs to TurnFix database IDs (from TurnFixImport.exe.config)
        // Using actual TurnFix database IDs for precise mapping instead of names
        const disciplineMapping = {
            '200': { id: 74, name: 'Boden', male: true, female: false }, // Men's Floor Exercise
            '210': { id: 31, name: 'Pferd', male: true, female: false }, // Pommel Horse
            '220': { id: 50, name: 'Ringe', male: true, female: false }, // Still Rings
            '230': { id: 71, name: 'Sprung', male: true, female: false }, // Men's Vault
            '240': { id: 72, name: 'Barren', male: true, female: false }, // Parallel Bars
            '250': { id: 46, name: 'Reck', male: true, female: false }, // Horizontal Bar
            '260': { id: 71, name: 'Sprung', male: false, female: true }, // Women's Vault (same ID as men's)
            '270': { id: 68, name: 'Stufenbarren', male: false, female: true }, // Uneven Bars
            '280': { id: 73, name: 'Schwebebalken', male: false, female: true }, // Balance Beam
            '290': { id: 74, name: 'Boden', male: false, female: true }, // Women's Floor Exercise (same ID as men's)
            '630': { id: 77, name: 'Minitrampolin', male: true, female: true }, // Mini Trampoline
            '915': { id: 75, name: 'Gerätebahn A', male: true, female: true }, // Apparatus Track A
            '916': { id: 76, name: 'Gerätebahn B', male: true, female: true } // Apparatus Track B
        };
        let insertionResults = {
            clubs: { inserted: 0, updated: 0, errors: 0 },
            participants: { inserted: 0, updated: 0, errors: 0 },
            competitions: { inserted: 0, updated: 0, errors: 0 },
            devices: { inserted: 0, updated: 0, errors: 0 }
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
                if (existingClub.length > 0) {
                    // Update existing club (just the name since that's what we have)
                    await prisma.$queryRawUnsafe(`
            UPDATE tfx_vereine 
            SET var_name = $1
            WHERE int_vereineid = $2
          `, club.name.trim(), existingClub[0].int_vereineid);
                    insertionResults.clubs.updated++;
                    console.log(`  ✅ Updated club: ${club.name}`);
                }
                else {
                    // Insert new club (with required int_gaueid field)
                    await prisma.$queryRawUnsafe(`
            INSERT INTO tfx_vereine (var_name, int_gaueid)
            VALUES ($1, $2)
          `, club.name.trim(), 1); // Default gaueid = 1
                    insertionResults.clubs.inserted++;
                    console.log(`  ✅ Inserted club: ${club.name}`);
                }
            }
            catch (error) {
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
                        if (clubResult.length > 0) {
                            clubId = clubResult[0].int_vereineid;
                            console.log(`  ✅ Found club ID: ${clubId} for "${participant.club}"`);
                        }
                        else {
                            console.log(`  ⚠️ Club not found: "${participant.club}"`);
                            // Try to find similar club names
                            const similarClubs = await prisma.$queryRawUnsafe(`
              SELECT var_name FROM tfx_vereine 
              WHERE LOWER(var_name) LIKE LOWER('%' || $1 || '%')
              LIMIT 3
            `, participant.club.trim());
                            if (similarClubs.length > 0) {
                                console.log(`  💡 Similar clubs found:`, similarClubs.map(c => c.var_name));
                            }
                        }
                    }
                    // Parse birth date - handle null values properly for raw SQL
                    let birthDate = null;
                    if (participant.birthDate) {
                        try {
                            let date;
                            const birthDateStr = participant.birthDate.toString();
                            // Check if it's German format DD.MM.YYYY
                            if (birthDateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                                const [day, month, year] = birthDateStr.split('.');
                                // Use UTC to avoid timezone issues
                                date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                            }
                            else {
                                // Try standard JavaScript date parsing
                                date = new Date(participant.birthDate);
                            }
                            if (!isNaN(date.getTime())) {
                                birthDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
                            }
                            else {
                                console.log(`  ⚠️ Invalid birth date for ${firstName} ${lastName}: ${participant.birthDate}`);
                            }
                        }
                        catch (e) {
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
                        }
                        else if (participant.gender === '1' || participant.gender === 1) {
                            gender = 1; // Male
                            console.log(`    🚹 Participant ${firstName} ${lastName}: DTB gender '${participant.gender}' → Male (1)`);
                        }
                        else {
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
                    if (existingParticipant.length > 0) {
                        // Update existing participant - handle birth date properly
                        // Only update club if we found a valid club ID (don't override with null)
                        const participantId = existingParticipant[0].int_teilnehmerid;
                        const existingBirthDate = existingParticipant[0].dat_geburtstag;
                        const clubInfo = clubId ? `(club ID: ${clubId})` : '(keeping existing club)';
                        const birthDateInfo = (!existingBirthDate && birthDate) ? ' [FIXED BIRTH DATE]' : '';
                        if (birthDate) {
                            await prisma.$queryRawUnsafe(`
              UPDATE tfx_teilnehmer 
              SET var_vorname = $1, var_nachname = $2, dat_geburtstag = $3::date, 
                  int_vereineid = COALESCE($4, int_vereineid), int_geschlecht = $5
              WHERE int_teilnehmerid = $6
            `, firstName, lastName, birthDate, clubId, gender, participantId);
                        }
                        else {
                            await prisma.$queryRawUnsafe(`
              UPDATE tfx_teilnehmer 
              SET var_vorname = $1, var_nachname = $2, dat_geburtstag = NULL, 
                  int_vereineid = COALESCE($3, int_vereineid), int_geschlecht = $4
              WHERE int_teilnehmerid = $5
            `, firstName, lastName, clubId, gender, participantId);
                        }
                        insertionResults.participants.updated++;
                        console.log(`  ✅ Updated participant: ${firstName} ${lastName} ${clubInfo}${birthDateInfo}`);
                    }
                    else {
                        // Insert new participant (int_geschlecht is required)
                        if (birthDate) {
                            await prisma.$queryRawUnsafe(`
              INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, dat_geburtstag, int_vereineid, int_geschlecht)
              VALUES ($1, $2, $3::date, $4, $5)
            `, firstName, lastName, birthDate, clubId, gender);
                        }
                        else {
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
                }
                catch (error) {
                    const name = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
                    console.log(`  ❌ Error processing participant ${name}:`, error);
                    insertionResults.participants.errors++;
                }
            }
        }
        else {
            console.log('⚠️ Skipping participant processing - event creation failed');
        }
        // Helper function to get or create tfx_bereiche based on gender
        const getOrCreateBereich = async (gender) => {
            let boolMaennlich = true;
            let boolWeiblich = true;
            let bereichName = 'Mixed';
            if (gender === 'männlich' || gender === 'male') {
                boolMaennlich = true;
                boolWeiblich = false;
                bereichName = 'Männlich';
            }
            else if (gender === 'weiblich' || gender === 'female') {
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
            for (const competition of extractedData.competitions) {
                try {
                    if (!competition.name || competition.name.trim() === '') {
                        console.log('  ⚠️ Skipping competition with empty name');
                        continue;
                    }
                    // Extract age ranges and gender
                    const ageFrom = competition.ageInfo?.min || 2000;
                    const ageTo = competition.ageInfo?.max || 2030;
                    const gender = competition.gender || 'mixed';
                    console.log(`  🔍 Processing: ${competition.name} (Ages: ${ageFrom}-${ageTo}, Gender: ${gender})`);
                    // Get or create appropriate bereich based on gender
                    const bereichId = await getOrCreateBereich(gender);
                    // Check if competition exists for this event
                    const existingCompetition = await prisma.$queryRawUnsafe(`
            SELECT int_wettkaempfeid FROM tfx_wettkaempfe 
            WHERE int_veranstaltungenid = $1 AND LOWER(var_name) = LOWER($2)
            LIMIT 1
          `, createdEvent.int_veranstaltungenid, competition.name.trim());
                    if (existingCompetition.length > 0) {
                        // Update existing competition with age ranges, bereich, and competition number
                        await prisma.$queryRawUnsafe(`
              UPDATE tfx_wettkaempfe 
              SET var_name = $1, yer_von = $2, yer_bis = $3, int_bereicheid = $4, var_nummer = $5
              WHERE int_wettkaempfeid = $6
            `, competition.name.trim(), ageFrom, ageTo, bereichId, competition.waNr || competition.number || null, existingCompetition[0].int_wettkaempfeid);
                        insertionResults.competitions.updated++;
                        console.log(`  ✅ Updated competition: ${competition.name} (Ages: ${ageFrom}-${ageTo}, Bereich: ${bereichId}, Number: ${competition.waNr || competition.number || 'none'})`);
                    }
                    else {
                        // Insert new competition with age ranges, bereich, and competition number
                        await prisma.$queryRawUnsafe(`
              INSERT INTO tfx_wettkaempfe (int_veranstaltungenid, int_bereicheid, var_name, yer_von, yer_bis, var_nummer)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, createdEvent.int_veranstaltungenid, bereichId, competition.name.trim(), ageFrom, ageTo, competition.waNr || competition.number || null);
                        insertionResults.competitions.inserted++;
                        console.log(`  ✅ Inserted competition: ${competition.name} (Ages: ${ageFrom}-${ageTo}, Bereich: ${bereichId}, Number: ${competition.waNr || competition.number || 'none'})`);
                    }
                }
                catch (error) {
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
                    if (participantResult.length > 0) {
                        const participantId = participantResult[0].int_teilnehmerid;
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
                            }
                            else {
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
                            }
                            else {
                                console.log(`    📝 Participant ${firstName} ${lastName} already in event`);
                            }
                        }
                        else {
                            console.log(`    ⚠️ No competitions found for event - participant ${firstName} ${lastName} not added to event`);
                        }
                    }
                    else {
                        console.log(`    ❌ Participant ${firstName} ${lastName} not found in database`);
                    }
                }
                catch (associationError) {
                    console.error(`    ❌ Failed to add participant ${participant.firstName} ${participant.lastName} to event:`, associationError);
                }
            }
            console.log(`🎯 Participant assignment complete: ${assignedCount}/${extractedData.participants.length} participants assigned to event`);
        }
        // 4. Insert/Update Devices/Disciplines and link them to competitions (enhanced with manual search)
        console.log('🤸 Starting comprehensive discipline processing...');
        // Always try to find and link disciplines, regardless of extraction results
        if (createdEvent) {
            // First, get all competitions created for this event
            const eventCompetitions = await prisma.$queryRawUnsafe(`
        SELECT int_wettkaempfeid, var_name FROM tfx_wettkaempfe 
        WHERE int_veranstaltungenid = $1
      `, createdEvent.int_veranstaltungenid);
            console.log(`  📊 Found ${eventCompetitions.length} competitions for this event`);
            // Define common gymnastics disciplines that should be linked to competitions
            const commonDisciplines = [
                { name: 'Boden', searchTerms: ['boden', 'floor', 'fx'] },
                { name: 'Sprung', searchTerms: ['sprung', 'vault', 'vt'] },
                { name: 'Stufenbarren', searchTerms: ['stufenbarren', 'barren', 'uneven', 'ub'] },
                { name: 'Schwebebalken', searchTerms: ['schwebebalken', 'balken', 'beam', 'bb'] },
                { name: 'Reck', searchTerms: ['reck', 'high bar', 'hb'] },
                { name: 'Pauschenpferd', searchTerms: ['pauschenpferd', 'pommel', 'ph'] },
                { name: 'Ringe', searchTerms: ['ringe', 'rings', 'sr'] },
                { name: 'Barren', searchTerms: ['barren', 'parallel', 'pb'] }
            ];
            let linkedCount = 0;
            // For each competition, try to link appropriate disciplines
            for (const competition of eventCompetitions) {
                const competitionName = competition.var_name.toLowerCase();
                console.log(`  🔍 Processing competition: "${competition.var_name}"`);
                // Determine which disciplines to link based on competition name
                let disciplinesToLink = [];
                if (competitionName.includes('vierkampf') && competitionName.includes('w')) {
                    // Women's all-around (4 events)
                    disciplinesToLink = ['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken'];
                }
                else if (competitionName.includes('sechskampf') && competitionName.includes('m')) {
                    // Men's all-around (6 events)
                    disciplinesToLink = ['Boden', 'Pauschenpferd', 'Ringe', 'Sprung', 'Barren', 'Reck'];
                }
                else if (competitionName.includes('geräte')) {
                    // Generic apparatus competition - link common disciplines
                    disciplinesToLink = ['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken', 'Reck', 'Pauschenpferd', 'Ringe', 'Barren'];
                }
                else {
                    // For other competitions, link basic disciplines
                    disciplinesToLink = ['Boden', 'Sprung'];
                }
                console.log(`    📝 Will attempt to link disciplines: ${disciplinesToLink.join(', ')}`);
                // Link each discipline to this competition
                for (const disciplineName of disciplinesToLink) {
                    try {
                        // Find the discipline in the database
                        const existingDiscipline = await prisma.$queryRawUnsafe(`
              SELECT int_disziplinenid FROM tfx_disziplinen 
              WHERE LOWER(var_name) = LOWER($1)
              LIMIT 1
            `, disciplineName);
                        if (existingDiscipline.length > 0) {
                            const disciplineId = existingDiscipline[0].int_disziplinenid;
                            // Check if this competition-discipline link already exists
                            const existingLink = await prisma.$queryRawUnsafe(`
                SELECT int_wettkaempfe_x_disziplinenid FROM tfx_wettkaempfe_x_disziplinen 
                WHERE int_wettkaempfeid = $1 AND int_disziplinenid = $2
                LIMIT 1
              `, competition.int_wettkaempfeid, disciplineId);
                            if (existingLink.length === 0) {
                                // Create the competition-discipline link
                                await prisma.$queryRawUnsafe(`
                  INSERT INTO tfx_wettkaempfe_x_disziplinen (int_wettkaempfeid, int_disziplinenid, int_sortierung)
                  VALUES ($1, $2, $3)
                `, competition.int_wettkaempfeid, disciplineId, linkedCount + 1);
                                console.log(`    🔗 Linked discipline "${disciplineName}" to competition "${competition.var_name}"`);
                                linkedCount++;
                                insertionResults.devices.updated++;
                            }
                            else {
                                console.log(`    ✅ Discipline "${disciplineName}" already linked to competition "${competition.var_name}"`);
                            }
                        }
                        else {
                            console.log(`    ⚠️ Discipline "${disciplineName}" not found in database`);
                            insertionResults.devices.errors++;
                        }
                    }
                    catch (linkError) {
                        console.log(`    ❌ Error linking discipline ${disciplineName} to competition ${competition.var_name}:`, linkError);
                        insertionResults.devices.errors++;
                    }
                }
            }
            console.log(`  🎯 Discipline linking complete: ${linkedCount} new links created`);
        }
        else {
            console.log('⚠️ Skipping discipline processing - event creation failed');
        }
        console.log('💾 Database insertion completed:');
        console.log(`  🏢 Clubs: ${insertionResults.clubs.inserted} inserted, ${insertionResults.clubs.updated} updated, ${insertionResults.clubs.errors} errors`);
        console.log(`  👥 Participants: ${insertionResults.participants.inserted} inserted, ${insertionResults.participants.updated} updated, ${insertionResults.participants.errors} errors`);
        console.log(`  🏆 Competitions: ${insertionResults.competitions.inserted} inserted, ${insertionResults.competitions.updated} updated, ${insertionResults.competitions.errors} errors`);
        console.log(`  🤸 Disciplines: ${insertionResults.devices.inserted} inserted, ${insertionResults.devices.updated} found/linked, ${insertionResults.devices.errors} errors`);
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
                location: location?.trim() || null,
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
                summary: {
                    clubsCount: extractedData.clubs.length,
                    competitionsCount: extractedData.competitions.length,
                    participantsCount: extractedData.participants.length,
                    devicesCount: extractedData.devices.length
                }
            },
            debug: debugData,
            summary: {
                rootElements: Object.keys(parsedXml || {}),
                potentialDataFound: Object.keys(foundElements).length,
                fileProcessed: req.file.originalname,
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
    }
    catch (error) {
        console.error('❌ XML Import Error:', error);
        // Clean up uploaded file on error
        if (filePath && fs_1.default.existsSync(filePath)) {
            try {
                fs_1.default.unlinkSync(filePath);
                console.log('🗑️ Cleaned up uploaded file after error');
            }
            catch (cleanupError) {
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
// Get event by ID (moved to end to avoid catching other routes)
router.get('/:id', async (req, res) => {
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
        }
        else if (now >= startDate && now <= endDate) {
            status = 'active';
        }
        const formattedEvent = {
            ...event,
            int_eventid: Number(event.int_eventid),
            participant_count: Number(event.participant_count || 0),
            score_count: Number(event.score_count || 0),
            dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
            dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
            status
        };
        res.json(formattedEvent);
    }
    catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/events/:id/participants - Compatibility endpoint
router.get('/:id/participants', authBypass_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching event participants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/events/:id - Delete an event
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
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
        // Delete associated competitions
        const competitionsCount = await prisma.tfx_wettkaempfe.count({
            where: { int_veranstaltungenid: eventId }
        });
        await prisma.tfx_wettkaempfe.deleteMany({
            where: { int_veranstaltungenid: eventId }
        });
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
    }
    catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Simple test route for XML import (no auth)
router.post('/import-test', upload.single('xmlFile'), async (req, res) => {
    console.log('🧪 TEST: XML import started');
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const filePath = req.file.path;
        const xmlContent = fs_1.default.readFileSync(filePath, 'utf-8');
        console.log('📄 XML file received, length:', xmlContent.length);
        res.json({
            success: true,
            message: 'XML import test completed',
            xmlSize: xmlContent.length,
            preview: xmlContent.substring(0, 200)
        });
        // Clean up
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('❌ Test import error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=events.js.map