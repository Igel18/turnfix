import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentArrowUpIcon, DocumentArrowDownIcon, PlayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import type { GymNetMatchReport } from '../hooks/useExport'
import type { CertificateLayout, PaperFormat, Participant } from '../Results.types'

export type ResultsGymNetExportWizardStep = 'type' | 'certificates' | 'template' | 'target' | 'execute' | 'report'
export type ResultsExportType = 'csv' | 'pdf' | 'certificates' | 'xml'

const STEP_KEYS = {
  type: 'type',
  certificates: 'certificates',
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
    case STEP_KEYS.type:
      return 'results.exportWizard.titles.type'
    case STEP_KEYS.certificates:
      return 'results.exportWizard.titles.certificates'
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
  certificateParticipants: Participant[]
  certificateLayouts: CertificateLayout[]
  selectedCertificateLayout: CertificateLayout | null
  onCertificateLayoutChange: (layout: CertificateLayout | null) => void
  selectedPaperFormat: PaperFormat
  onPaperFormatChange: (format: PaperFormat) => void
  certificateSortOrder: 'asc' | 'desc'
  onCertificateSortOrderChange: (order: 'asc' | 'desc') => void
  onExportCsv: () => Promise<void>
  onExportPdf: () => Promise<void>
  onPrepareCertificates: () => Promise<void>
  onExportCertificates: () => Promise<void>
  onExportXml: (templateFile: File, outputFileName?: string) => Promise<GymNetMatchReport | null>
}

export function useResultsGymNetExportWizard({
  isOpen,
  onClose,
  eventName,
  selectedCompetitionLabel,
  certificateParticipants,
  certificateLayouts,
  selectedCertificateLayout,
  onCertificateLayoutChange,
  selectedPaperFormat,
  onPaperFormatChange,
  certificateSortOrder,
  onCertificateSortOrderChange,
  onExportCsv,
  onExportPdf,
  onPrepareCertificates,
  onExportCertificates,
  onExportXml,
}: UseResultsGymNetExportWizardProps) {
  const { t } = useTranslation()

  const [step, setStep] = useState<ResultsGymNetExportWizardStep>(STEP_KEYS.type)
  const [exportType, setExportType] = useState<ResultsExportType | null>(null)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [outputFileName, setOutputFileName] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [report, setReport] = useState<GymNetMatchReport | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setStep(STEP_KEYS.type)
    setExportType(null)
    setTemplateFile(null)
    setOutputFileName('')
    setIsExporting(false)
    setErrorMessage(null)
    setReport(null)
  }, [isOpen])

  const steps = useMemo(
    () => {
      if (!exportType) {
        return [{ key: STEP_KEYS.type, label: t('results.exportWizard.steps.type') }]
      }

      if (exportType === 'xml') {
        return [
          { key: STEP_KEYS.type, label: t('results.exportWizard.steps.type') },
          { key: STEP_KEYS.template, label: t('results.exportWizard.steps.template'), icon: DocumentArrowUpIcon },
          { key: STEP_KEYS.target, label: t('results.exportWizard.steps.target'), icon: DocumentArrowDownIcon },
          { key: STEP_KEYS.execute, label: t('results.exportWizard.steps.execute'), icon: PlayIcon },
          { key: STEP_KEYS.report, label: t('results.exportWizard.steps.report'), icon: CheckCircleIcon },
        ]
      }

      if (exportType === 'certificates') {
        return [
          { key: STEP_KEYS.type, label: t('results.exportWizard.steps.type') },
          { key: STEP_KEYS.certificates, label: t('results.exportWizard.steps.certificates') },
          { key: STEP_KEYS.execute, label: t('results.exportWizard.steps.execute'), icon: PlayIcon },
        ]
      }

      return [
        { key: STEP_KEYS.type, label: t('results.exportWizard.steps.type') },
        { key: STEP_KEYS.execute, label: t('results.exportWizard.steps.execute'), icon: PlayIcon },
      ]
    },
    [exportType, t]
  )

  const resetState = () => {
    setStep(STEP_KEYS.type)
    setExportType(null)
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

  const handleExportTypeSelect = (type: ResultsExportType) => {
    setExportType(type)
    setErrorMessage(null)
    setReport(null)
    setTemplateFile(null)
    setOutputFileName('')
  }

  const goNext = () => {
    if (step === STEP_KEYS.type) {
      if (!exportType) {
        setErrorMessage(t('results.exportWizard.errors.exportTypeRequired'))
        return
      }

      setErrorMessage(null)

      if (exportType === 'xml') {
        setStep(STEP_KEYS.template)
      } else if (exportType === 'certificates') {
        void onPrepareCertificates()
        setStep(STEP_KEYS.certificates)
      } else {
        setStep(STEP_KEYS.execute)
      }
      return
    }

    if (step === STEP_KEYS.certificates) {
      if (!selectedCertificateLayout) {
        setErrorMessage(t('results.exportWizard.errors.certificateLayoutRequired'))
        return
      }
      setErrorMessage(null)
      setStep(STEP_KEYS.execute)
      return
    }

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
    if (step === STEP_KEYS.type) {
      handleClose()
      return
    }

    if (step === STEP_KEYS.template) {
      setStep(STEP_KEYS.type)
      return
    }
    if (step === STEP_KEYS.certificates) {
      setStep(STEP_KEYS.type)
      return
    }
    if (step === STEP_KEYS.target) {
      setStep(STEP_KEYS.template)
      return
    }
    if (step === STEP_KEYS.execute) {
      setStep(exportType === 'xml' ? STEP_KEYS.target : exportType === 'certificates' ? STEP_KEYS.certificates : STEP_KEYS.type)
      return
    }
    if (step === STEP_KEYS.report) {
      setStep(STEP_KEYS.execute)
    }
  }

  const runExport = async () => {
    setIsExporting(true)
    setErrorMessage(null)

    try {
      if (exportType === 'csv') {
        await onExportCsv()
        setReport(null)
      } else if (exportType === 'pdf') {
        await onExportPdf()
        setReport(null)
      } else if (exportType === 'certificates') {
        await onExportCertificates()
        setReport(null)
        handleClose()
        return
      } else {
        if (!templateFile) {
          setErrorMessage(t('results.exportWizard.errors.templateRequired'))
          return
        }
        const safeName = ensureXmlExtension(normalizeFileName(outputFileName))
        const matchReport = await onExportXml(templateFile, safeName)
        setReport(matchReport)
      }
      setStep(STEP_KEYS.report)
    } catch (error) {
      const fallbackMessage = t('results.exportWizard.errors.exportFailed')
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage)
    } finally {
      setIsExporting(false)
    }
  }

  const exportTypeLabel = exportType ? t(`results.exportWizard.exportTypes.${exportType}`) : ''

  return {
    exportType,
    exportTypeLabel,
    setExportType: handleExportTypeSelect,
    step,
    setStep,
    steps,
    title: t(toStepTitleKey(step)),
    certificateParticipants,
    certificateLayouts,
    selectedCertificateLayout,
    onCertificateLayoutChange,
    selectedPaperFormat,
    onPaperFormatChange,
    certificateSortOrder,
    onCertificateSortOrderChange,
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