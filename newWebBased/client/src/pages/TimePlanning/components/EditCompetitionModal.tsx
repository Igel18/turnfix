/**
 * EditCompetitionModal component
 * Point 124: Separation of Concerns
 *
 * Modal for editing the warm-up time and start time of a competition.
 */

import { useTranslation } from 'react-i18next';
import UnifiedModal from '@/components/UnifiedModal';
import type { Competition } from '../TimePlanning.types';

interface EditCompetitionModalProps {
  isOpen: boolean;
  editingCompetition: Competition | null;
  selectedEvent: any;
  onClose: () => void;
  onSave: () => void;
  onChange: (competition: Competition) => void;
}

export function EditCompetitionModal({
  isOpen,
  editingCompetition,
  selectedEvent,
  onClose,
  onSave,
  onChange,
}: EditCompetitionModalProps) {
  const { t } = useTranslation();

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('timePlanning.editTimes', 'Zeiten bearbeiten')}
      size="md"
      showFooter={true}
      onSave={onSave}
      saveLabel={t('common.save', 'Speichern')}
      showCancel={true}
      cancelLabel={t('common.cancel', 'Abbrechen')}
    >
      {editingCompetition && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{editingCompetition.name}</h4>
            <p className="text-sm text-gray-600">Nr. {editingCompetition.number}</p>
          </div>

          {/* Event Date (read-only) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                📅 {t('timePlanning.eventDate', 'Veranstaltungsdatum')}:
              </span>
              <span className="text-sm text-blue-700">
                {selectedEvent?.dat_eventstartdate
                  ? new Date(selectedEvent.dat_eventstartdate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {t('timePlanning.dateInfo', 'Das Datum wird vom Veranstaltungsdatum übernommen. Nur die Uhrzeit kann individuell eingestellt werden.')}
            </p>
          </div>

          {/* Warm-up Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('timePlanning.warmupTime', 'Einturnzeit')}
            </label>
            <input
              type="time"
              value={editingCompetition.warmupTime || ''}
              onChange={e => onChange({ ...editingCompetition, warmupTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('timePlanning.startTime', 'Startzeit')}
            </label>
            <input
              type="time"
              value={editingCompetition.startTime || ''}
              onChange={e => onChange({ ...editingCompetition, startTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}
