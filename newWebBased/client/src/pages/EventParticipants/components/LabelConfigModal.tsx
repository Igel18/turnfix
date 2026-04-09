/**
 * Label Configuration Modal Component
 * Point 131: Extracted from EventParticipants for SoC
 * 
 * Displays a modal to configure label printing settings before generating PDF
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedModal from '@/components/UnifiedModal';
import { apiGet } from '@/utils/api';

export interface LabelConfig {
  rows: number;
  columns: number;
  width: number;
  height: number;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  showBorders: boolean;
  startRow: number;
  startColumn: number;
}

interface LabelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (config: LabelConfig) => void;
  participantCount: number;
}

export function LabelConfigModal({ isOpen, onClose, onPrint, participantCount }: LabelConfigModalProps) {
  const { t } = useTranslation();
  
  const [config, setConfig] = useState<LabelConfig>({
    rows: 16,
    columns: 4,
    width: 48.5, // mm
    height: 16.9, // mm
    marginTop: 13, // mm
    marginLeft: 8, // mm
    marginRight: 8, // mm
    marginBottom: 13, // mm
    showBorders: true,
    startRow: 1,
    startColumn: 1,
  });

  // Load label configuration from server on mount
  useEffect(() => {
    if (isOpen) {
      loadLabelConfig();
    }
  }, [isOpen]);

  const loadLabelConfig = async () => {
    try {
      const serverConfig = await apiGet('/configuration');
      if (serverConfig?.printing) {
        const p = serverConfig.printing;
        setConfig({
          rows: p.label_rows ?? 16,
          columns: p.label_columns ?? 4,
          width: p.label_width ?? 48.5,
          height: p.label_height ?? 16.9,
          marginTop: p.label_margin_top ?? 13,
          marginLeft: p.label_margin_left ?? 8,
          marginRight: p.label_margin_right ?? 8,
          marginBottom: p.label_margin_bottom ?? 13,
          showBorders: p.label_show_borders ?? true,
          startRow: 1,
          startColumn: 1,
        });
      }
    } catch (error) {
      console.error('Failed to load label configuration, using defaults:', error);
    }
  };

  const handlePrint = () => {
    onPrint(config);
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('eventParticipants.labelConfig.title')}
      size="2xl"
      showFooter={false}
      fullHeight={true}
    >
      <div className="space-y-4">
        {/* Rows and Columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.rows')}
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.rows}
              onChange={(e) => setConfig({ ...config, rows: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.columns')}
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.columns}
              onChange={(e) => setConfig({ ...config, columns: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Width and Height */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.width')} (mm)
            </label>
            <input
              type="number"
              min="10"
              max="200"
              step="0.1"
              value={config.width}
              onChange={(e) => setConfig({ ...config, width: parseFloat(e.target.value) || 48.5 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.height')} (mm)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              step="0.1"
              value={config.height}
              onChange={(e) => setConfig({ ...config, height: parseFloat(e.target.value) || 16.9 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Margins */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginTop')} (mm)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={config.marginTop}
              onChange={(e) => setConfig({ ...config, marginTop: parseFloat(e.target.value) || 15 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginLeft')} (mm)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={config.marginLeft}
              onChange={(e) => setConfig({ ...config, marginLeft: parseFloat(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginRight')} (mm)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={config.marginRight}
              onChange={(e) => setConfig({ ...config, marginRight: parseFloat(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginBottom')} (mm)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={config.marginBottom}
              onChange={(e) => setConfig({ ...config, marginBottom: parseFloat(e.target.value) || 15 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Show Borders Checkbox */}
        <div className="flex items-center">
          <input
            id="showBorders"
            type="checkbox"
            checked={config.showBorders}
            onChange={(e) => setConfig({ ...config, showBorders: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="showBorders" className="ml-2 block text-sm text-gray-900">
            {t('eventParticipants.labelConfig.showBorders')}
          </label>
        </div>

        {/* Start Row / Start Column (48c) */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">{t('eventParticipants.labelConfig.startPositionTitle')}</h4>
          <p className="text-xs text-gray-500 mb-3">{t('eventParticipants.labelConfig.startPositionHint')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eventParticipants.labelConfig.startRow')}
              </label>
              <input
                type="number"
                min="1"
                max={config.rows}
                value={config.startRow}
                onChange={(e) => setConfig({ ...config, startRow: Math.max(1, Math.min(config.rows, parseInt(e.target.value) || 1)) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eventParticipants.labelConfig.startColumn')}
              </label>
              <input
                type="number"
                min="1"
                max={config.columns}
                value={config.startColumn}
                onChange={(e) => setConfig({ ...config, startColumn: Math.max(1, Math.min(config.columns, parseInt(e.target.value) || 1)) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Preview Info (48b) */}
        {(() => {
          const labelsPerPage = config.rows * config.columns;
          const skippedPositions = (config.startRow - 1) * config.columns + (config.startColumn - 1);
          const availableOnFirstPage = labelsPerPage - skippedPositions;
          const totalLabels = participantCount;
          const pagesNeeded = totalLabels <= 0
            ? 0
            : availableOnFirstPage >= totalLabels
              ? 1
              : 1 + Math.ceil((totalLabels - availableOnFirstPage) / labelsPerPage);
          return (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">{t('eventParticipants.labelConfig.previewInfo')}</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>{t('eventParticipants.labelConfig.labelsPerPage', { rows: config.rows, columns: config.columns, count: labelsPerPage })}</li>
                <li>{t('eventParticipants.labelConfig.participantCount', { count: totalLabels })}</li>
                {skippedPositions > 0 && (
                  <li>{t('eventParticipants.labelConfig.skippedLabels', { count: skippedPositions })}</li>
                )}
                {totalLabels > 0 && (
                  <li className="font-medium">{t('eventParticipants.labelConfig.pagesNeeded', { pages: pagesNeeded })}</li>
                )}
              </ul>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('eventParticipants.labelConfig.generatePDF')}
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}
