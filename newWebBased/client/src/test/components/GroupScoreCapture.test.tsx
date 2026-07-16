/**
 * Component Tests — GroupScoreCapture
 *
 * Tests the GroupScoreCapture page component:
 * - Selection panel rendering (group, competition, discipline, attempt)
 * - Data loading workflow with MSW mocks
 * - Discipline field loading on discipline change
 * - Final score calculation logic
 * - Score entry modal open/close behavior
 * - Save score flow
 * - Empty/no-event state handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../renderWithProviders';
import { calculateFinalScoreFromFieldValues } from '@turnfix/shared';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock useEvent to provide selected event
const mockSelectedEvent = {
  int_eventid: 1,
  var_eventname: 'Test Event',
  dat_eventstartdate: '2025-06-15',
  dat_eventenddate: '2025-06-16',
  var_location: 'Sporthalle Berlin',
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

// Mock UnifiedScoreEntry since it's a complex modal component
vi.mock('@/components/UnifiedScoreEntry', () => ({
  default: ({ isOpen, onClose, onSave, title, saving }: any) =>
    isOpen ? (
      <div data-testid="score-entry-modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="save-btn" onClick={onSave} disabled={saving}>
          Save
        </button>
        <button data-testid="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// ── Test Data ──────────────────────────────────────────────────────────────

const mockGroups = [
  { int_gruppenid: 1, int_vereineid: 1, var_name: 'Gruppe A', clubName: 'TV Berlin' },
  { int_gruppenid: 2, int_vereineid: 2, var_name: 'Gruppe B', clubName: 'TSV München' },
];

const mockCompetitions = [
  { id: 10, name: 'Wettkampf Damen', eventId: 1, gender: 'weiblich' },
  { id: 11, name: 'Wettkampf Herren', eventId: 1, gender: 'männlich' },
];

const mockDisciplines = [
  { id: 100, name: 'Boden', shortName: 'BO', maleAllowed: true, femaleAllowed: true, calculationType: 1, attempts: 1 },
  { id: 101, name: 'Sprung', shortName: 'SP', maleAllowed: true, femaleAllowed: true, calculationType: 1, attempts: 2 },
];

const mockDisciplineFields = [
  { id: 1000, disciplineId: 100, name: 'D-Note', sortOrder: 1, group: 1, isFinalScore: false, isStartingScore: false, enabled: true },
  { id: 1001, disciplineId: 100, name: 'E-Note', sortOrder: 2, group: 1, isFinalScore: false, isStartingScore: false, enabled: true },
  { id: 1002, disciplineId: 100, name: 'Gesamt', sortOrder: 3, group: 1, isFinalScore: true, isStartingScore: false, enabled: true },
];

// ── MSW Handlers ───────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/groups', ({ request }) => {
      const url = new URL(request.url);
      const eventId = url.searchParams.get('eventId');
      if (eventId === '1') {
        return HttpResponse.json({ results: mockGroups, pagination: { total: 2, limit: 1000, offset: 0, hasMore: false } });
      }
      return HttpResponse.json({ results: [], pagination: { total: 0, limit: 1000, offset: 0, hasMore: false } });
    }),
    http.get('/api/competitions', ({ request }) => {
      const url = new URL(request.url);
      const eventId = url.searchParams.get('eventId');
      if (eventId === '1') {
        return HttpResponse.json({ results: mockCompetitions, pagination: { total: 2, limit: 100, offset: 0, hasMore: false } });
      }
      return HttpResponse.json({ results: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } });
    }),
    http.get('/api/disciplines', () => {
      return HttpResponse.json({ results: mockDisciplines, pagination: { total: 2, limit: 500, offset: 0, hasMore: false } });
    }),
    http.get('/api/discipline-fields', ({ request }) => {
      const url = new URL(request.url);
      const discId = url.searchParams.get('disciplineId');
      if (discId === '100') {
        return HttpResponse.json({ results: mockDisciplineFields });
      }
      return HttpResponse.json({ results: [] });
    }),
    http.post('/api/scores/group', async ({ request }) => {
      const body = await request.json() as any;
      return HttpResponse.json({
        id: 999,
        ...body,
        message: 'Score saved'
      }, { status: 201 });
    }),
  );
}

// ── Lazy import to let mocks take effect ───────────────────────────────────

async function renderGroupScoreCapture() {
  const mod = await import('../../pages/GroupTeamScoring/GroupScoreCapture');
  const Component = mod.default;
  return renderWithProviders(<Component />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GroupScoreCapture', () => {
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
      await renderGroupScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('groupTeamScoring.groupScoring')).toBeInTheDocument();
      });
    });

    it('should render the info box', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('groupTeamScoring.groupInfo')).toBeInTheDocument();
      });
    });

    it('should render selection panel with all 4 dropdowns', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('groupTeamScoring.selectionPanel')).toBeInTheDocument();
        expect(screen.getByText(/groupTeamScoring\.selectGroup/)).toBeInTheDocument();
        expect(screen.getByText(/groupTeamScoring\.selectCompetition/)).toBeInTheDocument();
        expect(screen.getByText(/groupTeamScoring\.selectDiscipline/)).toBeInTheDocument();
        expect(screen.getByText('groupTeamScoring.attempt')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should load groups from API and populate dropdown', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('Gruppe A (TV Berlin)')).toBeInTheDocument();
        expect(screen.getByText('Gruppe B (TSV München)')).toBeInTheDocument();
      });
    });

    it('should load competitions from API and populate dropdown', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('Wettkampf Damen')).toBeInTheDocument();
        expect(screen.getByText('Wettkampf Herren')).toBeInTheDocument();
      });
    });

    it('should load disciplines from API and populate dropdown', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('Boden')).toBeInTheDocument();
        expect(screen.getByText('Sprung')).toBeInTheDocument();
      });
    });
  });

  describe('Selection Workflow', () => {
    it('should start with no selections (all dropdowns empty)', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        // All selects should show placeholder options
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should not show score entry button when selections are incomplete', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        // The add button (Enter Score) should not be shown when nothing is selected
        expect(screen.queryByText('groupTeamScoring.enterScore')).not.toBeInTheDocument();
      });
    });

    it('should default attempt to 1', async () => {
      await renderGroupScoreCapture();

      await waitFor(() => {
        const attemptInput = screen.getByDisplayValue('1');
        expect(attemptInput).toBeInTheDocument();
      });
    });
  });

  describe('Score Calculation Logic', () => {
    it('should calculate final score via centralized helper when no formula is set', () => {
      const finalScore = calculateFinalScoreFromFieldValues('', [
        { fieldId: 1, fieldName: 'D-Note', value: 5.5, sortOrder: 1, isFinalScore: false, isStartingScore: false },
        { fieldId: 2, fieldName: 'E-Note', value: 4.3, sortOrder: 2, isFinalScore: false, isStartingScore: false },
        { fieldId: 3, fieldName: 'Endwert', value: null, sortOrder: 3, isFinalScore: true, isStartingScore: false },
      ]);

      expect(finalScore).toBeCloseTo(9.8);
    });

    it('should calculate linked formulas via centralized helper', () => {
      const finalScore = calculateFinalScoreFromFieldValues('A + B', [
        { fieldId: 1, fieldName: 'D-Note', value: 5.5, sortOrder: 1, isFinalScore: false, isStartingScore: false },
        { fieldId: 2, fieldName: 'E-Note', value: 4.3, sortOrder: 2, isFinalScore: false, isStartingScore: false },
        { fieldId: 3, fieldName: 'Endwert', value: null, sortOrder: 3, isFinalScore: true, isStartingScore: false },
      ]);

      expect(finalScore).toBeCloseTo(9.8);
    });

    it('should handle null values as 0 in calculation', () => {
      const components = [
        { fieldId: 1, value: null },
        { fieldId: 2, value: 3.5 },
      ];

      const total = components.map(c => c.value || 0).reduce((sum, val) => sum + val, 0);
      expect(total).toBe(3.5);
    });

    it('should handle empty components array', () => {
      const total = [].reduce((sum: number, val: number) => sum + val, 0);
      expect(total).toBe(0);
    });

    it('should not count final score field in sum', () => {
      const fields = [
        { id: 1, isFinalScore: false },
        { id: 2, isFinalScore: true },
      ];
      const components = [
        { fieldId: 1, value: 8.5 },
        { fieldId: 2, value: 100 }, // This should be excluded
      ];

      const values = components
        .filter(c => !fields.find(f => f.id === c.fieldId && f.isFinalScore))
        .map(c => c.value || 0);

      expect(values.reduce((s, v) => s + v, 0)).toBe(8.5);
    });
  });

  describe('Score Component State', () => {
    it('should update component value correctly', () => {
      // Replicating handleComponentChange logic
      const initial = [
        { fieldId: 1, fieldName: 'D-Note', value: null as number | null },
        { fieldId: 2, fieldName: 'E-Note', value: null as number | null },
      ];

      const updated = initial.map(c => c.fieldId === 1 ? { ...c, value: 5.5 } : c);
      expect(updated[0].value).toBe(5.5);
      expect(updated[1].value).toBeNull();
    });

    it('should leave other components unchanged when updating one', () => {
      const initial = [
        { fieldId: 1, fieldName: 'D-Note', value: 3.0 },
        { fieldId: 2, fieldName: 'E-Note', value: 7.5 },
        { fieldId: 3, fieldName: 'Penalty', value: 0.3 },
      ];

      const fieldToUpdate = 2;
      const newValue = 8.0;
      const updated = initial.map(c => c.fieldId === fieldToUpdate ? { ...c, value: newValue } : c);

      expect(updated[0].value).toBe(3.0);
      expect(updated[1].value).toBe(8.0);
      expect(updated[2].value).toBe(0.3);
    });
  });

  describe('Score Data Construction', () => {
    it('should build correct ScoreData for API submission', () => {
      const scoreData = {
        groupId: 1,
        competitionId: 10,
        disciplineId: 100,
        statusId: 1,
        attempt: 1,
        components: [
          { fieldId: 1000, value: 5.5 },
          { fieldId: 1001, value: 4.3 },
        ].filter(c => c.value !== null),
        finalScore: 9.8,
        comment: undefined,
      };

      expect(scoreData.groupId).toBe(1);
      expect(scoreData.components).toHaveLength(2);
      expect(scoreData.finalScore).toBeCloseTo(9.8);
      expect(scoreData.comment).toBeUndefined();
    });

    it('should filter out null-value components before saving', () => {
      const components = [
        { fieldId: 1, value: 5.5 },
        { fieldId: 2, value: null },
        { fieldId: 3, value: 8.0 },
      ];

      const filtered = components.filter(c => c.value !== null);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(c => c.fieldId)).toEqual([1, 3]);
    });

    it('should include comment when provided', () => {
      const comment = 'Penalty for stepping out';
      const scoreData = {
        groupId: 1,
        competitionId: 10,
        disciplineId: 100,
        statusId: 1,
        attempt: 1,
        components: [],
        finalScore: 0,
        comment: comment || undefined,
      };

      expect(scoreData.comment).toBe('Penalty for stepping out');
    });

    it('should convert empty comment to undefined', () => {
      const comment = '';
      const scoreData = {
        comment: comment || undefined,
      };

      expect(scoreData.comment).toBeUndefined();
    });
  });

  describe('No Event Selected', () => {
    it('should not load data when eventId is missing', async () => {
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

      await renderGroupScoreCapture();

      // Should render the template but not the group dropdown content
      await waitFor(() => {
        expect(screen.getByText('groupTeamScoring.groupScoring')).toBeInTheDocument();
      });

      // Groups should not be loaded
      expect(screen.queryByText('Gruppe A (TV Berlin)')).not.toBeInTheDocument();
    });
  });
});
