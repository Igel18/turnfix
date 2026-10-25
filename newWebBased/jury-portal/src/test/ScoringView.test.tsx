import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ScoringView from '../components/JuryPortal/components/ScoringView';
import type { Device, DisciplineField, Participant, Squad } from '../components/JuryPortal/JuryPortal.types';

const participant = (id: number, name: string, extra: Partial<Participant> = {}): Participant => ({
  id,
  participantId: id,
  name,
  club: 'TV Test',
  clubName: 'TV Test',
  startNumber: id,
  firstName: name.split(' ')[0],
  lastName: name.split(' ')[1] ?? '',
  status: 'pending',
  ...extra,
});

const device = (extra: Partial<Device> = {}): Device => ({
  id: 1, name: 'Boden', disciplineId: 1, icon: '', int_berechnung: 2, ...extra,
});

const squad: Squad = { id: 1, name: 'Riege 7', participants: [] };

const baseProps = () => {
  const participants = [participant(1, 'Anna Alt'), participant(2, 'Berta Bunt'), participant(3, 'Cora Camp')];
  return {
    participants,
    currentParticipant: participants[0] as Participant | undefined,
    currentParticipantIndex: 0,
    selectedDevice: device() as Device | null,
    selectedSquad: squad as Squad | null,
    disciplineFields: [] as DisciplineField[],
    loadedJuryResults: {} as Record<string, number>,
    score: '',
    loading: false,
    statuses: [{ id: 1, name: 'Leistungen erfasst', colorCode: '{0,255,0}' }, { id: 2, name: 'Offen', colorCode: '{255,0,0}' }],
    squadStatusId: null as number | null,
    onParticipantSelect: vi.fn(),
    onScoreChange: vi.fn(),
    onSquadStatusChange: vi.fn(),
    onCalculationComplete: vi.fn(),
    onScoreSubmit: vi.fn(),
    onDeviceComplete: vi.fn(),
    onBack: vi.fn(),
    getScoreValidation: vi.fn(() => ({ isValid: true, message: '' })),
  };
};

const sidebar = () => screen.getByRole('heading', { name: /Teilnehmer \(\d+\)/ }).closest('div.flex-col') as HTMLElement;

describe('ScoringView', () => {
  describe('header', () => {
    it('shows the device and the squad and goes back', () => {
      const props = baseProps();
      render(<ScoringView {...props} />);
      expect(screen.getByRole('heading', { level: 1, name: 'Boden' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));
      expect(props.onBack).toHaveBeenCalledTimes(1);
    });

    it('completes the device', () => {
      const props = baseProps();
      render(<ScoringView {...props} />);
      fireEvent.click(screen.getByRole('button', { name: 'Gerät abschließen' }));
      expect(props.onDeviceComplete).toHaveBeenCalledTimes(1);
    });

    it('uses the database icon of the device when there is one', () => {
      const props = baseProps();
      render(<ScoringView {...props} selectedDevice={device({ iconPath: '/icons/boden.png' })} />);
      expect(screen.getByAltText('Boden icon')).toHaveAttribute('src', '/icons/boden.png');
    });
  });

  describe('participant list', () => {
    it('lists all participants with start number, name and club', () => {
      render(<ScoringView {...baseProps()} />);
      expect(screen.getByRole('heading', { name: 'Teilnehmer (3)' })).toBeInTheDocument();
      expect(within(sidebar()).getByText('Anna Alt')).toBeInTheDocument();
      expect(within(sidebar()).getByText('Berta Bunt')).toBeInTheDocument();
      expect(within(sidebar()).getAllByText('TV Test')).toHaveLength(3);
    });

    it('shows the progress of the completed participants', () => {
      const props = baseProps();
      props.participants[1] = participant(2, 'Berta Bunt', { currentScore: 12.5 });
      render(<ScoringView {...props} />);
      expect(within(sidebar()).getByText('1 / 3')).toBeInTheDocument();
    });

    it('counts a stored score of 0 as completed', () => {
      const props = baseProps();
      props.participants[0] = participant(1, 'Anna Alt', { currentScore: 0 });
      render(<ScoringView {...props} />);
      expect(within(sidebar()).getByText('1 / 3')).toBeInTheDocument();
    });

    it('shows stored scores and a checkmark', () => {
      const props = baseProps();
      props.participants[1] = participant(2, 'Berta Bunt', { currentScore: 12.5 });
      render(<ScoringView {...props} />);
      expect(within(sidebar()).getByText(/12[.,]50/)).toBeInTheDocument();
      expect(within(sidebar()).getByText('✓')).toBeInTheDocument();
    });

    it('shows the result of a built-in formula together with the raw input', () => {
      const props = baseProps();
      props.participants[1] = participant(2, 'Berta Bunt', { currentScore: 5 });
      render(<ScoringView {...props} selectedDevice={device({ var_formel: '20-x' })} />);
      expect(within(sidebar()).getByText(/15[.,]00/)).toBeInTheDocument();
      expect(within(sidebar()).getByText(/Eingabe:\s*5[.,]00/)).toBeInTheDocument();
    });

    it('marks the current participant with an arrow', () => {
      render(<ScoringView {...baseProps()} currentParticipantIndex={1} />);
      expect(within(sidebar()).getByText('→')).toBeInTheDocument();
    });

    it('selects a participant by index when clicked', () => {
      const props = baseProps();
      render(<ScoringView {...props} />);
      fireEvent.click(within(sidebar()).getByText('Cora Camp'));
      expect(props.onParticipantSelect).toHaveBeenCalledWith(2);
    });

    it('shows a message without participants', () => {
      render(<ScoringView {...baseProps()} participants={[]} currentParticipant={undefined} />);
      expect(screen.getByText('Keine Teilnehmer gefunden')).toBeInTheDocument();
      expect(screen.getByText('Wählen Sie einen Teilnehmer aus der Liste')).toBeInTheDocument();
    });
  });

  describe('squad status', () => {
    it('offers the statuses and reports the chosen one as a number', () => {
      const props = baseProps();
      render(<ScoringView {...props} />);
      const select = within(sidebar()).getByRole('combobox');
      expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual(['Status wählen', 'Leistungen erfasst', 'Offen']);

      fireEvent.change(select, { target: { value: '2' } });
      expect(props.onSquadStatusChange).toHaveBeenCalledWith(2);
    });

    it('shows the current status and ignores the placeholder', () => {
      const props = baseProps();
      render(<ScoringView {...props} squadStatusId={1} />);
      const select = within(sidebar()).getByRole('combobox');
      expect(select).toHaveValue('1');

      fireEvent.change(select, { target: { value: '' } });
      expect(props.onSquadStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('simple score input', () => {
    const scoreInput = () => screen.getByPlaceholderText(/0[.,]0+/) as HTMLInputElement;

    it('shows the current participant', () => {
      render(<ScoringView {...baseProps()} currentParticipantIndex={1} currentParticipant={baseProps().participants[1]} />);
      expect(screen.getByRole('heading', { level: 2, name: 'Berta Bunt' })).toBeInTheDocument();
      expect(screen.getByText('Teilnehmer 2 von 3')).toBeInTheDocument();
    });

    it('shows the entered score and reports changes', () => {
      const props = baseProps();
      render(<ScoringView {...props} score="9,5" />);
      expect(scoreInput()).toHaveValue('9,5');

      fireEvent.change(scoreInput(), { target: { value: '9,55' } });
      expect(props.onScoreChange).toHaveBeenCalledWith('9,55');
    });

    it('normalizes the score when leaving the field', () => {
      const props = baseProps();
      render(<ScoringView {...props} score="9" />);
      fireEvent.blur(scoreInput(), { target: { value: '9' } });
      expect(props.onScoreChange).toHaveBeenCalledWith(expect.stringMatching(/^9[.,]00$/));
    });

    it('disables saving without a score and while loading', () => {
      const { rerender } = render(<ScoringView {...baseProps()} score="" />);
      expect(screen.getByRole('button', { name: /Bewertung speichern/ })).toBeDisabled();

      rerender(<ScoringView {...baseProps()} score="  " />);
      expect(screen.getByRole('button', { name: /Bewertung speichern/ })).toBeDisabled();

      rerender(<ScoringView {...baseProps()} score="9.5" loading />);
      expect(screen.getByRole('button', { name: /Speichert/ })).toBeDisabled();
    });

    it('saves the score', () => {
      const props = baseProps();
      render(<ScoringView {...props} score="9.5" />);
      fireEvent.click(screen.getByRole('button', { name: /Bewertung speichern/ }));
      expect(props.onScoreSubmit).toHaveBeenCalledTimes(1);
    });

    it('shows the maximum score of the device', () => {
      render(<ScoringView {...baseProps()} selectedDevice={device({ maxScore: 10 })} />);
      expect(screen.getByText(/max\. 10[.,]00/)).toBeInTheDocument();
    });

    it('shows a validation message for an invalid score', () => {
      const props = baseProps();
      props.getScoreValidation.mockReturnValue({ isValid: false, message: 'Maximal 10.00 Punkte' });
      render(<ScoringView {...props} score="11" />);
      expect(screen.getByText(/Maximal 10.00 Punkte/)).toBeInTheDocument();
    });

    it('does not show a validation message for a valid score', () => {
      render(<ScoringView {...baseProps()} score="9" />);
      expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
    });
  });

  describe('navigation buttons', () => {
    it('is disabled at the first participant going back and enabled going forward', () => {
      const props = baseProps();
      render(<ScoringView {...props} currentParticipantIndex={0} />);
      expect(screen.getByRole('button', { name: /Vorheriger/ })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /Nächster/ }));
      expect(props.onParticipantSelect).toHaveBeenCalledWith(1);
    });

    it('is disabled at the last participant going forward and enabled going back', () => {
      const props = baseProps();
      render(<ScoringView {...props} currentParticipantIndex={2} currentParticipant={props.participants[2]} />);
      expect(screen.getByRole('button', { name: /Nächster/ })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /Vorheriger/ }));
      expect(props.onParticipantSelect).toHaveBeenCalledWith(1);
    });
  });

  describe('linked formula input', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ var_formel: 'A + B' }) }) as Response));
    });
    afterEach(() => vi.unstubAllGlobals());

    const fields: DisciplineField[] = [
      { id: 11, disciplineId: 1, name: 'D-Note', sortOrder: 1, enabled: true, isEndValue: false, isStartValue: false },
      { id: 12, disciplineId: 1, name: 'E-Note', sortOrder: 2, enabled: true, isEndValue: false, isStartValue: false },
      { id: 13, disciplineId: 1, name: 'Endwert', sortOrder: 3, enabled: true, isEndValue: true, isStartValue: false },
    ];

    it('shows the formula and one input per formula value, labelled with the field names', async () => {
      render(<ScoringView {...baseProps()} selectedDevice={device({ int_formelid: 5 })} disciplineFields={fields} />);

      expect(await screen.findByText('A: D-Note')).toBeInTheDocument();
      expect(screen.getByText('B: E-Note')).toBeInTheDocument();
      expect(screen.getByText('A + B', { selector: 'div.font-mono' })).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
    });

    it('reports the calculated result and the field values', async () => {
      const props = baseProps();
      render(<ScoringView {...props} selectedDevice={device({ int_formelid: 5 })} disciplineFields={fields} />);

      const [a, b] = await screen.findAllByRole('textbox');
      fireEvent.change(a, { target: { value: '5' } });
      fireEvent.change(b, { target: { value: '7,5' } });

      await waitFor(() => expect(props.onCalculationComplete).toHaveBeenLastCalledWith(12.5, { A: 5, B: 7.5 }));
    });
  });
});
