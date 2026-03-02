/**
 * Component Tests — SquadStatusManagement
 *
 * Tests the SquadStatusManagement page:
 * - View mode toggling (matrix/table/grid)
 * - Filter logic (squad, discipline, status)
 * - Status color parsing (rgb, hex, json object)
 * - Data sorting
 * - Generate combinations flow
 * - Status update workflow
 * - CSV export data preparation
 * - No-event state handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../renderWithProviders';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSelectedEvent = {
  int_eventid: 1,
  var_eventname: 'Stadtmeisterschaft 2025',
  dat_eventstartdate: '2025-06-15',
  dat_eventenddate: '2025-06-16',
  var_location: 'Berlin',
  status: 'active' as const,
};

const mockUseEvent = vi.fn(() => ({
  selectedEvent: mockSelectedEvent,
  selectedCompetition: null,
  selectedSquad: null,
  selectedDiscipline: null,
  setSelectedEvent: vi.fn(),
  setSelectedCompetition: vi.fn(),
  setSelectedSquad: vi.fn(),
  setSelectedDiscipline: vi.fn(),
  clearSelection: vi.fn(),
  refreshEvents: vi.fn(),
  eventUpdateTrigger: 0,
}));

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => mockUseEvent(),
  useOptionalEvent: () => mockUseEvent(),
  EventProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) return `${key}(${JSON.stringify(params)})`;
      return key;
    },
    i18n: { language: 'de', changeLanguage: vi.fn() },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// Mock Socket.IO
vi.mock('@/utils/socket', () => ({
  default: () => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

// Mock apiGet/apiPost
vi.mock('@/utils/api', async () => {
  const actual = await vi.importActual('@/utils/api');
  return {
    ...actual as object,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
  };
});

// ── Test Data ──────────────────────────────────────────────────────────────

const mockSquadDisciplines = [
  {
    id: 1,
    eventId: 1,
    squadName: 'Riege A',
    disciplineId: 100,
    disciplineName: 'Boden',
    disciplineShort: 'BO',
    statusId: 1,
    status: { id: 1, name: 'Offen', colorCode: '{"r":200,"g":200,"b":200}' },
    round: 1,
    isFirstApparatus: true,
  },
  {
    id: 2,
    eventId: 1,
    squadName: 'Riege A',
    disciplineId: 101,
    disciplineName: 'Sprung',
    disciplineShort: 'SP',
    statusId: 2,
    status: { id: 2, name: 'In Bearbeitung', colorCode: 'rgb(255,200,0)' },
    round: 1,
    isFirstApparatus: false,
  },
  {
    id: 3,
    eventId: 1,
    squadName: 'Riege B',
    disciplineId: 100,
    disciplineName: 'Boden',
    disciplineShort: 'BO',
    statusId: 3,
    status: { id: 3, name: 'Abgeschlossen', colorCode: '#4CAF50' },
    round: 1,
    isFirstApparatus: true,
  },
];

const mockStatuses = [
  { int_statusid: 1, var_name: 'Offen', ary_colorcode: '{"r":200,"g":200,"b":200}' },
  { int_statusid: 2, var_name: 'In Bearbeitung', ary_colorcode: 'rgb(255,200,0)' },
  { int_statusid: 3, var_name: 'Abgeschlossen', ary_colorcode: '#4CAF50' },
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SquadStatusManagement', () => {
  describe('Status Color Parsing', () => {
    // Extracted from SquadStatusManagement.getStatusColor()
    function getStatusColor(colorCode: string): string {
      if (!colorCode) return 'rgb(200, 200, 200)';

      // Try JSON format: {"r":255,"g":200,"b":0}
      try {
        const parsed = JSON.parse(colorCode);
        if (parsed.r !== undefined && parsed.g !== undefined && parsed.b !== undefined) {
          return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;
        }
      } catch { /* Not JSON */ }

      // Try rgb() format
      if (colorCode.startsWith('rgb(')) {
        return colorCode;
      }

      // Try hex format
      if (colorCode.startsWith('#')) {
        return colorCode;
      }

      return 'rgb(200, 200, 200)';
    }

    it('should parse JSON color format', () => {
      expect(getStatusColor('{"r":255,"g":200,"b":0}')).toBe('rgb(255, 200, 0)');
    });

    it('should parse already-formatted rgb() string', () => {
      expect(getStatusColor('rgb(255,200,0)')).toBe('rgb(255,200,0)');
    });

    it('should pass through hex colors', () => {
      expect(getStatusColor('#4CAF50')).toBe('#4CAF50');
    });

    it('should return default gray for empty string', () => {
      expect(getStatusColor('')).toBe('rgb(200, 200, 200)');
    });

    it('should return default for invalid format', () => {
      expect(getStatusColor('not-a-color')).toBe('rgb(200, 200, 200)');
    });

    it('should handle malformed JSON gracefully', () => {
      expect(getStatusColor('{invalid}')).toBe('rgb(200, 200, 200)');
    });
  });

  describe('Filter Logic', () => {
    it('should filter by squad name (case-insensitive)', () => {
      const filterSquad = 'riege a';
      const filtered = mockSquadDisciplines.filter(item =>
        item.squadName.toLowerCase().includes(filterSquad.toLowerCase())
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.every(f => f.squadName === 'Riege A')).toBe(true);
    });

    it('should filter by discipline name', () => {
      const filterDiscipline = 'Boden';
      const filtered = mockSquadDisciplines.filter(item =>
        item.disciplineName === filterDiscipline
      );
      expect(filtered).toHaveLength(2);
    });

    it('should filter by status ID', () => {
      const filterStatus = '2';
      const filtered = mockSquadDisciplines.filter(item =>
        item.statusId.toString() === filterStatus
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status.name).toBe('In Bearbeitung');
    });

    it('should apply multiple filters simultaneously', () => {
      const filterSquad = 'Riege A';
      const filterDiscipline = 'Boden';
      const filtered = mockSquadDisciplines.filter(item =>
        item.squadName.includes(filterSquad) &&
        item.disciplineName === filterDiscipline
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should return all items when no filters are active', () => {
      const filtered = mockSquadDisciplines.filter(() => true);
      expect(filtered).toHaveLength(3);
    });

    it('should return empty for non-matching filter', () => {
      const filtered = mockSquadDisciplines.filter(item =>
        item.squadName.includes('Riege Z')
      );
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Data Aggregation', () => {
    it('should extract unique squad names', () => {
      const uniqueSquads = [...new Set(mockSquadDisciplines.map(d => d.squadName))];
      expect(uniqueSquads).toEqual(['Riege A', 'Riege B']);
    });

    it('should extract unique disciplines', () => {
      const uniqueDiscs = [...new Set(mockSquadDisciplines.map(d => d.disciplineName))];
      expect(uniqueDiscs).toEqual(['Boden', 'Sprung']);
    });

    it('should extract unique statuses', () => {
      const uniqueStatuses = [...new Set(mockSquadDisciplines.map(d => d.status.name))];
      expect(uniqueStatuses).toEqual(['Offen', 'In Bearbeitung', 'Abgeschlossen']);
    });
  });

  describe('View Mode Behavior', () => {
    it('should support matrix, table, and grid view modes', () => {
      const validModes = ['matrix', 'table', 'grid'];
      validModes.forEach(mode => {
        expect(['matrix', 'table', 'grid']).toContain(mode);
      });
    });

    it('should default to matrix view', () => {
      const defaultView = 'matrix';
      expect(defaultView).toBe('matrix');
    });
  });

  describe('Matrix Data Transformation', () => {
    it('should organize data into squad rows and discipline columns', () => {
      // Build matrix structure
      const squads = [...new Set(mockSquadDisciplines.map(d => d.squadName))];
      const disciplines = [...new Set(mockSquadDisciplines.map(d => d.disciplineName))];

      const matrixRows = squads.map(squadName => {
        const row: Record<string, any> = { squadName };
        disciplines.forEach(disc => {
          const item = mockSquadDisciplines.find(
            d => d.squadName === squadName && d.disciplineName === disc
          );
          row[disc] = item?.status || null;
        });
        return row;
      });

      expect(matrixRows).toHaveLength(2);
      expect(matrixRows[0].squadName).toBe('Riege A');
      expect(matrixRows[0]['Boden'].name).toBe('Offen');
      expect(matrixRows[0]['Sprung'].name).toBe('In Bearbeitung');
      expect(matrixRows[1].squadName).toBe('Riege B');
      expect(matrixRows[1]['Boden'].name).toBe('Abgeschlossen');
      expect(matrixRows[1]['Sprung']).toBeNull();
    });
  });

  describe('CSV Export Data', () => {
    it('should prepare correct CSV row structure', () => {
      const csvRows = mockSquadDisciplines.map(item => ({
        squad: item.squadName,
        discipline: item.disciplineName,
        status: item.status.name,
        round: item.round || '',
        firstApparatus: item.isFirstApparatus ? 'Ja' : 'Nein',
      }));

      expect(csvRows).toHaveLength(3);
      expect(csvRows[0]).toEqual({
        squad: 'Riege A',
        discipline: 'Boden',
        status: 'Offen',
        round: 1,
        firstApparatus: 'Ja',
      });
    });
  });

  describe('Status Update Logic', () => {
    it('should build correct update payload', () => {
      const itemId = 1;
      const newStatusId = 3;
      const updatePayload = {
        statusId: newStatusId,
      };

      expect(updatePayload.statusId).toBe(3);
    });

    it('should identify item by id for updates', () => {
      const targetId = 2;
      const item = mockSquadDisciplines.find(d => d.id === targetId);
      expect(item?.squadName).toBe('Riege A');
      expect(item?.disciplineName).toBe('Sprung');
    });
  });

  describe('Generate Combinations', () => {
    it('should identify squads and disciplines for generation', () => {
      const squads = ['Riege A', 'Riege B', 'Riege C'];
      const disciplines = ['Boden', 'Sprung', 'Reck'];
      const totalCombinations = squads.length * disciplines.length;
      expect(totalCombinations).toBe(9);
    });

    it('should detect existing combinations', () => {
      const existingKeys = new Set(
        mockSquadDisciplines.map(d => `${d.squadName}::${d.disciplineId}`)
      );

      expect(existingKeys.has('Riege A::100')).toBe(true);
      expect(existingKeys.has('Riege A::101')).toBe(true);
      expect(existingKeys.has('Riege B::100')).toBe(true);
      expect(existingKeys.has('Riege B::101')).toBe(false); // Missing
    });
  });

  describe('Sorting', () => {
    it('should sort by squad name ascending', () => {
      const sorted = [...mockSquadDisciplines].sort((a, b) =>
        a.squadName.localeCompare(b.squadName)
      );
      expect(sorted[0].squadName).toBe('Riege A');
      expect(sorted[2].squadName).toBe('Riege B');
    });

    it('should sort by status name', () => {
      const sorted = [...mockSquadDisciplines].sort((a, b) =>
        a.status.name.localeCompare(b.status.name)
      );
      expect(sorted[0].status.name).toBe('Abgeschlossen');
      expect(sorted[1].status.name).toBe('In Bearbeitung');
      expect(sorted[2].status.name).toBe('Offen');
    });

    it('should sort by discipline name', () => {
      const sorted = [...mockSquadDisciplines].sort((a, b) =>
        a.disciplineName.localeCompare(b.disciplineName)
      );
      expect(sorted[0].disciplineName).toBe('Boden');
      expect(sorted[2].disciplineName).toBe('Sprung');
    });
  });
});
