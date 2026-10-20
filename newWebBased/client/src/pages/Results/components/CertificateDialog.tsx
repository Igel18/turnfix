/**
 * CertificateDialog Component
 * Point 123: Separation of Concerns
 * 
 * Modal dialog for printing certificates:
 * - Layout selection
 * - Paper format selection
 * - Debug mode toggle
 * - Participant preview
 */

import { useTranslation } from 'react-i18next'
import UnifiedModal from '@/components/UnifiedModal'
import { isDebugEnabled, setDebugMode } from '@/utils/debug'
import type { CertificateLayout, PaperFormat, Participant } from '../Results.types'

interface CertificateDialogProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  layouts: CertificateLayout[]
  selectedLayout: CertificateLayout | null
  onLayoutChange: (layout: CertificateLayout | null) => void
  selectedPaperFormat: PaperFormat
  onPaperFormatChange: (format: PaperFormat) => void
  isPrinting: boolean
  onGenerate: () => void
  paperFormats: Record<PaperFormat, { width: number; height: number; name: string }>
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (order: 'asc' | 'desc') => void
}

export const CertificateDialog = ({
  isOpen,
  onClose,
  participants,
  layouts,
  selectedLayout,
  onLayoutChange,
  selectedPaperFormat,
  onPaperFormatChange,
  isPrinting,
  onGenerate,
  paperFormats,
  sortOrder,
  onSortOrderChange
}: CertificateDialogProps) => {
  const { t } = useTranslation()

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('results.printCertificates')}
      size="md"
      showFooter={false}
    >
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          {t('results.certificate.selectedParticipants', { count: participants.length })}
        </p>
        <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2 text-sm">
          {participants.slice(0, 5).map(p => (
            <div key={p.id} className="truncate">
              {t('results.certificate.participantEntry', { rank: p.rank, name: p.name, club: p.club })}
            </div>
          ))}
          {participants.length > 5 && (
            <div className="text-gray-500">
              {t('results.certificate.andMore', { count: participants.length - 5 })}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('results.certificate.selectLayout')}
        </label>
        <select
          value={selectedLayout?.int_layoutid || ''}
          onChange={(e) => {
            const layoutId = Number(e.target.value)
            const layout = layouts.find(l => l.int_layoutid === layoutId)
            onLayoutChange(layout || null)
          }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">{t('results.certificate.chooseLayout')}</option>
          {layouts.map(layout => (
            <option key={layout.int_layoutid} value={layout.int_layoutid}>
              {layout.var_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('results.certificate.paperFormat')}
        </label>
        <select
          value={selectedPaperFormat}
          onChange={(e) => onPaperFormatChange(e.target.value as PaperFormat)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {Object.entries(paperFormats).map(([key, format]) => (
            <option key={key} value={key}>
              {format.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {t('results.certificate.paperFormatHint')}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('results.certificate.sortOrder')}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSortOrderChange('desc')}
            className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
              sortOrder === 'desc'
                ? 'bg-purple-100 border-purple-500 text-purple-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ↓ {t('results.certificate.sortOrderDesc')}
          </button>
          <button
            type="button"
            onClick={() => onSortOrderChange('asc')}
            className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
              sortOrder === 'asc'
                ? 'bg-purple-100 border-purple-500 text-purple-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ↑ {t('results.certificate.sortOrderAsc')}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isDebugEnabled()}
            onChange={(e) => setDebugMode(e.target.checked)}
            className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-medium text-gray-700">
            {t('results.certificate.debugMode')}
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          {t('results.certificate.debugModeHint')}
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onGenerate}
          disabled={!selectedLayout || isPrinting}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isPrinting ? t('results.certificate.generating') : t('results.certificate.generatePDF')}
        </button>
      </div>
    </UnifiedModal>
  )
}
