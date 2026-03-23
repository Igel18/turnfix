/**
 * Participant Table View Component
 * Point 122: Separation of Concerns - Extracted from EventParticipants.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { isDebugEnabled } from '@/utils/debug';
import { SortableTableHeader } from '@/components/SortableTableHeader';
import { GenderBadge } from '@/components/GenderBadge';
import { UnifiedActionButtons } from '@/components/templates/EventManagementTemplate';
import { getUnifiedParticipantHeaderLabels } from '@/utils/headerLabels';
import type { Participant, Competition } from '../EventParticipants.types';

interface ParticipantTableProps {
  participants: Participant[];
  competitions: Competition[];
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  onEdit: (participant: Participant) => void;
  onDelete: (participantId: number) => void;
  onToggleStatus: (participantId: number, startetNicht: boolean) => void;
}

export const ParticipantTable: React.FC<ParticipantTableProps> = ({
  participants,
  competitions,
  sortKey,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { t } = useTranslation();
  const labels = getUnifiedParticipantHeaderLabels(t);

  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-2">{t('eventParticipants.empty.title')}</p>
        <p className="text-sm">{t('eventParticipants.empty.subtitle')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableTableHeader
              label={labels.name}
              sortKey="lastname"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label={labels.startNumber}
              sortKey="startNumber"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label={labels.club}
              sortKey="club"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label={labels.age}
              sortKey="age"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label={labels.gender}
              sortKey="gender"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label={labels.squad}
              sortKey="squad_name"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={onSort}
            />
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {labels.status}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('eventParticipants.table.competitions')}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('eventParticipants.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {participants.map((participant) => (
            <tr key={participant.id} className="hover:bg-gray-50">
              {/* Name */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {participant.firstname} {participant.lastname}
                </div>
                {isDebugEnabled() && (
                  <div className="text-sm text-gray-500">ID: {participant.id}</div>
                )}
              </td>

              {/* Start Number */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  #{participant.startNumber || '-'}
                </span>
              </td>

              {/* Club */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {participant.club}
              </td>

              {/* Age */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {participant.age}
              </td>

              {/* Gender */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <GenderBadge value={participant.gender} />
              </td>

              {/* Squad */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {participant.squad_name || '-'}
              </td>

              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onToggleStatus(participant.id, !participant.startet_nicht)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    participant.startet_nicht
                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {participant.startet_nicht
                    ? t('eventParticipants.status.notStarting')
                    : t('eventParticipants.status.active')}
                </button>
              </td>

              {/* Competitions */}
              <td className="px-6 py-4 text-sm text-gray-500">
                {participant.assignedCompetitions && participant.assignedCompetitions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {participant.assignedCompetitions.map((compId) => {
                      const comp = competitions.find((c) => c.id === compId);
                      return (
                        <span
                          key={compId}
                          className="inline-block px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full"
                          title={comp?.name}
                        >
                          {comp?.name ?? `#${compId}`}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <UnifiedActionButtons
                  onEdit={() => onEdit(participant)}
                  onDelete={() => onDelete(participant.id)}
                  editTitle={t('eventParticipants.actions.editParticipant')}
                  deleteTitle={t('eventParticipants.actions.removeFromEvent')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
