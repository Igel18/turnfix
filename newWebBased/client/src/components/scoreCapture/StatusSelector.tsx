import { useTranslation } from 'react-i18next';
import { Status } from '@/types/ScoreCapture.types';

interface StatusSelectorProps {
  statuses: Status[];
  currentStatusId: number | null;
  onChange: (statusId: number) => void;
  getStatusColor: (statusId: number) => string;
}

export function StatusSelector({
  statuses,
  currentStatusId,
  onChange,
  getStatusColor
}: StatusSelectorProps) {
  const { t } = useTranslation();

  return (
    <select
      value={currentStatusId || ''}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className={`px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        currentStatusId ? getStatusColor(currentStatusId) : 'border-gray-300'
      }`}
    >
      <option value="">{t('scoreCapture.selectStatus')}</option>
      {statuses.map((status) => (
        <option key={status.int_statusid} value={status.int_statusid}>
          {status.var_name}
        </option>
      ))}
    </select>
  );
}
