import { buildGymnetImportResponse } from '../../src/utils/gymnetImportResponse';
import type { ExtractedData } from '../../src/utils/gymnetXmlParser';

const emptyExtractedData: ExtractedData = {
  clubs: [],
  competitions: [],
  participants: [],
  devices: [],
  teams: [],
};

describe('buildGymnetImportResponse', () => {
  it('returns event details and import counts after a successful import', () => {
    const startDate = new Date('2026-10-07T00:00:00.000Z');
    const endDate = new Date('2026-10-08T00:00:00.000Z');
    const response = buildGymnetImportResponse({
      uploadedFiles: [{ originalname: 'meldungen.xml' }],
      extractedData: { ...emptyExtractedData, clubs: [{ name: 'TSV Beispiel' }] },
      perFileSummaries: [],
      debug: {},
      foundElements: { participant: [] },
      createdEvent: { int_veranstaltungenid: 42, var_name: 'Herbstturnen', dat_von: startDate },
      eventCreationError: null,
      parsedStartDate: startDate,
      parsedEndDate: endDate,
      venueIdToUse: 3,
      venueNameToUse: 'Sporthalle',
      description: '  Einladung  ',
      scoringMode: 'standard',
      importResult: null,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.createdEvent).toMatchObject({
      id: 42,
      name: 'Herbstturnen',
      description: 'Einladung',
    });
    expect(response.body.extractedData.summary.clubsCount).toBe(1);
    expect(response.body.summary.filesProcessed).toBe(1);
  });

  it('returns a client error and a useful message when event creation fails', () => {
    const response = buildGymnetImportResponse({
      uploadedFiles: [],
      extractedData: emptyExtractedData,
      perFileSummaries: [],
      debug: {},
      foundElements: {},
      createdEvent: null,
      eventCreationError: new Error('database unavailable'),
      parsedStartDate: new Date(),
      parsedEndDate: new Date(),
      venueIdToUse: 1,
      venueNameToUse: '',
      scoringMode: 'standard',
      importResult: null,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('database unavailable');
  });
});