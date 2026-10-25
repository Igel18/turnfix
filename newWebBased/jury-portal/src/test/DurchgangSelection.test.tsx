import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DurchgangSelection from '../components/JuryPortal/components/DurchgangSelection';
import type { ActiveSquadInfo, Durchgang } from '../components/JuryPortal/JuryPortal.types';

const dg = (durchgang: number, squads: Array<[string, number]>, extra: Partial<Durchgang> = {}): Durchgang => ({
  durchgang,
  startTime: null,
  competitions: [{ id: durchgang * 10, name: `Wettkampf ${durchgang}`, number: String(durchgang) }],
  squads: squads.map(([name, participantCount]) => ({ name, participantCount })),
  ...extra,
});

const info = (squadName: string, status: ActiveSquadInfo['status']): ActiveSquadInfo => ({
  squadName, status, currentDeviceName: null, currentDisciplineId: null, timeInfo: '',
});

const baseProps = () => ({
  durchgaenge: [dg(1, [['A', 3], ['B', 2]]), dg(2, [['C', 4]])],
  loading: false,
  activeSquadInfos: [] as ActiveSquadInfo[],
  currentTime: '',
  onDurchgangSelect: vi.fn(),
  onBack: vi.fn(),
});

describe('DurchgangSelection', () => {
  it('shows the heading and one card per Durchgang', () => {
    render(<DurchgangSelection {...baseProps()} />);
    expect(screen.getByRole('heading', { name: 'Durchgang auswählen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Durchgang 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Durchgang 2' })).toBeInTheDocument();
  });

  it('shows squad count, participant count and competitions on the card', () => {
    render(<DurchgangSelection {...baseProps()} />);
    const card = screen.getByTestId('durchgang-card-1');
    expect(within(card).getByText('2 Riegen · 5 Teilnehmer')).toBeInTheDocument();
    expect(within(card).getByText('Wettkampf 1')).toBeInTheDocument();
  });

  it('uses the singular for a single squad', () => {
    render(<DurchgangSelection {...baseProps()} />);
    expect(within(screen.getByTestId('durchgang-card-2')).getByText('1 Riege · 4 Teilnehmer')).toBeInTheDocument();
  });

  it('lists the squad names of the Durchgang', () => {
    render(<DurchgangSelection {...baseProps()} />);
    const card = screen.getByTestId('durchgang-card-1');
    expect(within(card).getByText('A')).toBeInTheDocument();
    expect(within(card).getByText('B')).toBeInTheDocument();
  });

  it('abbreviates long squad lists', () => {
    const squads: Array<[string, number]> = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(n => [n, 1]);
    render(<DurchgangSelection {...baseProps()} durchgaenge={[dg(1, squads), dg(2, [['X', 1]])]} />);
    const card = screen.getByTestId('durchgang-card-1');
    expect(within(card).getByText('...und 3 weitere')).toBeInTheDocument();
    expect(within(card).queryByText('G')).not.toBeInTheDocument();
  });

  it('shows the planned start time', () => {
    render(<DurchgangSelection {...baseProps()} durchgaenge={[dg(1, [['A', 1]], { startTime: '09:30' }), dg(2, [['B', 1]])]} />);
    expect(within(screen.getByTestId('durchgang-card-1')).getByText('ab 09:30 Uhr')).toBeInTheDocument();
    expect(within(screen.getByTestId('durchgang-card-2')).queryByText(/Uhr/)).not.toBeInTheDocument();
  });

  it('calls onDurchgangSelect with the clicked Durchgang', () => {
    const props = baseProps();
    render(<DurchgangSelection {...props} />);
    fireEvent.click(screen.getByTestId('durchgang-card-2'));
    expect(props.onDurchgangSelect).toHaveBeenCalledTimes(1);
    expect(props.onDurchgangSelect).toHaveBeenCalledWith(props.durchgaenge[1]);
  });

  it('calls onBack from the back button', () => {
    const props = baseProps();
    render(<DurchgangSelection {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows a loading message', () => {
    render(<DurchgangSelection {...baseProps()} loading durchgaenge={[]} />);
    expect(screen.getByText('Lade Durchgänge...')).toBeInTheDocument();
  });

  it('shows an empty message when there are no Durchgänge', () => {
    render(<DurchgangSelection {...baseProps()} durchgaenge={[]} />);
    expect(screen.getByText('Keine Durchgänge gefunden für dieses Event')).toBeInTheDocument();
  });

  it('does not show Durchgänge without squads', () => {
    render(<DurchgangSelection {...baseProps()} durchgaenge={[dg(1, [['A', 1]]), dg(2, [])]} />);
    expect(screen.getByTestId('durchgang-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('durchgang-card-2')).not.toBeInTheDocument();
  });

  describe('time planning highlighting (same look as the squad list)', () => {
    const infos = [info('A', 'active'), info('B', 'unknown'), info('C', 'upcoming')];

    it('shows legend and clock only with time planning data', () => {
      const { rerender } = render(<DurchgangSelection {...baseProps()} />);
      expect(screen.queryByText('Aktuell aktiv')).not.toBeInTheDocument();
      expect(screen.queryByText('10:15 Uhr')).not.toBeInTheDocument();

      rerender(<DurchgangSelection {...baseProps()} activeSquadInfos={infos} currentTime="10:15" />);
      expect(screen.getByText('10:15 Uhr')).toBeInTheDocument();
      expect(screen.getByText('Bald dran (≤30 min)')).toBeInTheDocument();
    });

    it('badges the active and the upcoming Durchgang', () => {
      render(<DurchgangSelection {...baseProps()} activeSquadInfos={infos} currentTime="10:15" />);
      expect(within(screen.getByTestId('durchgang-card-1')).getByText('Aktuell aktiv')).toBeInTheDocument();
      expect(within(screen.getByTestId('durchgang-card-2')).getByText('Bald dran')).toBeInTheDocument();
    });

    it('lists the active Durchgang first', () => {
      render(
        <DurchgangSelection
          {...baseProps()}
          durchgaenge={[dg(1, [['A', 1]]), dg(2, [['B', 1]])]}
          activeSquadInfos={[info('A', 'unknown'), info('B', 'active')]}
          currentTime="10:00"
        />
      );
      const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
      expect(headings).toEqual(['Durchgang 2', 'Durchgang 1']);
    });
  });
});
