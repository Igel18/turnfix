import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import JuryPortal from '../components/JuryPortal';

const disciplines = [
  { int_disziplinid: 100, var_name: 'Boden', int_berechnung: 2, maxScore: 10 },
  { int_disziplinid: 200, var_name: 'Pferd', int_berechnung: 2, maxScore: 10 },
  { int_disziplinid: 300, var_name: 'Ringe', int_berechnung: 2, maxScore: 10 },
];

const rotationOf = (ids: number[]) => ids.map((id, i) => {
  const d = disciplines.find(x => x.int_disziplinid === id)!;
  return { round: i + 1, disciplineId: id, name: d.var_name, shortName: d.var_name.slice(0, 3), icon: null };
});

const squadManagement = {
  squads: [{
    id: 1, name: 'Riege 1', participantCount: 1,
    participants: [{ id: 1, firstname: 'Anna', lastname: 'Alt', startNumber: 1, club: 'TV', clubName: 'TV', competitions: [{ id: 10 }] }],
  }],
};

function mockApi(rotation: unknown[]) {
  const calls: Array<{ url: string; method: string; body: any }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const reply = (payload: unknown) => ({ ok: true, json: async () => payload }) as Response;

    if (method === 'POST') return reply({ success: true, wertungenId: 55 });
    if (url.includes('/time-planning/squad-rotation')) return reply({ devices: rotation });
    if (url.includes('/time-planning/bahn-details')) return reply({ bahnen: [] });
    if (url.includes('/time-planning/durchgaenge')) return reply({ durchgaenge: [] });
    if (url.includes('/time-planning/active-squads')) return reply({ currentTime: '', squadInfos: [] });
    if (url.includes('/squad-management')) return reply(squadManagement);
    if (url.includes('/competitions/10/disciplines')) return reply({ disciplines });
    if (url.includes('/competitions')) {
      return reply([{
        id: 10, name: 'WK', eventId: 1,
        disciplines: disciplines.map(d => ({ int_disziplinid: d.int_disziplinid, disciplineId: d.int_disziplinid })),
      }]);
    }
    if (url.includes('/discipline-fields')) return reply([]);
    if (url.includes('/participant-status')) return reply({ participants: [] });
    if (url.includes('/squad-disciplines')) return reply({ squadDisciplines: [] });
    if (url.includes('/scores')) return reply({ results: [] });
    if (url.includes('/statuses')) return reply({ statuses: [] });
    if (url.includes('/events')) return reply({ events: [{ int_eventid: 1, var_eventname: 'Cup' }] });
    return reply([]);
  }));
  return calls;
}

async function openDeviceList() {
  render(<JuryPortal />);
  const select = await screen.findByRole('combobox');
  await screen.findByRole('option', { name: 'Cup' });
  fireEvent.change(select, { target: { value: '1' } });
  const next = await screen.findByRole('button', { name: /Weiter zur Riegeneinteilung/ });
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);
  fireEvent.click(await screen.findByRole('heading', { name: 'Riege 1' }));
  await screen.findByRole('heading', { name: 'Ringe' }, { timeout: 4000 });
}

const pickDevice = (name: string) => fireEvent.click(screen.getByRole('heading', { name }));
const deviceCard = (name: string) => screen.getByRole('heading', { name }).closest('div.cursor-pointer') as HTMLElement;
const stateOf = (id: number) => screen.getByTestId(`rotation-device-${id}`).getAttribute('data-state');

describe('Jury Portal — device rotation of the squad', () => {
  beforeEach(() => localStorage.setItem('juryPortal_filterToday', 'false'));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows done, current and next device while scoring', async () => {
    mockApi(rotationOf([100, 200, 300]));
    await openDeviceList();
    pickDevice('Pferd');

    await screen.findByTestId('rotation-device-200');
    expect([stateOf(100), stateOf(200), stateOf(300)]).toEqual(['done', 'current', 'next']);
    expect(screen.getByTestId('rotation-next')).toHaveTextContent('Nächstes Gerät: Ringe');
  });

  it('shows the first device without anything done', async () => {
    mockApi(rotationOf([100, 200, 300]));
    await openDeviceList();
    pickDevice('Boden');

    await screen.findByTestId('rotation-device-100');
    expect([stateOf(100), stateOf(200), stateOf(300)]).toEqual(['current', 'next', 'upcoming']);
  });

  it('announces the last device of the squad', async () => {
    mockApi(rotationOf([100, 200, 300]));
    await openDeviceList();
    pickDevice('Ringe');

    expect(await screen.findByTestId('rotation-last')).toHaveTextContent('Letztes Gerät der Riege');
    expect(screen.queryByTestId('rotation-next')).not.toBeInTheDocument();
  });

  it('follows the rotation order of the squad, not the order of the device list', async () => {
    mockApi(rotationOf([300, 100, 200]));
    await openDeviceList();
    pickDevice('Boden');

    await screen.findByTestId('rotation-device-100');
    const order = screen.getAllByTestId(/^rotation-device-/).map(el => el.getAttribute('data-testid'));
    expect(order).toEqual(['rotation-device-300', 'rotation-device-100', 'rotation-device-200']);
    expect(screen.getByTestId('rotation-next')).toHaveTextContent('Pferd');
  });

  it('suggests the next device after completing a device', async () => {
    const calls = mockApi(rotationOf([100, 200, 300]));
    await openDeviceList();
    pickDevice('Boden');
    await screen.findByTestId('rotation-device-100');

    fireEvent.click(screen.getByRole('button', { name: 'Gerät abschließen' }));
    await screen.findByRole('heading', { name: 'Gerät auswählen' });

    expect(within(deviceCard('Pferd')).getByText('Als Nächstes')).toBeInTheDocument();
    expect(deviceCard('Boden')).not.toHaveTextContent('Als Nächstes');
    expect(deviceCard('Ringe')).not.toHaveTextContent('Als Nächstes');
    expect(calls.some(c => c.method === 'POST' && c.url.includes('/squad-management/complete'))).toBe(true);
  });

  it('continues with the suggested device and moves the suggestion on', async () => {
    mockApi(rotationOf([100, 200, 300]));
    await openDeviceList();
    pickDevice('Boden');
    await screen.findByTestId('rotation-device-100');
    fireEvent.click(screen.getByRole('button', { name: 'Gerät abschließen' }));
    await screen.findByRole('heading', { name: 'Gerät auswählen' });

    pickDevice('Pferd');
    await screen.findByTestId('rotation-device-200');
    expect(stateOf(200)).toBe('current');

    fireEvent.click(screen.getByRole('button', { name: 'Gerät abschließen' }));
    await screen.findByRole('heading', { name: 'Gerät auswählen' });
    expect(within(deviceCard('Ringe')).getByText('Als Nächstes')).toBeInTheDocument();
    expect(deviceCard('Pferd')).not.toHaveTextContent('Als Nächstes');
  });

  it('suggests nothing after the last device', async () => {
    mockApi(rotationOf([100, 200, 300]));
    await openDeviceList();
    pickDevice('Ringe');
    await screen.findByTestId('rotation-device-300');

    fireEvent.click(screen.getByRole('button', { name: 'Gerät abschließen' }));
    await screen.findByRole('heading', { name: 'Gerät auswählen' });
    expect(screen.queryByText('Als Nächstes')).not.toBeInTheDocument();
  });

  it('suggests nothing when the user only went back without completing', async () => {
    mockApi(rotationOf([100, 200, 300]));
    await openDeviceList();
    pickDevice('Boden');
    await screen.findByTestId('rotation-device-100');

    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    await screen.findByRole('heading', { name: 'Gerät auswählen' });
    expect(screen.queryByText('Als Nächstes')).not.toBeInTheDocument();
  });

  it('shows no rotation and no suggestion when none is planned', async () => {
    mockApi([]);
    await openDeviceList();
    pickDevice('Boden');

    await screen.findByTestId('context-device');
    expect(screen.queryAllByTestId(/^rotation-device-/)).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Gerät abschließen' }));
    await screen.findByRole('heading', { name: 'Gerät auswählen' });
    expect(screen.queryByText('Als Nächstes')).not.toBeInTheDocument();
  });

  it('shows no rotation row when the scored device is not part of the planned rotation', async () => {
    mockApi(rotationOf([100, 200]));
    await openDeviceList();
    pickDevice('Ringe');

    await screen.findByTestId('context-device');
    expect(screen.queryAllByTestId(/^rotation-device-/)).toHaveLength(0);
  });
});
