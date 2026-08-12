import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultsGymNetExportWizard } from '@/pages/Results/components'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

const defaultPaperFormats = {
  A4: { width: 595, height: 842, name: 'A4' },
  A3: { width: 842, height: 1191, name: 'A3' }
} as any

const defaultParticipants = [
  {
    id: 1,
    rank: 1,
    name: 'Max Mustermann',
    club: 'TV Test',
    age: 15,
    gender: 'männlich',
    startNumber: 12,
    scores: {},
    totalScore: 0
  }
] as any

const defaultLayouts = [
  {
    int_layoutid: 1,
    var_name: 'Standard',
    txt_comment: null,
    fields: []
  }
] as any

describe('ResultsGymNetExportWizard', () => {
  it('runs the XML wizard flow and shows the match report', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onLayoutChange = vi.fn()
    const onPaperChange = vi.fn()
    const onSortOrderChange = vi.fn()
    const onPrepareCertificates = vi.fn().mockResolvedValue(undefined)
    const onExportCsv = vi.fn().mockResolvedValue(undefined)
    const onExportPdf = vi.fn().mockResolvedValue(undefined)
    const onExportCertificates = vi.fn().mockResolvedValue(undefined)
    const onExportXml = vi.fn().mockResolvedValue({
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
        certificateParticipants={defaultParticipants}
        certificateLayouts={defaultLayouts}
        selectedCertificateLayout={defaultLayouts[0]}
        onCertificateLayoutChange={onLayoutChange}
        selectedPaperFormat={'A4'}
        onPaperFormatChange={onPaperChange}
        paperFormats={defaultPaperFormats}
        certificateSortOrder={'desc'}
        onCertificateSortOrderChange={onSortOrderChange}
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
        onPrepareCertificates={onPrepareCertificates}
        onExportCertificates={onExportCertificates}
        onExportXml={onExportXml}
      />
    )

    await user.click(screen.getByText('results.exportWizard.exportTypes.xml').closest('button') as HTMLButtonElement)
    await user.click(screen.getByRole('button', { name: 'common.next' }))

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

    await waitFor(() => expect(onExportXml).toHaveBeenCalledTimes(1))
    expect(onExportXml).toHaveBeenCalledWith(templateFile, 'gymnet-results.xml')
    expect(await screen.findByText('results.matchReport.competitionsMatched')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.close' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('runs the integrated certificate export flow from wizard', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onLayoutChange = vi.fn()
    const onPaperChange = vi.fn()
    const onSortOrderChange = vi.fn()
    const onPrepareCertificates = vi.fn().mockResolvedValue(undefined)
    const onExportCsv = vi.fn().mockResolvedValue(undefined)
    const onExportPdf = vi.fn().mockResolvedValue(undefined)
    const onExportCertificates = vi.fn().mockResolvedValue(undefined)
    const onExportXml = vi.fn().mockResolvedValue(null)

    render(
      <ResultsGymNetExportWizard
        isOpen={true}
        onClose={onClose}
        eventName="Test Event"
        selectedCompetitionLabel="Wettkampf A"
        certificateParticipants={defaultParticipants}
        certificateLayouts={defaultLayouts}
        selectedCertificateLayout={defaultLayouts[0]}
        onCertificateLayoutChange={onLayoutChange}
        selectedPaperFormat={'A4'}
        onPaperFormatChange={onPaperChange}
        paperFormats={defaultPaperFormats}
        certificateSortOrder={'desc'}
        onCertificateSortOrderChange={onSortOrderChange}
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
        onPrepareCertificates={onPrepareCertificates}
        onExportCertificates={onExportCertificates}
        onExportXml={onExportXml}
      />
    )

    await user.click(screen.getByText('results.exportWizard.exportTypes.certificates').closest('button') as HTMLButtonElement)
    await user.click(screen.getByRole('button', { name: 'common.next' }))

    await waitFor(() => expect(onPrepareCertificates).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'common.next' }))
    await user.click(screen.getByRole('button', { name: 'results.exportWizard.actions.startExport' }))

    await waitFor(() => expect(onExportCertificates).toHaveBeenCalledTimes(1))
    expect(onExportCsv).not.toHaveBeenCalled()
    expect(onExportPdf).not.toHaveBeenCalled()
    expect(onExportXml).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
