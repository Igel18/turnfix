import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '../renderWithProviders'
import { SessionsView } from '@/pages/TimePlanning/components/SessionsView'
import type { DeviceSchedule, SessionGroup, TimeSettings } from '@/pages/TimePlanning/TimePlanning.types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'timePlanning.calculatedDuration' && params?.duration !== undefined) {
        return `Estimated duration: ${String(params.duration)} minutes`
      }
      if (key === 'timePlanning.basedOnSettings') {
        return `Based on settings`
      }
      if (key === 'timePlanning.startsAt' && params?.time) {
        return `Starts at ${String(params.time)}`
      }
      return key
    },
  }),
}))

const timeSettings: TimeSettings = {
  exerciseDurationMinutes: 3,
  breakBetweenDevicesMinutes: 0,
  warmupDurationMinutes: 15,
  rotationIntervalMinutes: 20,
}

const sessionGroups: SessionGroup[] = [
  {
    session: 0,
    startTime: null,
    startDate: null,
    competitions: [
      {
        id: 999,
        name: 'WK Unassigned',
        number: '999',
        round: 0,
        startTime: null,
        startDate: null,
        warmupTime: null,
        warmupDate: null,
        disciplineCount: 2,
        participantCount: 0,
        int_bahn: null,
      },
    ],
    squads: [],
  },
  {
    session: 2,
    startTime: '10:00',
    startDate: '2026-08-23',
    competitions: [
      {
        id: 101,
        name: 'WK Boden/Sprung',
        number: '101',
        round: 2,
        startTime: '10:00',
        startDate: '2026-08-23',
        warmupTime: '09:45',
        warmupDate: '2026-08-23',
        disciplineCount: 4,
        participantCount: 0,
        int_bahn: 1,
      },
      {
        id: 102,
        name: 'WK Reck/Barren',
        number: '102',
        round: 2,
        startTime: '10:30',
        startDate: '2026-08-23',
        warmupTime: '10:15',
        warmupDate: '2026-08-23',
        disciplineCount: 3,
        participantCount: 0,
        int_bahn: 2,
      },
    ],
    squads: [
      {
        name: 'Riege A',
        participantCount: 10,
        competitions: ['WK Boden/Sprung'],
        competitionIds: [101],
      },
      {
        name: 'Riege B',
        participantCount: 8,
        competitions: ['WK Boden/Sprung', 'WK Reck/Barren'],
        competitionIds: [101, 102],
      },
      {
        name: 'Riege C',
        participantCount: 6,
        competitions: ['WK Reck/Barren'],
        competitionIds: [102],
      },
    ],
  },
]

describe('SessionsView three-column layout', () => {
  it('renders sessions column, middle unassigned column and selected-session competitions column', () => {
    renderWithProviders(
      <SessionsView
        sessionGroups={sessionGroups}
        selectedSession={2}
        setSelectedSession={vi.fn()}
        timeSettings={timeSettings}
        handleEditCompetition={vi.fn()}
        handleEditStartDevices={vi.fn()}
        handleDragStart={vi.fn()}
        handleDragOver={vi.fn()}
        handleDrop={vi.fn()}
        calculateDeviceSchedule={vi.fn(() => [])}
        setDeviceSchedule={vi.fn()}
        onOpenMatrix={vi.fn()}
      />
    )

    expect(screen.getByText('timePlanning.sessions (2)')).toBeInTheDocument()
    expect(screen.getByText('timePlanning.unassignedCompetitions (1)')).toBeInTheDocument()
    expect(screen.getByText('timePlanning.competitions (timePlanning.session 2)')).toBeInTheDocument()

    expect(screen.getByText('WK Unassigned')).toBeInTheDocument()

    expect(screen.getAllByText('Riege A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Riege B').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Riege C').length).toBeGreaterThan(0)

    expect(screen.getByText('24 timePlanning.participants')).toBeInTheDocument()
    expect(screen.getByText('7 timePlanning.devices')).toBeInTheDocument()
    expect(screen.getByText('Estimated duration: 342 minutes')).toBeInTheDocument()
  })

  it('uses the third column action to open matrix and pass calculated schedule', () => {
    const schedule: DeviceSchedule[] = [
      {
        squadName: 'Riege A',
        deviceName: 'Boden',
        startTime: '10:00',
        endTime: '10:03',
        competition: 'WK Boden/Sprung',
        isWarmup: false,
      },
    ]
    const calculateDeviceSchedule = vi.fn(() => schedule)
    const setDeviceSchedule = vi.fn()
    const onOpenMatrix = vi.fn()

    renderWithProviders(
      <SessionsView
        sessionGroups={sessionGroups}
        selectedSession={2}
        setSelectedSession={vi.fn()}
        timeSettings={timeSettings}
        handleEditCompetition={vi.fn()}
        handleEditStartDevices={vi.fn()}
        handleDragStart={vi.fn()}
        handleDragOver={vi.fn()}
        handleDrop={vi.fn()}
        calculateDeviceSchedule={calculateDeviceSchedule}
        setDeviceSchedule={setDeviceSchedule}
        onOpenMatrix={onOpenMatrix}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'timePlanning.viewTimeline' }))

    expect(calculateDeviceSchedule).toHaveBeenCalledWith(sessionGroups[1])
    expect(setDeviceSchedule).toHaveBeenCalledWith(schedule)
    expect(onOpenMatrix).toHaveBeenCalledOnce()
  })
})
