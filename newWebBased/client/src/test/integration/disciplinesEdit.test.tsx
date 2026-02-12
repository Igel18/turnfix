import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import DisciplinesUnified from '../../pages/DisciplinesUnified'

type FetchResponse = {
  ok: boolean
  json: () => Promise<any>
}

const mockDisciplines = [
  {
    id: 1,
    name: 'Boden',
    short_name: 'BO',
    display_name: 'Bodenturnen',
    formula: 'x*2',
    input_mask: '00.00',
    attempts: 1,
    icon: '',
    shortcut: '',
    calculation_type: 2,
    unit: 'P',
    lanes_division: false,
    male_allowed: true,
    female_allowed: true,
    sport_id: 1,
    formula_id: undefined,
    should_calculate: true,
    gender_text: 'Gemischt'
  }
]

const mockFormulas = [
  {
    int_formelid: 10,
    var_name: 'Punkte Formel',
    var_formel: 'x*2',
    int_typ: 1,
    discipline_count: 0
  }
]

const mockSports = [
  {
    int_sportid: 1,
    var_name: 'Geräteturnen',
    discipline_count: 2
  }
]

const mockDisciplineFields: any[] = []

describe('Disciplines Edit & Formulas', () => {
  let queryClient: QueryClient
  let fetchMock: ReturnType<typeof vi.fn>

  const findAddDisciplineButton = () => {
    const labelMatches = screen.queryAllByText(/(Disziplin (erstellen|hinzufügen)|Create Discipline|Add Discipline)/i)
    for (const match of labelMatches) {
      const button = match.closest('button')
      if (button) return button
    }

    return screen.queryByRole('button', { name: /(disziplin|create discipline|add discipline)/i })
  }

  const findSelectByLabelText = (labelRegex: RegExp) => {
    const labels = screen.queryAllByText(labelRegex)
    const label = labels[0]
    if (!label) return null

    // Labels are not associated via htmlFor, so locate the nearest select after the label
    const container = label.closest('div')
    if (!container) return null

    return container.querySelector('select') as HTMLSelectElement | null
  }

  const findSelectByOptionText = (optionRegex: RegExp) => {
    const selectElements = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
    return selectElements.find(select =>
      Array.from(select.options).some(option => optionRegex.test(option.text))
    ) || null
  }

  const findInputByLabelText = (labelRegex: RegExp, scope?: HTMLElement | null) => {
    const root = scope || document.body
    const labels = Array.from(root.querySelectorAll('label')).filter(label =>
      labelRegex.test(label.textContent || '')
    )

    const label = labels[0] || null
    if (!label) return null

    const container = label.closest('div') || label.parentElement
    if (!container) return null

    return container.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null
  }

  const findInputByPlaceholder = (placeholderRegex: RegExp, scope?: HTMLElement | null) => {
    const root = scope || document.body
    const inputs = Array.from(root.querySelectorAll('input, textarea')) as (HTMLInputElement | HTMLTextAreaElement)[]
    return inputs.find(input => placeholderRegex.test(input.placeholder || '')) || null
  }

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <DisciplinesUnified />
          </I18nextProvider>
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  beforeAll(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
  })

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit): Promise<FetchResponse> => {
      const url = typeof input === 'string' ? input : input.url
      const method = init?.method || 'GET'

      if (url.startsWith('/api/disciplines') && method === 'GET') {
        return { ok: true, json: async () => mockDisciplines }
      }
      if (url.startsWith('/api/formulas') && method === 'GET') {
        return { ok: true, json: async () => ({ formulas: mockFormulas }) }
      }
      if (url.startsWith('/api/sports') && method === 'GET') {
        return { ok: true, json: async () => ({ sports: mockSports }) }
      }
      if (url.startsWith('/api/discipline-fields') && method === 'GET') {
        return { ok: true, json: async () => ({ disciplineFields: mockDisciplineFields }) }
      }
      if (url === '/api/disciplines' && method === 'POST') {
        return { ok: true, json: async () => ({ id: 99 }) }
      }
      if (url.startsWith('/api/disciplines/') && method === 'PUT') {
        return { ok: true, json: async () => ({}) }
      }

      return { ok: true, json: async () => ({}) }
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  it('renders existing disciplines and basic data', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Boden')).toBeInTheDocument()
    })
  })

  it('creates a discipline with custom formula and gender flags', async () => {
    const user = userEvent.setup()
    renderComponent()

    // Wait for data to load (loading = false) so handleCreate won't abort with alert
    await waitFor(() => {
      expect(screen.getByText('Boden')).toBeInTheDocument()
    })

    // Find add button - may be in action buttons row below the header
    let addButton = findAddDisciplineButton()
    
    // Fallback: look for any blue bg button (the add button has bg-blue-600)
    if (!addButton) {
      const allButtons = screen.getAllByRole('button')
      addButton = allButtons.find(btn => btn.className.includes('bg-blue-600')) || null
    }
    if (!addButton) throw new Error('Add discipline button not found')

    await user.click(addButton)

    // Wait for modal form to render — the modal overlay has class "fixed inset-0"
    await waitFor(() => {
      const modalOverlay = document.querySelector('.fixed.inset-0')
      if (!modalOverlay) throw new Error('Modal overlay not found')
      const inputs = modalOverlay.querySelectorAll('input[type="text"]')
      if (inputs.length === 0) throw new Error('No text inputs found in modal')
    }, { timeout: 3000 })

    // Now find all inputs within the modal
    // Note: i18n may load in English or German, use language-agnostic selectors
    const modalOverlay = document.querySelector('.fixed.inset-0') as HTMLElement
    
    // Get all inputs in order — the form layout is: name, shortName, displayName, then formula section
    const textInputs = Array.from(modalOverlay.querySelectorAll('input[type="text"]')) as HTMLInputElement[]
    const textareas = Array.from(modalOverlay.querySelectorAll('textarea')) as HTMLTextAreaElement[]
    const numberInputs = Array.from(modalOverlay.querySelectorAll('input[type="number"]')) as HTMLInputElement[]
    const selects = Array.from(modalOverlay.querySelectorAll('select')) as HTMLSelectElement[]
    
    // First 3 text inputs are: name, shortName, displayName  
    const nameInput = textInputs[0]
    const shortNameInput = textInputs[1]
    const displayNameInput = textInputs[2]
    // The textarea is the formula input
    const formulaInput = textareas[0]
    // After the calculation selects, we have: inputMask, attempts(number), unit
    // Find inputMask by placeholder containing "00"
    const inputMaskInput = textInputs.find(input => /00/.test(input.placeholder)) || textInputs[3]
    // Attempts is the only number input
    const attemptsInput = numberInputs[0]
    // Unit is the text input after inputMask with placeholder containing "Point" or "Punkte"
    const unitInput = textInputs.find(input => /(point|punkte)/i.test(input.placeholder)) || textInputs[4]
    // Sport select — the one with options containing "disciplines" text  
    const sportSelect = selects.find(select =>
      Array.from(select.options).some(opt => /disciplines|disziplinen|Geräteturnen/i.test(opt.text))
    ) || selects[selects.length - 1]

    if (!nameInput || !shortNameInput || !displayNameInput || !formulaInput || !inputMaskInput || !attemptsInput || !unitInput || !sportSelect) {
      throw new Error('Discipline form inputs not found')
    }

    await user.clear(nameInput)
    await user.type(nameInput, 'Sprung')
    await user.clear(shortNameInput)
    await user.type(shortNameInput, 'SP')
    await user.clear(displayNameInput)
    await user.type(displayNameInput, 'Sprung Gerät')
    await user.clear(formulaInput)
    await user.type(formulaInput, 'x*2')
    await user.clear(inputMaskInput)
    await user.type(inputMaskInput, '00.00')
    await user.clear(attemptsInput)
    await user.type(attemptsInput, '3')
    await user.clear(unitInput)
    await user.type(unitInput, 'P')

    await user.selectOptions(sportSelect, '1')

    // Find gender checkboxes within the modal
    const checkboxes = Array.from(modalOverlay.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[]
    const maleCheckbox = checkboxes.find(cb => {
      const label = cb.closest('label')
      return label && /(männlich|male)/i.test(label.textContent || '')
    })
    const femaleCheckbox = checkboxes.find(cb => {
      const label = cb.closest('label')
      return label && /(weiblich|female)/i.test(label.textContent || '')
    })

    if (maleCheckbox && !maleCheckbox.checked) {
      await user.click(maleCheckbox)
    }
    if (femaleCheckbox && femaleCheckbox.checked) {
      await user.click(femaleCheckbox)
    }

    // Find save button in the modal
    const saveButton = Array.from(modalOverlay.querySelectorAll('button')).find(btn =>
      /(speichern|save)/i.test(btn.textContent || '')
    )
    if (!saveButton) throw new Error('Save button not found in modal')
    await user.click(saveButton)

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/disciplines' && init?.method === 'POST'
      )
      expect(postCall).toBeTruthy()

      const body = postCall?.[1]?.body as string
      const payload = JSON.parse(body)

      expect(payload.name).toBe('Sprung')
      expect(payload.shortName).toBe('SP')
      expect(payload.formula).toBe('x*2')
      expect(payload.maleAllowed).toBe(true)
      expect(payload.femaleAllowed).toBe(false)
      expect(payload.sportId).toBe(1)
    })
  })

  it('shows predefined formula selection and marks custom formula as ignored', async () => {
    const user = userEvent.setup()
    renderComponent()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Boden')).toBeInTheDocument()
    })

    const addButton = findAddDisciplineButton()
    if (!addButton) throw new Error('Add discipline button not found')

    await user.click(addButton)

    const formulaSelect = findSelectByLabelText(/^Formel/i) || findSelectByOptionText(/Punkte Formel/i)
    if (!formulaSelect) throw new Error('Formula select not found')

    await user.selectOptions(formulaSelect, '10')

    await waitFor(() => {
      expect(screen.getByText(/(ignored|ignoriert)/i)).toBeInTheDocument()
    })
  })
})
