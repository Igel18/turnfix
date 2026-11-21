import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ScoringContextBar from '../components/JuryPortal/components/ScoringContextBar';
import { DeviceRotationProgress } from '../components/JuryPortal/components/ScoringView';
import type { RotationDevice } from '../components/JuryPortal/JuryPortal.types';

describe('ScoringContextBar', () => {
  it('shows Durchgang, Riege and Bahn', () => {
    render(<ScoringContextBar durchgang={2} squadName="Riege A" bahn={3} />);

    expect(within(screen.getByTestId('context-durchgang')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-squad')).getByText('Riege A')).toBeInTheDocument();
    expect(within(screen.getByTestId('context-bahn')).getByText('3')).toBeInTheDocument();
  });

  it('omits unavailable context entries', () => {
    render(<ScoringContextBar durchgang={null} squadName={undefined} bahn={null} />);
    expect(screen.queryAllByTestId(/^context-/)).toHaveLength(0);
  });
});

describe('DeviceRotationProgress', () => {
  const device = (disciplineId: number, name: string): RotationDevice => ({
    round: disciplineId,
    disciplineId,
    name,
    shortName: name.slice(0, 3),
    icon: null,
  });
  const rotation = [device(1, 'Boden'), device(2, 'Pferd'), device(3, 'Ringe')];

  it('groups only explicitly completed devices, highlights the selected one and lists remaining devices', () => {
    render(
      <DeviceRotationProgress
        rotation={rotation}
        completedDisciplineIds={[1]}
        currentDevice={{ id: 2, name: 'Pferd', disciplineId: 2, icon: '', iconPath: '/icons/pferd.png' }}
        currentDisciplineId={2}
      />
    );

    expect(screen.getByTestId('rotation-device-1')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('rotation-device-1')).toHaveTextContent('Boden');
    expect(screen.getByTestId('rotation-device-2')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('rotation-device-2')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('rotation-device-2').querySelector('img')).toHaveAttribute('src', '/icons/pferd.png');
    expect(screen.getByTestId('rotation-device-3')).toHaveAttribute('data-state', 'upcoming');
    expect(screen.getByTestId('rotation-device-3')).toHaveTextContent('Ringe');
  });

  it('does not imply earlier devices are completed based on rotation order', () => {
    render(
      <DeviceRotationProgress
        rotation={rotation}
        completedDisciplineIds={[]}
        currentDevice={{ id: 2, name: 'Pferd', disciplineId: 2, icon: '' }}
        currentDisciplineId={2}
      />
    );

    expect(screen.getByTestId('rotation-device-1')).toHaveAttribute('data-state', 'upcoming');
    expect(screen.getByTestId('rotation-device-3')).toHaveAttribute('data-state', 'upcoming');
    expect(screen.getByText('Vorherige Geräte noch offen')).toBeInTheDocument();
    expect(screen.getByTestId('rotation-device-1')).toHaveTextContent('Runde 1');
    expect(screen.getByTestId('rotation-device-3')).toHaveTextContent('Als Nächstes · Runde 3');
  });

  it('displays the remaining devices in rotation order with their planned rounds', () => {
    const reordered = [
      { ...device(2, 'Pferd'), round: 1 },
      { ...device(3, 'Ringe'), round: 3 },
      { ...device(1, 'Boden'), round: 7 },
    ];
    render(
      <DeviceRotationProgress
        rotation={reordered}
        completedDisciplineIds={[]}
        currentDevice={{ id: 2, name: 'Pferd', disciplineId: 2, icon: '' }}
        currentDisciplineId={2}
      />
    );

    const list = screen.getByRole('list', { name: 'Geplante nächste Geräte' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map(item => item.getAttribute('data-testid'))).toEqual([
      'rotation-device-3', 'rotation-device-1',
    ]);
    expect(items[0]).toHaveTextContent('RingeAls Nächstes · Runde 3');
    expect(items[1]).toHaveTextContent('BodenRunde 7');
  });

  it('does not invent a planned next round when rotation data has no round', () => {
    render(
      <DeviceRotationProgress
        rotation={[device(1, 'Boden'), { ...device(2, 'Pferd'), round: null }]}
        completedDisciplineIds={[]}
        currentDevice={{ id: 1, name: 'Boden', disciplineId: 1, icon: '' }}
        currentDisciplineId={1}
      />
    );

    expect(screen.getByTestId('rotation-device-2')).toHaveTextContent('Reihenfolge offen');
    expect(screen.getByTestId('rotation-device-2')).not.toHaveTextContent('Als Nächstes');
  });

  it('shows the selected device when no rotation is planned', () => {
    render(
      <DeviceRotationProgress
        rotation={[]}
        completedDisciplineIds={[]}
        currentDevice={{ id: 2, name: 'Pferd', disciplineId: 2, icon: '' }}
        currentDisciplineId={2}
      />
    );

    expect(screen.getByTestId('rotation-device-2')).toHaveTextContent('Pferd');
    expect(screen.getByText('Keine weiteren Geräte')).toBeInTheDocument();
  });
});
