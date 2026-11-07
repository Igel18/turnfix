import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfigurationLayout from '@/pages/Configuration/ConfigurationLayout'
import { invalidateCache } from '@/utils/api'
import type { ConfigSection } from '@/pages/Configuration/Configuration.types'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/FirewallManagement', () => ({ default: () => null }))
vi.mock('@/components/WifiSettings', () => ({ default: () => null }))

const backupSection: ConfigSection = {
  id: 'backup',
  name: 'Backup',
  icon: () => null,
  description: '',
  settings: [],
}

const renderBackup = () => render(
  <ConfigurationLayout
    sections={[backupSection]}
    activeSection="backup"
    activeConfigSection={backupSection}
    connectedDb={null}
    availableDatabases={[]}
    loadingDatabases={false}
    databaseListError={false}
    databaseHost={null}
    databaseUser={null}
    onActiveSectionChange={vi.fn()}
    onRefreshConnectedDatabase={vi.fn()}
    onLoadAvailableDatabases={vi.fn()}
    onSettingChange={vi.fn()}
  />,
)

const response = (body: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => body,
})

describe('Backup server status', () => {
  beforeEach(() => invalidateCache())
  afterEach(() => {
    invalidateCache()
    vi.unstubAllGlobals()
  })

  it('loads status and refreshes it with a new browser request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ running: true, lastSuccess: '2026-11-07T10:00:00Z', lastPath: 'D:\\backups\\latest', error: null }))
      .mockResolvedValueOnce(response({ running: false, lastSuccess: null, lastPath: null, error: 'Disk full' }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderBackup()

    expect(await screen.findByText('configuration.sections.backup.status.running')).toBeInTheDocument()
    expect(screen.getByText('D:\\backups\\latest')).toBeInTheDocument()
    expect(screen.getByText(new Date('2026-11-07T10:00:00Z').toLocaleString())).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/configuration/backup/status', expect.objectContaining({ method: 'GET' }))

    await user.click(screen.getByRole('button', { name: 'configuration.sections.backup.status.refresh' }))
    expect(await screen.findByText('configuration.sections.backup.status.idle')).toBeInTheDocument()
    expect(screen.getByText('Disk full')).toBeInTheDocument()
    expect(screen.getAllByText('configuration.sections.backup.status.notAvailable')).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows request errors and allows retrying', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: 'Service unavailable' }, false))
      .mockResolvedValueOnce(response({ running: false, lastSuccess: null, lastPath: null, error: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderBackup()

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable')
    await user.click(screen.getByRole('button', { name: 'configuration.sections.backup.status.refresh' }))
    await waitFor(() => expect(screen.getByText('configuration.sections.backup.status.idle')).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a network error when the status cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network disconnected')))
    renderBackup()

    expect(await screen.findByRole('alert')).toHaveTextContent('Network disconnected')
    expect(screen.getByRole('button', { name: 'configuration.sections.backup.status.refresh' })).toBeEnabled()
  })
})