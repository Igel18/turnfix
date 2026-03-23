/**
 * Component Tests – Analyzer
 *
 * Tests:
 *   AnalyzerBanner
 *     - renders nothing while loading / no data
 *     - shows green strip when summary has no issues
 *     - shows amber strip when only warnings
 *     - shows red strip when errors present
 *     - renders link to /analyzer?eventId=X
 *
 *   CheckItem
 *     - renders ok status (no action buttons shown)
 *     - renders warning status with action button
 *     - renders error status with action button
 *     - renders quick-action button when quickActionId present
 *     - calls onQuickAction with correct args
 *     - shows detail items up to 5
 *     - shows "and X more" when affectedCount > details length
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── i18n mock ──────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params && typeof params.count !== 'undefined') return `${key}:${params.count}`
      return key
    },
  }),
}))

// ── react-router-dom navigate mock ────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// ── Import components AFTER mocks ─────────────────────────────────────────

import { AnalyzerBanner } from '@/pages/Analyzer/components/AnalyzerBanner'
import { CheckItem } from '@/pages/Analyzer/components/CheckItem'
import type { AnalyzerCheck } from '@/pages/Analyzer/Analyzer.types'

// ============================================================================
// Helpers
// ============================================================================

function makeCheck(overrides: Partial<AnalyzerCheck> = {}): AnalyzerCheck {
  return {
    id: 'missing_start_numbers',
    category: 'setup',
    severity: 'warning',
    status: 'warning',
    affectedCount: 3,
    details: [
      { id: 1, label: 'Max Mustermann' },
      { id: 2, label: 'Anna Schmidt' },
    ],
    actionRoute: '/event-participants',
    quickActionId: undefined,
    ...overrides,
  }
}

function renderCheckItem(props: Partial<Parameters<typeof CheckItem>[0]> = {}) {
  const defaults = {
    check: makeCheck(),
    eventId: 42,
    quickActionLoading: null as string | null,
    onQuickAction: vi.fn(),
  }
  return render(
    <MemoryRouter>
      <CheckItem {...defaults} {...props} />
    </MemoryRouter>,
  )
}

// ============================================================================
// AnalyzerBanner tests
// ============================================================================

describe('AnalyzerBanner', () => {
  const globalFetch = global.fetch

  afterEach(() => {
    global.fetch = globalFetch
    vi.restoreAllMocks()
  })

  it('renders nothing while loading (fetch pending)', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as any
    const { container } = render(
      <MemoryRouter>
        <AnalyzerBanner eventId={1} />
      </MemoryRouter>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any
    const { container } = render(
      <MemoryRouter>
        <AnalyzerBanner eventId={1} />
      </MemoryRouter>,
    )
    // Still null after error settle
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('shows green strip when no issues', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: { errors: 0, warnings: 0, infos: 0, ok: 8, total: 8 } }),
    }) as any

    const { container } = render(
      <MemoryRouter>
        <AnalyzerBanner eventId={1} />
      </MemoryRouter>,
    )

    await waitFor(() => expect(container.firstChild).not.toBeNull())
    const banner = container.firstChild as HTMLElement
    expect(banner.className).toMatch(/green/)
  })

  it('shows amber strip when only warnings present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: { errors: 0, warnings: 2, infos: 0, ok: 6, total: 8 } }),
    }) as any

    const { container } = render(
      <MemoryRouter>
        <AnalyzerBanner eventId={1} />
      </MemoryRouter>,
    )

    await waitFor(() => expect(container.firstChild).not.toBeNull())
    const banner = container.firstChild as HTMLElement
    expect(banner.className).toMatch(/amber/)
  })

  it('shows red strip when errors present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: { errors: 1, warnings: 0, infos: 0, ok: 7, total: 8 } }),
    }) as any

    const { container } = render(
      <MemoryRouter>
        <AnalyzerBanner eventId={5} />
      </MemoryRouter>,
    )

    await waitFor(() => expect(container.firstChild).not.toBeNull())
    const banner = container.firstChild as HTMLElement
    expect(banner.className).toMatch(/red/)
  })

  it('renders a link to /analyzer?eventId=X', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: { errors: 0, warnings: 0, infos: 0, ok: 8, total: 8 } }),
    }) as any

    render(
      <MemoryRouter>
        <AnalyzerBanner eventId={7} />
      </MemoryRouter>,
    )

    await waitFor(() => screen.getByText('analyzer.banner.openDetails'))
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/analyzer?eventId=7')
  })
})

// ============================================================================
// CheckItem tests
// ============================================================================

describe('CheckItem – ok status', () => {
  it('renders ok status: no action buttons', () => {
    renderCheckItem({ check: makeCheck({ status: 'ok', affectedCount: 0, details: [] }) })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows ok description key', () => {
    renderCheckItem({ check: makeCheck({ status: 'ok', affectedCount: 0, details: [] }) })
    expect(screen.getByText(/descriptionOk/)).toBeTruthy()
  })
})

describe('CheckItem – warning status', () => {
  it('renders warning with action button', () => {
    renderCheckItem({ check: makeCheck({ status: 'warning' }) })
    const button = screen.getByRole('button')
    expect(button).toBeTruthy()
    expect(button.textContent).toContain('analyzer.checks.missing_start_numbers.action')
  })

  it('clicking action button calls navigate', () => {
    renderCheckItem()
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(mockNavigate).toHaveBeenCalledWith('/event-participants?eventId=42')
  })

  it('shows affected count badge', () => {
    renderCheckItem({ check: makeCheck({ affectedCount: 3 }) })
    expect(screen.getByText('3')).toBeTruthy()
  })
})

describe('CheckItem – error status', () => {
  it('renders error with action button', () => {
    renderCheckItem({
      check: makeCheck({ status: 'error', severity: 'error', id: 'competitions_without_disciplines' }),
    })
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('analyzer.checks.competitions_without_disciplines.action')
  })
})

describe('CheckItem – quick action', () => {
  it('shows quick-action button when quickActionId present', () => {
    renderCheckItem({
      check: makeCheck({ quickActionId: 'generate_start_numbers', status: 'warning' }),
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
  })

  it('calls onQuickAction with correct args on click', () => {
    const onQuickAction = vi.fn()
    renderCheckItem({
      check: makeCheck({ quickActionId: 'generate_start_numbers', status: 'warning' }),
      onQuickAction,
      eventId: 42,
    })
    const buttons = screen.getAllByRole('button')
    // Second button is the quick-action button
    fireEvent.click(buttons[1])
    expect(onQuickAction).toHaveBeenCalledWith('generate_start_numbers', 42)
  })

  it('disables quick-action button when loading matches quickActionId', () => {
    renderCheckItem({
      check: makeCheck({ quickActionId: 'generate_start_numbers', status: 'warning' }),
      quickActionLoading: 'generate_start_numbers',
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toBeDisabled()
  })

  it('does NOT disable quick-action when loading different action', () => {
    renderCheckItem({
      check: makeCheck({ quickActionId: 'generate_start_numbers', status: 'warning' }),
      quickActionLoading: 'generate_squad_combination',
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).not.toBeDisabled()
  })
})

describe('CheckItem – details list', () => {
  it('renders up to 5 detail items', () => {
    const details = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, label: `Person ${i + 1}` }))
    renderCheckItem({ check: makeCheck({ details, affectedCount: 5 }) })
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Person ${i}`)).toBeTruthy()
    }
  })

  it('shows "and X more" when affectedCount > details.length', () => {
    const details = [{ id: 1, label: 'Person 1' }]
    renderCheckItem({ check: makeCheck({ details, affectedCount: 10 }) })
    expect(screen.getByText(/analyzer\.andMore/)).toBeTruthy()
  })

  it('does NOT show "and more" when affectedCount equals details.length', () => {
    const details = [{ id: 1, label: 'Person 1' }]
    renderCheckItem({ check: makeCheck({ details, affectedCount: 1 }) })
    expect(screen.queryByText(/analyzer\.andMore/)).toBeNull()
  })
})
