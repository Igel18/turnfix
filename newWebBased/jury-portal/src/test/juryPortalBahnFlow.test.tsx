import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JuryPortal from '../components/JuryPortal';

const devices = {
  boden: { id: 100, name: 'Boden', disciplineId: 100, icon: '' },
  sprung: { id: 200, name: 'Sprung', disciplineId: 200, icon: '' },
  reck: { id: 300, name: 'Reck', disciplineId: 300, icon: '' },
};

vi.mock('../components/JuryPortal/components/DeviceSelection', () => ({
  default: ({ onDeviceSelect }: any) => (
    <div>
      <h1>Gerät auswählen</h1>
      {Object.values(devices).map((d: any) => (
        <button key={d.id} onClick={() => onDeviceSelect(d)}>{`device-${d.name}`}</button>
      ))}
    </div>
  ),
}));

vi.mock('../components/JuryPortal/components/ScoringView', () => ({
  default: ({ participants, selectedDevice, onBack }: any) => (
    <div>
      <h1>Bewertung</h1>
      <p data-testid="scoring-device">{selectedDevice?.name}</p>
      <p data-testid="scoring-participants">{participants.map((p: any) => p.id).join(',')}</p>
      <button onClick={onBack}>scoring-back</button>
    </div>
  ),
}));

const participant = (id: number, competitionId: number) => ({
  id, firstname: `P${id}`, lastname: 'X', startNumber: id, competitions: [{ id: competitionId }],
});

const squadManagement = {
  squads: [{
    id: 1, name: 'A', participantCount: 3,
    participants: [participant(1, 10), participant(2, 20), participant(3, 30)],
  }],
};

const bahnDetails = [
  { durchgang: 1, bahn: 1, competitions: [{ id: 10, name: 'WK 10', number: '10', disciplineIds: [100, 200, 300] }], squads: [{ name: 'A', participantCount: 1 }] },
  { durchgang: 1, bahn: 2, competitions: [{ id: 20, name: 'WK 20', number: '20', disciplineIds: [100] }], squads: [{ name: 'A', participantCount: 1 }] },
  { durchgang: 1, bahn: 3, competitions: [{ id: 30, name: 'WK 30', number: '30', disciplineIds: [200] }], squads: [{ name: 'A', participantCount: 1 }] },
];

const singleDurchgang = {
  durchgaenge: [{
    durchgang: 1, startTime: null,
    competitions: [10, 20, 30].map(id => ({ id, name: `WK ${id}`, number: String(id) })),
    squads: [{ name: 'A', participantCount: 3 }],
  }],
};

function mockApi(bahnResponse: { ok: boolean; body: unknown } = { ok: true, body: { bahnen: bahnDetails } }) {
  const fetchMock = vi.fn(async (input: any) => {
    const url = String(input);
    const body = (payload: unknown, ok = true) => ({ ok, json: async () => payload }) as Response;
    if (url.includes('/time-planning/bahn-details')) return body(bahnResponse.body, bahnResponse.ok);
    if (url.includes('/time-planning/durchgaenge')) return body(singleDurchgang);
    if (url.includes('/time-planning/active-squads')) return body({ currentTime: '', squadInfos: [] });
    if (url.includes('/squad-management')) return body(squadManagement);
    if (url.includes('/statuses')) return body({ statuses: [] });
    if (url.includes('/events')) return body({ events: [{ int_eventid: 1, var_eventname: 'Cup' }] });
    return body([]);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function openDeviceStep() {
  render(<JuryPortal />);
  const select = await screen.findByRole('combobox');
  await screen.findByRole('option', { name: 'Cup' });
  fireEvent.change(select, { target: { value: '1' } });
  const next = await screen.findByRole('button', { name: /Weiter zur Riegeneinteilung/ });
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);
  fireEvent.click(await screen.findByRole('heading', { name: 'A' }));
  await screen.findByRole('heading', { name: 'Gerät auswählen' });
}

const pickDevice = (name: string) => fireEvent.click(screen.getByRole('button', { name: `device-${name}` }));

describe('JuryPortal — Bahn after the discipline', () => {
  beforeEach(() => localStorage.setItem('juryPortal_filterToday', 'false'));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('asks for the Bahn when the discipline is offered on several Bahnen', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Boden');

    expect(await screen.findByRole('heading', { name: 'Bahn auswählen' })).toBeInTheDocument();
    expect(screen.getByText('A · Boden')).toBeInTheDocument();
    expect(screen.getByTestId('bahn-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('bahn-card-2')).toBeInTheDocument();
    expect(screen.queryByTestId('bahn-card-3')).not.toBeInTheDocument();
  });

  it('offers only the Bahnen of the chosen discipline', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Sprung');

    await screen.findByRole('heading', { name: 'Bahn auswählen' });
    expect(screen.getByTestId('bahn-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('bahn-card-3')).toBeInTheDocument();
    expect(screen.queryByTestId('bahn-card-2')).not.toBeInTheDocument();
  });

  it('scores only the participants of the chosen Bahn', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Boden');

    fireEvent.click(await screen.findByTestId('bahn-card-2'));

    await screen.findByRole('heading', { name: 'Bewertung' });
    await waitFor(() => expect(screen.getByTestId('scoring-participants')).toHaveTextContent(/^2$/));
    expect(screen.getByTestId('scoring-device')).toHaveTextContent('Boden');
  });

  it('skips the Bahn step when the discipline is on a single Bahn', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Reck');

    await screen.findByRole('heading', { name: 'Bewertung' });
    expect(screen.queryByRole('heading', { name: 'Bahn auswählen' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('scoring-participants')).toHaveTextContent(/^1$/));
  });

  it('skips the Bahn step and keeps everyone when the Bahn request fails', async () => {
    mockApi({ ok: false, body: {} });
    await openDeviceStep();
    pickDevice('Boden');

    await screen.findByRole('heading', { name: 'Bewertung' });
    await waitFor(() => expect(screen.getByTestId('scoring-participants')).toHaveTextContent('1,2,3'));
  });

  it('goes back from the Bahn list to the device list', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Boden');
    await screen.findByRole('heading', { name: 'Bahn auswählen' });

    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(await screen.findByRole('heading', { name: 'Gerät auswählen' })).toBeInTheDocument();
  });

  it('goes back from scoring to the Bahn list when a Bahn was chosen', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Boden');
    fireEvent.click(await screen.findByTestId('bahn-card-1'));
    await screen.findByRole('heading', { name: 'Bewertung' });

    fireEvent.click(screen.getByRole('button', { name: 'scoring-back' }));
    expect(await screen.findByRole('heading', { name: 'Bahn auswählen' })).toBeInTheDocument();
  });

  it('goes back from scoring straight to the device list when the Bahn step was skipped', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Reck');
    await screen.findByRole('heading', { name: 'Bewertung' });

    fireEvent.click(screen.getByRole('button', { name: 'scoring-back' }));
    expect(await screen.findByRole('heading', { name: 'Gerät auswählen' })).toBeInTheDocument();
  });

  it('forgets the chosen Bahn when another discipline is chosen', async () => {
    mockApi();
    await openDeviceStep();
    pickDevice('Boden');
    fireEvent.click(await screen.findByTestId('bahn-card-2'));
    await screen.findByRole('heading', { name: 'Bewertung' });

    fireEvent.click(screen.getByRole('button', { name: 'scoring-back' }));
    await screen.findByRole('heading', { name: 'Bahn auswählen' });
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    await screen.findByRole('heading', { name: 'Gerät auswählen' });

    pickDevice('Reck');
    await screen.findByRole('heading', { name: 'Bewertung' });
    await waitFor(() => expect(screen.getByTestId('scoring-participants')).toHaveTextContent(/^1$/));
  });
});
