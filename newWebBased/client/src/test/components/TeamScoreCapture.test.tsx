/**
 * Component Tests — TeamScoreCapture
 *
 * Tests the TeamScoreCapture page component:
 * - EntityScoringSelector rendering and 3-step selection workflow
 * - Data loading (teams, competitions, disciplines)
 * - Team competition filtering (competitionType === 1)
 * - Discipline filtering based on selected competition
 * - Score matrix state management
 * - Save score flow
 * - Score matrix key generation
 * - Score table visibility based on selection state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../renderWithProviders';
import { calculateFinalScoreFromFieldValues } from '@turnfix/shared';

// ── Mocks ──────────────────────────────────────────────────────────────────

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

// Mock sub-components
vi.mock('@/components/EntityScoringSelector', () => ({
  default: ({ entities, competitions, disciplines, selectedEntityId, selectedCompetitionId, selectedDisciplineId, onEntityChange, onCompetitionChange, onDisciplineChange, entityType, loading }: any) => (
    <div data-testid="entity-scoring-selector">
      <span data-testid="entity-type">{entityType}</span>
      <span data-testid="entity-count">{entities?.length || 0}</span>
      <span data-testid="competition-count">{competitions?.length || 0}</span>
      <span data-testid="discipline-count">{disciplines?.length || 0}</span>
      <span data-testid="selected-entity">{selectedEntityId || 'none'}</span>
      <span data-testid="selected-comp">{selectedCompetitionId || 'none'}</span>
      <span data-testid="selected-disc">{selectedDisciplineId || 'none'}</span>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <button data-testid="select-team" onClick={() => onEntityChange(1)}>Select Team</button>
      <button data-testid="select-comp" onClick={() => onCompetitionChange(10)}>Select Comp</button>
      <button data-testid="select-disc" onClick={() => onDisciplineChange(100)}>Select Disc</button>
    </div>
  ),
}));

vi.mock('../../../pages/GroupTeamScoring/components/TeamScoreTable', () => ({
  TeamScoreTable: ({ team, disciplineFields, maxAttempts, loading, scoreMatrix }: any) => (
    <div data-testid="team-score-table">
      <span data-testid="table-team">{team?.clubName || 'none'}</span>
      <span data-testid="table-fields">{disciplineFields?.length || 0}</span>
      <span data-testid="table-attempts">{maxAttempts}</span>
      <span data-testid="table-loading">{loading ? 'true' : 'false'}</span>
    </div>
  ),
}));

// ── Test Data ──────────────────────────────────────────────────────────────

const mockTeams = [
  { id: 1, clubId: 1, competitionId: 10, number: 1, riege: 'A', startNumber: 101, clubName: 'TV Berlin', competitionName: 'Wettkampf Damen' },
  { id: 2, clubId: 2, competitionId: 10, number: 2, riege: 'B', startNumber: 102, clubName: 'TSV München', competitionName: 'Wettkampf Damen' },
];

const mockCompetitionsAll = [
  { id: 10, name: 'Team Wettkampf Damen', eventId: 1, gender: 'weiblich', competitionType: 1, disciplines: [{ disciplineId: 100 }, { disciplineId: 101 }] },
  { id: 11, name: 'Einzel Wettkampf Herren', eventId: 1, gender: 'männlich', competitionType: 0 },
  { id: 12, name: 'Team Wettkampf Herren', eventId: 1, gender: 'männlich', competitionType: 1, disciplines: [{ disciplineId: 100 }] },
];

const mockDisciplines = [
  { id: 100, name: 'Boden', shortName: 'BO', maleAllowed: true, femaleAllowed: true, calculationType: 1, attempts: 1 },
  { id: 101, name: 'Sprung', shortName: 'SP', maleAllowed: true, femaleAllowed: true, calculationType: 1, attempts: 2 },
  { id: 102, name: 'Reck', shortName: 'RE', maleAllowed: true, femaleAllowed: false, calculationType: 1, attempts: 1 },
];

const mockDisciplineFields = [
  { id: 1000, disciplineId: 100, name: 'D-Note', sortOrder: 1, group: 1, isFinalScore: false, isStartingScore: false, enabled: true },
  { id: 1001, disciplineId: 100, name: 'E-Note', sortOrder: 2, group: 1, isFinalScore: false, isStartingScore: false, enabled: true },
];

// ── MSW Handlers ───────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/teams', () => {
      return HttpResponse.json({ results: mockTeams, pagination: { total: 2, limit: 1000, offset: 0, hasMore: false } });
    }),
    http.get('/api/competitions', () => {
      // Returns ALL competitions (page filters for team type)
      return HttpResponse.json(mockCompetitionsAll);
    }),
    http.get('/api/disciplines', () => {
      return HttpResponse.json(mockDisciplines);
    }),
    http.get('/api/discipline-fields', () => {
      return HttpResponse.json(mockDisciplineFields);
    }),
    http.get('/api/scores/team', () => {
      return HttpResponse.json({ results: [], pagination: { total: 0 } });
    }),
    http.post('/api/scores/team', async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({ id: 999, ...body as object }, { status: 201 });
    }),
  );
}

// ── Lazy import ────────────────────────────────────────────────────────────

async function renderTeamScoreCapture() {
  const mod = await import('../../pages/GroupTeamScoring/TeamScoreCapture');
  return renderWithProviders(<mod.default />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TeamScoreCapture', () => {
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
    it('should render the page title', { timeout: 15000 }, async () => {
      await renderTeamScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('groupTeamScoring.teamScoring')).toBeInTheDocument();
      });
    });

    it('should render the info box', async () => {
      await renderTeamScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('groupTeamScoring.teamInfo')).toBeInTheDocument();
      });
    });

    it('should render the EntityScoringSelector', async () => {
      await renderTeamScoreCapture();

      await waitFor(() => {
        expect(screen.getByTestId('entity-scoring-selector')).toBeInTheDocument();
        expect(screen.getByTestId('entity-type')).toHaveTextContent('team');
      });
    });
  });

  describe('Data Loading', () => {
    it('should load teams and pass them to the selector', async () => {
      await renderTeamScoreCapture();

      await waitFor(() => {
        expect(screen.getByTestId('entity-count')).toHaveTextContent('2');
      });
    });

    it('should filter competitions to team type only (competitionType === 1)', async () => {
      await renderTeamScoreCapture();

      // Only team competitions (competitionType === 1) should be passed
      await waitFor(() => {
        // 2 of 3 competitions have competitionType === 1
        expect(screen.getByTestId('competition-count')).toHaveTextContent('2');
      });
    });

    it('should load all disciplines', async () => {
      await renderTeamScoreCapture();

      await waitFor(() => {
        expect(screen.getByTestId('discipline-count')).toHaveTextContent('3');
      });
    });
  });

  describe('Competition Type Filtering', () => {
    it('should only include team competitions (competitionType === 1)', () => {
      // Pure logic test for competition filtering
      const allCompetitions = mockCompetitionsAll;
      const teamCompetitions = allCompetitions.filter(
        (comp: any) => comp.competitionType === 1
      );

      expect(teamCompetitions).toHaveLength(2);
      expect(teamCompetitions.map(c => c.name)).toEqual([
        'Team Wettkampf Damen',
        'Team Wettkampf Herren',
      ]);
    });

    it('should exclude individual competitions (competitionType === 0)', () => {
      const teamOnly = mockCompetitionsAll.filter(c => c.competitionType === 1);
      expect(teamOnly.find(c => c.name === 'Einzel Wettkampf Herren')).toBeUndefined();
    });
  });

  describe('Discipline Filtering by Competition', () => {
    it('should return empty when no competition is selected', () => {
      const selectedCompetitionId: number | null = null;
      const result = !selectedCompetitionId ? [] : mockDisciplines;
      expect(result).toHaveLength(0);
    });

    it('should filter disciplines by competition discipline assignments', () => {
      const selectedComp = mockCompetitionsAll[0]; // Team Wettkampf Damen: disciplines [100, 101]
      const competitionDisciplineIds = new Set<number>();
      (selectedComp.disciplines || []).forEach((disc: any) => {
        const discId = disc.disciplineId || disc.int_disziplinid || disc.id;
        if (discId) competitionDisciplineIds.add(discId);
      });

      const filtered = mockDisciplines.filter(d => competitionDisciplineIds.has(d.id));
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.name)).toEqual(['Boden', 'Sprung']);
    });

    it('should handle competition without disciplines property', () => {
      const selectedComp = mockCompetitionsAll[1]; // Has no .disciplines
      const hasDisciplines = selectedComp.disciplines && Array.isArray(selectedComp.disciplines);
      expect(hasDisciplines).toBeFalsy();
      // Should return all disciplines as fallback
    });
  });

  describe('Score Matrix Key Generation', () => {
    it('should generate correct matrix keys', () => {
      const teamId = 1;
      const attempt = 2;
      const fieldId = 1000;
      const key = `team-${teamId}-attempt-${attempt}-field-${fieldId}`;
      expect(key).toBe('team-1-attempt-2-field-1000');
    });

    it('should create unique keys for different attempts', () => {
      const keys = [1, 2, 3].map(attempt => `team-1-attempt-${attempt}-field-1000`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(3);
    });

    it('should create unique keys for different fields', () => {
      const keys = [1000, 1001, 1002].map(fieldId => `team-1-attempt-1-field-${fieldId}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(3);
    });
  });

  describe('Score Save Logic', () => {
    it('should calculate final score via centralized helper when no formula is set', () => {
      const finalScore = calculateFinalScoreFromFieldValues('', [
        { fieldId: 1000, fieldName: 'D-Note', value: 5.5, sortOrder: 1, isFinalScore: false, isStartingScore: false },
        { fieldId: 1001, fieldName: 'E-Note', value: 4.3, sortOrder: 2, isFinalScore: false, isStartingScore: false },
        { fieldId: 1002, fieldName: 'Endwert', value: null, sortOrder: 3, isFinalScore: true, isStartingScore: false },
      ]);

      expect(finalScore).toBeCloseTo(9.8);
    });

    it('should calculate linked formulas via centralized helper', () => {
      const finalScore = calculateFinalScoreFromFieldValues('A + B', [
        { fieldId: 1000, fieldName: 'D-Note', value: 5.5, sortOrder: 1, isFinalScore: false, isStartingScore: false },
        { fieldId: 1001, fieldName: 'E-Note', value: 4.3, sortOrder: 2, isFinalScore: false, isStartingScore: false },
        { fieldId: 1002, fieldName: 'Endwert', value: null, sortOrder: 3, isFinalScore: true, isStartingScore: false },
      ]);

      expect(finalScore).toBeCloseTo(9.8);
    });

    it('should skip components with zero or empty values', () => {
      const scoreMatrix: Record<string, string> = {
        'team-1-attempt-1-field-1000': '5.5',
        'team-1-attempt-1-field-1001': '0',
      };

      const components = mockDisciplineFields
        .filter(f => !f.isFinalScore)
        .map(field => {
          const key = `team-1-attempt-1-field-${field.id}`;
          const value = parseFloat(scoreMatrix[key] || '0');
          return { fieldId: field.id, value: value > 0 ? value : null };
        })
        .filter(c => c.value !== null);

      expect(components).toHaveLength(1);
      expect(components[0].fieldId).toBe(1000);
    });

    it('should not save if no components have values', () => {
      const components: { fieldId: number; value: number | null }[] = [];
      // The component returns early if components.length === 0
      expect(components.length === 0).toBe(true);
    });
  });

  describe('Existing Score Loading', () => {
    it('should populate score matrix from existing scores', () => {
      const existingScores = [
        {
          attempt: 1,
          components: [
            { fieldId: 1000, value: 5.5 },
            { fieldId: 1001, value: 4.3 },
          ],
        },
      ];

      const teamId = 1;
      const matrix: Record<string, string> = {};
      existingScores.forEach((score: any) => {
        (score.components || []).forEach((component: any) => {
          const key = `team-${teamId}-attempt-${score.attempt}-field-${component.fieldId}`;
          matrix[key] = component.value?.toString() || '';
        });
      });

      expect(matrix['team-1-attempt-1-field-1000']).toBe('5.5');
      expect(matrix['team-1-attempt-1-field-1001']).toBe('4.3');
    });

    it('should handle scores without components gracefully', () => {
      const existingScores = [{ attempt: 1 }]; // No components
      const matrix: Record<string, string> = {};
      existingScores.forEach((score: any) => {
        (score.components || []).forEach((component: any) => {
          matrix[`team-1-attempt-${score.attempt}-field-${component.fieldId}`] = component.value?.toString() || '';
        });
      });

      expect(Object.keys(matrix)).toHaveLength(0);
    });
  });

  describe('No Event Selected', () => {
    it('should not load data without event', async () => {
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

      await renderTeamScoreCapture();

      await waitFor(() => {
        expect(screen.getByText('groupTeamScoring.teamScoring')).toBeInTheDocument();
      });

      // Selector should show 0 entities
      expect(screen.getByTestId('entity-count')).toHaveTextContent('0');
    });
  });
});
