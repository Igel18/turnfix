import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TimePlanningMatrixPage from '../../pages/TimePlanningMatrixPage/index'

const { useTimePlanningDataMock, useTimePlanningPageFiltersMock, scheduleMatrixViewMock } = vi.hoisted(() => ({
  useTimePlanningDataMock: vi.fn(),
  useTimePlanningPageFiltersMock: vi.fn(),
  scheduleMatrixViewMock: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'timePlanning.pages.matrix.title': 'Zeitplan-Tabelle',
      'timePlanning.pages.matrix.subtitle': 'Zeitplan-Matrix prüfen, anpassen und exportieren',
      'timePlanning.help.button': 'Hilfe',
      'timePlanning.wizard.startButton': 'Assistent',
      'timePlanning.settings': 'Einstellungen',
      'timePlanning.exportPDF': 'Zeitplan (PDF)',
      'timePlanning.noEventSelected': 'Keine Veranstaltung ausgewählt',
      'timePlanning.selectEventToManageTime': 'Bitte wählen Sie eine Veranstaltung aus.',
    }[key] ?? key),
  }),
}))

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => ({ selectedEvent: null }),
}))

vi.mock('@/components/templates/EventManagementTemplate', () => ({
  EventManagementTemplate: ({ title, customActions, children }: any) => (
    <main>
      <h1>{title}</h1>
      <div>{customActions}</div>
      {children}
    </main>
  ),
}))

vi.mock('@/components/UnifiedModal', () => ({
  default: ({ isOpen, children }: any) => isOpen ? <div>{children}</div> : null,
}))

vi.mock('@/pages/TimePlanning/components', () => ({
  HelpPanels: () => <div data-testid="time-planning-help">Zeitplan-Hilfe</div>,
  TimePlanningFilters: () => null,
  TimeSettingsModal: () => null,
  TimePlanningWizard: () => null,
}))

vi.mock('@/pages/TimePlanning/components/ScheduleMatrixView', () => ({
  ScheduleMatrixView: (props: any) => {
    scheduleMatrixViewMock(props)
    return <div data-testid="schedule-matrix" data-event-id={props.eventId} />
  },
}))

vi.mock('@/pages/TimePlanning/hooks', () => ({
  useTimePlanningData: useTimePlanningDataMock,
  useTimePlanningPageFilters: useTimePlanningPageFiltersMock,
}))

vi.mock('@/pages/TimePlanning/timePlanningSettingsStorage', () => ({
  loadTimeSettingsFromStorage: () => ({
    exerciseDurationMinutes: 3,
    rotationIntervalMinutes: 20,
    breakBetweenDevicesMinutes: 0,
    warmupDurationMinutes: 15,
  }),
  saveTimeSettingsToStorage: vi.fn(),
}))

interface MatrixTestEvent {
  id: string
  sessionGroups: Array<{
    session: number
    competitions: never[]
    startTime: string
    startDate: null
    squads: never[]
  }>
}

let nextTestEventId = 900000

function createMatrixTestEvent(): MatrixTestEvent {
  const id = String(++nextTestEventId)
  return {
    id,
    sessionGroups: [
      { session: 1, competitions: [], startTime: '08:00', startDate: null, squads: [] },
      { session: 2, competitions: [], startTime: '10:00', startDate: null, squads: [] },
    ],
  }
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TimePlanningMatrixPage />
    </MemoryRouter>,
  )
}

describe('TimePlanningMatrixPage', () => {
  let testEvent: MatrixTestEvent

  beforeEach(() => {
    vi.clearAllMocks()
    testEvent = createMatrixTestEvent()
    useTimePlanningDataMock.mockReturnValue({
      loading: false,
      competitions: [],
      sessionGroups: testEvent.sessionGroups,
      squads: [],
      refetch: vi.fn(),
    })
    useTimePlanningPageFiltersMock.mockReturnValue({
      showFilters: false,
      toggleFilters: vi.fn(),
      searchTerm: '',
      setSearchTerm: vi.fn(),
      sessionFilter: '',
      setSessionFilter: vi.fn(),
      laneFilter: '',
      setLaneFilter: vi.fn(),
      squadFilter: '',
      setSquadFilter: vi.fn(),
      competitionFilter: '',
      setCompetitionFilter: vi.fn(),
      sessionOptions: [],
      laneOptions: [],
      squadOptions: [],
      competitionOptions: [],
      resetFilters: vi.fn(),
      filteredCompetitions: [],
      filteredSquads: [],
      filteredSessionGroups: testEvent.sessionGroups,
    })
  })

  it('loads the event from the URL and renders its grouped session data in the matrix', () => {
    renderPage(`/time-planning/matrix?eventId=${testEvent.id}`)

    expect(useTimePlanningDataMock).toHaveBeenCalledWith({ eventId: testEvent.id })
    expect(screen.getByTestId('schedule-matrix').getAttribute('data-event-id')).toBe(testEvent.id)
    expect(scheduleMatrixViewMock.mock.lastCall?.[0].sessionGroups).toEqual(testEvent.sessionGroups)
  })

  it('passes the selected session separately from full groups needed to find its end boundary', () => {
    const secondSessionOnly = [testEvent.sessionGroups[1]]
    useTimePlanningPageFiltersMock.mockReturnValue({
      showFilters: false,
      toggleFilters: vi.fn(),
      searchTerm: '',
      setSearchTerm: vi.fn(),
      sessionFilter: '2',
      setSessionFilter: vi.fn(),
      laneFilter: '',
      setLaneFilter: vi.fn(),
      squadFilter: '',
      setSquadFilter: vi.fn(),
      competitionFilter: '',
      setCompetitionFilter: vi.fn(),
      sessionOptions: [],
      laneOptions: [],
      squadOptions: [],
      competitionOptions: [],
      resetFilters: vi.fn(),
      filteredCompetitions: [],
      filteredSquads: [],
      filteredSessionGroups: secondSessionOnly,
    })

    renderPage(`/time-planning/matrix?eventId=${testEvent.id}`)

    const matrixProps = scheduleMatrixViewMock.mock.lastCall?.[0]
    expect(matrixProps.selectedSession).toBe('2')
    expect(matrixProps.sessionGroups).toEqual(testEvent.sessionGroups)
    expect(matrixProps.visibleSessionGroups).toEqual(secondSessionOnly)
  })

  it('shows the localized help button and toggles the help panel', () => {
    renderPage(`/time-planning/matrix?eventId=${testEvent.id}`)

    fireEvent.click(screen.getByRole('button', { name: 'Hilfe' }))

    expect(screen.queryByTestId('time-planning-help') !== null).toBe(true)
  })

  it('shows the no-event state and does not render the matrix without an event id', () => {
    renderPage('/time-planning/matrix')

    expect(screen.getByRole('heading', { name: 'Keine Veranstaltung ausgewählt' }) !== null).toBe(true)
    expect(screen.queryByTestId('schedule-matrix')).toBeNull()
  })
})