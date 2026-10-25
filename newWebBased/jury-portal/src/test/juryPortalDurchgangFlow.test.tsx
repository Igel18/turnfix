import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JuryPortal from '../components/JuryPortal';

// Replace the later steps by a probe that exposes the squad handed over to the device step.
vi.mock('../components/JuryPortal/components/DeviceSelection', () => ({
  default: ({ selectedSquad, onBack }: any) => (
    <div>
      <h1>Gerät auswählen</h1>
      <p data-testid="device-squad">{selectedSquad?.name}</p>
      <p data-testid="device-participants">{(selectedSquad?.participants ?? []).map((p: any) => p.id).join(',')}</p>
      <button onClick={onBack}>device-back</button>
    </div>
  ),
}));

const participant = (id: number, competitionId: number) => ({
  id, firstname: `P${id}`, lastname: 'X', startNumber: id, competitions: [{ id: competitionId }],
});

const squadManagement = {
  squads: [
    { id: 1, name: 'A', participantCount: 2, participants: [participant(1, 10), participant(2, 20)] },
    { id: 2, name: 'B', participantCount: 1, participants: [participant(3, 10)] },
    { id: 3, name: 'C', participantCount: 1, participants: [participant(4, 20)] },
  ],
};

const durchgaenge = (list: any[]) => ({ durchgaenge: list });
const dg = (n: number, comps: number[], squads: string[]) => ({
  durchgang: n,
  startTime: null,
  competitions: comps.map(id => ({ id, name: `WK ${id}`, number: String(id) })),
  squads: squads.map(name => ({ name, participantCount: 1 })),
});

function mockApi(durchgaengePayload: unknown) {
  const fetchMock = vi.fn(async (input: any) => {
    const url = String(input);
    const body = (payload: unknown) => ({ ok: true, json: async () => payload }) as Response;
    if (url.includes('/time-planning/durchgaenge')) return body(durchgaengePayload);
    if (url.includes('/time-planning/active-squads')) return body({ currentTime: '', squadInfos: [] });
    if (url.includes('/squad-management')) return body(squadManagement);
    if (url.includes('/statuses')) return body({ statuses: [] });
    if (url.includes('/events')) return body({ events: [{ int_eventid: 1, var_eventname: 'Cup' }] });
    return body([]);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function openEvent() {
  render(<JuryPortal />);
  const select = await screen.findByRole('combobox');
  await screen.findByRole('option', { name: 'Cup' });
  fireEvent.change(select, { target: { value: '1' } });
  // The button reads "Lädt..." while the event's squads are being fetched
  const next = await screen.findByRole('button', { name: /Weiter zur Riegeneinteilung/ });
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);
}

describe('JuryPortal — Durchgang before squad selection', () => {
  beforeEach(() => {
    localStorage.setItem('juryPortal_filterToday', 'false');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('asks for the Durchgang first when the event has more than one', async () => {
    mockApi(durchgaenge([dg(1, [10], ['A', 'B']), dg(2, [20], ['A', 'C'])]));
    await openEvent();

    expect(await screen.findByRole('heading', { name: 'Durchgang auswählen' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Riege auswählen' })).not.toBeInTheDocument();
  });

  it('shows only the squads of the chosen Durchgang', async () => {
    mockApi(durchgaenge([dg(1, [10], ['A', 'B']), dg(2, [20], ['A', 'C'])]));
    await openEvent();

    fireEvent.click(await screen.findByTestId('durchgang-card-2'));

    expect(await screen.findByRole('heading', { name: 'Riege auswählen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'C' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'B' })).not.toBeInTheDocument();
  });

  it('hands only the participants of the chosen Durchgang to the next step', async () => {
    mockApi(durchgaenge([dg(1, [10], ['A', 'B']), dg(2, [20], ['A', 'C'])]));
    await openEvent();

    fireEvent.click(await screen.findByTestId('durchgang-card-2'));
    fireEvent.click(await screen.findByRole('heading', { name: 'A' }));

    expect(await screen.findByTestId('device-squad')).toHaveTextContent('A');
    // squad A has participant 1 (competition 10, Durchgang 1) and 2 (competition 20, Durchgang 2)
    expect(screen.getByTestId('device-participants')).toHaveTextContent(/^2$/);
  });

  it('goes back from the squad list to the Durchgang list and from there to the event', async () => {
    mockApi(durchgaenge([dg(1, [10], ['A', 'B']), dg(2, [20], ['A', 'C'])]));
    await openEvent();

    fireEvent.click(await screen.findByTestId('durchgang-card-1'));
    await screen.findByRole('heading', { name: 'Riege auswählen' });
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(await screen.findByRole('heading', { name: 'Durchgang auswählen' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(await screen.findByRole('heading', { name: 'Jury Portal' })).toBeInTheDocument();
  });

  it('lets the user choose another Durchgang after going back', async () => {
    mockApi(durchgaenge([dg(1, [10], ['A', 'B']), dg(2, [20], ['A', 'C'])]));
    await openEvent();

    fireEvent.click(await screen.findByTestId('durchgang-card-1'));
    await screen.findByRole('heading', { name: 'Riege auswählen' });
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    fireEvent.click(await screen.findByTestId('durchgang-card-2'));

    expect(await screen.findByRole('heading', { name: 'C' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'B' })).not.toBeInTheDocument();
  });

  it('skips the Durchgang step when there is only one Durchgang', async () => {
    mockApi(durchgaenge([dg(1, [10, 20], ['A', 'B', 'C'])]));
    await openEvent();

    expect(await screen.findByRole('heading', { name: 'Riege auswählen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'C' })).toBeInTheDocument();
  });

  it('skips the Durchgang step when the Durchgang request fails', async () => {
    const fetchMock = mockApi(durchgaenge([]));
    fetchMock.mockImplementation(async (input: any) => {
      const url = String(input);
      const body = (payload: unknown, ok = true) => ({ ok, json: async () => payload }) as Response;
      if (url.includes('/time-planning/durchgaenge')) return body({}, false);
      if (url.includes('/time-planning/active-squads')) return body({ currentTime: '', squadInfos: [] });
      if (url.includes('/squad-management')) return body(squadManagement);
      if (url.includes('/statuses')) return body({ statuses: [] });
      if (url.includes('/events')) return body({ events: [{ int_eventid: 1, var_eventname: 'Cup' }] });
      return body([]);
    });
    await openEvent();

    expect(await screen.findByRole('heading', { name: 'Riege auswählen' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument());
  });

  it('going back from the squad list leads to the event when the Durchgang step was skipped', async () => {
    mockApi(durchgaenge([dg(1, [10, 20], ['A', 'B', 'C'])]));
    await openEvent();

    await screen.findByRole('heading', { name: 'Riege auswählen' });
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(await screen.findByRole('heading', { name: 'Jury Portal' })).toBeInTheDocument();
  });
});
