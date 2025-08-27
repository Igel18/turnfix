import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import multer from 'multer';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

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
      whereClause = `WHERE LOWER(var_name) LIKE LOWER($${paramIndex}) OR LOWER(var_veranstalter) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_veranstaltungen
      ${whereClause}
    `;
    
    const countResult = await (prisma as any).$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        int_veranstaltungenid as int_eventid,
        var_name as var_eventname,
        dat_von as dat_eventstartdate,
        dat_bis as dat_eventenddate,
        var_veranstalter as var_location,
        COALESCE(txt_hinweise, '') as var_description,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,
        (SELECT COUNT(*) FROM tfx_wertungen wr
         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid
         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count
      FROM tfx_veranstaltungen v
      ${whereClause}
      ORDER BY dat_von DESC, var_name ASC
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

    // Read and parse XML file
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
      interface ExtractedData {
        clubs: any[];
        competitions: any[];
        participants: any[];
        devices: any[];
      }

      const result: ExtractedData = {
        clubs: [],
        competitions: [],
        participants: [],
        devices: []
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
                if (key.toLowerCase().includes('name') || 
                    key.toLowerCase().includes('title') ||
                    key.toLowerCase().includes('bezeichnung') ||
                    key.toLowerCase().includes('wettkampf')) {
                  competition.name = item[key];
                }
                if (key.toLowerCase().includes('id') ||
                    key.toLowerCase().includes('waid')) {
                  competition.id = item[key];
                }
                if (key.toLowerCase().includes('date') || 
                    key.toLowerCase().includes('datum')) {
                  competition.date = item[key];
                }
                if (key.toLowerCase().includes('category') || 
                    key.toLowerCase().includes('kategorie') ||
                    key.toLowerCase().includes('geschlecht')) {
                  competition.category = item[key];
                }
                if (key.toLowerCase().includes('alter')) {
                  if (!competition.ageInfo) competition.ageInfo = {};
                  if (key.toLowerCase().includes('min')) {
                    competition.ageInfo.min = item[key];
                  } else if (key.toLowerCase().includes('max')) {
                    competition.ageInfo.max = item[key];
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
                key.toLowerCase().includes('kategorie') ||
                key.toLowerCase().includes('geschlecht')) {
              competition.category = data[key];
            }
            if (key.toLowerCase().includes('alter')) {
              if (!competition.ageInfo) competition.ageInfo = {};
              if (key.toLowerCase().includes('min')) {
                competition.ageInfo.min = data[key];
              } else if (key.toLowerCase().includes('max')) {
                competition.ageInfo.max = data[key];
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
                if (key.toLowerCase().includes('name') || 
                    key.toLowerCase().includes('nachname') ||
                    key.toLowerCase().includes('lastname') ||
                    key.toLowerCase().includes('pername')) {
                  participant.lastName = item[key];
                }
                if (key.toLowerCase().includes('firstname') || 
                    key.toLowerCase().includes('vorname') ||
                    key.toLowerCase().includes('pervorname')) {
                  participant.firstName = item[key];
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
            if (key.toLowerCase().includes('name') || 
                key.toLowerCase().includes('nachname') ||
                key.toLowerCase().includes('lastname') ||
                key.toLowerCase().includes('pername')) {
              participant.lastName = data[key];
            }
            if (key.toLowerCase().includes('firstname') || 
                key.toLowerCase().includes('vorname') ||
                key.toLowerCase().includes('pervorname')) {
              participant.firstName = data[key];
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
          });
          if (Object.keys(participant).length > 0) {
            participant._source = currentPath;
            result.participants.push(participant);
          }
        }
      };

      // Extract devices/apparatus/geräte
      const extractDevices = (data: any, currentPath: string) => {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            if (item && typeof item === 'object') {
              const device: any = {};
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

      const processNode = (node: any, path: string = '') => {
        if (!node || typeof node !== 'object') return;

        Object.keys(node).forEach(key => {
          const value = node[key];
          const currentPath = path ? `${path}.${key}` : key;

          // Target specific GymNet XML structures
          if (key.toLowerCase() === 'wettkampf') {
            extractCompetitions([value], currentPath);
          }

          if (key.toLowerCase() === 'mannschaft') {
            extractClubs([value], currentPath);
          }

          if (key.toLowerCase() === 'tn') {
            extractParticipants([value], currentPath);
          }

          if (key.toLowerCase() === 'disziplin') {
            extractDevices([value], currentPath);
          }

          // Continue recursive processing
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'object') {
                processNode(item, `${currentPath}[${index}]`);
              }
            });
          } else if (typeof value === 'object' && value !== null) {
            processNode(value, currentPath);
          }
        });
      };

      processNode(obj);
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
      });
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
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    // Create the event in the database with extracted data
    let createdEvent = null;
    try {
      console.log('🎪 Creating Event in Database...');
      
      // Use raw SQL to insert into tfx_veranstaltungen
      const insertQuery = `
        INSERT INTO tfx_veranstaltungen (
          var_name, 
          dat_von, 
          dat_bis, 
          var_veranstalter, 
          int_wettkampforteid
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING int_veranstaltungenid, var_name
      `;
      
      const result = await prisma.$queryRawUnsafe(
        insertQuery,
        eventName.trim(),
        parsedStartDate,
        parsedEndDate,
        location?.trim() || '',
        1 // Default wettkampforteid - we need this as it's required
      ) as any[];
      
      createdEvent = result[0];

      console.log('✅ Event created successfully:');
      console.log(`  - ID: ${createdEvent.int_veranstaltungenid}`);
      console.log(`  - Name: ${createdEvent.var_name}`);

    } catch (eventError) {
      console.error('❌ Error creating event:', eventError);
      // Continue with the import even if event creation fails
    }

    // Database insertion for extracted data
    console.log('💾 Starting database insertion process...');
    
    // Discipline mapping from GymNet IDs to TurnFix database IDs (from TurnFixImport.exe.config)
    // Using actual TurnFix database IDs for precise mapping instead of names
    const disciplineMapping: Record<string, {id: number, name: string, male: boolean, female: boolean}> = {
      '200': { id: 74, name: 'Boden', male: true, female: false },        // Men's Floor Exercise
      '210': { id: 31, name: 'Pferd', male: true, female: false },        // Pommel Horse
      '220': { id: 50, name: 'Ringe', male: true, female: false },        // Still Rings
      '230': { id: 71, name: 'Sprung', male: true, female: false },       // Men's Vault
      '240': { id: 72, name: 'Barren', male: true, female: false },       // Parallel Bars
      '250': { id: 46, name: 'Reck', male: true, female: false },         // Horizontal Bar
      '260': { id: 71, name: 'Sprung', male: false, female: true },       // Women's Vault (same ID as men's)
      '270': { id: 68, name: 'Stufenbarren', male: false, female: true }, // Uneven Bars
      '280': { id: 73, name: 'Schwebebalken', male: false, female: true }, // Balance Beam
      '290': { id: 74, name: 'Boden', male: false, female: true },        // Women's Floor Exercise (same ID as men's)
      '630': { id: 77, name: 'Minitrampolin', male: true, female: true }, // Mini Trampoline
      '915': { id: 75, name: 'Gerätebahn A', male: true, female: true },  // Apparatus Track A
      '916': { id: 76, name: 'Gerätebahn B', male: true, female: true }   // Apparatus Track B
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

    // 2. Insert/Update Participants
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
          const clubResult = await prisma.$queryRawUnsafe(`
            SELECT int_vereineid FROM tfx_vereine 
            WHERE LOWER(var_name) = LOWER($1)
            LIMIT 1
          `, participant.club.trim());
          
          if ((clubResult as any[]).length > 0) {
            clubId = (clubResult as any[])[0].int_vereineid;
          }
        }

        // Parse birth date - handle null values properly
        let birthDate: Date | null = null;
        if (participant.birthDate) {
          try {
            birthDate = new Date(participant.birthDate);
          } catch (e) {
            console.log(`  ⚠️ Invalid birth date for ${firstName} ${lastName}: ${participant.birthDate}`);
          }
        }

        // Determine gender (int_geschlecht is required in schema)
        let gender = 1; // Default to male (1)
        if (participant.gender) {
          gender = participant.gender.toLowerCase() === 'w' || participant.gender.toLowerCase() === 'f' ? 2 : 1;
        }

        // Check if participant exists (same first name, last name, and birth date)
        const existingParticipant = await prisma.$queryRawUnsafe(`
          SELECT int_teilnehmerid FROM tfx_teilnehmer 
          WHERE LOWER(var_vorname) = LOWER($1) 
            AND LOWER(var_nachname) = LOWER($2)
            AND (dat_geburtstag = $3 OR (dat_geburtstag IS NULL AND $3 IS NULL))
          LIMIT 1
        `, firstName, lastName, birthDate);

        if ((existingParticipant as any[]).length > 0) {
          // Update existing participant
          await prisma.$queryRawUnsafe(`
            UPDATE tfx_teilnehmer 
            SET var_vorname = $1, var_nachname = $2, dat_geburtstag = $3, 
                int_vereineid = COALESCE($4, int_vereineid), int_geschlecht = $5
            WHERE int_teilnehmerid = $6
          `, firstName, lastName, birthDate, clubId, gender, (existingParticipant as any[])[0].int_teilnehmerid);
          
          insertionResults.participants.updated++;
          console.log(`  ✅ Updated participant: ${firstName} ${lastName}`);
        } else {
          // Insert new participant (int_geschlecht is required)
          await prisma.$queryRawUnsafe(`
            INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, dat_geburtstag, int_vereineid, int_geschlecht)
            VALUES ($1, $2, $3, $4, $5)
          `, firstName, lastName, birthDate, clubId || 1, gender); // Default vereineid to 1 if not found
          
          insertionResults.participants.inserted++;
          console.log(`  ✅ Inserted participant: ${firstName} ${lastName}`);
        }
      } catch (error) {
        const name = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
        console.log(`  ❌ Error processing participant ${name}:`, error);
        insertionResults.participants.errors++;
      }
    }

    // 3. Insert/Update Competitions (if event was created successfully)
    if (createdEvent && extractedData.competitions.length > 0) {
      console.log('🏆 Processing competitions...');
      for (const competition of extractedData.competitions) {
        try {
          if (!competition.name || competition.name.trim() === '') {
            console.log('  ⚠️ Skipping competition with empty name');
            continue;
          }

          // Parse competition date
          let competitionDate = parsedStartDate; // Default to event start date
          if (competition.date) {
            try {
              competitionDate = new Date(competition.date);
            } catch (e) {
              console.log(`  ⚠️ Invalid competition date: ${competition.date}, using event start date`);
            }
          }

          // Check if competition exists for this event
          const existingCompetition = await prisma.$queryRawUnsafe(`
            SELECT int_wettkaempfeid FROM tfx_wettkaempfe 
            WHERE int_veranstaltungenid = $1 AND LOWER(var_name) = LOWER($2)
            LIMIT 1
          `, createdEvent.int_veranstaltungenid, competition.name.trim());

          if ((existingCompetition as any[]).length > 0) {
            // Update existing competition
            await prisma.$queryRawUnsafe(`
              UPDATE tfx_wettkaempfe 
              SET var_name = $1, dat_datum = $2, dt_updated = $3
              WHERE int_wettkaempfeid = $4
            `, competition.name.trim(), competitionDate, new Date(), (existingCompetition as any[])[0].int_wettkaempfeid);
            
            insertionResults.competitions.updated++;
            console.log(`  ✅ Updated competition: ${competition.name}`);
          } else {
            // Insert new competition
            await prisma.$queryRawUnsafe(`
              INSERT INTO tfx_wettkaempfe (int_veranstaltungenid, var_name, dat_datum, dt_created, dt_updated)
              VALUES ($1, $2, $3, $4, $5)
            `, createdEvent.int_veranstaltungenid, competition.name.trim(), competitionDate, new Date(), new Date());
            
            insertionResults.competitions.inserted++;
            console.log(`  ✅ Inserted competition: ${competition.name}`);
          }
        } catch (error) {
          console.log(`  ❌ Error processing competition ${competition.name}:`, error);
          insertionResults.competitions.errors++;
        }
      }
    }

    // 4. Insert/Update Devices/Disciplines
    console.log('🤸 Processing devices/disciplines...');
    for (const device of extractedData.devices) {
      try {
        const gymnetId = device.id || device.code;
        const deviceName = device.name?.trim();
        
        if (!deviceName) {
          console.log('  ⚠️ Skipping device with empty name');
          continue;
        }

        // Try to map GymNet ID to TurnFix discipline using database IDs
        let mappedDiscipline = null;
        if (gymnetId && disciplineMapping[gymnetId]) {
          mappedDiscipline = disciplineMapping[gymnetId];
          console.log(`  🎯 Mapped GymNet ID ${gymnetId} to TurnFix discipline: ${mappedDiscipline.name} (DB ID: ${mappedDiscipline.id})`);
        }

        if (mappedDiscipline) {
          // We have a precise mapping - check if this exact discipline exists by database ID
          const existingDiscipline = await prisma.$queryRawUnsafe(`
            SELECT int_disziplinenid FROM tfx_disziplinen 
            WHERE int_disziplinenid = $1
            LIMIT 1
          `, mappedDiscipline.id);

          if ((existingDiscipline as any[]).length > 0) {
            // Discipline exists - we don't need to update it as it's already correct
            insertionResults.devices.updated++;
            console.log(`  ✅ Found existing discipline: ${mappedDiscipline.name} (DB ID: ${mappedDiscipline.id}) mapped to GymNet ID ${gymnetId}`);
          } else {
            console.log(`  ⚠️ Expected discipline with ID ${mappedDiscipline.id} not found in database - this may indicate a database schema issue`);
            insertionResults.devices.errors++;
          }
        } else {
          // No mapping found - handle as before (by name or create new)
          console.log(`  ⚠️ No mapping found for GymNet ID ${gymnetId} - falling back to name-based lookup for "${deviceName}"`);
          
          // Check if discipline exists by name or GymNet ID
          const existingDiscipline = await prisma.$queryRawUnsafe(`
            SELECT int_disziplinenid FROM tfx_disziplinen 
            WHERE LOWER(var_name) = LOWER($1)
            LIMIT 1
          `, deviceName);

          if ((existingDiscipline as any[]).length > 0) {
            // Discipline found by name - just reference it
            insertionResults.devices.updated++;
            console.log(`  ✅ Found existing discipline: ${deviceName} (unmapped)`);
          } else {
            // This discipline doesn't exist - we can't create new ones without required fields
            console.log(`  ⚠️ Discipline not found: ${deviceName} - would need sport ID to create new discipline`);
            insertionResults.devices.errors++;
          }
        }
      } catch (error) {
        console.log(`  ❌ Error processing device ${device.name}:`, error);
        insertionResults.devices.errors++;
      }
    }

    console.log('💾 Database insertion completed:');
    console.log(`  🏢 Clubs: ${insertionResults.clubs.inserted} inserted, ${insertionResults.clubs.updated} updated, ${insertionResults.clubs.errors} errors`);
    console.log(`  👥 Participants: ${insertionResults.participants.inserted} inserted, ${insertionResults.participants.updated} updated, ${insertionResults.participants.errors} errors`);
    console.log(`  🏆 Competitions: ${insertionResults.competitions.inserted} inserted, ${insertionResults.competitions.updated} updated, ${insertionResults.competitions.errors} errors`);
    console.log(`  🤸 Disciplines: ${insertionResults.devices.inserted} inserted, ${insertionResults.devices.updated} updated, ${insertionResults.devices.errors} errors`);

    // Return structured response with extracted data
    res.json({
      success: true,
      message: createdEvent 
        ? `Event "${createdEvent.var_name}" created successfully and data imported to database`
        : 'XML erfolgreich geparst und analysiert',
      createdEvent: createdEvent ? {
        id: createdEvent.int_veranstaltungenid,
        name: createdEvent.var_name,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        location: location?.trim() || null,
        description: description?.trim() || null
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
        nextSteps: [
          'Review the extracted clubs, competitions, participants, and devices',
          'Verify the data accuracy and completeness',
          'Implement database import for the extracted data',
          'Add validation and error handling for specific data formats'
        ]
      }
    });

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
    } else if (now >= startDate && now <= endDate) {
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
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
