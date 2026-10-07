import type { ExtractedData } from './gymnetXmlParser';
import type { ImportResult, InsertionResults } from './gymnetDbImport';
import { summarizeExtractedData } from './gymnetImportData';

interface ImportedEvent {
  int_veranstaltungenid: number;
  var_name: string;
  dat_von: Date | string | null;
}

interface PerFileSummary {
  filename: string;
  clubs: number;
  competitions: number;
  participants: number;
  devices: number;
  teams: number;
}

export interface GymnetImportResponseInput {
  uploadedFiles: { originalname: string }[];
  extractedData: ExtractedData;
  perFileSummaries: PerFileSummary[];
  debug: Record<string, unknown>;
  foundElements: Record<string, unknown>;
  createdEvent: ImportedEvent | null;
  eventCreationError: unknown | null;
  parsedStartDate: Date;
  parsedEndDate: Date;
  venueIdToUse: number;
  venueNameToUse: string;
  description?: string;
  scoringMode: string;
  importResult: ImportResult | null;
}

const emptyInsertionResults: InsertionResults = {
  clubs: { inserted: 0, updated: 0, errors: 0 },
  participants: { inserted: 0, updated: 0, errors: 0 },
  competitions: { inserted: 0, updated: 0, errors: 0 },
  devices: { inserted: 0, updated: 0, errors: 0 },
  teams: { inserted: 0, members: 0, errors: 0 },
};

export function buildGymnetImportResponse(input: GymnetImportResponseInput) {
  const {
    uploadedFiles,
    extractedData,
    perFileSummaries,
    debug,
    foundElements,
    createdEvent,
    eventCreationError,
    parsedStartDate,
    parsedEndDate,
    venueIdToUse,
    venueNameToUse,
    description,
    scoringMode,
    importResult,
  } = input;
  const insertionResults = importResult?.insertionResults || emptyInsertionResults;
  const extractedSummary = summarizeExtractedData(extractedData);
  const fileNames = uploadedFiles.map(file => file.originalname);

  const body = {
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
      scoringMode,
    } : null,
    eventCreationError: eventCreationError ? {
      message: eventCreationError instanceof Error ? eventCreationError.message : String(eventCreationError),
      details: 'Check server logs for detailed error information',
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
      summary: extractedSummary,
    },
    debug,
    summary: {
      filesProcessed: uploadedFiles.length,
      fileNames,
      potentialDataFound: Object.keys(foundElements).length,
      importLog: [
        `📄 ${uploadedFiles.length} Datei(en): ${fileNames.join(', ')}`,
        '📊 Extrahierte Daten:',
        `   - ${extractedData.clubs.length} Vereine`,
        `   - ${extractedData.competitions.length} Wettkämpfe`,
        `   - ${extractedData.participants.length} Teilnehmer`,
        `   - ${extractedData.devices.length} Disziplinen`,
        `   - ${extractedData.teams.length} Mannschaften`,
        '💾 Datenbank-Import:',
        `   - Vereine: ${insertionResults.clubs.inserted} neu, ${insertionResults.clubs.updated} aktualisiert`,
        `   - Teilnehmer: ${insertionResults.participants.inserted} neu, ${insertionResults.participants.updated} aktualisiert`,
        `   - Wettkämpfe: ${insertionResults.competitions.inserted} neu`,
        `   - Disziplinen: ${insertionResults.devices.inserted} neu, ${insertionResults.devices.updated} verknüpft`,
        `   - Mannschaften: ${insertionResults.teams.inserted} erstellt, ${insertionResults.teams.members} Mitglieder zugewiesen`,
        createdEvent ? `✅ Event "${createdEvent.var_name}" (ID: ${createdEvent.int_veranstaltungenid}) erfolgreich erstellt` : '❌ Event-Erstellung fehlgeschlagen',
      ],
      nextSteps: createdEvent ? [
        'Event created successfully',
        'Review the extracted and imported data',
        'Verify the data accuracy and completeness in the database',
      ] : [
        'Event creation failed - check server logs for details',
        'Review the extracted data below for debugging',
        'Verify database connection and constraints',
      ],
    },
    perFileSummaries,
  };

  return {
    statusCode: createdEvent ? 200 : 400,
    body,
  };
}