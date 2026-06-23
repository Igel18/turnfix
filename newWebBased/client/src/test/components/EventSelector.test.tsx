import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EventSelector } from '../../components/EventSelector'
import { apiGet } from '../../utils/api'

const mockNavigate = vi.fn()

const mockEventContext = {
  selectedEvent: null,
  selectedCompetition: null,
  selectedSquad: null,
  setSelectedEvent: vi.fn(),
  setSelectedCompetition: vi.fn(),
  setSelectedSquad: vi.fn(),
}

vi.mock('../../utils/api', () => ({
  apiGet: vi.fn(),
}))

vi.mock('../../hooks/useEventSearch', () => ({
  useEventSearch: () => ({
    results: [],
    isLoading: false,
  }),
}))

vi.mock('../../contexts/EventContext', () => ({
  useEvent: () => mockEventContext,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const map: Record<string, string> = {
        'eventManagement.selectEvent': 'Select Event',
        'events.search': 'Search events...',
      }
      return map[key] ?? options?.defaultValue ?? key
    },
  }),
}))

function renderSelector() {
  return render(
    <MemoryRouter>
      <EventSelector />
    </MemoryRouter>
  )
}

function makeEvents(count: number, startId: number) {
  return Array.from({ length: count }, (_, idx) => {
    const id = startId + idx
    return {
      int_eventid: id,
      var_eventname: `Event ${id}`,
      dat_eventstartdate: '2026-01-01T00:00:00.000Z',
      dat_eventenddate: '2026-01-02T00:00:00.000Z',
      var_location: 'Test Hall',
      status: 'upcoming',
    }
  })
}

describe('EventSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEventContext.selectedEvent = null
  })

  it('loads all events across paginated /events responses', async () => {
    vi.mocked(apiGet)
      .mockResolvedValueOnce({
        events: makeEvents(50, 1),
        pagination: { total: 93, limit: 50, offset: 0, hasMore: true },
      })
      .mockResolvedValueOnce({
        events: makeEvents(43, 51),
        pagination: { total: 93, limit: 50, offset: 50, hasMore: false },
      })

    renderSelector()

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith('/events?limit=50&offset=0')
      expect(apiGet).toHaveBeenCalledWith('/events?limit=50&offset=50')
    })

    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(94) // placeholder + 93 events
    expect(screen.getByRole('option', { name: /Event 93/ })).toBeInTheDocument()
  })

  it('filters event dropdown options using event search input', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({
      events: [
        {
          int_eventid: 1,
          var_eventname: 'Fruehjahrs-Cup',
          dat_eventstartdate: '2026-01-01T00:00:00.000Z',
          dat_eventenddate: '2026-01-02T00:00:00.000Z',
          var_location: 'Halle A',
          status: 'upcoming',
        },
        {
          int_eventid: 2,
          var_eventname: 'Herbstturnfest',
          dat_eventstartdate: '2026-02-01T00:00:00.000Z',
          dat_eventenddate: '2026-02-02T00:00:00.000Z',
          var_location: 'Halle B',
          status: 'upcoming',
        },
      ],
      pagination: { total: 2, limit: 50, offset: 0, hasMore: false },
    })

    renderSelector()

    await screen.findByRole('option', { name: /Fruehjahrs-Cup/ })

    const searchInput = screen.getByPlaceholderText('Search events...')
    await userEvent.type(searchInput, 'Herbst')

    expect(screen.getByRole('option', { name: /Herbstturnfest/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Fruehjahrs-Cup/ })).not.toBeInTheDocument()
  })
})
