import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentArrowUpIcon, DocumentArrowDownIcon, PlayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import WizardModal from '@/components/WizardModal'
import type { GymNetMatchReport } from '../hooks/useExport'

interface ResultsGymNetExportWizardProps {
  isOpen: boolean
  onClose: () => void
  eventName: string
  selectedCompetitionLabel: string
  onExport: (templateFile: File, outputFileName?: string) => Promise<GymNetMatchReport | null>
}

type WizardStep = 'template' | 'target' | 'execute' | 'report'

const STEP_KEYS = {
  template: 'template',
  target: 'target',
  execute: 'execute',
  report: 'report',
} as const

const WIZARD_MODAL_SIZE = '3xl'
const XML_FILE_ACCEPT = '.xml,text/xml,application/xml'

const todayDatePart = () => new Date().toISOString().split('T')[0]

const normalizeFileName = (name: string) => {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, '_').trim()
  return cleaned || 'gymnet_results.xml'
}

const ensureXmlExtension = (name: string) => {
  return name.toLowerCase().endsWith('.xml') ? name : `${name}.xml`
}

const toStepTitleKey = (step: WizardStep) => {
  switch (step) {
    case STEP_KEYS.template:
      return 'results.exportWizard.titles.template'
    case STEP_KEYS.target:
      return 'results.exportWizard.titles.target'
    case STEP_KEYS.execute:
      return 'results.exportWizard.titles.execute'
    case STEP_KEYS.report:
      return 'results.exportWizard.titles.report'
    default:
      return 'results.exportWizard.title'
  }
}

export function ResultsGymNetExportWizard({
  isOpen,
  onClose,
  eventName,
  selectedCompetitionLabel,
  onExport,
}: ResultsGymNetExportWizardProps) {
  const { t } = useTranslation()

  const [step, setStep] = useState<WizardStep>(STEP_KEYS.template)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [outputFileName, setOutputFileName] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [report, setReport] = useState<GymNetMatchReport | null>(null)

  const steps = useMemo(
    () => [
      { key: STEP_KEYS.template, label: t('results.exportWizard.steps.template'), icon: DocumentArrowUpIcon },
      { key: STEP_KEYS.target, label: t('results.exportWizard.steps.target'), icon: DocumentArrowDownIcon },
      { key: STEP_KEYS.execute, label: t('results.exportWizard.steps.execute'), icon: PlayIcon },
      { key: STEP_KEYS.report, label: t('results.exportWizard.steps.report'), icon: CheckCircleIcon },
    ],
    [t]
  )

  const resetState = () => {
    setStep(STEP_KEYS.template)
    setTemplateFile(null)
    setOutputFileName('')
    setIsExporting(false)
    setErrorMessage(null)
    setReport(null)
  }

  const handleClose = () => {
    if (isExporting) {
      return
    }
    resetState()
    onClose()
  }

  const handleTemplateSelect = (file: File | null) => {
    setTemplateFile(file)
    setErrorMessage(null)

    if (!file) {
      setOutputFileName('')
      return
    }

    const ext = file.name.toLowerCase().endsWith('.xml') ? '.xml' : '.xml'
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const proposedName = `${baseName}_Results_${todayDatePart()}${ext}`
    setOutputFileName(proposedName)
  }

  const goNext = () => {
    if (step === STEP_KEYS.template) {
      if (!templateFile) {
        setErrorMessage(t('results.exportWizard.errors.templateRequired'))
        return
      }
      setStep(STEP_KEYS.target)
      return
    }

    if (step === STEP_KEYS.target) {
      if (!outputFileName.trim()) {
        setErrorMessage(t('results.exportWizard.errors.outputFileNameRequired'))
        return
      }
      setStep(STEP_KEYS.execute)
      return
    }

    if (step === STEP_KEYS.execute || step === STEP_KEYS.report) {
      handleClose()
    }
  }

  const goBack = () => {
    if (step === STEP_KEYS.template) {
      handleClose()
      return
    }
    if (step === STEP_KEYS.target) {
      setStep(STEP_KEYS.template)
      return
    }
    if (step === STEP_KEYS.execute) {
      setStep(STEP_KEYS.target)
      return
    }
    if (step === STEP_KEYS.report) {
      setStep(STEP_KEYS.execute)
    }
  }

  const runExport = async () => {
    if (!templateFile) {
      setErrorMessage(t('results.exportWizard.errors.templateRequired'))
      return
    }

    const safeName = ensureXmlExtension(normalizeFileName(outputFileName))
    setIsExporting(true)
    setErrorMessage(null)

    try {
      const matchReport = await onExport(templateFile, safeName)
      setReport(matchReport)
      setStep(STEP_KEYS.report)
    } catch (error) {
      const fallbackMessage = t('results.exportWizard.errors.exportFailed')
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t(toStepTitleKey(step))}
      steps={steps}
      currentStep={step}
      size={WIZARD_MODAL_SIZE}
    >
      <div className="space-y-4">
        {step === STEP_KEYS.template && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p>{t('results.exportWizard.help.template')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('results.exportWizard.templateInputLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept={XML_FILE_ACCEPT}
                onChange={(e) => handleTemplateSelect(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
              />
              {templateFile && (
                <p className="mt-2 text-xs text-gray-600">
                  {t('results.exportWizard.selectedTemplate')}: <span className="font-medium">{templateFile.name}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {step === STEP_KEYS.target && (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <p>{t('results.exportWizard.help.target')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('results.exportWizard.outputFileNameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={outputFileName}
                onChange={(e) => {
                  setOutputFileName(e.target.value)
                  setErrorMessage(null)
                }}
                placeholder={t('results.exportWizard.outputFileNamePlaceholder')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">{t('results.exportWizard.outputFileNameHint')}</p>
            </div>
          </div>
        )}

        {step === STEP_KEYS.execute && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p>{t('results.exportWizard.help.execute')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-3">
                <div className="text-gray-500">{t('results.exportWizard.summary.event')}</div>
                <div className="font-semibold text-gray-900">{eventName}</div>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <div className="text-gray-500">{t('results.exportWizard.summary.competition')}</div>
                <div className="font-semibold text-gray-900">{selectedCompetitionLabel}</div>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <div className="text-gray-500">{t('results.exportWizard.summary.template')}</div>
                <div className="font-semibold text-gray-900">{templateFile?.name || '-'}</div>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <div className="text-gray-500">{t('results.exportWizard.summary.output')}</div>
                <div className="font-semibold text-gray-900">{ensureXmlExtension(normalizeFileName(outputFileName))}</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => void runExport()}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4" />
                {isExporting ? t('results.exportWizard.actions.exporting') : t('results.exportWizard.actions.startExport')}
              </button>
            </div>
          </div>
        )}

        {step === STEP_KEYS.report && (
          <div className="space-y-4 text-sm">
            {report ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">{t('results.matchReport.competitionsMatched')}</div>
                    <div className="font-semibold">{report.summary.competitionsMatched}</div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">{t('results.matchReport.participantsMatched')}</div>
                    <div className="font-semibold">{report.summary.participantsMatched}</div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">{t('results.matchReport.disciplineScoresWritten')}</div>
                    <div className="font-semibold">{report.summary.disciplineScoresWritten}</div>
                  </div>
                  <div className="p-3 rounded bg-amber-50">
                    <div className="text-amber-700">{t('results.matchReport.competitionsUnmatched')}</div>
                    <div className="font-semibold text-amber-700">{report.summary.competitionsUnmatched}</div>
                  </div>
                  <div className="p-3 rounded bg-amber-50">
                    <div className="text-amber-700">{t('results.matchReport.participantsUnmatched')}</div>
                    <div className="font-semibold text-amber-700">{report.summary.participantsUnmatched}</div>
                  </div>
                  <div className="p-3 rounded bg-amber-50">
                    <div className="text-amber-700">{t('results.matchReport.disciplinesUnmatched')}</div>
                    <div className="font-semibold text-amber-700">{report.summary.disciplinesUnmatched}</div>
                  </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-auto border rounded p-3 bg-white">
                  <div>
                    <div className="font-medium">{t('results.matchReport.unmatchedCompetitions')}</div>
                    <div className="text-gray-600 whitespace-pre-wrap">{report.unmatchedCompetitions.join('\n') || t('results.matchReport.none')}</div>
                  </div>
                  <div>
                    <div className="font-medium">{t('results.matchReport.unmatchedParticipants')}</div>
                    <div className="text-gray-600 whitespace-pre-wrap">{report.unmatchedParticipants.join('\n') || t('results.matchReport.none')}</div>
                  </div>
                  <div>
                    <div className="font-medium">{t('results.matchReport.unmatchedDisciplines')}</div>
                    <div className="text-gray-600 whitespace-pre-wrap">{report.unmatchedDisciplines.join('\n') || t('results.matchReport.none')}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-800">
                {t('results.matchReport.noReport')}
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={goBack}
            disabled={isExporting}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {step === STEP_KEYS.template ? t('common.cancel') : t('common.back')}
          </button>

          {step === STEP_KEYS.report ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('common.close')}
            </button>
          ) : step === STEP_KEYS.execute ? (
            <div className="text-xs text-gray-500">{t('results.exportWizard.actions.executeHint')}</div>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={isExporting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          )}
        </div>
      </div>
    </WizardModal>
  )
}

export default ResultsGymNetExportWizard
