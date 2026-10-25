import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ScoringContextBar from '../components/JuryPortal/components/ScoringContextBar';

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
});
