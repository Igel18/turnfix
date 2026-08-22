import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EventWorkflowSteps } from '../../pages/ManagementCenter/components/EventWorkflowSteps'

vi.mock('@/components/EventSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="event-selector">Event Selector</div>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'managementCenter.eventManagement.title': 'Veranstaltungsverwaltung',
        'managementCenter.eventManagement.subtitle': 'Workflow',
        'managementCenter.eventManagement.eventSetup.title': 'Veranstaltungsaufbau',
        'managementCenter.eventManagement.eventSetup.subtitle': 'Setup',
        'managementCenter.eventManagement.timePlanning.title': 'Zeitplanung',
        'managementCenter.eventManagement.timePlanning.subtitle': 'Durchgaenge, Rotation, Zeitplan-Tabelle',
        'managementCenter.eventManagement.competitionDay.title': 'Wettkampftag',
        'managementCenter.eventManagement.competitionDay.subtitle': 'Live',
        'managementCenter.eventManagement.resultsAwards.title': 'Ergebnisse & Auszeichnungen',
        'managementCenter.eventManagement.resultsAwards.subtitle': 'Ergebnisse',
        'managementCenter.buttons.expand': 'Erweitern',
        'managementCenter.buttons.collapse': 'Zuklappen',
        'managementCenter.eventManagement.timePlanning.rounds.title': 'Durchgaenge',
        'managementCenter.eventManagement.timePlanning.rounds.description': 'Durchgaenge planen',
        'managementCenter.eventManagement.timePlanning.rotation.title': 'Rotation',
        'managementCenter.eventManagement.timePlanning.rotation.description': 'Rotation planen',
        'managementCenter.eventManagement.timePlanning.matrix.title': 'Zeitplan-Tabelle',
        'managementCenter.eventManagement.timePlanning.matrix.description': 'Matrix bearbeiten',
      }
      return map[key] ?? key
    },
  }),
}))

describe('EventWorkflowSteps time planning section', () => {
  const selectedEvent = { int_eventid: 59 }

  function renderSubject() {
    return render(
      <MemoryRouter>
        <EventWorkflowSteps
          selectedEvent={selectedEvent}
          isEventSetupCollapsed={false}
          isTimePlanningCollapsed={false}
          isCompetitionDayCollapsed={false}
          isResultsAwardsCollapsed={false}
          onToggleEventSetup={vi.fn()}
          onToggleTimePlanning={vi.fn()}
          onToggleCompetitionDay={vi.fn()}
          onToggleResultsAwards={vi.fn()}
        />
      </MemoryRouter>
    )
  }

  it('renders Zeitplanung between Veranstaltungsaufbau and Wettkampftag', () => {
    renderSubject()

    const setupHeading = screen.getByRole('heading', { name: 'Veranstaltungsaufbau' })
    const timePlanningHeading = screen.getByRole('heading', { name: 'Zeitplanung' })
    const competitionDayHeading = screen.getByRole('heading', { name: 'Wettkampftag' })

    expect(setupHeading.compareDocumentPosition(timePlanningHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(timePlanningHeading.compareDocumentPosition(competitionDayHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders links for Durchgaenge, Rotation and Zeitplan-Tabelle with view query parameter', () => {
    renderSubject()

    expect(screen.getByRole('link', { name: /Durchgaenge/i }).getAttribute('href')).toBe('/time-planning?view=sessions&eventId=59')
    expect(screen.getByRole('link', { name: /Rotation/i }).getAttribute('href')).toBe('/time-planning?view=rotation&eventId=59')
    expect(screen.getByRole('link', { name: /Zeitplan-Tabelle/i }).getAttribute('href')).toBe('/time-planning?view=matrix&eventId=59')
  })
})
