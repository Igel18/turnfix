import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TimePlanningRotation from '@/pages/TimePlanningRotation';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'timePlanning.session': 'Session',
        'timePlanning.competitionSingle': 'Competition',
        'timePlanning.competitions': 'Competitions',
        'timePlanning.participants': 'Participants',
        'timePlanning.laneLabel': 'Lane',
        'timePlanning.laneDetails': 'Lane details',
        'timePlanning.unassignedCompetitions': 'Unassigned competitions',
        'timePlanning.noUnassignedCompetitions': 'No unassigned competitions',
        'timePlanning.noLanesYet': 'No lanes yet',
        'timePlanning.selectLaneFirst': 'Select lane first',
        'timePlanning.noCompetitionsOnLane': 'No competitions on lane',
        'timePlanning.squad': 'Squad',
        'timePlanning.squads': 'Squads',
        'timePlanning.lanesTitle': 'Lanes',
      }
      return map[key] ?? key
    },
  }),
}));

vi.mock('@/utils/api', () => ({
  apiPut: vi.fn().mockResolvedValue({ success: true }),
  invalidateCache: vi.fn(),
}));

type TestCompetition = {
  id: number;
  name: string;
  round: number;
  participantCount: number;
  int_bahn?: number | null;
};

const baseCompetitions: TestCompetition[] = [
  { id: 101, name: 'WK Durchgang 1', round: 1, participantCount: 10, int_bahn: 1 },
  { id: 102, name: 'WK Durchgang 2', round: 2, participantCount: 12, int_bahn: 1 },
];

const baseSquads = [
  { name: 'Riege 1', participantCount: 10, competitionId: 101, competitionIds: [101] },
  { name: 'Riege 2', participantCount: 12, competitionId: 102, competitionIds: [102] },
];

const baseDevices = [{ name: 'Boden' }, { name: 'Sprung' }];

function RotationHost({ competitions = baseCompetitions }: { competitions?: TestCompetition[] }) {
  const [selectedRound, setSelectedRound] = useState(1);
  const [visible, setVisible] = useState(true);

  return (
    <div>
      <button onClick={() => setVisible(false)}>hide-rotation</button>
      <button onClick={() => setVisible(true)}>show-rotation</button>

      {visible && (
        <TimePlanningRotation
          eventId="1"
          selectedRound={selectedRound}
          onSelectedRoundChange={setSelectedRound}
          competitions={competitions}
          squads={baseSquads}
          devices={baseDevices}
        />
      )}
    </div>
  );
}

describe('TimePlanningRotation round selection', () => {
  it('keeps the selected round after a remount', async () => {
    render(<RotationHost />);

    const round2Button = screen.getByRole('button', { name: /session\s+2/i });
    fireEvent.click(round2Button);

    await waitFor(() => {
      expect(round2Button.className).toContain('bg-blue-600');
    });

    fireEvent.click(screen.getByRole('button', { name: 'hide-rotation' }));
    fireEvent.click(screen.getByRole('button', { name: 'show-rotation' }));

    const round2ButtonAfterRemount = screen.getByRole('button', { name: /session\s+2/i });
    expect(round2ButtonAfterRemount.className).toContain('bg-blue-600');
  });

  it('falls back to first available round when selected round no longer exists', async () => {
    const onSelectedRoundChange = vi.fn();

    render(
      <TimePlanningRotation
        eventId="1"
        selectedRound={3}
        onSelectedRoundChange={onSelectedRoundChange}
        competitions={baseCompetitions}
        squads={baseSquads}
        devices={baseDevices}
      />
    );

    await waitFor(() => {
      expect(onSelectedRoundChange).toHaveBeenCalledWith(1);
    });
  });

  it('shows lane participant counts from competition participantCount (not squad totals)', () => {
    const competitions: TestCompetition[] = [
      { id: 201, name: 'WK Bahn 1', round: 1, participantCount: 20, int_bahn: 1 },
      { id: 202, name: 'WK Bahn 2', round: 1, participantCount: 5, int_bahn: 2 },
    ]

    const squads = [
      { name: 'Riege A', participantCount: 120, competitionId: 201, competitionIds: [201] },
      { name: 'Riege B', participantCount: 90, competitionId: 202, competitionIds: [202] },
    ]

    render(
      <TimePlanningRotation
        eventId="1"
        selectedRound={1}
        competitions={competitions}
        squads={squads}
        devices={baseDevices}
      />
    )

    const lane1Button = screen.getByRole('button', { name: /lane\s+1/i })
    const lane2Button = screen.getByRole('button', { name: /lane\s+2/i })

    expect(within(lane1Button).getByText('20')).toBeInTheDocument()
    expect(within(lane2Button).getByText('5')).toBeInTheDocument()
  })

  it('updates right lane details heading and participant count when lane selection changes', async () => {
    const competitions: TestCompetition[] = [
      { id: 301, name: 'WK Detail 1', round: 1, participantCount: 11, int_bahn: 1 },
      { id: 302, name: 'WK Detail 2', round: 1, participantCount: 7, int_bahn: 2 },
    ]

    const squads = [
      { name: 'Riege C', participantCount: 60, competitionId: 301, competitionIds: [301] },
      { name: 'Riege D', participantCount: 80, competitionId: 302, competitionIds: [302] },
    ]

    render(
      <TimePlanningRotation
        eventId="1"
        selectedRound={1}
        competitions={competitions}
        squads={squads}
        devices={baseDevices}
      />
    )

    expect(screen.getByRole('heading', { name: 'Competitions (Lane 1)' })).toBeInTheDocument()
    expect(screen.getAllByText(/Participants:\s*11/i).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /lane\s+2/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Competitions (Lane 2)' })).toBeInTheDocument()
    })
    expect(screen.getAllByText(/Participants:\s*7/i).length).toBeGreaterThan(0)
  })
});
