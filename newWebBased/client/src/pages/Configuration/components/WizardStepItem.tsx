/**
 * WizardStepItem component for rendering individual setup wizard steps.
 * Separated for better maintainability (SoC - Point 122).
 */

import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { StepStatus, WizardStepItemProps } from '../DatabaseSetupWizard.types';

function getStepIcon(status: StepStatus) {
  switch (status) {
    case 'success':
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    case 'running':
      return <ClockIcon className="h-6 w-6 text-blue-500 animate-spin" />;
    case 'error':
      return <XCircleIcon className="h-6 w-6 text-red-500" />;
    case 'skipped':
      return <ChevronRightIcon className="h-6 w-6 text-gray-400" />;
    default:
      return <div className="h-6 w-6 rounded-full border-2 border-gray-300" />;
  }
}

function getStepBorderClasses(status: StepStatus): string {
  switch (status) {
    case 'success':
      return 'border-green-300 bg-green-50';
    case 'error':
      return 'border-red-300 bg-red-50';
    case 'running':
      return 'border-blue-300 bg-blue-50';
    case 'skipped':
      return 'border-gray-300 bg-gray-50';
    default:
      return 'border-gray-300 bg-white';
  }
}

export default function WizardStepItem({
  step,
  index,
  canExecute,
  onExecute,
  onSkip,
  onRetry,
}: WizardStepItemProps) {
  const { t } = useTranslation();

  return (
    <div className={`border rounded-lg p-4 ${getStepBorderClasses(step.status)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getStepIcon(step.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900">
                {index + 1}. {step.title}
              </h3>
              {step.optional && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {t('configuration.wizard.optional') || 'Optional'}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{step.description}</p>

            {/* Output Log */}
            {step.output && step.output.length > 0 && (
              <div className="mt-3 bg-gray-900 rounded p-3 font-mono text-xs text-gray-100 max-h-40 overflow-y-auto">
                {step.output.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))}
              </div>
            )}

            {/* Error Details */}
            {step.error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {step.error}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 ml-4">
          {step.status === 'pending' && canExecute && (
            <>
              <button
                onClick={() => onExecute(step.id)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {t('configuration.wizard.execute') || 'Ausführen'}
              </button>
              {step.optional && (
                <button
                  onClick={() => onSkip(step.id)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {t('configuration.wizard.skip') || 'Überspringen'}
                </button>
              )}
            </>
          )}
          {step.status === 'error' && (
            <button
              onClick={() => onRetry(step.id)}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {t('configuration.wizard.retry') || 'Wiederholen'}
            </button>
          )}
          {step.status === 'running' && (
            <div className="px-3 py-1.5 text-sm text-blue-600">
              {t('configuration.wizard.running') || 'Wird ausgeführt...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
