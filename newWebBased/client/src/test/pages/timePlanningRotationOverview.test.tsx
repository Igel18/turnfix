import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TimePlanningRotationOverview from '@/pages/TimePlanningRotationOverview'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'timePlanning.session': 'Session',
        'timePlanning.rotationMatrix': 'Rotation matrix',
        'timePlanning.laneLabel': 'Lane',
        'timePlanning.competitionSingle': 'Competition',
        'timePlanning.competitions': 'Competitions',
        'timePlanning.squad': 'Squad',
        'timePlanning.squads': 'Squads',
        'timePlanning.rotations': 'Rotations',
        'timePlanning.rotationNumber': 'Rotation No.',
        'timePlanning.noLanesYet': 'No lanes yet',
        'timePlanning.noCompetitionsOnLane': 'No competitions on lane',
        'timePlanning.noStartDeviceSelected': 'No start device selected',
      }
      return map[key] ?? key
    },
  }),
}))

describe('TimePlanningRotationOverview', () => {
  const devices = [{ name: 'Boden' }, { name: 'Sprung' }]

  it('renders round selector and calls onSelectedRoundChange', () => {
    const onSelectedRoundChange = vi.fn()

    render(
      <TimePlanningRotationOverview
        selectedRound={1}
        onSelectedRoundChange={onSelectedRoundChange}
        devices={devices}
        competitions={[
          { id: 11, name: 'WK R1', round: 1, participantCount: 10, int_bahn: 1 },
          { id: 22, name: 'WK R2', round: 2, participantCount: 8, int_bahn: 2 },
        ]}
        squads={[
          { name: 'wA', participantCount: 10, competitionIds: [11] },
          { name: 'wB', participantCount: 8, competitionIds: [22] },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /session\s+2/i }))
    expect(onSelectedRoundChange).toHaveBeenCalledWith(2)
  })

  it('shows overview cards for all event lanes in selected round, including empty lanes', () => {
    render(
      <TimePlanningRotationOverview
        selectedRound={2}
        devices={devices}
        competitions={[
          { id: 101, name: 'WK Lane1 Round1', round: 1, participantCount: 12, int_bahn: 1 },
          { id: 202, name: 'WK Lane2 Round2', round: 2, participantCount: 7, int_bahn: 2 },
        ]}
        squads={[
          { name: 'wA', participantCount: 12, competitionIds: [101] },
          { name: 'wB', participantCount: 7, competitionIds: [202] },
        ]}
      />,
    )

    expect(screen.getByText(/lane\s+1/i)).toBeInTheDocument()
    expect(screen.getByText(/lane\s+2/i)).toBeInTheDocument()
    expect(screen.getByText('No competitions on lane')).toBeInTheDocument()
  })
})
