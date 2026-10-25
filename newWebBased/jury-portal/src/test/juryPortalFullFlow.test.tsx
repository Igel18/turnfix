/**
 * End-to-end UI flow of the Jury Portal without mocked sub-components:
 * event -> squad -> device -> score entry -> save -> next participant -> complete device.
 * Only the HTTP layer is replaced.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import JuryPortal from '../components/JuryPortal';

type Handler = (url: string, init?: RequestInit) => { ok?: boolean; body: unknown } | undefined;

const participant = (id: number, first: string, last: string) => ({
  id, firstname: first, lastname: last, startNumber: id, club: 'TV Test', clubName: 'TV Test',
  competitions: [{ id: 10 }],
});

const squadManagement = {
  squads: [
    { id: 1, name: 'Riege 1', participantCount: 2, participants: [participant(1, 'Anna', 'Alt'), participant(2, 'Berta', 'Bunt')] },
    { id: 2, name: 'Riege 2', participantCount: 1, participants: [participant(3, 'Cora', 'Camp')] },
  ],
};

const discipline = { int_disziplinid: 100, var_name: 'Boden', int_berechnung: 2, maxScore: 10, var_icon: null };

function mockApi(overrides: Handler = () => undefined) {
  const calls: Array<{ url: string; method: string; body: any }> = [];

  const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body });

    const reply = (payload: unknown, ok = true) => ({ ok, json: async () => payload }) as Response;

    const custom = overrides(url, init);
    if (custom) return reply(custom.body, custom.ok ?? true);

    if (method === 'POST' && url.includes('/scores/save-value')) return reply({ success: true, wertungenId: 55 });
    if (method === 'POST' && url.includes('/squad-management/complete')) return reply({ success: true });
    if (url.includes('/time-planning/bahn-details')) return reply({ bahnen: [] });
    if (url.includes('/time-planning/durchgaenge')) return reply({ durchgaenge: [] });
    if (url.includes('/time-planning/active-squads')) return reply({ currentTime: '', squadInfos: [] });
    if (url.includes('/squad-management')) return reply(squadManagement);
    if (url.includes('/competitions/10/disciplines')) return reply({ disciplines: [discipline] });
    if (url.includes('/competitions')) {
      return reply([{ id: 10, name: 'Wettkampf 10', eventId: 1, disciplines: [{ int_disziplinid: 100, disciplineId: 100 }] }]);
    }
    if (url.includes('/discipline-fields')) return reply([]);
    if (url.includes('/participant-status')) return reply({ participants: [] });
    if (url.includes('/squad-disciplines')) return reply({ squadDisciplines: [] });
    if (url.includes('/scores')) return reply({ results: [] });
    if (url.includes('/statuses')) return reply({ statuses: [] });
    if (url.includes('/events')) return reply({ events: [{ int_eventid: 1, var_eventname: 'Cup' }] });
    return reply([]);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

async function openScoring() {
  render(<JuryPortal />);
  const select = await screen.findByRole('combobox');
  await screen.findByRole('option', { name: 'Cup' });
  fireEvent.change(select, { target: { value: '1' } });
  const next = await screen.findByRole('button', { name: /Weiter zur Riegeneinteilung/ });
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);

  fireEvent.click(await screen.findByRole('heading', { name: 'Riege 1' }));
  const device = await screen.findByRole('heading', { name: 'Boden' }, { timeout: 4000 });
  fireEvent.click(device);
  await screen.findByRole('heading', { name: 'Teilnehmer (2)' }, { timeout: 4000 });
}

const scoreInput = () => screen.getByPlaceholderText(/0[.,]0+/) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: /Bewertung speichern/ });
const saveCalls = (calls: ReturnType<typeof mockApi>['calls']) =>
  calls.filter(c => c.method === 'POST' && c.url.includes('/scores/save-value'));

describe('Jury Portal — scoring with a linked formula (A + B)', () => {
  beforeEach(() => {
    localStorage.setItem('juryPortal_filterToday', 'false');
    vi.stubGlobal('alert', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const formulaApi = () => mockApi((url, init) => {
    if (url.includes('/competitions/10/disciplines')) {
      return { body: { disciplines: [{ ...discipline, int_formelid: 5, var_formel: 'A + B' }] } };
    }
    if (url.includes('/formulas/5')) return { body: { var_formel: 'A + B' } };
    if (url.includes('/discipline-fields')) {
      const field = (id: number, name: string, sortOrder: number, isFinalScore = false) => ({
        id, disciplineId: 100, name, sortOrder, enabled: true, isFinalScore, isStartingScore: false,
      });
      return { body: [field(11, 'D-Note', 1), field(12, 'E-Note', 2), field(13, 'Endwert', 3, true)] };
    }
    if (init?.method === 'POST' && url.includes('/scores/create-wertung')) return { body: { success: true, wertungenId: 55 } };
    if (init?.method === 'POST' && url.includes('/jury-results')) return { body: { success: true } };
    return undefined;
  });

  it('shows one input per formula value and calculates the result while typing', async () => {
    formulaApi();
    await openScoring();

    expect(await screen.findByText('A: D-Note')).toBeInTheDocument();
    expect(screen.getByText('B: E-Note')).toBeInTheDocument();

    const [a, b] = screen.getAllByRole('textbox');
    fireEvent.change(a, { target: { value: '5' } });
    fireEvent.change(b, { target: { value: '7,5' } });

    expect(await screen.findByText('12.50')).toBeInTheDocument();
  });

  it('saves every field under its own discipline field and then the final score', async () => {
    const { calls } = formulaApi();
    await openScoring();

    await screen.findByText('A: D-Note');
    const [a, b] = screen.getAllByRole('textbox');
    fireEvent.change(a, { target: { value: '5' } });
    fireEvent.change(b, { target: { value: '7,5' } });
    await screen.findByText('12.50');

    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveCalls(calls)).toHaveLength(1));
    const fieldSaves = calls.filter(c => c.method === 'POST' && /\/jury-results$/.test(c.url));
    const byField = Object.fromEntries(fieldSaves.map(c => [c.body.disciplineFieldId, c.body.performance]));
    expect(byField).toEqual({ 11: 5, 12: 7.5, 13: 12.5 });
    expect(fieldSaves.every(c => c.body.participantId === 55 && c.body.disciplineId === 100)).toBe(true);
    expect(saveCalls(calls)[0].body).toMatchObject({ competitionId: 10, participantId: 1, disciplineId: 100, score: 12.5 });
  });
});

describe('Jury Portal — complete scoring flow', () => {
  beforeEach(() => {
    localStorage.setItem('juryPortal_filterToday', 'false');
    vi.stubGlobal('alert', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.body.querySelectorAll('[class*="toast"]').forEach(el => el.remove());
  });

  it('walks from the event to the scoring view of the chosen squad and device', async () => {
    mockApi();
    await openScoring();

    expect(screen.getByRole('heading', { level: 1, name: 'Boden' })).toBeInTheDocument();
    expect(screen.getByTestId('context-squad')).toHaveTextContent('Riege 1');
    expect(screen.getByRole('heading', { level: 2, name: 'Anna Alt' })).toBeInTheDocument();
    expect(screen.getByText('Teilnehmer 1 von 2')).toBeInTheDocument();
  });

  it('only offers the squads of the event with their participants', async () => {
    mockApi();
    render(<JuryPortal />);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: '1' } });
    await screen.findByRole('option', { name: 'Cup' });
    const next = await screen.findByRole('button', { name: /Weiter zur Riegeneinteilung/ });
    await waitFor(() => expect(next).toBeEnabled());
    fireEvent.click(next);

    expect(await screen.findByRole('heading', { name: 'Riege 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Riege 2' })).toBeInTheDocument();
    expect(screen.getByText('2 Teilnehmer')).toBeInTheDocument();
  });

  it('keeps the save button disabled until a score is entered', async () => {
    mockApi();
    await openScoring();

    expect(saveButton()).toBeDisabled();
    fireEvent.change(scoreInput(), { target: { value: '9,5' } });
    expect(saveButton()).toBeEnabled();
  });

  it('saves the score with competition, participant, discipline and numeric value', async () => {
    const { calls } = mockApi();
    await openScoring();

    fireEvent.change(scoreInput(), { target: { value: '9.5' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveCalls(calls)).toHaveLength(1));
    expect(saveCalls(calls)[0].body).toEqual({ competitionId: 10, participantId: 1, disciplineId: 100, score: 9.5 });
  });

  it('marks the participant as completed after saving and updates the progress', async () => {
    mockApi();
    await openScoring();

    fireEvent.change(scoreInput(), { target: { value: '9.5' } });
    fireEvent.click(saveButton());

    const list = screen.getByRole('heading', { name: 'Teilnehmer (2)' }).closest('div.flex-col') as HTMLElement;
    await waitFor(() => expect(within(list).getByText('1 / 2')).toBeInTheDocument());
    expect(within(list).getByText('✓')).toBeInTheDocument();
    expect(within(list).getByText(/9[.,]50/)).toBeInTheDocument();
  });

  it('scores the next participant after navigating', async () => {
    const { calls } = mockApi();
    await openScoring();

    fireEvent.change(scoreInput(), { target: { value: '9.5' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(saveCalls(calls)).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: /Nächster/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Berta Bunt' })).toBeInTheDocument();
    expect(screen.getByText('Teilnehmer 2 von 2')).toBeInTheDocument();
    expect(scoreInput()).toHaveValue('');

    fireEvent.change(scoreInput(), { target: { value: '8.25' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(saveCalls(calls)).toHaveLength(2));
    expect(saveCalls(calls)[1].body).toMatchObject({ participantId: 2, score: 8.25 });
  });

  it('selects a participant directly from the list', async () => {
    mockApi();
    await openScoring();

    const list = screen.getByRole('heading', { name: 'Teilnehmer (2)' }).closest('div.flex-col') as HTMLElement;
    fireEvent.click(within(list).getByText('Berta Bunt'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Berta Bunt' })).toBeInTheDocument();
  });

  it('does not mark the participant as completed when the server rejects the score', async () => {
    mockApi((url, init) => (
      init?.method === 'POST' && url.includes('/scores/save-value')
        ? { ok: false, body: { error: 'Boom' } }
        : undefined
    ));
    await openScoring();

    fireEvent.change(scoreInput(), { target: { value: '9.5' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Boom')));
    const list = screen.getByRole('heading', { name: 'Teilnehmer (2)' }).closest('div.flex-col') as HTMLElement;
    expect(within(list).getByText('0 / 2')).toBeInTheDocument();
  });

  it('warns about a score above the maximum of the device', async () => {
    mockApi();
    await openScoring();

    fireEvent.change(scoreInput(), { target: { value: '11' } });
    expect(await screen.findByText(/⚠️/)).toBeInTheDocument();
  });

  it('completes the device, reports it to the server and returns to the device list', async () => {
    const { calls } = mockApi();
    await openScoring();

    fireEvent.click(screen.getByRole('button', { name: 'Gerät abschließen' }));

    expect(await screen.findByRole('heading', { name: 'Gerät auswählen' })).toBeInTheDocument();
    const complete = calls.find(c => c.method === 'POST' && c.url.includes('/squad-management/complete'));
    expect(complete?.body).toEqual({
      eventId: 1, squadName: 'Riege 1', disciplineId: 100, status: 'Leistungen erfasst',
    });
  });

  it('goes back through the steps to the event selection', async () => {
    mockApi();
    await openScoring();

    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(await screen.findByRole('heading', { name: 'Gerät auswählen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(await screen.findByRole('heading', { name: 'Riege auswählen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(await screen.findByRole('heading', { name: 'Jury Portal' })).toBeInTheDocument();
  });

  it('shows the scores that are already stored when the squad is opened', async () => {
    mockApi((url) => (
      url.includes('/scores?') && !url.includes('save-value')
        ? { body: { results: [{ id: 77, participantId: 1, disciplineId: 100, score: 7.75 }] } }
        : undefined
    ));
    await openScoring();

    const list = screen.getByRole('heading', { name: 'Teilnehmer (2)' }).closest('div.flex-col') as HTMLElement;
    await waitFor(() => expect(within(list).getByText('1 / 2')).toBeInTheDocument());
    expect(within(list).getByText(/7[.,]75/)).toBeInTheDocument();
  });
});
