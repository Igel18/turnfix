import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SquadSelection from '../components/JuryPortal/components/SquadSelection';
import type { ActiveSquadInfo, Squad } from '../components/JuryPortal/JuryPortal.types';

const person = (id: number, first: string, last: string, startNumber?: number) =>
  ({ id, firstName: first, lastName: last, startNumber }) as any;

const squads: Squad[] = [
  { id: 1, name: 'Riege 1', participants: [person(1, 'Anna', 'Alt', 7), person(2, 'Berta', 'Bunt', 8)] },
  { id: 2, name: 'Riege 2', participants: [person(3, 'Cora', 'Camp', 9)] },
  { id: 3, name: 'Riege 3', participants: [] },
];

const info = (squadName: string, status: ActiveSquadInfo['status'], extra: Partial<ActiveSquadInfo> = {}): ActiveSquadInfo => ({
  squadName, status, currentDeviceName: null, currentDisciplineId: null, timeInfo: '', ...extra,
});

const baseProps = () => ({
  squads,
  loading: false,
  activeSquadInfos: [] as ActiveSquadInfo[],
  currentTime: '',
  onSquadSelect: vi.fn(),
  onBack: vi.fn(),
});

const names = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);

describe('SquadSelection', () => {
  it('shows the heading and a card per squad with its participant count', () => {
    render(<SquadSelection {...baseProps()} />);
    expect(screen.getByRole('heading', { name: 'Riege auswählen' })).toBeInTheDocument();
    expect(names()).toEqual(['Riege 1', 'Riege 2', 'Riege 3']);
    expect(screen.getByText('2 Teilnehmer')).toBeInTheDocument();
    expect(screen.getByText('1 Teilnehmer')).toBeInTheDocument();
    expect(screen.getByText('0 Teilnehmer')).toBeInTheDocument();
  });

  it('previews the first three participants and abbreviates the rest', () => {
    const many: Squad = {
      id: 9, name: 'Große Riege',
      participants: [1, 2, 3, 4, 5].map(i => person(i, `V${i}`, `N${i}`, i)),
    };
    render(<SquadSelection {...baseProps()} squads={[many]} />);
    expect(screen.getByText(/#1\s+V1\s+N1/)).toBeInTheDocument();
    expect(screen.getByText(/#3\s+V3\s+N3/)).toBeInTheDocument();
    expect(screen.queryByText(/V4/)).not.toBeInTheDocument();
    expect(screen.getByText('...und 2 weitere')).toBeInTheDocument();
  });

  it('accepts firstname/lastname spellings from the API', () => {
    const s: Squad = { id: 1, name: 'R', participants: [{ id: 1, firstname: 'Dora', lastname: 'Dach', startNumber: 4 } as any] };
    render(<SquadSelection {...baseProps()} squads={[s]} />);
    expect(screen.getByText(/Dora\s+Dach/)).toBeInTheDocument();
  });

  it('calls onSquadSelect with the clicked squad', () => {
    const props = baseProps();
    render(<SquadSelection {...props} />);
    fireEvent.click(screen.getByRole('heading', { name: 'Riege 2' }));
    expect(props.onSquadSelect).toHaveBeenCalledWith(squads[1]);
  });

  it('calls onBack', () => {
    const props = baseProps();
    render(<SquadSelection {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows a loading and an empty message', () => {
    const { rerender } = render(<SquadSelection {...baseProps()} squads={[]} loading />);
    expect(screen.getByText('Lade Riegen...')).toBeInTheDocument();

    rerender(<SquadSelection {...baseProps()} squads={[]} />);
    expect(screen.getByText('Keine Riegen gefunden für dieses Event')).toBeInTheDocument();
  });

  describe('time planning highlighting', () => {
    const infos = [
      info('Riege 1', 'past'),
      info('Riege 2', 'active', { currentDeviceName: 'Barren', timeInfo: '10:00 – 10:30 Uhr' }),
      info('Riege 3', 'upcoming', { currentDeviceName: 'Reck', timeInfo: 'ab 10:30 Uhr' }),
    ];

    it('shows clock and legend only when time planning data exists', () => {
      const { rerender } = render(<SquadSelection {...baseProps()} />);
      expect(screen.queryByText('Aktuell aktiv')).not.toBeInTheDocument();

      rerender(<SquadSelection {...baseProps()} activeSquadInfos={infos} currentTime="10:12" />);
      expect(screen.getByText('10:12 Uhr')).toBeInTheDocument();
      expect(screen.getByText('Bald dran (≤30 min)')).toBeInTheDocument();
    });

    it('sorts active first, then upcoming, then unknown, then past', () => {
      render(<SquadSelection {...baseProps()} activeSquadInfos={infos} currentTime="10:12" />);
      expect(names()).toEqual(['Riege 2', 'Riege 3', 'Riege 1']);
    });

    it('shows badges and the device with time info for active and upcoming squads', () => {
      render(<SquadSelection {...baseProps()} activeSquadInfos={infos} currentTime="10:12" />);
      const active = screen.getByRole('heading', { name: 'Riege 2' }).closest('div.cursor-pointer') as HTMLElement;
      expect(within(active).getByText('Aktuell aktiv', { selector: 'span' })).toBeInTheDocument();
      expect(within(active).getByText('Barren')).toBeInTheDocument();
      expect(within(active).getByText(/10:00 – 10:30 Uhr/)).toBeInTheDocument();

      const upcoming = screen.getByRole('heading', { name: 'Riege 3' }).closest('div.cursor-pointer') as HTMLElement;
      expect(within(upcoming).getByText('Bald dran')).toBeInTheDocument();
      expect(within(upcoming).getByText(/Nächstes Gerät:/)).toBeInTheDocument();
      expect(within(upcoming).getByText('Reck')).toBeInTheDocument();
    });

    it('shows no badge for squads that are over', () => {
      render(<SquadSelection {...baseProps()} activeSquadInfos={infos} currentTime="10:12" />);
      const past = screen.getByRole('heading', { name: 'Riege 1' }).closest('div.cursor-pointer') as HTMLElement;
      expect(within(past).queryByText('Aktuell aktiv')).not.toBeInTheDocument();
      expect(within(past).queryByText('Bald dran')).not.toBeInTheDocument();
    });
  });
});
