/**
 * GymNet Import Route — Orchestrates XML upload, parsing, and database import.
 *
 * This is a thin route handler that:
 *   1. Handles the multipart file upload (multer)
 *   2. Parses the XML (gymnetXmlParser)
 *   3. Creates the event in the database
 *   4. Delegates data import to gymnetDbImport
 *   5. Builds and returns the response
 *
 * Extracted from events.ts as part of SoC refactoring.
 */

import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import multer = require('multer');
import * as fs from 'fs';
import prisma from '../lib/prisma';
import {
  parseXmlAsync,
  extractAllData,
  analyzeObject,
  findInObject,
  searchForDevicesAggressively
} from '../utils/gymnetXmlParser';
import { importGymnetData } from '../utils/gymnetDbImport';

const router = Router();

// ============================================================================
// Multer Configuration
// ============================================================================

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = 'uploads/xml';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `gymnet-${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.toLowerCase().endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Nur XML-Dateien sind erlaubt'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ============================================================================
// Health Check
// ============================================================================

router.get('/import-gymnet-test', (_req, res) => {
  res.json({
    success: true,
    message: 'XML import route is working',
    info: 'Use POST /api/events/import-gymnet with multipart form data containing xmlFile'
  });
});

// ============================================================================
// Simple Test Route (no auth)
// ============================================================================

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
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error: any) {
    console.error('❌ Test import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// Main Import Route
// ============================================================================

router.post('/import-gymnet', authenticateToken, upload.single('xmlFile'), async (req: AuthRequest, res) => {
  let filePath: string | undefined;

  try {
    // --- 1. File upload validation ---
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Keine XML-Datei hochgeladen' });
    }

    filePath = req.file.path;
    console.log('🔍 XML Import Started:');
    console.log('  - File:', req.file.originalname);
    console.log('  - Size:', req.file.size, 'bytes');

    // --- 2. Extract event metadata from form data ---
    const eventName = req.body.eventName;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const locationId = req.body.locationId;
    const description = req.body.description;

    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    // --- 3. Parse XML ---
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    console.log('📄 XML Content Preview (first 500 chars):');
    console.log(xmlContent.substring(0, 500) + '...');

    const parsedXml: any = await parseXmlAsync(xmlContent, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });

    console.log('🎯 XML Structure Analysis:');
    console.log('📊 Root elements:', Object.keys(parsedXml || {}));

    // Debug analysis
    const xmlAnalysis = analyzeObject(parsedXml);
    console.log('🔍 Detailed XML Analysis:');
    console.log(JSON.stringify(xmlAnalysis, null, 2));

    const debugData: any = {
      xmlStructure: xmlAnalysis,
      rawXmlPreview: xmlContent.substring(0, 1000),
      fileInfo: { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype },
      parseTimestamp: new Date().toISOString()
    };

    // Search for typical elements
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
      }
    });

    // --- 4. Extract structured data ---
    const extractedData = extractAllData(parsedXml);
    debugData.extractedData = extractedData;

    console.log('📋 Extracted Data Summary:');
    console.log(`  🏢 Clubs: ${extractedData.clubs.length}`);
    console.log(`  🏆 Competitions: ${extractedData.competitions.length}`);
    console.log(`  👥 Participants: ${extractedData.participants.length}`);
    console.log(`  🏋️ Devices: ${extractedData.devices.length}`);
    console.log(`  🏅 Teams: ${extractedData.teams.length}`);

    // Aggressive device search fallback
    if (extractedData.devices.length === 0) {
      console.log('🔍 DEBUG: No devices found. Searching aggressively...');
      const foundDeviceData = searchForDevicesAggressively(parsedXml, 'root');
      if (foundDeviceData.length > 0) {
        console.log(`  📊 Found ${foundDeviceData.length} potential device references`);
      } else {
        console.log('  ❌ No device/discipline references found in entire XML structure');
      }
    }

    // Log detailed findings
    if (extractedData.clubs.length > 0) {
      console.log('🏢 Found Clubs:');
      extractedData.clubs.slice(0, 5).forEach((club: any, index: number) => {
        console.log(`  ${index + 1}. ${club.name || 'Unnamed'} (ID: ${club.id || 'N/A'})`);
      });
    }

    if (extractedData.competitions.length > 0) {
      console.log('🏆 Found Competitions:');
      extractedData.competitions.slice(0, 5).forEach((comp: any, index: number) => {
        console.log(`  ${index + 1}. ${comp.name || 'Unnamed'} (Gender: ${comp.gender || 'N/A'})`);
      });
      if (extractedData.competitions.length > 5) {
        console.log(`  ... and ${extractedData.competitions.length - 5} more`);
      }
    }

    if (extractedData.participants.length > 0) {
      console.log('👥 Found Participants:');
      extractedData.participants.slice(0, 5).forEach((p: any, index: number) => {
        console.log(`  ${index + 1}. ${[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed'}`);
      });
    }

    if (extractedData.devices.length > 0) {
      console.log('🏋️ Found Devices:');
      extractedData.devices.slice(0, 5).forEach((d: any, index: number) => {
        console.log(`  ${index + 1}. ${d.name || 'Unnamed'} (code: ${d.code || 'N/A'})`);
      });
    }

    // --- 5. Create event in database ---
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedEndDate = endDate ? new Date(endDate) : new Date();

    let createdEvent: any = null;
    let eventCreationError: any = null;

    // Resolve venue
    let venueIdToUse = 1;
    let venueNameToUse = '';
    if (locationId) {
      try {
        const venue = await prisma.tfx_wettkampforte.findUnique({
          where: { int_wettkampforteid: parseInt(locationId) }
        });
        if (venue) {
          venueIdToUse = venue.int_wettkampforteid;
          venueNameToUse = venue.var_name || '';
        }
      } catch (error) {
        console.error('❌ Error fetching venue:', error);
      }
    }

    try {
      console.log('🎪 Creating Event in Database...');

      const insertQuery = `
        INSERT INTO tfx_veranstaltungen (
          var_name, dat_von, dat_bis, var_veranstalter, int_wettkampforteid,
          int_meldung_an, int_ansprechpartner, int_kontenid, int_hauptwettkampf,
          int_runde, dat_meldeschluss, bol_rundenwettkampf, int_edv, int_helfer,
          int_kampfrichter, rel_meldegeld, rel_nachmeldung, bol_faellig_nichtantritt,
          bol_ummeldung_moeglich, bol_nachmeldung_moeglich, var_meldung_website,
          var_verwendungszweck, txt_meldung_an, txt_startberechtigung,
          txt_teilnahmebedingungen, txt_siegerauszeichnung, txt_kampfrichter, txt_hinweise
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING int_veranstaltungenid, var_name, dat_von
      `;

      const result = await prisma.$queryRawUnsafe(
        insertQuery,
        eventName.trim(), parsedStartDate, parsedEndDate, venueNameToUse, venueIdToUse,
        1, 1, 1, null, 1, parsedEndDate, false, 0, 0, 0, 0.0, 0.0, false, false, false,
        '', '', '', '', '', '', '', ''
      ) as any[];

      createdEvent = result[0];
      console.log(`✅ Event created: ID=${createdEvent.int_veranstaltungenid}, Name="${createdEvent.var_name}"`);
    } catch (error) {
      console.error('❌ Error creating event:', error);
      eventCreationError = error;
    }

    // --- 6. Import data into database ---
    let importResult = null;
    if (createdEvent) {
      const eventYear = createdEvent.dat_von
        ? new Date(createdEvent.dat_von).getFullYear()
        : new Date().getFullYear();

      importResult = await importGymnetData(extractedData, createdEvent.int_veranstaltungenid, eventYear);
    } else {
      console.log('⚠️ Skipping data import — event creation failed');
    }

    // --- 7. Build response ---
    const insertionResults = importResult?.insertionResults || {
      clubs: { inserted: 0, updated: 0, errors: 0 },
      participants: { inserted: 0, updated: 0, errors: 0 },
      competitions: { inserted: 0, updated: 0, errors: 0 },
      devices: { inserted: 0, updated: 0, errors: 0 },
      teams: { inserted: 0, members: 0, errors: 0 }
    };

    const responseData = {
      success: createdEvent !== null,
      message: createdEvent
        ? `Event "${createdEvent.var_name}" created successfully and data imported to database`
        : eventCreationError
          ? `XML import failed: ${eventCreationError instanceof Error ? eventCreationError.message : String(eventCreationError)}`
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
      warnings: importResult?.warnings || [],
      insertionResults,
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
          'Verify database connection and constraints'
        ]
      }
    };

    res.status(createdEvent ? 200 : 400).json(responseData);

  } catch (error: any) {
    console.error('❌ XML Import Error:', error);

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

export default router;
