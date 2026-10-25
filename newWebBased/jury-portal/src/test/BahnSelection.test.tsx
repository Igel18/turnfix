import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BahnSelection from '../components/JuryPortal/components/BahnSelection';
import type { BahnOption, Squad } from '../components/JuryPortal/JuryPortal.types';

const option = (bahn: number, competitions: Array<[number, string]>, participantCount: number): BahnOption => ({
  bahn,
  durchgang: 1,
  competitions: competitions.map(([id, name]) => ({ id, name, number: String(id) })),
  competitionIds: competitions.map(([id]) => id),
  participantCount,
});

const participants = (...specs: Array<[number, number, string]>) =>
  specs.map(([id, competitionId, name]) => ({
    id, firstname: name, lastname: 'Muster', startNumber: id, competitions: [{ id: competitionId }],
  })) as any[];

const squad: Squad = {
  id: 1,
  name: 'Riege A',
  participants: participants([1, 10, 'Anna'], [2, 10, 'Berta'], [3, 20, 'Cora']),
};

const baseProps = () => ({
  options: [option(1, [[10, 'Wettkampf Zehn']], 2), option(2, [[20, 'Wettkampf Zwanzig']], 1)],
  squad,
  deviceName: 'Boden',
  loading: false,
  onBahnSelect: vi.fn(),
  onBack: vi.fn(),
});

describe('BahnSelection', () => {
  it('shows the heading with squad and device and one card per Bahn', () => {
    render(<BahnSelection {...baseProps()} />);
    expect(screen.getByRole('heading', { name: 'Bahn auswählen' })).toBeInTheDocument();
    expect(screen.getByText('Riege A · Boden')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bahn 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bahn 2' })).toBeInTheDocument();
  });

  it('shows the participant count of each Bahn', () => {
    render(<BahnSelection {...baseProps()} />);
    expect(within(screen.getByTestId('bahn-card-1')).getByText('2 Teilnehmer')).toBeInTheDocument();
    expect(within(screen.getByTestId('bahn-card-2')).getByText('1 Teilnehmer')).toBeInTheDocument();
  });

  it('shows the competitions of each Bahn', () => {
    render(<BahnSelection {...baseProps()} />);
    expect(within(screen.getByTestId('bahn-card-1')).getByText('Wettkampf Zehn')).toBeInTheDocument();
    expect(within(screen.getByTestId('bahn-card-1')).queryByText('Wettkampf Zwanzig')).not.toBeInTheDocument();
  });

  it('previews only the participants of that Bahn', () => {
    render(<BahnSelection {...baseProps()} />);
    const card1 = screen.getByTestId('bahn-card-1');
    expect(within(card1).getByText(/Anna Muster/)).toBeInTheDocument();
    expect(within(card1).getByText(/Berta Muster/)).toBeInTheDocument();
    expect(within(card1).queryByText(/Cora/)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('bahn-card-2')).getByText(/Cora Muster/)).toBeInTheDocument();
  });

  it('abbreviates long participant lists after three entries', () => {
    const many = participants(...[1, 2, 3, 4, 5].map(i => [i, 10, `P${i}`] as [number, number, string]));
    render(
      <BahnSelection
        {...baseProps()}
        squad={{ ...squad, participants: many }}
        options={[option(1, [[10, 'WK']], 5), option(2, [[20, 'WK2']], 0)]}
      />
    );
    expect(within(screen.getByTestId('bahn-card-1')).getByText('...und 2 weitere')).toBeInTheDocument();
  });

  it('calls onBahnSelect with the clicked option', () => {
    const props = baseProps();
    render(<BahnSelection {...props} />);
    fireEvent.click(screen.getByTestId('bahn-card-2'));
    expect(props.onBahnSelect).toHaveBeenCalledTimes(1);
    expect(props.onBahnSelect).toHaveBeenCalledWith(props.options[1]);
  });

  it('calls onBack from the back button', () => {
    const props = baseProps();
    render(<BahnSelection {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows a loading message', () => {
    render(<BahnSelection {...baseProps()} loading options={[]} />);
    expect(screen.getByText('Lade Bahnen...')).toBeInTheDocument();
  });

  it('shows an empty message when there is no Bahn', () => {
    render(<BahnSelection {...baseProps()} options={[]} />);
    expect(screen.getByText('Keine Bahnen gefunden für diese Riege und dieses Gerät')).toBeInTheDocument();
  });

  it('works without a squad (no participant preview)', () => {
    render(<BahnSelection {...baseProps()} squad={null} />);
    expect(screen.getByTestId('bahn-card-1')).toBeInTheDocument();
  });
});
