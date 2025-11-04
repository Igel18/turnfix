/**
 * Participant Card/Grid View Component
 * Point 122: Separation of Concerns - Extracted from EventParticipants.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GenderBadge } from '@/components/GenderBadge';
import { UnifiedActionButtons } from '@/components/templates/EventManagementTemplate';
import type { Participant } from '../EventParticipants.types';

interface ParticipantCardViewProps {
  participants: Participant[];
  onEdit: (participant: Participant) => void;
  onDelete: (participantId: number) => void;
}

export const ParticipantCardView: React.FC<ParticipantCardViewProps> = ({
  participants,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-2">{t('eventParticipants.empty.title')}</p>
        <p className="text-sm">{t('eventParticipants.empty.subtitle')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {participant.firstname} {participant.lastname}
              </h3>
              {process.env.DEBUG === 'true' && (
                <p className="text-xs text-gray-500">ID: {participant.id}</p>
              )}
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              #{participant.startNumber || '-'}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('eventParticipants.card.age')}:</span>
              <span className="font-medium">{participant.age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('eventParticipants.card.gender')}:</span>
              <GenderBadge value={participant.gender} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('eventParticipants.card.club')}:</span>
              <span className="font-medium truncate ml-2" title={participant.club}>
                {participant.club}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('eventParticipants.card.squad')}:</span>
              <span className="font-medium">{participant.squad_name || '—'}</span>
            </div>
          </div>

          {/* Status Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                participant.startet_nicht
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {participant.startet_nicht
                ? t('eventParticipants.status.notStarting')
                : t('eventParticipants.status.active')}
            </span>
            {participant.assignedCompetitions &&
              participant.assignedCompetitions.length > 0 && (
                <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded">
                  {participant.assignedCompetitions.length}{' '}
                  {t('eventParticipants.card.competitions')}
                </span>
              )}
            {participant.bol_ak && (
              <span className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded">
                {t('eventParticipants.card.outOfCompetition')}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end">
            <UnifiedActionButtons
              onEdit={() => onEdit(participant)}
              onDelete={() => onDelete(participant.id)}
              editTitle={t('eventParticipants.actions.editParticipant')}
              deleteTitle={t('eventParticipants.actions.removeFromEvent')}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
