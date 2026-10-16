import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LabelConfigModal } from '../components/LabelConfigModal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/UnifiedModal', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/utils/api', () => ({
  apiGet: vi.fn().mockResolvedValue({}),
}))

describe('LabelConfigModal numeric fields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps a cleared value empty, marks it invalid, and blocks printing', async () => {
    const onPrint = vi.fn()
    render(<LabelConfigModal isOpen onClose={vi.fn()} onPrint={onPrint} participantCount={10} />)

    const rowsInput = screen.getAllByRole('spinbutton')[0]
    await waitFor(() => expect(rowsInput).toHaveValue(16))
    fireEvent.change(rowsInput, { target: { value: '' } })

    expect(rowsInput).toHaveValue(null)
    expect(rowsInput).toBeInvalid()
    expect(screen.getByRole('button', { name: 'eventParticipants.labelConfig.generatePDF' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'eventParticipants.labelConfig.generatePDF' }))
    expect(onPrint).not.toHaveBeenCalled()

    fireEvent.change(rowsInput, { target: { value: '14' } })
    expect(rowsInput).toHaveValue(14)
    expect(screen.getByRole('button', { name: 'eventParticipants.labelConfig.generatePDF' })).toBeEnabled()
  })
})