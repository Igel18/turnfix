import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ScoringContextBar from '../components/JuryPortal/components/ScoringContextBar';
import type { RotationDevice } from '../components/JuryPortal/JuryPortal.types';

describe('ScoringContextBar', () => {
  it('shows Durchgang, Riege, Bahn and Gerät', () => {
    render(<ScoringContextBar durchgang={2} squadName="Riege A" bahn={3} deviceName="Boden" />);

    expect(within(screen.getByTestId('context-durchgang')).getByText('Durchgang')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-durchgang')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-squad')).getByText('Riege A')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-bahn')).getByText('3')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-device')).getByText('Boden')).toBeInTheDocument();
  });

  it('labels every entry', () => {
    render(<ScoringContextBar durchgang={1} squadName="A" bahn={1} deviceName="Boden" />);
    ['Durchgang', 'Riege', 'Bahn', 'Gerät'].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('omits the Durchgang when there is none', () => {
    render(<ScoringContextBar durchgang={null} squadName="A" bahn={1} deviceName="Boden" />);
    expect(screen.queryByTestId('context-durchgang')).not.toBeInTheDocument();
    expect(screen.getByTestId('context-squad')).toBeInTheDocument();
  });

  it('omits the Bahn when there is none', () => {
    render(<ScoringContextBar durchgang={1} squadName="A" bahn={null} deviceName="Boden" />);
    expect(screen.queryByTestId('context-bahn')).not.toBeInTheDocument();
    expect(screen.getByTestId('context-device')).toBeInTheDocument();
  });

  it('keeps the order Durchgang, Riege, Bahn, Gerät', () => {
    render(<ScoringContextBar durchgang={1} squadName="A" bahn={2} deviceName="Boden" />);
    const order = screen.getAllByTestId(/^context-/).map(el => el.getAttribute('data-testid'));
    expect(order).toEqual(['context-durchgang', 'context-squad', 'context-bahn', 'context-device']);
  });

  it('highlights the device as the current input target', () => {
    render(<ScoringContextBar durchgang={1} squadName="A" bahn={1} deviceName="Boden" />);
    expect(screen.getByTestId('context-device')).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('context-squad')).not.toHaveAttribute('data-current');
  });

  it('shows placeholders for missing names instead of crashing', () => {
    render(<ScoringContextBar durchgang={null} squadName={undefined} bahn={null} deviceName={undefined} />);
    expect(screen.queryByTestId('context-squad')).not.toBeInTheDocument();
    expect(screen.queryByTestId('context-device')).not.toBeInTheDocument();
  });

  describe('device rotation of the squad', () => {
    const dev = (disciplineId: number, name: string): RotationDevice => ({
      round: disciplineId, disciplineId, name, shortName: name.slice(0, 3), icon: null,
    });
    const rotation = [dev(1, 'Boden'), dev(2, 'Pferd'), dev(3, 'Ringe')];

    const renderBar = (currentDisciplineId: number | null, rot: RotationDevice[] = rotation) =>
      render(
        <ScoringContextBar
          durchgang={1}
          squadName="A"
          bahn={1}
          deviceName="Pferd"
          rotation={rot}
          currentDisciplineId={currentDisciplineId}
        />
      );

    it('lists every device of the rotation in order with its state', () => {
      renderBar(2);
      const items = screen.getAllByTestId(/^rotation-device-/);
      expect(items.map(i => i.getAttribute('data-testid'))).toEqual([
        'rotation-device-1', 'rotation-device-2', 'rotation-device-3',
      ]);
      expect(items.map(i => i.getAttribute('data-state'))).toEqual(['done', 'current', 'next']);
    });

    it('shows the names of the devices', () => {
      renderBar(2);
      expect(within(screen.getByTestId('rotation-device-1')).getByText(/Boden/)).toBeInTheDocument();
      expect(within(screen.getByTestId('rotation-device-3')).getByText(/Ringe/)).toBeInTheDocument();
    });

    it('names the next device', () => {
      renderBar(2);
      expect(screen.getByTestId('rotation-next')).toHaveTextContent('Nächstes Gerät: Ringe');
    });

    it('announces the last device of the squad', () => {
      renderBar(3);
      expect(screen.queryByTestId('rotation-next')).not.toBeInTheDocument();
      expect(screen.getByTestId('rotation-last')).toHaveTextContent('Letztes Gerät der Riege');
    });

    it('shows the first device as current without any done device', () => {
      renderBar(1);
      const states = screen.getAllByTestId(/^rotation-device-/).map(i => i.getAttribute('data-state'));
      expect(states).toEqual(['current', 'next', 'upcoming']);
    });

    it('marks the current device as the one being scored', () => {
      renderBar(2);
      expect(screen.getByTestId('rotation-device-2')).toHaveAttribute('aria-current', 'step');
      expect(screen.getByTestId('rotation-device-1')).not.toHaveAttribute('aria-current');
    });

    it('is hidden without a rotation, for an unknown current device or without a current device', () => {
      const { unmount } = renderBar(2, []);
      expect(screen.queryByTestId('rotation-device-2')).not.toBeInTheDocument();
      unmount();

      const second = renderBar(99);
      expect(screen.queryAllByTestId(/^rotation-device-/)).toHaveLength(0);
      second.unmount();

      renderBar(null);
      expect(screen.queryAllByTestId(/^rotation-device-/)).toHaveLength(0);
    });

    it('still works without the rotation props', () => {
      render(<ScoringContextBar durchgang={1} squadName="A" bahn={1} deviceName="Boden" />);
      expect(screen.queryAllByTestId(/^rotation-device-/)).toHaveLength(0);
      expect(screen.getByTestId('context-device')).toBeInTheDocument();
    });
  });
});
