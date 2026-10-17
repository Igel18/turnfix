/**
 * Label Configuration Modal Component
 * Point 131: Extracted from EventParticipants for SoC
 * 
 * Displays a modal to configure label printing settings before generating PDF
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedModal from '@/components/UnifiedModal';
import LocalizedNumberInput from '@/components/ui/LocalizedNumberInput';
import { apiGet } from '@/utils/api';

const LABEL_NUMERIC_FIELDS = [
  'rows', 'columns', 'width', 'height', 'marginTop', 'marginLeft', 'marginRight', 'marginBottom', 'startRow', 'startColumn',
] as const;

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
    if (!LABEL_NUMERIC_FIELDS.every(field => Number.isFinite(config[field]))) return;
    onPrint(config);
    onClose();
  };

  const updateNumericField = (fieldIndex: number, value: string | number, integer = false) => {
    const field = LABEL_NUMERIC_FIELDS[fieldIndex];
    const parsedValue = typeof value === 'number'
      ? value
      : value === '' ? Number.NaN : integer ? parseInt(value, 10) : parseFloat(value);
    setConfig(prev => ({ ...prev, [field]: parsedValue }));
  };

  const isConfigValid = LABEL_NUMERIC_FIELDS.every(field => Number.isFinite(config[field]))
    && config.rows >= 1 && config.rows <= 20
    && config.columns >= 1 && config.columns <= 10
    && config.width >= 10 && config.width <= 200
    && config.height >= 10 && config.height <= 100
    && config.marginTop >= 0 && config.marginTop <= 50
    && config.marginLeft >= 0 && config.marginLeft <= 50
    && config.marginRight >= 0 && config.marginRight <= 50
    && config.marginBottom >= 0 && config.marginBottom <= 50
    && config.startRow >= 1 && config.startRow <= config.rows
    && config.startColumn >= 1 && config.startColumn <= config.columns;

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
              required
              min="1"
              max="20"
              value={Number.isFinite(config.rows) ? config.rows : ''}
              onChange={(e) => updateNumericField(0, e.target.value, true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.columns')}
            </label>
            <input
              type="number"
              required
              min="1"
              max="10"
              value={Number.isFinite(config.columns) ? config.columns : ''}
              onChange={(e) => updateNumericField(1, e.target.value, true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
          </div>
        </div>

        {/* Width and Height */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.width')} (mm)
            </label>
            <LocalizedNumberInput
              id="label-width"
              required
              min={10}
              max={200}
              value={config.width}
              onValueChange={(value) => updateNumericField(2, value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.height')} (mm)
            </label>
            <LocalizedNumberInput
              id="label-height"
              required
              min={10}
              max={100}
              value={config.height}
              onValueChange={(value) => updateNumericField(3, value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
          </div>
        </div>

        {/* Margins */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginTop')} (mm)
            </label>
            <LocalizedNumberInput
              id="label-margin-top"
              required
              min={0}
              max={50}
              value={config.marginTop}
              onValueChange={(value) => updateNumericField(4, value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginLeft')} (mm)
            </label>
            <LocalizedNumberInput
              id="label-margin-left"
              required
              min={0}
              max={50}
              value={config.marginLeft}
              onValueChange={(value) => updateNumericField(5, value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginRight')} (mm)
            </label>
            <LocalizedNumberInput
              id="label-margin-right"
              required
              min={0}
              max={50}
              value={config.marginRight}
              onValueChange={(value) => updateNumericField(6, value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('eventParticipants.labelConfig.marginBottom')} (mm)
            </label>
            <LocalizedNumberInput
              id="label-margin-bottom"
              required
              min={0}
              max={50}
              value={config.marginBottom}
              onValueChange={(value) => updateNumericField(7, value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
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
                required
                min="1"
                max={Number.isFinite(config.rows) ? config.rows : undefined}
                value={Number.isFinite(config.startRow) ? config.startRow : ''}
                onChange={(e) => updateNumericField(8, e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eventParticipants.labelConfig.startColumn')}
              </label>
              <input
                type="number"
                required
                min="1"
                max={Number.isFinite(config.columns) ? config.columns : undefined}
                value={Number.isFinite(config.startColumn) ? config.startColumn : ''}
                onChange={(e) => updateNumericField(9, e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Preview Info (48b) */}
        {(() => {
          const labelsPerPage = Number.isFinite(config.rows) && Number.isFinite(config.columns)
            ? config.rows * config.columns
            : 0;
          const skippedPositions = Number.isFinite(config.startRow) && Number.isFinite(config.columns)
            ? (config.startRow - 1) * config.columns + (config.startColumn - 1)
            : 0;
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
            disabled={!isConfigValid}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('eventParticipants.labelConfig.generatePDF')}
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}
