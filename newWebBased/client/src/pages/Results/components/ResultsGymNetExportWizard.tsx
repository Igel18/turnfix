import { useTranslation } from 'react-i18next'
import { PlayIcon } from '@heroicons/react/24/outline'
import WizardModal from '@/components/WizardModal'
import type { GymNetMatchReport } from '../hooks/useExport'
import { useResultsGymNetExportWizard, RESULTS_GYMNET_EXPORT_STEP_KEYS } from './useResultsGymNetExportWizard'

const WIZARD_MODAL_SIZE = '3xl'
const XML_FILE_ACCEPT = '.xml,text/xml,application/xml'
const TEMPLATE_FILE_INPUT_ID = 'results-gymnet-template-input'
const OUTPUT_FILE_INPUT_ID = 'results-gymnet-output-input'

interface ResultsGymNetExportWizardProps {
  isOpen: boolean
  onClose: () => void
  eventName: string
  selectedCompetitionLabel: string
  onExport: (templateFile: File, outputFileName?: string) => Promise<GymNetMatchReport | null>
}

export function ResultsGymNetExportWizard({
  isOpen,
  onClose,
  eventName,
  selectedCompetitionLabel,
  onExport,
}: ResultsGymNetExportWizardProps) {
  const { t } = useTranslation()
  const wizard = useResultsGymNetExportWizard({
    isOpen,
    onClose,
    eventName,
    selectedCompetitionLabel,
    onExport,
  })

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={wizard.handleClose}
      title={wizard.title}
      steps={wizard.steps}
      currentStep={wizard.step}
      size={WIZARD_MODAL_SIZE}
    >
      <div className="space-y-4">
        {wizard.step === RESULTS_GYMNET_EXPORT_STEP_KEYS.template && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p>{t('results.exportWizard.help.template')}</p>
            </div>

            <div>
              <label htmlFor={TEMPLATE_FILE_INPUT_ID} className="block text-sm font-medium text-gray-700 mb-2">
                {t('results.exportWizard.templateInputLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id={TEMPLATE_FILE_INPUT_ID}
                type="file"
                accept={XML_FILE_ACCEPT}
                onChange={(e) => wizard.handleTemplateSelect(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
              />
              {wizard.templateFile && (
                <p className="mt-2 text-xs text-gray-600">
                  {t('results.exportWizard.selectedTemplate')}: <span className="font-medium">{wizard.templateFile.name}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {wizard.step === RESULTS_GYMNET_EXPORT_STEP_KEYS.target && (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <p>{t('results.exportWizard.help.target')}</p>
            </div>

            <div>
              <label htmlFor={OUTPUT_FILE_INPUT_ID} className="block text-sm font-medium text-gray-700 mb-2">
                {t('results.exportWizard.outputFileNameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id={OUTPUT_FILE_INPUT_ID}
                type="text"
                value={wizard.outputFileName}
                onChange={(e) => {
                  wizard.setOutputFileName(e.target.value)
                }}
                placeholder={t('results.exportWizard.outputFileNamePlaceholder')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">{t('results.exportWizard.outputFileNameHint')}</p>
            </div>
          </div>
        )}

        {wizard.step === RESULTS_GYMNET_EXPORT_STEP_KEYS.execute && (
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
                <div className="font-semibold text-gray-900">{wizard.templateFile?.name || '-'}</div>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <div className="text-gray-500">{t('results.exportWizard.summary.output')}</div>
                <div className="font-semibold text-gray-900">{wizard.outputFileName}</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => void wizard.runExport()}
                disabled={wizard.isExporting}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4" />
                {wizard.isExporting ? t('results.exportWizard.actions.exporting') : t('results.exportWizard.actions.startExport')}
              </button>
            </div>
          </div>
        )}

        {wizard.step === RESULTS_GYMNET_EXPORT_STEP_KEYS.report && (
          <div className="space-y-4 text-sm">
            {wizard.report ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">{t('results.matchReport.competitionsMatched')}</div>
                    <div className="font-semibold">{wizard.report.summary.competitionsMatched}</div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">{t('results.matchReport.participantsMatched')}</div>
                    <div className="font-semibold">{wizard.report.summary.participantsMatched}</div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">{t('results.matchReport.disciplineScoresWritten')}</div>
                    <div className="font-semibold">{wizard.report.summary.disciplineScoresWritten}</div>
                  </div>
                  <div className="p-3 rounded bg-amber-50">
                    <div className="text-amber-700">{t('results.matchReport.competitionsUnmatched')}</div>
                    <div className="font-semibold text-amber-700">{wizard.report.summary.competitionsUnmatched}</div>
                  </div>
                  <div className="p-3 rounded bg-amber-50">
                    <div className="text-amber-700">{t('results.matchReport.participantsUnmatched')}</div>
                    <div className="font-semibold text-amber-700">{wizard.report.summary.participantsUnmatched}</div>
                  </div>
                  <div className="p-3 rounded bg-amber-50">
                    <div className="text-amber-700">{t('results.matchReport.disciplinesUnmatched')}</div>
                    <div className="font-semibold text-amber-700">{wizard.report.summary.disciplinesUnmatched}</div>
                  </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-auto border rounded p-3 bg-white">
                  <div>
                    <div className="font-medium">{t('results.matchReport.unmatchedCompetitions')}</div>
                    <div className="text-gray-600 whitespace-pre-wrap">{wizard.report.unmatchedCompetitions.join('\n') || t('results.matchReport.none')}</div>
                  </div>
                  <div>
                    <div className="font-medium">{t('results.matchReport.unmatchedParticipants')}</div>
                    <div className="text-gray-600 whitespace-pre-wrap">{wizard.report.unmatchedParticipants.join('\n') || t('results.matchReport.none')}</div>
                  </div>
                  <div>
                    <div className="font-medium">{t('results.matchReport.unmatchedDisciplines')}</div>
                    <div className="text-gray-600 whitespace-pre-wrap">{wizard.report.unmatchedDisciplines.join('\n') || t('results.matchReport.none')}</div>
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

        {wizard.errorMessage && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {wizard.errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={wizard.goBack}
            disabled={wizard.isExporting}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {wizard.step === RESULTS_GYMNET_EXPORT_STEP_KEYS.template ? t('common.cancel') : t('common.back')}
          </button>

          {wizard.step === RESULTS_GYMNET_EXPORT_STEP_KEYS.report ? (
            <button
              type="button"
              onClick={wizard.handleClose}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('common.close')}
            </button>
          ) : wizard.step === RESULTS_GYMNET_EXPORT_STEP_KEYS.execute ? (
            <div className="text-xs text-gray-500">{t('results.exportWizard.actions.executeHint')}</div>
          ) : (
            <button
              type="button"
              onClick={wizard.goNext}
              disabled={wizard.isExporting}
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
