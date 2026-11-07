import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { WizardModal } from '@/components/WizardModal';
import { apiPost } from '@/utils/api';

interface RestoreWizardProps {
  onBack: () => void;
  onClose: () => void;
}

interface RestoreResult {
  databaseName: string;
  stagingPath: string;
}

const absolutePath = /^(?:[a-z]:[\\/]|\\\\[^\\/\s]+[\\/][^\\/\s]+(?:[\\/]|$)|\/(?!\/))[^\x00-\x1f]*$/i;
const validDatabaseName = /^[a-z][a-z0-9_]{0,62}$/;
const errorCodes = ['DATABASE_EXISTS', 'RESTORE_IN_PROGRESS', 'FORBIDDEN', 'INVALID_BACKUP_OR_STAGING', 'DATABASE_CREATE_FAILED', 'RESTORE_FAILED', 'INVALID_REQUEST', 'INVALID_TARGET_DATABASE'] as const;
const modalSize = '4xl' as const;
const restoreStep = 'restore';

export default function RestoreWizard({ onBack, onClose }: RestoreWizardProps) {
  const { t } = useTranslation();
  const [backup, setBackup] = useState('');
  const [staging, setStaging] = useState('');
  const [database, setDatabase] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [failure, setFailure] = useState<{ code: string; databaseMayRemain: boolean } | null>(null);
  const inFlight = useRef(false);
  const backupPath = backup.trim();
  const stagingPath = staging.trim();
  const databaseName = database.trim();
  const valid = absolutePath.test(backupPath) && absolutePath.test(stagingPath) && validDatabaseName.test(databaseName) && confirmed;

  const restore = async () => {
    if (!valid || inFlight.current || result) return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const response = await apiPost('/configuration/backup/restore', { backupPath, stagingPath, databaseName }, {
        headers: { 'Content-Type': 'application/json', 'X-TurnFix-Restore': '1' },
        retryOnRateLimit: false,
      });
      if (response?.success !== true || typeof response.databaseName !== 'string' || typeof response.stagingPath !== 'string') {
        throw { response: { data: response } };
      }
      setResult({ databaseName: response.databaseName, stagingPath: response.stagingPath });
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { code?: unknown; databaseCreated?: unknown } } })?.response?.data;
      const code = typeof data?.code === 'string' && errorCodes.some(known => known === data.code) ? data.code : 'UNKNOWN';
      setFailure({ code, databaseMayRemain: data?.databaseCreated !== false });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100';
  const buttonClass = 'inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <WizardModal isOpen onClose={onClose} closeDisabled={busy} title={t('configuration.restore.title')} size={modalSize} fullHeight
      steps={[{ key: restoreStep, label: t('configuration.restore.step') }]} currentStep={restoreStep}>
      <div className="space-y-5" aria-busy={busy}>
        <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{t('configuration.restore.prerequisites')}</p>
          <p>{t('configuration.restore.localOnly')}</p>
          <p>{t('configuration.restore.manualActivation')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">{t('configuration.restore.backupLabel')} <span className="text-red-600">*</span>
            <input required disabled={busy || !!result} className={inputClass} value={backup} onChange={event => setBackup(event.target.value)} />
          </label>
          <label className="text-sm font-medium text-gray-700">{t('configuration.restore.stagingLabel')} <span className="text-red-600">*</span>
            <input required disabled={busy || !!result} className={inputClass} value={staging} onChange={event => setStaging(event.target.value)} />
          </label>
          <label className="text-sm font-medium text-gray-700">{t('configuration.restore.databaseLabel')} <span className="text-red-600">*</span>
            <input required disabled={busy || !!result} className={inputClass} value={database} onChange={event => setDatabase(event.target.value)} />
          </label>
        </div>
        <p className="text-xs text-gray-600">{t('configuration.restore.validation')}</p>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" required disabled={busy || !!result} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />
          <span>{t('configuration.restore.confirmation')} <span className="text-red-600">*</span></span>
        </label>
        {failure && <div role="alert" className="space-y-2 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{t(`configuration.restore.errors.${failure.code}`)}</p>
          {failure.databaseMayRemain && <p>{t('configuration.restore.databaseMayRemain')}</p>}
        </div>}
        {result && <div role="status" className="space-y-2 rounded border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">{t('configuration.restore.success')}</p>
          <p>{t('configuration.restore.resultDatabase')}: <strong>{result.databaseName}</strong></p>
          <p>{t('configuration.restore.resultStaging')}: <strong>{result.stagingPath}</strong></p>
          <p>{t('configuration.restore.notSwitched')}</p>
          <p>{t('configuration.restore.manualActivation')}</p>
        </div>}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <button type="button" onClick={onBack} disabled={busy} className={buttonClass}>
            <ArrowLeftIcon className="h-4 w-4" />{t('configuration.restore.back')}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={buttonClass}>{t('common.close')}</button>
          <button type="button" onClick={restore} disabled={!valid || busy || !!result} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <ArrowPathIcon className="h-4 w-4" />{t(busy ? 'configuration.restore.running' : 'configuration.restore.start')}
          </button>
        </div>
      </div>
    </WizardModal>
  );
}
