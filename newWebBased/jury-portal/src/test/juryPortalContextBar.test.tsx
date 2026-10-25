import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import JuryPortal from '../components/JuryPortal';

const boden = { id: 100, name: 'Boden', disciplineId: 100, icon: '' };

vi.mock('../components/JuryPortal/components/DeviceSelection', () => ({
  default: ({ onDeviceSelect }: any) => (
    <div>
      <h1>Gerät auswählen</h1>
      <button onClick={() => onDeviceSelect(boden)}>device-Boden</button>
    </div>
  ),
}));

const participant = (id: number, competitionId: number) => ({
  id, firstname: `P${id}`, lastname: 'X', startNumber: id, competitions: [{ id: competitionId }],
});

const squadManagement = {
  squads: [{ id: 1, name: 'Riege A', participantCount: 2, participants: [participant(1, 10), participant(2, 20)] }],
};

const durchgang = (n: number, comps: number[]) => ({
  durchgang: n,
  startTime: null,
  competitions: comps.map(id => ({ id, name: `WK ${id}`, number: String(id) })),
  squads: [{ name: 'Riege A', participantCount: 1 }],
});

const bahn = (durchgangNo: number, bahnNo: number, compId: number) => ({
  durchgang: durchgangNo,
  bahn: bahnNo,
  competitions: [{ id: compId, name: `WK ${compId}`, number: String(compId), disciplineIds: [100] }],
  squads: [{ name: 'Riege A', participantCount: 1 }],
});

function mockApi(durchgaenge: unknown[], bahnen: unknown[]) {
  vi.stubGlobal('fetch', vi.fn(async (input: any) => {
    const url = String(input);
    const body = (payload: unknown) => ({ ok: true, json: async () => payload }) as Response;
    if (url.includes('/time-planning/bahn-details')) return body({ bahnen });
    if (url.includes('/time-planning/durchgaenge')) return body({ durchgaenge });
    if (url.includes('/time-planning/active-squads')) return body({ currentTime: '', squadInfos: [] });
    if (url.includes('/squad-management')) return body(squadManagement);
    if (url.includes('/statuses')) return body({ statuses: [] });
    if (url.includes('/events')) return body({ events: [{ int_eventid: 1, var_eventname: 'Cup' }] });
    return body([]);
  }));
}

async function goToScoring(pickDurchgang?: number, pickBahn?: number) {
  render(<JuryPortal />);
  const select = await screen.findByRole('combobox');
  await screen.findByRole('option', { name: 'Cup' });
  fireEvent.change(select, { target: { value: '1' } });
  const next = await screen.findByRole('button', { name: /Weiter zur Riegeneinteilung/ });
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);

  if (pickDurchgang !== undefined) {
    fireEvent.click(await screen.findByTestId(`durchgang-card-${pickDurchgang}`));
  }
  fireEvent.click(await screen.findByRole('heading', { name: 'Riege A' }));
  fireEvent.click(await screen.findByRole('button', { name: 'device-Boden' }));

  if (pickBahn !== undefined) {
    fireEvent.click(await screen.findByTestId(`bahn-card-${pickBahn}`));
  }
  return screen.findByTestId('context-device');
}

describe('JuryPortal scoring view — context bar', () => {
  beforeEach(() => localStorage.setItem('juryPortal_filterToday', 'false'));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows the chosen Durchgang, Riege, Bahn and Gerät', async () => {
    mockApi(
      [durchgang(1, [10]), durchgang(2, [20])],
      [bahn(1, 1, 10), bahn(2, 1, 20), bahn(2, 2, 20)]
    );
    await goToScoring(2, 2);

    expect(within(screen.getByTestId('context-durchgang')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-squad')).getByText('Riege A')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-bahn')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-device')).getByText('Boden')).toBeInTheDocument();
  });

  it('shows the only Durchgang even though it was not asked for', async () => {
    mockApi([durchgang(3, [10, 20])], [bahn(3, 1, 10)]);
    await goToScoring();

    expect(within(screen.getByTestId('context-durchgang')).getByText('3')).toBeInTheDocument();
  });

  it('shows the automatically taken over single Bahn', async () => {
    mockApi([durchgang(1, [10, 20])], [bahn(1, 4, 10)]);
    await goToScoring();

    expect(within(screen.getByTestId('context-bahn')).getByText('4')).toBeInTheDocument();
  });

  it('omits Durchgang and Bahn when the event has no such data', async () => {
    mockApi([], []);
    await goToScoring();

    expect(screen.queryByTestId('context-durchgang')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-bahn')).not.toBeInTheDocument();
    expect(screen.getByTestId('context-squad')).toBeInTheDocument();
    expect(screen.getByTestId('context-device')).toBeInTheDocument();
  });
});
