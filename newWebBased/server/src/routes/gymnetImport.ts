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
  searchForDevicesAggressively,
  type ExtractedData as ExtractedDataType
} from '../utils/gymnetXmlParser';
import { importGymnetData } from '../utils/gymnetDbImport';
import { normalizeImportScoringMode, withEventScoringMode } from '../utils/eventScoringMode';

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
// Main Import Route — accepts 1–10 XML files, all imported into one event
// ============================================================================

router.post('/import-gymnet', authenticateToken, upload.array('files', 10), async (req: AuthRequest, res) => {
  const uploadedFilePaths: string[] = [];

  try {
    // --- 1. File upload validation ---
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'Keine XML-Datei hochgeladen' });
    }

    uploadedFilePaths.push(...uploadedFiles.map(f => f.path));

    console.log(`🔍 XML Import Started: ${uploadedFiles.length} file(s)`);
    uploadedFiles.forEach(f => console.log(`  - File: ${f.originalname} (${f.size} bytes)`));

    // --- 2. Extract event metadata from form data ---
    const eventName = req.body.eventName;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const locationId = req.body.locationId;
    const description = req.body.description;
    const scoringMode = normalizeImportScoringMode(req.body.scoringMode);

    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    // --- 3. Parse and extract data from each XML file, then merge ---
    const perFileSummaries: { filename: string; clubs: number; competitions: number; participants: number; devices: number; teams: number }[] = [];

    const allClusters = await Promise.all(uploadedFiles.map(async (file) => {
      const xmlContent = fs.readFileSync(file.path, 'utf-8');
      const parsedXml: any = await parseXmlAsync(xmlContent, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      });
      const data = extractAllData(parsedXml);
      console.log(`  📄 ${file.originalname}: ${data.clubs.length} clubs, ${data.competitions.length} competitions, ${data.participants.length} participants, ${data.devices.length} devices, ${data.teams.length} teams`);
      perFileSummaries.push({
        filename: file.originalname,
        clubs: data.clubs.length,
        competitions: data.competitions.length,
        participants: data.participants.length,
        devices: data.devices.length,
        teams: data.teams.length,
      });
      return data;
    }));

    // Merge extracted data from all files
    const extractedData: ExtractedDataType = {
      clubs:        allClusters.flatMap(d => d.clubs),
      competitions: allClusters.flatMap(d => d.competitions),
      participants: allClusters.flatMap(d => d.participants),
      devices:      allClusters.flatMap(d => d.devices),
      teams:        allClusters.flatMap(d => d.teams),
    };

    console.log('📋 Merged Data Summary:');
    console.log(`  🏢 Clubs: ${extractedData.clubs.length}`);
    console.log(`  🏆 Competitions: ${extractedData.competitions.length}`);
    console.log(`  👥 Participants: ${extractedData.participants.length}`);
    console.log(`  🏋️ Devices: ${extractedData.devices.length}`);
    console.log(`  🏅 Teams: ${extractedData.teams.length}`);

    const debugData: any = {
      fileCount: uploadedFiles.length,
      perFileSummaries,
      parseTimestamp: new Date().toISOString()
    };

    // Search for typical elements in first file (for debug)
    const firstXmlContent = fs.readFileSync(uploadedFiles[0].path, 'utf-8');
    const firstParsed: any = await parseXmlAsync(firstXmlContent, { explicitArray: false, ignoreAttrs: false, mergeAttrs: true });
    const searchTerms = [
      'competition', 'wettkampf', 'event', 'veranstaltung',
      'participant', 'teilnehmer', 'athlete', 'turner',
      'name', 'vorname', 'nachname', 'firstname', 'lastname',
    ];
    const foundElements = findInObject(firstParsed, searchTerms);
    debugData.potentialDataElements = foundElements;

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
        '', withEventScoringMode('', scoringMode), '', '', '', '', '', ''
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

    // --- Deduplicate counts for accurate summary ---
    // Clubs: deduplicate by name (case-insensitive)
    const uniqueClubNames = new Set(
      extractedData.clubs
        .map((c: any) => (c.name || '').trim().toLowerCase())
        .filter((n: string) => n.length > 0)
    );
    // Participants: deduplicate by perID, or fallback to name+birthdate
    const uniqueParticipantKeys = new Set<string>();
    for (const p of extractedData.participants) {
      if (p.id) {
        uniqueParticipantKeys.add(`id:${p.id}`);
      } else {
        const key = `${(p.firstName || '').trim().toLowerCase()}|${(p.lastName || '').trim().toLowerCase()}|${p.birthDate || ''}`;
        uniqueParticipantKeys.add(key);
      }
    }
    // Devices: deduplicate by code+competitionWaNr (unique discipline per competition)
    const uniqueDeviceKeys = new Set<string>();
    for (const d of extractedData.devices) {
      const key = `${d.code || d.name || ''}|${d.competitionWaNr || ''}`;
      uniqueDeviceKeys.add(key);
    }

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
        description: description?.trim() || null,
        scoringMode
      } : null,
      eventCreationError: eventCreationError ? {
        message: eventCreationError instanceof Error ? eventCreationError.message : String(eventCreationError),
        details: 'Check server logs for detailed error information'
      } : null,
      warnings: importResult?.warnings || [],
      hints: importResult?.hints || [],
      insertionResults,
      extractedData: {
        clubs: extractedData.clubs,
        competitions: extractedData.competitions,
        participants: extractedData.participants,
        devices: extractedData.devices,
        teams: extractedData.teams,
        summary: {
          clubsCount: uniqueClubNames.size,
          competitionsCount: extractedData.competitions.length,
          participantsCount: uniqueParticipantKeys.size,
          devicesCount: uniqueDeviceKeys.size,
          teamsCount: extractedData.teams.length
        }
      },
      debug: debugData,
      summary: {
        filesProcessed: uploadedFiles.length,
        fileNames: uploadedFiles.map(f => f.originalname),
        potentialDataFound: Object.keys(foundElements).length,
        importLog: [
          `📄 ${uploadedFiles.length} Datei(en): ${uploadedFiles.map(f => f.originalname).join(', ')}`,
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
      },
      perFileSummaries,
    };

    res.status(createdEvent ? 200 : 400).json(responseData);

    // Cleanup uploaded files after response is sent
    for (const p of uploadedFilePaths) {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    }

  } catch (error: any) {
    console.error('❌ XML Import Error:', error);

    for (const p of uploadedFilePaths) {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
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

// ============================================================================
// Accept Discipline Suggestions — Link disciplines to a competition
// ============================================================================

router.post('/accept-discipline-suggestions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { competitionId, disciplines } = req.body;

    if (!competitionId || !Array.isArray(disciplines) || disciplines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'competitionId and disciplines[] are required'
      });
    }

    // Verify competition exists
    const competition = await prisma.$queryRawUnsafe(`
      SELECT int_wettkaempfeid, var_name FROM tfx_wettkaempfe WHERE int_wettkaempfeid = $1 LIMIT 1
    `, competitionId) as any[];

    if (competition.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Wettkampf mit ID ${competitionId} nicht gefunden`
      });
    }

    let linkedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Get current max sort order for this competition
    const maxSortResult = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(MAX(int_sortierung), 0) as max_sort 
      FROM tfx_wettkaempfe_x_disziplinen 
      WHERE int_wettkaempfeid = $1
    `, competitionId) as any[];
    let sortOrder = maxSortResult[0]?.max_sort || 0;

    for (const discipline of disciplines) {
      try {
        const disciplineId = discipline.id;
        if (!disciplineId) {
          errorCount++;
          continue;
        }

        // Verify discipline exists
        const discCheck = await prisma.$queryRawUnsafe(`
          SELECT int_disziplinenid FROM tfx_disziplinen WHERE int_disziplinenid = $1 LIMIT 1
        `, disciplineId) as any[];

        if (discCheck.length === 0) {
          console.log(`  ⚠️ Discipline ID ${disciplineId} not found in database`);
          errorCount++;
          continue;
        }

        // Check if already linked
        const existingLink = await prisma.$queryRawUnsafe(`
          SELECT int_wettkaempfe_x_disziplinenid FROM tfx_wettkaempfe_x_disziplinen 
          WHERE int_wettkaempfeid = $1 AND int_disziplinenid = $2 LIMIT 1
        `, competitionId, disciplineId) as any[];

        if (existingLink.length > 0) {
          console.log(`  ✅ Discipline ${disciplineId} already linked to competition ${competitionId}`);
          skippedCount++;
          continue;
        }

        sortOrder++;
        await prisma.$queryRawUnsafe(`
          INSERT INTO tfx_wettkaempfe_x_disziplinen (int_wettkaempfeid, int_disziplinenid, int_sortierung)
          VALUES ($1, $2, $3)
        `, competitionId, disciplineId, sortOrder);

        linkedCount++;
        console.log(`  🔗 Linked discipline ${disciplineId} to competition ${competitionId} (sort: ${sortOrder})`);
      } catch (error) {
        console.error(`  ❌ Error linking discipline:`, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `${linkedCount} Disziplinen zugewiesen`,
      linked: linkedCount,
      skipped: skippedCount,
      errors: errorCount,
      competitionId,
      competitionName: competition[0].var_name
    });
  } catch (error: any) {
    console.error('❌ Accept discipline suggestions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
