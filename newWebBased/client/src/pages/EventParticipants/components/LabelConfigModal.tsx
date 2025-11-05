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
}

interface LabelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (config: LabelConfig) => void;
}

export function LabelConfigModal({ isOpen, onClose, onPrint }: LabelConfigModalProps) {
  const { t } = useTranslation();
  
  const [config, setConfig] = useState<LabelConfig>({
    rows: 8,
    columns: 4,
    width: 48.5, // mm
    height: 16.9, // mm
    marginTop: 15, // mm
    marginLeft: 10, // mm
    marginRight: 10, // mm
    marginBottom: 15, // mm
    showBorders: true,
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
        setConfig({
          rows: serverConfig.printing.labelRows || 8,
          columns: serverConfig.printing.labelColumns || 4,
          width: serverConfig.printing.labelWidth || 48.5,
          height: serverConfig.printing.labelHeight || 16.9,
          marginTop: serverConfig.printing.labelMarginTop || 15,
          marginLeft: serverConfig.printing.labelMarginLeft || 10,
          marginRight: serverConfig.printing.labelMarginRight || 10,
          marginBottom: serverConfig.printing.labelMarginBottom || 15,
          showBorders:
            serverConfig.printing.labelShowBorders !== undefined
              ? serverConfig.printing.labelShowBorders
              : true,
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

        {/* Preview Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">{t('eventParticipants.labelConfig.previewInfo')}</h4>
          <p className="text-sm text-gray-600">
            {t('eventParticipants.labelConfig.labelsPerPage', {
              count: config.rows * config.columns,
              rows: config.rows,
              columns: config.columns,
            })}
          </p>
        </div>

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
