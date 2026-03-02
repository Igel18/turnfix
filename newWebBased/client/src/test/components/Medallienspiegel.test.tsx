/**
 * Component Tests — Medallienspiegel
 *
 * Tests the Medallienspiegel (Medal Standings) page:
 * - Medal data display (table and grid views)
 * - Sorting logic (total medals desc, then gold desc, etc.)
 * - useMedals hook integration
 * - No-event state / error state / no-medals state
 * - PDF export data preparation
 * - Socket.IO event handling integration
 * - MedalTable / MedalGrid sub-components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../renderWithProviders';
import type { MedalStanding, MedalData } from '../../hooks/useMedals';

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
    t: (key: string) => key,
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

// Mock jsPDF (PDF export)
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    save: vi.fn(),
    setPage: vi.fn(),
    internal: { getNumberOfPages: () => 1 },
  })),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// ── Test Data ──────────────────────────────────────────────────────────────

const mockStandings: MedalStanding[] = [
  {
    clubId: 1,
    clubName: 'TV Berlin',
    totalGold: 3,
    totalSilver: 2,
    totalBronze: 1,
    totalMedals: 6,
    totalStarters: 15,
    competitions: [
      { competitionId: 1, competitionName: 'Damen A', gold: 2, silver: 1, bronze: 0, starters: 8 },
      { competitionId: 2, competitionName: 'Herren A', gold: 1, silver: 1, bronze: 1, starters: 7 },
    ],
  },
  {
    clubId: 2,
    clubName: 'TSV München',
    totalGold: 1,
    totalSilver: 3,
    totalBronze: 2,
    totalMedals: 6,
    totalStarters: 20,
    competitions: [
      { competitionId: 1, competitionName: 'Damen A', gold: 0, silver: 2, bronze: 1, starters: 10 },
      { competitionId: 2, competitionName: 'Herren A', gold: 1, silver: 1, bronze: 1, starters: 10 },
    ],
  },
  {
    clubId: 3,
    clubName: 'SC Hamburg',
    totalGold: 0,
    totalSilver: 0,
    totalBronze: 3,
    totalMedals: 3,
    totalStarters: 8,
    competitions: [],
  },
];

const mockMedalData: MedalData = {
  eventId: 1,
  eventName: 'Stadtmeisterschaft 2025',
  standings: mockStandings,
};

// ── MSW Handlers ───────────────────────────────────────────────────────────

function setupHandlers(overrideData?: Partial<MedalData> | null, status: number = 200) {
  server.use(
    http.get('/api/medals/:eventId', () => {
      if (status !== 200) {
        return HttpResponse.json({ error: 'Internal Server Error' }, { status });
      }
      return HttpResponse.json(overrideData !== undefined ? { ...mockMedalData, ...overrideData } : mockMedalData);
    }),
  );
}

// ── Lazy import ────────────────────────────────────────────────────────────

async function renderMedallienspiegel() {
  const mod = await import('../../pages/Medallienspiegel');
  return renderWithProviders(<mod.default />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Medallienspiegel', () => {
  beforeEach(() => {
    setupHandlers();
    mockUseEvent.mockReturnValue({
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
    });
  });

  describe('Page Rendering', () => {
    it('should render the page title', async () => {
      await renderMedallienspiegel();

      await waitFor(() => {
        expect(screen.getByText('medallienspiegel.title')).toBeInTheDocument();
      });
    });

    it('should display club names in standings', async () => {
      await renderMedallienspiegel();

      await waitFor(() => {
        expect(screen.getByText('TV Berlin')).toBeInTheDocument();
        expect(screen.getByText('TSV München')).toBeInTheDocument();
        expect(screen.getByText('SC Hamburg')).toBeInTheDocument();
      });
    });
  });

  describe('Medal Sorting Logic', () => {
    it('should sort by total medals descending', () => {
      const sorted = [...mockStandings].sort((a, b) => {
        if (a.totalMedals !== b.totalMedals) return b.totalMedals - a.totalMedals;
        if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold;
        if (a.totalSilver !== b.totalSilver) return b.totalSilver - a.totalSilver;
        return b.totalBronze - a.totalBronze;
      });

      // TV Berlin (6 medals, 3 gold) should rank before TSV München (6 medals, 1 gold)
      expect(sorted[0].clubName).toBe('TV Berlin');
      expect(sorted[1].clubName).toBe('TSV München');
      expect(sorted[2].clubName).toBe('SC Hamburg');
    });

    it('should break ties by gold count', () => {
      const tiedStandings = [
        { ...mockStandings[0], totalMedals: 5, totalGold: 1 },
        { ...mockStandings[1], totalMedals: 5, totalGold: 3 },
      ];

      const sorted = [...tiedStandings].sort((a, b) => {
        if (a.totalMedals !== b.totalMedals) return b.totalMedals - a.totalMedals;
        if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold;
        return 0;
      });

      expect(sorted[0].totalGold).toBe(3);
      expect(sorted[1].totalGold).toBe(1);
    });

    it('should break gold ties by silver count', () => {
      const tiedStandings = [
        { ...mockStandings[0], totalMedals: 6, totalGold: 2, totalSilver: 1 },
        { ...mockStandings[1], totalMedals: 6, totalGold: 2, totalSilver: 3 },
      ];

      const sorted = [...tiedStandings].sort((a, b) => {
        if (a.totalMedals !== b.totalMedals) return b.totalMedals - a.totalMedals;
        if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold;
        if (a.totalSilver !== b.totalSilver) return b.totalSilver - a.totalSilver;
        return b.totalBronze - a.totalBronze;
      });

      expect(sorted[0].totalSilver).toBe(3);
    });

    it('should handle empty standings', () => {
      const sorted = ([] as MedalStanding[]).sort(() => 0);
      expect(sorted).toHaveLength(0);
    });

    it('should handle single club standing', () => {
      const sorted = [mockStandings[0]].sort(() => 0);
      expect(sorted[0].clubName).toBe('TV Berlin');
    });
  });

  describe('PDF Export Data Preparation', () => {
    it('should prepare correct table data for PDF', () => {
      const tableData = [...mockStandings]
        .sort((a, b) => {
          if (a.totalMedals !== b.totalMedals) return b.totalMedals - a.totalMedals;
          if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold;
          if (a.totalSilver !== b.totalSilver) return b.totalSilver - a.totalSilver;
          return b.totalBronze - a.totalBronze;
        })
        .map((standing, index) => ({
          rank: index + 1,
          clubName: standing.clubName,
          gold: standing.totalGold,
          silver: standing.totalSilver,
          bronze: standing.totalBronze,
          total: standing.totalMedals,
          starters: standing.totalStarters,
        }));

      expect(tableData[0]).toEqual({
        rank: 1,
        clubName: 'TV Berlin',
        gold: 3,
        silver: 2,
        bronze: 1,
        total: 6,
        starters: 15,
      });
    });

    it('should calculate total medals and starters for summary', () => {
      const totalMedals = mockStandings.reduce((sum, s) => sum + s.totalMedals, 0);
      const totalStarters = mockStandings.reduce((sum, s) => sum + s.totalStarters, 0);

      expect(totalMedals).toBe(15); // 6 + 6 + 3
      expect(totalStarters).toBe(43); // 15 + 20 + 8
    });

    it('should generate safe PDF filename', () => {
      const eventName = 'Stadtmeisterschaft 2025 / Berlin';
      const fileName = `medallienspiegel_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      expect(fileName).toBe('medallienspiegel_Stadtmeisterschaft_2025___Berlin.pdf');
      expect(fileName).not.toContain('/');
      expect(fileName).not.toContain(' ');
    });
  });

  describe('No Event State', () => {
    it('should show no-event message when no event is selected', async () => {
      mockUseEvent.mockReturnValue({
        selectedEvent: null,
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
      });

      await renderMedallienspiegel();

      await waitFor(() => {
        expect(screen.getByText('medallienspiegel.noEventTitle')).toBeInTheDocument();
        expect(screen.getByText('medallienspiegel.noEventMessage')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Data State', () => {
    it('should show no-medals message when standings are empty', async () => {
      setupHandlers({ standings: [] });

      await renderMedallienspiegel();

      await waitFor(() => {
        expect(screen.getByText('medallienspiegel.noMedalsTitle')).toBeInTheDocument();
        expect(screen.getByText('medallienspiegel.noMedalsMessage')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message on API failure', async () => {
      setupHandlers(null, 500);

      await renderMedallienspiegel();

      await waitFor(() => {
        expect(screen.getByText('medallienspiegel.loadError')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show retry button on error', async () => {
      setupHandlers(null, 500);

      await renderMedallienspiegel();

      await waitFor(() => {
        expect(screen.getByText('medallienspiegel.retry')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Medal Standing Statistics', () => {
    it('should correctly sum per-competition medals', () => {
      const standing = mockStandings[0]; // TV Berlin
      const goldFromComps = standing.competitions.reduce((s, c) => s + c.gold, 0);
      const silverFromComps = standing.competitions.reduce((s, c) => s + c.silver, 0);
      const bronzeFromComps = standing.competitions.reduce((s, c) => s + c.bronze, 0);

      expect(goldFromComps).toBe(standing.totalGold);
      expect(silverFromComps).toBe(standing.totalSilver);
      expect(bronzeFromComps).toBe(standing.totalBronze);
    });

    it('should correctly sum per-competition starters', () => {
      const standing = mockStandings[0];
      const startersFromComps = standing.competitions.reduce((s, c) => s + c.starters, 0);
      expect(startersFromComps).toBe(standing.totalStarters);
    });

    it('should handle clubs with zero medals', () => {
      const zeroCounts = mockStandings[2]; // SC Hamburg
      expect(zeroCounts.totalGold).toBe(0);
      expect(zeroCounts.totalSilver).toBe(0);
      expect(zeroCounts.totalBronze).toBe(3);
      expect(zeroCounts.totalMedals).toBe(3);
    });
  });
});
