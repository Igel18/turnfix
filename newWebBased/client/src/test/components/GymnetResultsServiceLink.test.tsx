import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GymnetResultsServiceLink } from '@/pages/Results/components/GymnetResultsServiceLink'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key) })
}))

const apiGetMock = vi.fn()
vi.mock('@/utils/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args)
}))

const FILE_INPUT_ID = 'results-gymnet-event-id-input'

describe('GymnetResultsServiceLink', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('renders nothing when no eventId is provided', () => {
    const { container } = render(<GymnetResultsServiceLink eventId={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the "not linked" hint and upload form when no mapping exists yet', async () => {
    apiGetMock.mockRejectedValue(new Error('not found'))

    render(<GymnetResultsServiceLink eventId="7" />)

    expect(await screen.findByText('results.exportWizard.gymnetEventId.notLinked')).toBeInTheDocument()
    expect(document.getElementById(FILE_INPUT_ID)).toBeTruthy()
    expect(apiGetMock).toHaveBeenCalledWith('/results/gymnet-event-id/7')
  })

  it('shows the matched event and results service link when a mapping exists', async () => {
    apiGetMock.mockResolvedValue({
      mapping: { gymnetEventId: '654321', evName: 'Test Event', evStart: '2026-05-01', evStop: '2026-05-02', updatedAt: '2026-05-01T00:00:00.000Z' },
      resultsServiceUrl: 'https://m.ergebnisse.dtb-gymnet.de/index.php?eventID=654321'
    })

    render(<GymnetResultsServiceLink eventId="7" />)

    const link = await screen.findByRole('link', { name: 'results.exportWizard.gymnetEventId.openLink' })
    expect(link).toHaveAttribute('href', 'https://m.ergebnisse.dtb-gymnet.de/index.php?eventID=654321')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('hides the upload form when showUploadForm is false', async () => {
    apiGetMock.mockRejectedValue(new Error('not found'))

    render(<GymnetResultsServiceLink eventId="7" showUploadForm={false} />)

    await screen.findByText('results.exportWizard.gymnetEventId.notLinked')
    expect(document.getElementById(FILE_INPUT_ID)).toBeNull()
  })

  it('uploads the Standardexport.xls and shows the returned mapping and warning', async () => {
    apiGetMock.mockRejectedValue(new Error('not found'))
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        mapping: { gymnetEventId: '111222', evName: 'Test Event', evStart: '2026-05-01', evStop: '2026-05-02', updatedAt: '2026-05-01T00:00:00.000Z' },
        resultsServiceUrl: 'https://m.ergebnisse.dtb-gymnet.de/index.php?eventID=111222',
        warning: 'Die Datei enthält unterschiedliche evID-Werte. Es wurde die erste gefundene ID verwendet.'
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<GymnetResultsServiceLink eventId="7" />)

    await screen.findByText('results.exportWizard.gymnetEventId.notLinked')

    const file = new File(['xls-content'], 'Standardexport.xls', { type: 'application/vnd.ms-excel' })
    await user.upload(document.getElementById(FILE_INPUT_ID) as HTMLInputElement, file)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/results/gymnet-event-id/7', expect.objectContaining({ method: 'POST' })))
    expect(await screen.findByRole('link', { name: 'results.exportWizard.gymnetEventId.openLink' })).toBeInTheDocument()
    expect(screen.getByText('Die Datei enthält unterschiedliche evID-Werte. Es wurde die erste gefundene ID verwendet.')).toBeInTheDocument()
  })

  it('shows an error message when the upload fails', async () => {
    apiGetMock.mockRejectedValue(new Error('not found'))
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'In der Datei wurde keine evID gefunden' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<GymnetResultsServiceLink eventId="7" />)

    await screen.findByText('results.exportWizard.gymnetEventId.notLinked')

    const file = new File(['xls-content'], 'Standardexport.xls', { type: 'application/vnd.ms-excel' })
    await user.upload(document.getElementById(FILE_INPUT_ID) as HTMLInputElement, file)

    expect(await screen.findByText('In der Datei wurde keine evID gefunden')).toBeInTheDocument()
  })
})
