/**
 * TDD Unit Tests — ViewModeToggle component
 * Shared Matrix / Table / Grid toggle buttons used across CompetitionStatus and SquadStatus.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewModeToggle } from '../ViewModeToggle'

describe('ViewModeToggle', () => {

  it('renders all three mode buttons', () => {
    render(<ViewModeToggle viewMode="table" onChange={() => {}} />)
    // Buttons have aria-label attributes
    expect(screen.getByRole('button', { name: /Matrix/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tabelle|Table/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Kacheln|Grid/i })).toBeTruthy()
  })

  it('highlights the active "table" mode button', () => {
    const { container } = render(<ViewModeToggle viewMode="table" onChange={() => {}} />)
    const buttons = container.querySelectorAll('button')
    // The table button (index 1) should be active
    const tableBtn = Array.from(buttons).find(b =>
      b.getAttribute('aria-label')?.match(/Tabelle|Table/i)
    )!
    expect(tableBtn.className).toContain('bg-blue-600')
  })

  it('highlights the active "matrix" mode button', () => {
    const { container } = render(<ViewModeToggle viewMode="matrix" onChange={() => {}} />)
    const buttons = container.querySelectorAll('button')
    const matrixBtn = Array.from(buttons).find(b =>
      b.getAttribute('aria-label')?.match(/Matrix/i)
    )!
    expect(matrixBtn.className).toContain('bg-blue-600')
  })

  it('highlights the active "grid" mode button', () => {
    const { container } = render(<ViewModeToggle viewMode="grid" onChange={() => {}} />)
    const buttons = container.querySelectorAll('button')
    const gridBtn = Array.from(buttons).find(b =>
      b.getAttribute('aria-label')?.match(/Kacheln|Grid/i)
    )!
    expect(gridBtn.className).toContain('bg-blue-600')
  })

  it('calls onChange with "matrix" when Matrix button is clicked', () => {
    const onChange = vi.fn()
    render(<ViewModeToggle viewMode="table" onChange={onChange} />)
    const matrixBtn = screen.getByRole('button', { name: /Matrix/i })
    fireEvent.click(matrixBtn)
    expect(onChange).toHaveBeenCalledWith('matrix')
  })

  it('calls onChange with "table" when Table button is clicked', () => {
    const onChange = vi.fn()
    render(<ViewModeToggle viewMode="matrix" onChange={onChange} />)
    const tableBtn = screen.getByRole('button', { name: /Tabelle|Table/i })
    fireEvent.click(tableBtn)
    expect(onChange).toHaveBeenCalledWith('table')
  })

  it('calls onChange with "grid" when Grid button is clicked', () => {
    const onChange = vi.fn()
    render(<ViewModeToggle viewMode="table" onChange={onChange} />)
    const gridBtn = screen.getByRole('button', { name: /Kacheln|Grid/i })
    fireEvent.click(gridBtn)
    expect(onChange).toHaveBeenCalledWith('grid')
  })

  it('inactive buttons have a non-blue style', () => {
    const { container } = render(<ViewModeToggle viewMode="table" onChange={() => {}} />)
    const buttons = container.querySelectorAll('button')
    // Matrix and Grid buttons should NOT be bg-blue-600
    const matrixBtn = Array.from(buttons).find(b =>
      b.getAttribute('aria-label')?.match(/Matrix/i)
    )!
    expect(matrixBtn.className).not.toContain('bg-blue-600')
  })

})
