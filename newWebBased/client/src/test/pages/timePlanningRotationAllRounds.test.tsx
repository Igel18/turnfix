import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TimePlanningRotation from '@/pages/TimePlanningRotation';
import { buildBahnenForRound } from '@/pages/useTimePlanningRotationModel';
import { getRotationRoundFromSessionFilter } from '@/pages/TimePlanning/rotationUtils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'timePlanning.session': 'Session',
        'common.all': 'All',
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

const competitions = [
  { id: 101, name: 'WK Eins', round: 1, participantCount: 10, int_bahn: 1 },
  { id: 102, name: 'WK Zwei', round: 2, participantCount: 12, int_bahn: 1 },
  { id: 103, name: 'WK Offen', round: 2, participantCount: 4, int_bahn: null },
  { id: 104, name: 'WK Vier', round: 1, participantCount: 6, int_bahn: 2 },
];

const squads = [
  { name: 'Riege 1', participantCount: 10, competitionId: 101, competitionIds: [101] },
  { name: 'Riege 2', participantCount: 12, competitionId: 102, competitionIds: [102] },
  { name: 'Riege 3', participantCount: 4, competitionId: 103, competitionIds: [103] },
];

const devices = [{ name: 'Boden' }, { name: 'Sprung' }];

const renderRotation = (selectedRound: number | null, onSelectedRoundChange = vi.fn()) =>
  render(
    <TimePlanningRotation
      eventId="1"
      selectedRound={selectedRound}
      onSelectedRoundChange={onSelectedRoundChange}
      competitions={competitions}
      squads={squads}
      devices={devices}
    />
  );

describe('getRotationRoundFromSessionFilter', () => {
  it('maps "all sessions" to null and a chosen session to its number', () => {
    expect(getRotationRoundFromSessionFilter('')).toBeNull();
    expect(getRotationRoundFromSessionFilter('2')).toBe(2);
  });

  it('treats an invalid value as all sessions', () => {
    expect(getRotationRoundFromSessionFilter('abc')).toBeNull();
    expect(getRotationRoundFromSessionFilter('0')).toBeNull();
  });
});

describe('buildBahnenForRound without a round', () => {
  it('merges the lanes of all rounds and keeps every competition and squad', () => {
    const bahnen = buildBahnenForRound(competitions, squads, null);

    expect(bahnen.map(b => b.bahnNumber)).toEqual([1, 2]);
    expect(bahnen[0].competitions.map(c => c.competition.id)).toEqual([101, 102]);
    expect(bahnen[0].competitions[1].squads.map(s => s.name)).toEqual(['Riege 2']);
    expect(bahnen[1].competitions.map(c => c.competition.id)).toEqual([104]);
  });

  it('still limits the lanes to one round when a round is given', () => {
    const bahnen = buildBahnenForRound(competitions, squads, 2);
    expect(bahnen.map(b => b.bahnNumber)).toEqual([1]);
    expect(bahnen[0].competitions.map(c => c.competition.id)).toEqual([102]);
  });
});

describe('TimePlanningRotation with all rounds', () => {
  it('lists the lanes and the unassigned competitions of every round', () => {
    renderRotation(null);

    expect(screen.getByRole('button', { name: /lane\s+1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lane\s+2/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unassigned competitions (1)' })).toBeInTheDocument();
    expect(screen.getByText('WK Offen')).toBeInTheDocument();
  });

  it('shows the competitions of different rounds on the same lane with their round', () => {
    renderRotation(null);

    expect(screen.getByText('WK Eins')).toBeInTheDocument();
    expect(screen.getByText('WK Zwei')).toBeInTheDocument();
    const lane1 = screen.getByRole('button', { name: /lane\s+1/i });
    expect(within(lane1).getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('Session 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Session 2').length).toBeGreaterThan(0);
  });

  it('does not reset the selection to a single round', async () => {
    const onSelectedRoundChange = vi.fn();
    renderRotation(null, onSelectedRoundChange);

    fireEvent.click(screen.getByRole('button', { name: /lane\s+2/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Competitions (Lane 2)' })).toBeInTheDocument());
    expect(onSelectedRoundChange).not.toHaveBeenCalled();
  });

  it('shows only that round and still labels its competitions with the round', () => {
    renderRotation(2);

    expect(screen.queryByText('WK Eins')).not.toBeInTheDocument();
    expect(screen.getByText('WK Zwei')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lane\s+2/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Session 1')).not.toBeInTheDocument();
    expect(screen.getAllByText('Session 2').length).toBeGreaterThan(1);
  });
});

describe('TimePlanningRotation rounds on lanes and in the header', () => {
  it('shows the rounds of the competitions on each lane card', () => {
    renderRotation(null);

    expect(within(screen.getByRole('button', { name: /lane\s+1/i })).getByText('Session 1, 2')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /lane\s+2/i })).getByText('Session 1')).toBeInTheDocument();
  });

  it('shows only the selected round on the lane cards', () => {
    renderRotation(2);

    expect(within(screen.getByRole('button', { name: /lane\s+1/i })).getByText('Session 2')).toBeInTheDocument();
  });

  it('shows only the rounds that are present on the lane', () => {
    render(
      <TimePlanningRotation
        eventId="1"
        selectedRound={null}
        competitions={[{ id: 1, name: 'WK', round: 1, participantCount: 1, int_bahn: 1 }]}
        squads={[]}
        devices={devices}
      />
    );
    const lane = screen.getByRole('button', { name: /lane\s+1/i });
    expect(within(lane).queryByText('Session 2')).not.toBeInTheDocument();
    expect(within(lane).getByText('Session 1')).toBeInTheDocument();
  });

  it('names the active round in a header line', () => {
    const { unmount } = renderRotation(null);
    expect(screen.getByTestId('rotation-round-label')).toHaveTextContent('All Session');
    unmount();

    renderRotation(2);
    expect(screen.getByTestId('rotation-round-label')).toHaveTextContent('Session 2');
  });
});
