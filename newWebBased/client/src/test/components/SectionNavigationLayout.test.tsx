import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SectionNavigationLayout from '@/components/SectionNavigationLayout'
import {
  competitionDayActions,
  eventSetupActions,
  timePlanningActions,
} from '@/pages/ManagementCenter/ManagementCenter.constants'

const event = vi.hoisted(() => ({ selectedEvent: null as { int_eventid: number } | null }))

vi.mock('@/contexts/EventContext', () => ({ useEvent: () => event }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

function renderNavigation(
  path: string,
  actions = eventSetupActions,
  titleKey = 'setup'
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<SectionNavigationLayout actions={actions} titleKey={titleKey} />}>
          {actions.filter(action => !action.external).map(action => <Route key={action.href} path={action.href} element={<div>Page content</div>} />)}
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('SectionNavigationLayout', () => {
  it('renders all setup links with the selected event and marks the current page', () => {
    event.selectedEvent = { int_eventid: 59 }
    renderNavigation('/event-participants?eventId=42')

    const navigation = screen.getAllByRole('navigation', { name: 'setup' })[0]
    const links = within(navigation).getAllByRole('link')
    expect(links).toHaveLength(8)
    expect(links.map(link => link.getAttribute('href'))).toEqual(
      eventSetupActions.map(action => `${action.href}?eventId=59`)
    )
    expect(links[3]).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('preserves a URL event when the context has no selection', () => {
    event.selectedEvent = null
    renderNavigation('/analyzer?eventId=42')

    const navigation = screen.getAllByRole('navigation', { name: 'setup' })[0]
    expect(within(navigation).getAllByRole('link')[0]).toHaveAttribute('href', '/analyzer?eventId=42')
    expect(within(navigation).getAllByRole('link')[0]).toHaveAttribute('aria-current', 'page')
  })

  it('does not append an event ID when none is selected', () => {
    event.selectedEvent = null
    renderNavigation('/analyzer')

    const navigation = screen.getAllByRole('navigation', { name: 'setup' })[0]
    expect(within(navigation).getAllByRole('link')[0]).toHaveAttribute('href', '/analyzer')
  })

  it('closes the mobile menu after navigating', () => {
    event.selectedEvent = { int_eventid: 59 }
    const { container } = renderNavigation('/analyzer?eventId=59')
    const details = container.querySelector('details')!
    details.open = true

    const mobileNavigation = within(details).getByRole('navigation', { name: 'setup' })
    fireEvent.click(within(mobileNavigation).getAllByRole('link')[3])

    expect(details.open).toBe(false)
    expect(within(mobileNavigation).getAllByRole('link')[3]).toHaveAttribute('aria-current', 'page')
  })

  it('renders the time-planning links with the event ID', () => {
    event.selectedEvent = { int_eventid: 59 }
    renderNavigation('/time-planning/rotation?eventId=59', timePlanningActions, 'time-planning')

    const navigation = screen.getAllByRole('navigation', { name: 'time-planning' })[0]
    const links = within(navigation).getAllByRole('link')
    expect(links).toHaveLength(4)
    expect(links.map(link => link.getAttribute('href'))).toEqual(
      timePlanningActions.map(action => `${action.href}?eventId=59`)
    )
    expect(links[1]).toHaveAttribute('aria-current', 'page')
  })

  it('renders competition-day links and keeps the jury portal external', () => {
    event.selectedEvent = { int_eventid: 59 }
    renderNavigation('/score-capture?eventId=59', competitionDayActions, 'competition-day')

    const navigation = screen.getAllByRole('navigation', { name: 'competition-day' })[0]
    const links = within(navigation).getAllByRole('link')
    expect(links).toHaveLength(9)
    expect(links[4]).toHaveAttribute('aria-current', 'page')
    expect(links[8]).toHaveAttribute('target', '_blank')
    expect(links[8]).toHaveAttribute('rel', 'noopener noreferrer')
    expect(links[8]).toHaveAttribute('href', competitionDayActions[8].href)
  })
})