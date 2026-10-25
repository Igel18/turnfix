import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventSelection from '../components/JuryPortal/components/EventSelection';

const events = [
  { int_eventid: 1, var_eventname: 'Frühjahrscup' },
  { int_eventid: 2, var_eventname: 'Herbstpokal', dat_eventbeginn: '2026-10-25' },
];

const baseProps = () => ({
  events,
  filteredEvents: events,
  filterToday: false,
  loading: false,
  selectedEvent: null as number | null,
  onEventChange: vi.fn(),
  onFilterTodayChange: vi.fn(),
  onNext: vi.fn(),
});

describe('EventSelection', () => {
  it('shows the portal title and the event select with all offered events', () => {
    render(<EventSelection {...baseProps()} />);
    expect(screen.getByRole('heading', { name: 'Jury Portal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bitte Event auswählen...' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Frühjahrscup' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Herbstpokal/ })).toBeInTheDocument();
  });

  it('only offers the filtered events', () => {
    render(<EventSelection {...baseProps()} filteredEvents={[events[0]]} filterToday />);
    expect(screen.getByRole('option', { name: 'Frühjahrscup' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Herbstpokal/ })).not.toBeInTheDocument();
  });

  it('reports the chosen event id as a number and null for the placeholder', () => {
    const props = baseProps();
    render(<EventSelection {...props} />);
    const select = screen.getByRole('combobox');

    fireEvent.change(select, { target: { value: '2' } });
    expect(props.onEventChange).toHaveBeenLastCalledWith(2);

    fireEvent.change(select, { target: { value: '' } });
    expect(props.onEventChange).toHaveBeenLastCalledWith(null);
  });

  it('shows the current selection', () => {
    render(<EventSelection {...baseProps()} selectedEvent={2} />);
    expect(screen.getByRole('combobox')).toHaveValue('2');
  });

  it('disables "weiter" without an event and while loading', () => {
    const { rerender } = render(<EventSelection {...baseProps()} />);
    expect(screen.getByRole('button', { name: /Weiter zur Riegeneinteilung/ })).toBeDisabled();

    rerender(<EventSelection {...baseProps()} selectedEvent={1} loading />);
    expect(screen.getByRole('button', { name: 'Lädt...' })).toBeDisabled();
  });

  it('continues with the chosen event', () => {
    const props = baseProps();
    render(<EventSelection {...props} selectedEvent={1} />);
    fireEvent.click(screen.getByRole('button', { name: /Weiter zur Riegeneinteilung/ }));
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  describe('today filter', () => {
    it('reflects and changes the filter state', () => {
      const props = baseProps();
      const { rerender } = render(<EventSelection {...props} filterToday />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(props.onFilterTodayChange).toHaveBeenCalledWith(false);

      rerender(<EventSelection {...props} filterToday={false} />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('shows the number of events matching the current filter setting', () => {
      const { rerender } = render(<EventSelection {...baseProps()} filterToday filteredEvents={[events[0]]} />);
      expect(screen.getByText('1 Event(s)')).toBeInTheDocument();

      rerender(<EventSelection {...baseProps()} filterToday={false} />);
      expect(screen.getByText('2 Event(s)')).toBeInTheDocument();
    });

    it('explains when no event takes place today', () => {
      render(<EventSelection {...baseProps()} filterToday filteredEvents={[]} />);
      expect(screen.getByText(/Keine Events für heute gefunden/)).toBeInTheDocument();
    });

    it('does not show the hint when the filter is off', () => {
      render(<EventSelection {...baseProps()} filterToday={false} filteredEvents={[]} />);
      expect(screen.queryByText(/Keine Events für heute gefunden/)).not.toBeInTheDocument();
    });
  });
});
