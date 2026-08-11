import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultsGymNetExportWizard } from '@/pages/Results/components'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

describe('ResultsGymNetExportWizard', () => {
  it('runs the standard wizard flow and shows the match report', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onExport = vi.fn().mockResolvedValue({
      summary: {
        competitionsMatched: 1,
        participantsMatched: 1,
        disciplineScoresWritten: 2,
        competitionsUnmatched: 0,
        participantsUnmatched: 0,
        disciplinesUnmatched: 0
      },
      unmatchedCompetitions: [],
      unmatchedParticipants: [],
      unmatchedDisciplines: []
    })

    render(
      <ResultsGymNetExportWizard
        isOpen={true}
        onClose={onClose}
        eventName="Test Event"
        selectedCompetitionLabel="Wettkampf A"
        onExport={onExport}
      />
    )

    const templateFile = new File(['<Wettkämpfe />'], 'import-template.xml', {
      type: 'application/xml'
    })

    const fileInput = document.getElementById('results-gymnet-template-input') as HTMLInputElement
    expect(fileInput).toBeTruthy()
    await user.upload(fileInput, templateFile)

    await user.click(screen.getByRole('button', { name: 'common.next' }))

    const outputInput = document.getElementById('results-gymnet-output-input') as HTMLInputElement
    expect(outputInput).toBeTruthy()
    expect(outputInput.value).toMatch(/^import-template_Results_\d{4}-\d{2}-\d{2}\.xml$/)
    await user.clear(outputInput)
    await user.type(outputInput, 'gymnet-results')

    await user.click(screen.getByRole('button', { name: 'common.next' }))
    await user.click(screen.getByRole('button', { name: 'results.exportWizard.actions.startExport' }))

    await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1))
    expect(onExport).toHaveBeenCalledWith(templateFile, 'gymnet-results.xml')
    expect(await screen.findByText('results.matchReport.competitionsMatched')).toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'common.close' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
