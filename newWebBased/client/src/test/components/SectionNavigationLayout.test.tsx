import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SectionNavigationLayout from '@/components/SectionNavigationLayout'
import { eventSetupActions } from '@/pages/ManagementCenter/ManagementCenter.constants'

const event = vi.hoisted(() => ({ selectedEvent: null as { int_eventid: number } | null }))

vi.mock('@/contexts/EventContext', () => ({ useEvent: () => event }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

function renderNavigation(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<SectionNavigationLayout actions={eventSetupActions} titleKey="setup" />}>
          {eventSetupActions.map(action => <Route key={action.href} path={action.href} element={<div>Page content</div>} />)}
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
})