/**
 * Unit Tests — ScoreCaptureV2 Components
 *
 * Tests:
 * - ParticipantList: renders participants, progress bar, active selection, status badge
 * - ScoringPanel: renders empty state, save button disabled when no participant,
 *   save button enabled, navigation prev/next, score input, status display
 * Point 125: Jury-style split-view score capture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  resolveScoringInputMode as mockResolveScoringInputMode,
  LinkedFormulaInput as MockLinkedFormulaInput,
  extractFormulaSymbols as mockExtractFormulaSymbols,
} from '@turnfix/shared';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}(${JSON.stringify(params)})`;
      return key;
    },
    i18n: { language: 'de' },
  }),
}));

vi.mock('@/components/status', () => ({
  StatusBadge: ({ label, colorCode }: { label: string | null; colorCode: string | null }) => (
    <span data-testid="status-badge" data-color={colorCode ?? ''}>
      {label ?? ''}
    </span>
  ),
}));

vi.mock('@turnfix/shared', () => ({
  resolveScoringInputMode: vi.fn(() => 'simple'),
  BuiltInFormulaInput: vi.fn(() => null),
  LinkedFormulaInput: vi.fn(() => null),
  applyBuiltInFormula: vi.fn(() => 0),
  detectFormulaType: vi.fn(() => 'simple'),
  normalizeValueForCalculation: vi.fn((v: unknown) => parseFloat(String(v)) || 0),
  extractFormulaSymbols: vi.fn(() => []),
}));

vi.mock('@/components/FormulaInput', () => ({
  FormulaInput: () => <div data-testid="formula-input" />,
}));

vi.mock('@/utils/scoreFormatter', () => ({
  normalizeScoreInput: vi.fn((v: string) => v),
  getScorePlaceholder: vi.fn(() => '0.000'),
}));

vi.mock('lucide-react', () => ({
  Users: () => <svg data-testid="users-icon" />,
  Trophy: () => <svg data-testid="trophy-icon" />,
  ChevronLeft: () => <svg />,
  ChevronRight: () => <svg />,
}));

// ── Test helpers ───────────────────────────────────────────────────────────

import type { ParticipantListItem } from '@/pages/ScoreCaptureV2/ScoreCaptureV2.types';

const makeParticipant = (overrides: Partial<ParticipantListItem> = {}): ParticipantListItem => ({
  id: 1,
  name: 'Anna Muster',
  startNumber: 5,
  clubName: 'TV Beispiel',
  currentScore: null,
  wertungenId: null,
  statusId: null,
  statusName: null,
  statusColor: null,
  ...overrides,
});

const mockStatuses = [
  { int_statusid: 1, var_name: 'Angemeldet', ary_colorcode: '#cccccc', bol_bogen: false, bol_karte: false },
  { int_statusid: 2, var_name: 'Wertung erfasst', ary_colorcode: '#00cc66', bol_bogen: false, bol_karte: false },
  { int_statusid: 3, var_name: 'Abwesend', ary_colorcode: '#ff4444', bol_bogen: false, bol_karte: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantList tests
// ─────────────────────────────────────────────────────────────────────────────
import { ParticipantList } from '@/pages/ScoreCaptureV2/components';

describe('ParticipantList', () => {
  it('renders participant names', () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ id: 1, name: 'Anna Muster' }), makeParticipant({ id: 2, name: 'Bob Test' })]}
        currentIndex={0}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('Anna Muster')).toBeTruthy();
    expect(screen.getByText('Bob Test')).toBeTruthy();
  });

  it('shows empty icon when no participants', () => {
    render(
      <ParticipantList participants={[]} currentIndex={0} onSelect={vi.fn()} />
    );
    expect(screen.getByTestId('users-icon')).toBeTruthy();
  });

  it('calls onSelect with correct index when item clicked', () => {
    const onSelect = vi.fn();
    const participants = [
      makeParticipant({ id: 1, name: 'Alpha' }),
      makeParticipant({ id: 2, name: 'Beta' }),
    ];
    render(
      <ParticipantList participants={participants} currentIndex={0} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByTestId('participant-list-item-2'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('marks active participant with blue border (active class)', () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ id: 1 })]}
        currentIndex={0}
        onSelect={vi.fn()}
      />
    );
    const btn = screen.getByTestId('participant-list-item-1');
    expect(btn.className).toContain('border-blue-600');
  });

  it('shows status badge when statusName provided', () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ id: 1, statusName: 'Wertung erfasst', statusColor: '#00ff00' })]}
        currentIndex={0}
        onSelect={vi.fn()}
      />
    );
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('Wertung erfasst');
  });

  it('shows progress fraction', () => {
    render(
      <ParticipantList
        participants={[
          makeParticipant({ id: 1, currentScore: 12.5 }),
          makeParticipant({ id: 2, currentScore: null }),
        ]}
        currentIndex={0}
        onSelect={vi.fn()}
      />
    );
    // Progress text "1 / 2"
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('shows squad and discipline names in subtitle', () => {
    render(
      <ParticipantList
        participants={[makeParticipant()]}
        currentIndex={0}
        onSelect={vi.fn()}
        disciplineName="Boden"
        squadName="Riege 1"
      />
    );
    expect(screen.getByText('Boden – Riege 1')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ScoringPanel tests
// ─────────────────────────────────────────────────────────────────────────────
import { ScoringPanel } from '@/pages/ScoreCaptureV2/components';

const mockDiscipline = {
  int_disziplinid: 10,
  var_name: 'Boden',
  int_berechnung: 0,
  var_formel: null,
  int_formelid: null,
  var_unit: 'Pkt',
} as any;

describe('ScoringPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    } as Response)));
  });

  const defaultStatusProps = {
    statuses: mockStatuses,
    onStatusChange: vi.fn(async () => {}),
  };

  it('renders empty state when no participant', () => {
    render(
      <ScoringPanel
        participant={undefined}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={3}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    // Shows select participant message
    expect(screen.getByText('scoreCaptureV2.selectParticipant')).toBeTruthy();
  });

  it('renders participant name when provided', () => {
    const participant = makeParticipant({ id: 1, name: 'Anna Muster', clubName: 'TV Beispiel' });
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={3}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    expect(screen.getByText('Anna Muster')).toBeTruthy();
    expect(screen.getByText('TV Beispiel')).toBeTruthy();
  });

  it('shows save button', () => {
    const participant = makeParticipant();
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score="12.5"
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    expect(screen.getByTestId('save-score-button')).toBeTruthy();
  });

  it('calls onSave when save button clicked', () => {
    const onSave = vi.fn();
    const participant = makeParticipant();
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score="12.5"
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={onSave}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    fireEvent.click(screen.getByTestId('save-score-button'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows loading text when saving', () => {
    const participant = makeParticipant();
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score="10"
        participantCount={2}
        currentIndex={0}
        loading={true}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    expect(screen.getByText(/scoreCaptureV2\.saving/)).toBeTruthy();
  });

  it('calls onNavigate with "prev" when prev button clicked', () => {
    const onNavigate = vi.fn();
    const participant = makeParticipant();
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={3}
        currentIndex={1}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={onNavigate}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    fireEvent.click(screen.getByTestId('nav-prev-button'));
    expect(onNavigate).toHaveBeenCalledWith('prev');
  });

  it('calls onNavigate with "next" when next button clicked', () => {
    const onNavigate = vi.fn();
    const participant = makeParticipant();
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={3}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={onNavigate}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    fireEvent.click(screen.getByTestId('nav-next-button'));
    expect(onNavigate).toHaveBeenCalledWith('next');
  });

  it('shows prev button disabled at first participant', () => {
    const participant = makeParticipant();
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={3}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    const prevBtn = screen.getByTestId('nav-prev-button') as HTMLButtonElement;
    expect(prevBtn).toBeTruthy();
    expect(prevBtn.disabled).toBe(true);
  });

  it('shows next button disabled at last participant', () => {
    const participant = makeParticipant();
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={3}
        currentIndex={2}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    const nextBtn = screen.getByTestId('nav-next-button') as HTMLButtonElement;
    expect(nextBtn).toBeTruthy();
    expect(nextBtn.disabled).toBe(true);
  });

  // TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC — status badge hidden until DB has per-device status column
  it.skip('shows status badge when wertungenId is null but statusName is set', () => {
    const participant = makeParticipant({
      wertungenId: null,
      statusName: 'Wertung erfasst',
      statusColor: '#00ff00',
    });
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('Wertung erfasst');
  });

  // TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC — hint text hidden alongside the status section
  it.skip('shows hint text when wertungenId and statusName are both null', () => {
    const participant = makeParticipant({ wertungenId: null, statusName: null });
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    expect(screen.getByText('scoreCaptureV2.statusAfterSave')).toBeTruthy();
  });

  // TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC — status dropdown hidden until DB has per-device status column
  it.skip('shows status dropdown when wertungenId is set', () => {
    const participant = makeParticipant({
      wertungenId: 42,
      statusId: 2,
      statusName: 'Wertung erfasst',
    });
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    const select = screen.getByTestId('status-select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('2');
  });

  // TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC — status dropdown hidden
  it.skip('dropdown shows all status options', () => {
    const participant = makeParticipant({ wertungenId: 42, statusId: 1 });
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    const optionTexts = options.map(o => o.textContent);
    expect(optionTexts).toContain('Angemeldet');
    expect(optionTexts).toContain('Wertung erfasst');
    expect(optionTexts).toContain('Abwesend');
  });

  it('passes fieldScores as initialValues to LinkedFormulaInput in linkedFormula mode', () => {
    // Arrange: linked formula mode with two fields and existing field scores
    vi.mocked(mockResolveScoringInputMode).mockReturnValueOnce('linkedFormula' as any);
    vi.mocked(mockExtractFormulaSymbols).mockReturnValueOnce(['A', 'B']);

    const fieldScores: Record<number, number> = { 10: 8.5, 11: 1.5 };
    const disciplineWithFormula = { ...mockDiscipline, var_formel: 'A + B' };
    const fields = [
      { id: 10, name: 'D-Note', isFinalScore: false, isStartingScore: false, sortOrder: 1 },
      { id: 11, name: 'E-Note', isFinalScore: false, isStartingScore: false, sortOrder: 2 },
    ];

    render(
      <ScoringPanel
        participant={makeParticipant()}
        discipline={disciplineWithFormula}
        disciplineFields={fields}
        score=""
        fieldScores={fieldScores}
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );

    // LinkedFormulaInput should receive initialValues mapped from fieldScores
    expect(vi.mocked(MockLinkedFormulaInput)).toHaveBeenCalledWith(
      expect.objectContaining({ initialValues: { A: 8.5, B: 1.5 } }),
      expect.anything(),
    );
  });

  it('does not pass initialValues when fieldScores is empty', () => {
    vi.mocked(mockResolveScoringInputMode).mockReturnValueOnce('linkedFormula' as any);
    vi.mocked(mockExtractFormulaSymbols).mockReturnValueOnce(['A', 'B']);

    render(
      <ScoringPanel
        participant={makeParticipant()}
        discipline={{ ...mockDiscipline, var_formel: 'A + B' }}
        disciplineFields={[
          { id: 10, name: 'D-Note', isFinalScore: false, isStartingScore: false, sortOrder: 1 },
          { id: 11, name: 'E-Note', isFinalScore: false, isStartingScore: false, sortOrder: 2 },
        ]}
        score=""
        fieldScores={{}}   // empty — no pre-fill expected
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        {...defaultStatusProps}
      />
    );

    // When fieldScores is empty the component passes an empty object ({}),
    // which LinkedFormulaInput treats as "no pre-fill".
      expect(vi.mocked(MockLinkedFormulaInput)).toHaveBeenCalledWith(
      expect.objectContaining({ initialValues: {} }),
      expect.anything(),
    );
  });

  // TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC — status dropdown hidden
  it.skip('calls onStatusChange with wertungenId and selected statusId on dropdown change', async () => {
    const onStatusChange = vi.fn(async () => {});
    const participant = makeParticipant({ wertungenId: 99, statusId: 1 });
    render(
      <ScoringPanel
        participant={participant}
        discipline={mockDiscipline}
        disciplineFields={[]}
        score=""
        participantCount={2}
        currentIndex={0}
        loading={false}
        onScoreChange={vi.fn()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        onNavigate={vi.fn()}
        getScoreValidation={() => ({ isValid: true, message: '' })}
        statuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    );
    const select = screen.getByTestId('status-select');
    await act(async () => {
      fireEvent.change(select, { target: { value: '3' } });
    });
    expect(onStatusChange).toHaveBeenCalledWith(99, 3);
  });
});

