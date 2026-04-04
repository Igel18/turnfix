/**
 * TDD Unit Tests — StatusBadge component
 * Unified status badge used across CompetitionStatus, SquadStatus, ParticipantStatus pages.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {

  it('renders the label text', () => {
    render(<StatusBadge label="Abgeschlossen" colorCode="{4,172,39}" />)
    expect(screen.getByText('Abgeschlossen')).toBeTruthy()
  })

  it('renders a dash for missing label', () => {
    render(<StatusBadge label={null} colorCode="{200,200,200}" />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('renders a dash for empty label', () => {
    render(<StatusBadge label="" colorCode="{200,200,200}" />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('applies the "border" className for valid color codes', () => {
    const { container } = render(<StatusBadge label="Offen" colorCode="{200,200,200}" />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('border')
  })

  it('applies fallback gray class for null colorCode', () => {
    const { container } = render(<StatusBadge label="Unbekannt" colorCode={null} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-gray-100')
  })

  it('applies consistent text-xs font-medium sizing', () => {
    const { container } = render(<StatusBadge label="Test" colorCode="{100,200,50}" />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('text-xs')
    expect(badge.className).toContain('font-medium')
  })

  it('applies inline style from color parsing', () => {
    const { container } = render(<StatusBadge label="Rot" colorCode="{255,0,0}" />)
    const badge = container.querySelector('span')!
    expect(badge.style.borderColor).toBeTruthy()
  })

  it('accepts optional className override', () => {
    const { container } = render(
      <StatusBadge label="Custom" colorCode="{100,100,100}" className="my-custom-class" />
    )
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('my-custom-class')
  })

})
