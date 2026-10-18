import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import Configuration from '@/pages/Configuration'
import type { DatabaseSetupWizardProps } from '@/pages/Configuration/DatabaseSetupWizard.types'

const { apiGetMock, apiPostMock, translate } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  translate: (key: string) => key,
}))

vi.mock('@/utils/api', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate }),
}))

vi.mock('@/components/UnifiedPageHeader', () => ({
  default: ({ customActions, searchTerm, onSearchChange }: {
    customActions: React.ReactNode
    searchTerm: string
    onSearchChange: (value: string) => void
  }) => (
    <header>
      <input aria-label="configuration search" value={searchTerm} onChange={event => onSearchChange(event.target.value)} />
      {customActions}
    </header>
  ),
}))

vi.mock('@/pages/Configuration/DatabaseSetupWizard', () => ({
  default: (props: DatabaseSetupWizardProps) => {
    const [callbackResult, setCallbackResult] = useState('')
    const run = (callback: () => Promise<unknown>) => async () => {
      setCallbackResult(JSON.stringify(await callback()))
    }
    return (
      <div data-testid="database-wizard-harness">
        <output data-testid="wizard-db-config">{JSON.stringify(props.currentDbConfig)}</output>
        <output data-testid="wizard-callback-result">{callbackResult}</output>
        <button onClick={run(() => props.onCreateDatabase('new_database', { db_host: 'db-host', db_name: 'old_name' }))}>wizard-create-database</button>
        <button onClick={run(() => props.onTestConnection({ db_host: 'db-host' }))}>wizard-test-connection</button>
        <button onClick={run(() => props.onCreateSchema({ db_name: 'next' }))}>wizard-create-schema</button>
        <button onClick={run(() => props.onApplyGymNetPreset({ db_name: 'next' }))}>wizard-gymnet-preset</button>
        <button onClick={run(() => props.onImportProductionDisciplines({ db_name: 'next' }))}>wizard-production-disciplines</button>
        <button onClick={run(() => props.onImportProductionStatuses({ db_name: 'next' }))}>wizard-production-statuses</button>
        <button onClick={run(() => props.onImportSampleData({ db_name: 'next' }))}>wizard-sample-data</button>
        <button onClick={run(() => props.onImportDisciplineGroups({ db_name: 'next' }))}>wizard-discipline-groups</button>
        <button onClick={run(() => props.onImportStandardCountries({ db_name: 'next' }))}>wizard-standard-countries</button>
        <button onClick={() => props.onUpdateDatabaseName('wizard_database')}>wizard-update-database-name</button>
        <button onClick={run(() => props.onSaveAndReconnect())}>wizard-save-reconnect</button>
      </div>
    )
  },
}))

vi.mock('@/components/FirewallManagement', () => ({
  default: () => <div>firewall-settings</div>,
}))

vi.mock('@/components/WifiSettings', () => ({
  default: () => <div>wifi-settings</div>,
}))

describe('Configuration page', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    const realSetTimeout = globalThis.setTimeout.bind(globalThis)
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout === 2000) return 0 as unknown as ReturnType<typeof setTimeout>
      return realSetTimeout(handler, timeout, ...args)
    }) as typeof setTimeout)
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/configuration/connected-database') {
        return { connectedDatabase: 'turnfix' }
      }
      return { database: { db_name: 'turnfix' } }
    })
    apiPostMock.mockImplementation(async (path: string) => {
      if (path === '/configuration/list-databases') {
        return { databases: ['turnfix', 'turnfix_test'] }
      }
      return { connectedDatabase: 'turnfix' }
    })
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ scoreCapture: { useJuryResults: false } }) })))
  })

  it('loads settings, edits a value, and saves it through the configuration API', async () => {
    const user = userEvent.setup()
    render(<Configuration />)

    await screen.findByDisplayValue('turnfix')
    await user.click(screen.getByRole('button', { name: 'configuration.sections.security.title' }))

    const timeoutInput = await screen.findByDisplayValue('480')
    fireEvent.change(timeoutInput, { target: { value: '600' } })
    await user.click(screen.getByRole('button', { name: 'configuration.saveConfiguration' }))

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/configuration/save', expect.objectContaining({
        security: expect.objectContaining({ session_timeout: 600 }),
      }))
    })
  })

  it('stores score capture settings separately from the main configuration', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    render(<Configuration />)

    await user.click(await screen.findByRole('button', { name: 'configuration.sections.scoreCapture.title' }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'configuration.saveConfiguration' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/app-settings/scoreCapture', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ useJuryResults: true }),
      }))
    })
    expect(apiPostMock).toHaveBeenCalledWith('/configuration/save', expect.not.objectContaining({ scoreCapture: expect.anything() }))
  })

  it('navigates all configuration sections and renders their specialized settings', async () => {
    const user = userEvent.setup()
    render(<Configuration />)

    const sections = [
      { name: 'configuration.sections.database.title', control: 'password' },
      { name: 'configuration.sections.application.title', control: 'textbox' },
      { name: 'Language & Localization', control: 'combobox' },
      { name: 'configuration.sections.security.title', control: 'spinbutton' },
      { name: 'configuration.sections.imports.title', control: 'textarea' },
      { name: 'configuration.sections.printing.title', control: 'combobox' },
      { name: 'configuration.sections.participantLabels.title', control: 'spinbutton' },
      { name: 'configuration.sections.logging.title', control: 'combobox' },
      { name: 'configuration.sections.scoreCapture.title', control: 'checkbox' },
      { name: 'configuration.firewall.title', control: 'firewall-settings' },
      { name: 'configuration.sections.wifi.title', control: 'wifi-settings' },
    ] as const

    for (const { name, control } of sections) {
      await user.click(await screen.findByRole('button', { name }))
      expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
      if (control === 'firewall-settings' || control === 'wifi-settings') {
        expect(screen.getByText(control)).toBeInTheDocument()
      } else if (control === 'password') {
        expect(document.querySelector('input[type="password"]')).not.toBeNull()
      } else if (control === 'textarea') {
        expect(document.querySelector('textarea')).not.toBeNull()
      } else {
        expect((await screen.findAllByRole(control)).length).toBeGreaterThan(0)
      }
    }
  })

  it('refreshes the database name options from the server', async () => {
    const user = userEvent.setup()
    render(<Configuration />)

    await screen.findByDisplayValue('turnfix')
    const previousListCalls = apiPostMock.mock.calls.filter(([path]) => path === '/configuration/list-databases').length
    await user.click(screen.getByRole('button', { name: 'configuration.sections.database.refreshDatabaseList' }))

    await waitFor(() => {
      const currentListCalls = apiPostMock.mock.calls.filter(([path]) => path === '/configuration/list-databases').length
      expect(currentListCalls).toBeGreaterThan(previousListCalls)
    })
    await waitFor(() => {
      expect(document.querySelector('#configuration-database-name-options option[value="turnfix_test"]')).not.toBeNull()
    })
    expect(apiPostMock).toHaveBeenCalledWith('/configuration/list-databases', expect.objectContaining({
      db_host: 'localhost',
      db_port: 5432,
      db_user: 'postgres',
    }))
  })

  it('forwards every wizard action to its API endpoint with the expected payload', async () => {
    const user = userEvent.setup()
    render(<Configuration />)

    const actions = [
      ['wizard-create-database', '/configuration/create-database', { db_host: 'db-host', db_name: 'new_database' }],
      ['wizard-test-connection', '/configuration/test-database', { db_host: 'db-host' }],
      ['wizard-create-schema', '/configuration/create-schema', { dbConfig: { db_name: 'next' } }],
      ['wizard-gymnet-preset', '/configuration/gymnet-preset', { dbConfig: { db_name: 'next' } }],
      ['wizard-production-disciplines', '/configuration/production-disciplines', { dbConfig: { db_name: 'next' } }],
      ['wizard-production-statuses', '/configuration/production-statuses', { dbConfig: { db_name: 'next' } }],
      ['wizard-sample-data', '/configuration/sample-data', { dbConfig: { db_name: 'next' } }],
      ['wizard-discipline-groups', '/configuration/discipline-groups', { dbConfig: { db_name: 'next' } }],
      ['wizard-standard-countries', '/configuration/standard-countries', { dbConfig: { db_name: 'next' } }],
    ] as const

    for (const [buttonName, endpoint, payload] of actions) {
      await user.click(screen.getByRole('button', { name: buttonName }))
      await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(endpoint, payload))
    }
  })

  it('saves and reconnects through the wizard using the current database configuration', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    render(<Configuration />)

    await screen.findByDisplayValue('turnfix')
    await user.click(screen.getByRole('button', { name: 'wizard-save-reconnect' }))

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/configuration/save', expect.objectContaining({
        database: expect.objectContaining({ db_name: 'turnfix' }),
      }))
      expect(fetchMock).toHaveBeenCalledWith('/api/app-settings/scoreCapture', expect.objectContaining({ method: 'PUT' }))
    })
  })

  it('reports import callback failure responses instead of treating them as successful', async () => {
    const user = userEvent.setup()
    render(<Configuration />)
    await screen.findByDisplayValue('turnfix')
    apiPostMock.mockResolvedValueOnce({ success: false, error: 'Preset rejected' })

    await user.click(screen.getByRole('button', { name: 'wizard-gymnet-preset' }))

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/configuration/gymnet-preset', { dbConfig: { db_name: 'next' } })
      expect(screen.getByTestId('wizard-callback-result')).toHaveTextContent('"success":false')
      expect(screen.getByTestId('wizard-callback-result')).toHaveTextContent('Preset rejected')
    })
  })

  it('updates the database name in wizard state before the next callback', async () => {
    const user = userEvent.setup()
    render(<Configuration />)

    await screen.findByDisplayValue('turnfix')
    await user.click(screen.getByRole('button', { name: 'wizard-update-database-name' }))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-db-config')).toHaveTextContent('"db_name":"wizard_database"')
    })
  })

  it('filters visible settings by a translated setting label', async () => {
    const user = userEvent.setup()
    render(<Configuration />)

    const search = screen.getByRole('textbox', { name: 'configuration search' })
    await user.type(search, 'sessionTimeout')

    expect(screen.getByRole('button', { name: 'configuration.sections.security.title' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'configuration.sections.application.title' })).not.toBeInTheDocument()
  })

  it('shows a configuration load error when the settings request fails', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('configuration unavailable'))
    render(<Configuration />)

    expect(await screen.findByText('configuration.messages.loadFailed')).toBeInTheDocument()
  })

  it('shows database-list errors while keeping the name editable', async () => {
    apiPostMock.mockRejectedValueOnce(new Error('database list unavailable'))
    render(<Configuration />)

    expect(await screen.findByText('configuration.sections.database.databaseListError')).toBeInTheDocument()
    expect(screen.getByDisplayValue('turnfix')).toBeInTheDocument()
  })
})
