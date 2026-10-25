import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceSelection from '../components/JuryPortal/components/DeviceSelection';
import type { Device, Squad } from '../components/JuryPortal/JuryPortal.types';

const device = (id: number, name: string, extra: Partial<Device> = {}): Device => ({
  id, name, disciplineId: id, icon: '', ...extra,
});

const squad: Squad = { id: 1, name: 'Riege 4', participants: [] };

const baseProps = () => ({
  devices: [device(1, 'Boden', { iconPath: '/icons/boden.png' }), device(2, 'Sprung')],
  selectedSquad: squad,
  loading: false,
  onDeviceSelect: vi.fn(),
  onBack: vi.fn(),
});

describe('DeviceSelection', () => {
  it('shows the heading and the name of the squad', () => {
    render(<DeviceSelection {...baseProps()} />);
    expect(screen.getByRole('heading', { name: 'Gerät auswählen' })).toBeInTheDocument();
    expect(screen.getByText('Riege 4')).toBeInTheDocument();
  });

  it('shows a card per device', () => {
    render(<DeviceSelection {...baseProps()} />);
    expect(screen.getByRole('heading', { name: 'Boden' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sprung' })).toBeInTheDocument();
  });

  it('shows the database icon when there is one and a placeholder otherwise', () => {
    render(<DeviceSelection {...baseProps()} />);
    expect(screen.getByAltText('Boden icon')).toHaveAttribute('src', '/icons/boden.png');
    expect(screen.queryByAltText('Sprung icon')).not.toBeInTheDocument();
  });

  it('calls onDeviceSelect with the clicked device', () => {
    const props = baseProps();
    render(<DeviceSelection {...props} />);
    fireEvent.click(screen.getByRole('heading', { name: 'Sprung' }));
    expect(props.onDeviceSelect).toHaveBeenCalledTimes(1);
    expect(props.onDeviceSelect).toHaveBeenCalledWith(props.devices[1]);
  });

  it('calls onBack', () => {
    const props = baseProps();
    render(<DeviceSelection {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows a loading and an empty message', () => {
    const { rerender } = render(<DeviceSelection {...baseProps()} devices={[]} loading />);
    expect(screen.getByText('Lade Geräte...')).toBeInTheDocument();

    rerender(<DeviceSelection {...baseProps()} devices={[]} />);
    expect(screen.getByText('Keine Geräte gefunden')).toBeInTheDocument();
  });

  it('renders without a squad', () => {
    render(<DeviceSelection {...baseProps()} selectedSquad={null} />);
    expect(screen.getByRole('heading', { name: 'Gerät auswählen' })).toBeInTheDocument();
  });

  describe('next device of the squad', () => {
    const card = (name: string) => screen.getByRole('heading', { name }).closest('div.cursor-pointer') as HTMLElement;

    it('marks the suggested next device', () => {
      render(<DeviceSelection {...baseProps()} nextDeviceId={2} />);
      expect(card('Sprung')).toHaveAttribute('data-next', 'true');
      expect(card('Sprung')).toHaveTextContent('Als Nächstes');
      expect(card('Boden')).not.toHaveAttribute('data-next');
      expect(card('Boden')).not.toHaveTextContent('Als Nächstes');
    });

    it('shows no marker without a suggestion or for an unknown device', () => {
      const { rerender } = render(<DeviceSelection {...baseProps()} />);
      expect(screen.queryByText('Als Nächstes')).not.toBeInTheDocument();

      rerender(<DeviceSelection {...baseProps()} nextDeviceId={99} />);
      expect(screen.queryByText('Als Nächstes')).not.toBeInTheDocument();

      rerender(<DeviceSelection {...baseProps()} nextDeviceId={null} />);
      expect(screen.queryByText('Als Nächstes')).not.toBeInTheDocument();
    });

    it('can still choose any device', () => {
      const props = baseProps();
      render(<DeviceSelection {...props} nextDeviceId={2} />);
      fireEvent.click(screen.getByRole('heading', { name: 'Boden' }));
      expect(props.onDeviceSelect).toHaveBeenCalledWith(props.devices[0]);
    });
  });
});
