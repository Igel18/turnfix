import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import LocalizedNumberInput, { parseLocalizedNumber } from '../LocalizedNumberInput'

describe('LocalizedNumberInput', () => {
  it('parses comma decimals and keeps the localized draft while focused', () => {
    function Harness() {
      const [value, setValue] = useState(3)
      return <LocalizedNumberInput value={value} min={0} max={60} onValueChange={setValue} />
    }

    render(<Harness />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '3,5' } })

    expect(input).toHaveValue('3,5')
    expect(parseLocalizedNumber('3,5')).toBe(3.5)
    expect(parseLocalizedNumber('3.5')).toBe(3.5)
  })

  it('marks empty required and out-of-range values invalid', () => {
    render(<LocalizedNumberInput value={Number.NaN} min={1} max={60} required onValueChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })
})