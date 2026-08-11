import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentArrowUpIcon, DocumentArrowDownIcon, PlayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import type { GymNetMatchReport } from '../hooks/useExport'

export type ResultsGymNetExportWizardStep = 'template' | 'target' | 'execute' | 'report'

const STEP_KEYS = {
  template: 'template',
  target: 'target',
  execute: 'execute',
  report: 'report',
} as const

const todayDatePart = () => new Date().toISOString().split('T')[0]

const normalizeFileName = (name: string) => {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, '_').trim()
  return cleaned || 'gymnet_results.xml'
}

const ensureXmlExtension = (name: string) => {
  return name.toLowerCase().endsWith('.xml') ? name : `${name}.xml`
}

const toStepTitleKey = (step: ResultsGymNetExportWizardStep) => {
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

export interface UseResultsGymNetExportWizardProps {
  isOpen: boolean
  onClose: () => void
  eventName: string
  selectedCompetitionLabel: string
  onExport: (templateFile: File, outputFileName?: string) => Promise<GymNetMatchReport | null>
}

export function useResultsGymNetExportWizard({
  isOpen,
  onClose,
  eventName,
  selectedCompetitionLabel,
  onExport,
}: UseResultsGymNetExportWizardProps) {
  const { t } = useTranslation()

  const [step, setStep] = useState<ResultsGymNetExportWizardStep>(STEP_KEYS.template)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [outputFileName, setOutputFileName] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [report, setReport] = useState<GymNetMatchReport | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setStep(STEP_KEYS.template)
    setTemplateFile(null)
    setOutputFileName('')
    setIsExporting(false)
    setErrorMessage(null)
    setReport(null)
  }, [isOpen])

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

    const baseName = file.name.replace(/\.[^.]+$/, '')
    const proposedName = `${baseName}_Results_${todayDatePart()}.xml`
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

  return {
    step,
    setStep,
    steps,
    title: t(toStepTitleKey(step)),
    templateFile,
    outputFileName,
    setOutputFileName,
    isExporting,
    errorMessage,
    report,
    handleClose,
    handleTemplateSelect,
    goNext,
    goBack,
    runExport,
    eventName,
    selectedCompetitionLabel,
    isOpen,
  }
}

export { STEP_KEYS as RESULTS_GYMNET_EXPORT_STEP_KEYS }