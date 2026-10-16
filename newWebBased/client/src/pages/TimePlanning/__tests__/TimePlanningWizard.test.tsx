import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimePlanningWizard } from '../components/TimePlanningWizard'
import { useTimePlanningWizard } from '../hooks/useTimePlanningWizard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key === 'timePlanning.wizard.step5.generate' ? 'Round Robin generieren' : key,
  }),
}))

vi.mock('@/components/WizardModal', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../hooks/useTimePlanningWizard', () => ({
  useTimePlanningWizard: vi.fn(),
}))

describe('TimePlanningWizard', () => {
  const generateRoundRobin = vi.fn()
  let setTimeSettings: ReturnType<typeof vi.fn>
  let wizardState: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    setTimeSettings = vi.fn()
    wizardState = {
      currentStep: 'generate',
      setCurrentStep: vi.fn(),
      goNext: vi.fn(),
      goBack: vi.fn(),
      isFirstStep: false,
      isLastStep: false,
      reset: vi.fn(),
      timeSettings: { exerciseDurationMinutes: 3, rotationIntervalMinutes: 20, breakBetweenDevicesMinutes: 0, warmupDurationMinutes: 15 },
      setTimeSettings,
      durchgangStartTimes: { 1: '08:00' },
      setDurchgangStartTime: vi.fn(),
      pendingRounds: {},
      setCompetitionRound: vi.fn(),
      maxRound: 1,
      addDurchgang: vi.fn(),
      savingRounds: false,
      pendingBahnen: {},
      setCompetitionBahn: vi.fn(),
      maxBahn: 1,
      addBahn: vi.fn(),
      savingBahnen: false,
      durchgangData: [{ durchgang: 1, squads: ['Riege A'], disciplines: [{ id: 1, name: 'Boden', shortName: 'Bo' }] }],
      loadingDurchgangData: false,
      startAssignments: {},
      setStartAssignment: vi.fn(),
      autoAssignStartPositions: vi.fn(),
      generating: false,
      generateRoundRobin,
      generationError: null,
      generationResult: null,
    }
    vi.mocked(useTimePlanningWizard).mockReturnValue(wizardState as any)
  })

  it('shows the generate action and starts generation when clicked', () => {
    render(
      <TimePlanningWizard
        isOpen
        onClose={vi.fn()}
        eventId="4713"
        competitions={[]}
        timeSettings={{ exerciseDurationMinutes: 3, rotationIntervalMinutes: 20, breakBetweenDevicesMinutes: 0, warmupDurationMinutes: 15 }}
        setTimeSettings={vi.fn()}
        onRefetch={vi.fn()}
        onViewMatrix={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Round Robin generieren' }))

    expect(generateRoundRobin).toHaveBeenCalledOnce()
  })

  it('keeps a cleared timing value empty and blocks continuing', () => {
    vi.mocked(useTimePlanningWizard).mockReturnValue({
      ...wizardState,
      currentStep: 'timing',
      timeSettings: { exerciseDurationMinutes: Number.NaN, rotationIntervalMinutes: 20, breakBetweenDevicesMinutes: 0, warmupDurationMinutes: 15 },
    } as any)

    render(
      <TimePlanningWizard
        isOpen
        onClose={vi.fn()}
        eventId="4713"
        competitions={[]}
        timeSettings={{ exerciseDurationMinutes: 3, rotationIntervalMinutes: 20, breakBetweenDevicesMinutes: 0, warmupDurationMinutes: 15 }}
        setTimeSettings={vi.fn()}
        onRefetch={vi.fn()}
        onViewMatrix={vi.fn()}
      />,
    )

    const durationInput = screen.getAllByRole('spinbutton')[0]
    expect(durationInput).toHaveValue(null)
    expect(durationInput).toBeInvalid()
    expect(screen.getByRole('button', { name: 'timePlanning.wizard.next' })).toBeDisabled()

    fireEvent.change(durationInput, { target: { value: '5' } })
    expect(setTimeSettings).toHaveBeenCalledWith(expect.objectContaining({ exerciseDurationMinutes: 5 }))
  })
})