import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TimeSettingsModal } from '../components/TimeSettingsModal'
import { DEFAULT_TIME_SETTINGS } from '../TimePlanning.types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('TimeSettingsModal numeric fields', () => {
  it('keeps cleared values invalid and blocks saving', () => {
    const saveTimeSettings = vi.fn()
    function Harness() {
      const [timeSettings, setTimeSettings] = useState(DEFAULT_TIME_SETTINGS)
      return (
        <TimeSettingsModal
          timeSettings={timeSettings}
          setTimeSettings={setTimeSettings}
          setShowTimeSettings={vi.fn()}
          saveTimeSettings={saveTimeSettings}
        />
      )
    }
    render(<Harness />)

    const durationInput = screen.getAllByRole('spinbutton')[0]
    fireEvent.change(durationInput, { target: { value: '' } })

    expect(screen.getAllByRole('spinbutton')[0]).toHaveValue(null)
    expect(screen.getAllByRole('spinbutton')[0]).toBeInvalid()
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(saveTimeSettings).not.toHaveBeenCalled()
  })
})