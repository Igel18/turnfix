/**
 * Unit tests for the sample data import utility.
 * 
 * Tests the importSampleData function which creates one sample record
 * per category (country, association, region, club, participants, venue, layout).
 */

// Create mock before jest.mock hoisting can be an issue
const mockPrismaClient = {
  tfx_laender: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  tfx_verbaende: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  tfx_gaue: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  tfx_vereine: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  tfx_teilnehmer: {
    count: jest.fn(),
    create: jest.fn(),
  },
  tfx_wettkampforte: {
    count: jest.fn(),
    create: jest.fn(),
  },
  tfx_layouts: {
    count: jest.fn(),
    create: jest.fn(),
  },
  tfx_layout_felder: {
    create: jest.fn(),
  },
};

// Mock the default prisma client module - must come before import
jest.mock('../../src/db/connection', () => ({
  __esModule: true,
  default: mockPrismaClient,
}));

// Mock debug utility
jest.mock('../../src/utils/debug', () => ({
  isDebug: () => false,
}));

// Import AFTER mocks are set up
import { importSampleData, loadSampleData, SampleDataStats } from '../../src/utils/sampleDataImport';

describe('importSampleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when database is empty (fresh setup)', () => {
    beforeEach(() => {
      // All tables are empty
      mockPrismaClient.tfx_laender.count.mockResolvedValue(0);
      mockPrismaClient.tfx_verbaende.count.mockResolvedValue(0);
      mockPrismaClient.tfx_gaue.count.mockResolvedValue(0);
      mockPrismaClient.tfx_vereine.count.mockResolvedValue(0);
      mockPrismaClient.tfx_teilnehmer.count.mockResolvedValue(0);
      mockPrismaClient.tfx_wettkampforte.count.mockResolvedValue(0);
      mockPrismaClient.tfx_layouts.count.mockResolvedValue(0);

      // Create mock return values
      mockPrismaClient.tfx_laender.create.mockResolvedValue({ int_laenderid: 1, var_name: 'Deutschland', var_kuerzel: 'DE' });
      mockPrismaClient.tfx_verbaende.create.mockResolvedValue({ int_verbaendeid: 1, var_name: 'Muster-Turnverband', var_kuerzel: 'MTV' });
      mockPrismaClient.tfx_gaue.create.mockResolvedValue({ int_gaueid: 1, var_name: 'Muster-Turngau', var_kuerzel: 'MTG' });
      mockPrismaClient.tfx_vereine.create.mockResolvedValue({ int_vereineid: 1, var_name: 'TV Musterstadt' });
      mockPrismaClient.tfx_teilnehmer.create
        .mockResolvedValueOnce({ int_teilnehmerid: 1, var_vorname: 'Max', var_nachname: 'Mustermann' })
        .mockResolvedValueOnce({ int_teilnehmerid: 2, var_vorname: 'Erika', var_nachname: 'Musterfrau' });
      mockPrismaClient.tfx_wettkampforte.create.mockResolvedValue({ int_wettkampforteid: 1, var_name: 'Muster-Sporthalle' });
      mockPrismaClient.tfx_layouts.create.mockResolvedValue({ int_layoutid: 1, var_name: 'Standard-Urkunde' });
      mockPrismaClient.tfx_layout_felder.create.mockResolvedValue({ int_layout_felderid: 1 });
    });

    it('should create all sample records successfully', async () => {
      const result = await importSampleData();
      expect(result.success).toBe(true);
    });

    it('should create exactly 1 country', async () => {
      const result = await importSampleData();
      expect(result.stats.createdCountries).toBe(1);
      expect(mockPrismaClient.tfx_laender.create).toHaveBeenCalledWith({
        data: { var_name: 'Deutschland', var_kuerzel: 'DE' },
      });
    });

    it('should create exactly 1 association', async () => {
      const result = await importSampleData();
      expect(result.stats.createdAssociations).toBe(1);
      expect(mockPrismaClient.tfx_verbaende.create).toHaveBeenCalledWith({
        data: { var_name: 'Muster-Turnverband', var_kuerzel: 'MTV', int_laenderid: 1 },
      });
    });

    it('should create exactly 1 region', async () => {
      const result = await importSampleData();
      expect(result.stats.createdRegions).toBe(1);
      expect(mockPrismaClient.tfx_gaue.create).toHaveBeenCalledWith({
        data: { var_name: 'Muster-Turngau', var_kuerzel: 'MTG', int_verbaendeid: 1 },
      });
    });

    it('should create exactly 1 club', async () => {
      const result = await importSampleData();
      expect(result.stats.createdClubs).toBe(1);
      expect(mockPrismaClient.tfx_vereine.create).toHaveBeenCalledWith({
        data: { var_name: 'TV Musterstadt', int_gaueid: 1 },
      });
    });

    it('should create exactly 2 participants (1 male, 1 female)', async () => {
      const result = await importSampleData();
      expect(result.stats.createdParticipants).toBe(2);
      expect(mockPrismaClient.tfx_teilnehmer.create).toHaveBeenCalledTimes(2);
      
      // First call: male participant
      expect(mockPrismaClient.tfx_teilnehmer.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          var_vorname: 'Max',
          var_nachname: 'Mustermann',
          int_geschlecht: 1, // male
          int_vereineid: 1,
        }),
      });
      
      // Second call: female participant
      expect(mockPrismaClient.tfx_teilnehmer.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          var_vorname: 'Erika',
          var_nachname: 'Musterfrau',
          int_geschlecht: 2, // female
          int_vereineid: 1,
        }),
      });
    });

    it('should create exactly 1 venue', async () => {
      const result = await importSampleData();
      expect(result.stats.createdVenues).toBe(1);
      expect(mockPrismaClient.tfx_wettkampforte.create).toHaveBeenCalledWith({
        data: {
          var_name: 'Muster-Sporthalle',
          var_adresse: 'Turnstraße 1',
          var_plz: '12345',
          var_ort: 'Musterstadt',
        },
      });
    });

    it('should create exactly 1 certificate layout with 9 fields', async () => {
      const result = await importSampleData();
      expect(result.stats.createdLayouts).toBe(1);
      expect(mockPrismaClient.tfx_layouts.create).toHaveBeenCalledWith({
        data: {
          var_name: 'Standard-Urkunde',
          txt_comment: expect.stringContaining('Muster-Layout'),
        },
      });
      // Should create 9 layout fields (5 DB fields + 4 static texts)
      expect(mockPrismaClient.tfx_layout_felder.create).toHaveBeenCalledTimes(9);
    });

    it('should create layout fields with correct DB field references', async () => {
      await importSampleData();
      const calls = mockPrismaClient.tfx_layout_felder.create.mock.calls;
      const fieldValues = calls.map((c: any) => c[0].data);
      
      // DB fields (int_typ=0): Name(3), Platz(5), Punkte(6), WK-Nr(15), Verein(4)
      const dbFields = fieldValues.filter((f: any) => f.int_typ === 0);
      const dbFieldValues = dbFields.map((f: any) => f.var_value).sort();
      expect(dbFieldValues).toEqual(['15', '3', '4', '5', '6']);
      
      // Static text fields (int_typ=1): "Platz", "erreichte mit ", "Punkten", "im Wettkampf Nr."
      const textFields = fieldValues.filter((f: any) => f.int_typ === 1);
      expect(textFields.length).toBe(4);
      const textValues = textFields.map((f: any) => f.var_value);
      expect(textValues).toContain('Platz');
      expect(textValues).toContain('Punkten');
      expect(textValues).toContain('im Wettkampf Nr.');
    });

    it('should link all layout fields to the created layout ID', async () => {
      await importSampleData();
      const calls = mockPrismaClient.tfx_layout_felder.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.int_layoutid).toBe(1);
      });
    });

    it('should have no skipped categories', async () => {
      const result = await importSampleData();
      expect(result.stats.skipped).toEqual([]);
    });

    it('should chain foreign keys correctly (country → association → region → club → participant)', async () => {
      await importSampleData();
      
      // Association references the created country
      expect(mockPrismaClient.tfx_verbaende.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ int_laenderid: 1 }),
      });
      
      // Region references the created association
      expect(mockPrismaClient.tfx_gaue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ int_verbaendeid: 1 }),
      });
      
      // Club references the created region
      expect(mockPrismaClient.tfx_vereine.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ int_gaueid: 1 }),
      });
      
      // Participants reference the created club
      expect(mockPrismaClient.tfx_teilnehmer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ int_vereineid: 1 }),
        }),
      );
    });
  });

  describe('when database already has data', () => {
    beforeEach(() => {
      // All tables already have data
      mockPrismaClient.tfx_laender.count.mockResolvedValue(3);
      mockPrismaClient.tfx_verbaende.count.mockResolvedValue(2);
      mockPrismaClient.tfx_gaue.count.mockResolvedValue(5);
      mockPrismaClient.tfx_vereine.count.mockResolvedValue(10);
      mockPrismaClient.tfx_teilnehmer.count.mockResolvedValue(50);
      mockPrismaClient.tfx_wettkampforte.count.mockResolvedValue(2);
      mockPrismaClient.tfx_layouts.count.mockResolvedValue(1);

      // findFirst returns existing records for FK chaining
      mockPrismaClient.tfx_laender.findFirst.mockResolvedValue({ int_laenderid: 5 });
      mockPrismaClient.tfx_verbaende.findFirst.mockResolvedValue({ int_verbaendeid: 3 });
      mockPrismaClient.tfx_gaue.findFirst.mockResolvedValue({ int_gaueid: 7 });
      mockPrismaClient.tfx_vereine.findFirst.mockResolvedValue({ int_vereineid: 12 });
    });

    it('should skip all categories', async () => {
      const result = await importSampleData();
      expect(result.success).toBe(true);
      expect(result.stats.createdCountries).toBe(0);
      expect(result.stats.createdAssociations).toBe(0);
      expect(result.stats.createdRegions).toBe(0);
      expect(result.stats.createdClubs).toBe(0);
      expect(result.stats.createdParticipants).toBe(0);
      expect(result.stats.createdVenues).toBe(0);
      expect(result.stats.createdLayouts).toBe(0);
    });

    it('should list all skipped categories', async () => {
      const result = await importSampleData();
      expect(result.stats.skipped).toContain('countries');
      expect(result.stats.skipped).toContain('associations');
      expect(result.stats.skipped).toContain('regions');
      expect(result.stats.skipped).toContain('clubs');
      expect(result.stats.skipped).toContain('participants');
      expect(result.stats.skipped).toContain('venues');
      expect(result.stats.skipped).toContain('layouts');
      expect(result.stats.skipped.length).toBe(7);
    });

    it('should not call create on any table', async () => {
      await importSampleData();
      expect(mockPrismaClient.tfx_laender.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_verbaende.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_gaue.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_vereine.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_teilnehmer.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_wettkampforte.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_layouts.create).not.toHaveBeenCalled();
      expect(mockPrismaClient.tfx_layout_felder.create).not.toHaveBeenCalled();
    });
  });

  describe('custom Prisma client support', () => {
    it('should use custom client when provided', async () => {
      const customClient = {
        tfx_laender: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ int_laenderid: 99 }) },
        tfx_verbaende: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ int_verbaendeid: 99 }) },
        tfx_gaue: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ int_gaueid: 99 }) },
        tfx_vereine: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ int_vereineid: 99 }) },
        tfx_teilnehmer: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ int_teilnehmerid: 99 }) },
        tfx_wettkampforte: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ int_wettkampforteid: 99 }) },
        tfx_layouts: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ int_layoutid: 99 }) },
        tfx_layout_felder: { create: jest.fn().mockResolvedValue({ int_layout_felderid: 99 }) },
      } as any;

      await importSampleData(customClient);

      // Should use custom client, not mock default
      expect(customClient.tfx_laender.count).toHaveBeenCalled();
      expect(mockPrismaClient.tfx_laender.count).not.toHaveBeenCalled();
    });
  });

  describe('data validation', () => {
    beforeEach(() => {
      mockPrismaClient.tfx_laender.count.mockResolvedValue(0);
      mockPrismaClient.tfx_verbaende.count.mockResolvedValue(0);
      mockPrismaClient.tfx_gaue.count.mockResolvedValue(0);
      mockPrismaClient.tfx_vereine.count.mockResolvedValue(0);
      mockPrismaClient.tfx_teilnehmer.count.mockResolvedValue(0);
      mockPrismaClient.tfx_wettkampforte.count.mockResolvedValue(0);
      mockPrismaClient.tfx_layouts.count.mockResolvedValue(0);

      mockPrismaClient.tfx_laender.create.mockResolvedValue({ int_laenderid: 1 });
      mockPrismaClient.tfx_verbaende.create.mockResolvedValue({ int_verbaendeid: 1 });
      mockPrismaClient.tfx_gaue.create.mockResolvedValue({ int_gaueid: 1 });
      mockPrismaClient.tfx_vereine.create.mockResolvedValue({ int_vereineid: 1 });
      mockPrismaClient.tfx_teilnehmer.create.mockResolvedValue({ int_teilnehmerid: 1 });
      mockPrismaClient.tfx_wettkampforte.create.mockResolvedValue({ int_wettkampforteid: 1 });
      mockPrismaClient.tfx_layouts.create.mockResolvedValue({ int_layoutid: 1 });
      mockPrismaClient.tfx_layout_felder.create.mockResolvedValue({ int_layout_felderid: 1 });
    });

    it('country name should fit in VarChar(150)', async () => {
      await importSampleData();
      const call = mockPrismaClient.tfx_laender.create.mock.calls[0][0];
      expect(call.data.var_name.length).toBeLessThanOrEqual(150);
    });

    it('country kuerzel should fit in VarChar(4)', async () => {
      await importSampleData();
      const call = mockPrismaClient.tfx_laender.create.mock.calls[0][0];
      expect(call.data.var_kuerzel.length).toBeLessThanOrEqual(4);
    });

    it('association kuerzel should fit in VarChar(8)', async () => {
      await importSampleData();
      const call = mockPrismaClient.tfx_verbaende.create.mock.calls[0][0];
      expect(call.data.var_kuerzel.length).toBeLessThanOrEqual(8);
    });

    it('region kuerzel should fit in VarChar(15)', async () => {
      await importSampleData();
      const call = mockPrismaClient.tfx_gaue.create.mock.calls[0][0];
      expect(call.data.var_kuerzel.length).toBeLessThanOrEqual(15);
    });

    it('venue PLZ should fit in VarChar(5)', async () => {
      await importSampleData();
      const call = mockPrismaClient.tfx_wettkampforte.create.mock.calls[0][0];
      expect(call.data.var_plz.length).toBeLessThanOrEqual(5);
    });

    it('participant gender values should be 1 (male) or 2 (female)', async () => {
      await importSampleData();
      const calls = mockPrismaClient.tfx_teilnehmer.create.mock.calls;
      const genders = calls.map((c: any) => c[0].data.int_geschlecht);
      expect(genders).toContain(1);
      expect(genders).toContain(2);
    });

    it('participant dates should be valid Date objects', async () => {
      await importSampleData();
      const calls = mockPrismaClient.tfx_teilnehmer.create.mock.calls;
      calls.forEach((call: any) => {
        const date = call[0].data.dat_geburtstag;
        expect(date).toBeInstanceOf(Date);
        expect(date.getTime()).not.toBeNaN();
      });
    });

    it('layout name should fit in VarChar(100)', async () => {
      await importSampleData();
      const call = mockPrismaClient.tfx_layouts.create.mock.calls[0][0];
      expect(call.data.var_name.length).toBeLessThanOrEqual(100);
    });

    it('layout field values should fit in VarChar(200)', async () => {
      await importSampleData();
      const calls = mockPrismaClient.tfx_layout_felder.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.var_value.length).toBeLessThanOrEqual(200);
      });
    });

    it('layout field fonts should fit in VarChar(150)', async () => {
      await importSampleData();
      const calls = mockPrismaClient.tfx_layout_felder.create.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].data.var_font.length).toBeLessThanOrEqual(150);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('loadSampleData()', () => {
  it('returns an object without errors', () => {
    const data = loadSampleData();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  it('has a country with var_name and var_kuerzel', () => {
    const { country } = loadSampleData();
    expect(typeof country.var_name).toBe('string');
    expect(country.var_name.length).toBeGreaterThan(0);
    expect(typeof country.var_kuerzel).toBe('string');
    expect(country.var_kuerzel.length).toBeGreaterThan(0);
  });

  it('has an association with var_name and var_kuerzel', () => {
    const { association } = loadSampleData();
    expect(typeof association.var_name).toBe('string');
    expect(typeof association.var_kuerzel).toBe('string');
  });

  it('has a region with var_name and var_kuerzel', () => {
    const { region } = loadSampleData();
    expect(typeof region.var_name).toBe('string');
    expect(typeof region.var_kuerzel).toBe('string');
  });

  it('has a club with var_name', () => {
    const { club } = loadSampleData();
    expect(typeof club.var_name).toBe('string');
    expect(club.var_name.length).toBeGreaterThan(0);
  });

  it('has at least one participant', () => {
    const { participants } = loadSampleData();
    expect(Array.isArray(participants)).toBe(true);
    expect(participants.length).toBeGreaterThan(0);
  });

  it('every participant has required fields with valid types', () => {
    const { participants } = loadSampleData();
    for (const p of participants) {
      expect(typeof p.var_vorname).toBe('string');
      expect(typeof p.var_nachname).toBe('string');
      expect(typeof p.int_geschlecht).toBe('number');
      expect(typeof p.dat_geburtstag).toBe('string');
      expect(isNaN(new Date(p.dat_geburtstag).getTime())).toBe(false);
      expect(typeof p.bool_nur_jahr).toBe('boolean');
    }
  });

  it('has both a male (1) and a female (2) participant', () => {
    const { participants } = loadSampleData();
    const genders = participants.map((p) => p.int_geschlecht);
    expect(genders).toContain(1);
    expect(genders).toContain(2);
  });

  it('has a venue with all address fields', () => {
    const { venue } = loadSampleData();
    expect(typeof venue.var_name).toBe('string');
    expect(typeof venue.var_adresse).toBe('string');
    expect(typeof venue.var_plz).toBe('string');
    expect(typeof venue.var_ort).toBe('string');
  });

  it('has a layout with var_name, txt_comment and a non-empty fields array', () => {
    const { layout } = loadSampleData();
    expect(typeof layout.var_name).toBe('string');
    expect(typeof layout.txt_comment).toBe('string');
    expect(Array.isArray(layout.fields)).toBe(true);
    expect(layout.fields.length).toBeGreaterThan(0);
  });

  it('every layout field has all required numeric and string properties', () => {
    const { layout } = loadSampleData();
    for (const f of layout.fields) {
      expect(typeof f.int_typ).toBe('number');
      expect(typeof f.var_font).toBe('string');
      expect(typeof f.rel_x).toBe('number');
      expect(typeof f.rel_y).toBe('number');
      expect(typeof f.rel_w).toBe('number');
      expect(typeof f.rel_h).toBe('number');
      expect(typeof f.var_value).toBe('string');
      expect(typeof f.int_align).toBe('number');
      expect(typeof f.int_layer).toBe('number');
    }
  });
});
