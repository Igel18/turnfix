/**
 * ParticipantList – Left sidebar for ScoreCaptureV2.
 * Mirrors the visual style of the Jury Portal's ParticipantSidebar.
 * Point 125: Jury-style split-view score capture.
 */

import React from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/status';
import type { ParticipantListItem } from '../ScoreCaptureV2.types';

interface ParticipantListProps {
  participants: ParticipantListItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  disciplineName?: string;
  squadName?: string;
}

function hasScore(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentIndex,
  onSelect,
  disciplineName,
  squadName,
}) => {
  const { t } = useTranslation();

  const completedCount = participants.filter(p => hasScore(p.currentScore)).length;
  const progressPercent = participants.length ? (completedCount / participants.length) * 100 : 0;

  return (
    <div
      className="w-full sm:w-2/5 lg:w-1/3 bg-white border-b sm:border-b-0 sm:border-r border-gray-300 flex flex-col"
      style={{ minHeight: 0 }}
    >
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          {t('scoreCaptureV2.participants', { count: participants.length })}
        </h2>
        {(disciplineName || squadName) && (
          <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
            {squadName && disciplineName ? `${disciplineName} – ${squadName}` : disciplineName || squadName}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">
              {t('scoreCaptureV2.progress')}
            </span>
            <span className="text-xs text-gray-500">
              {completedCount} / {participants.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t('scoreCaptureV2.noParticipants')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {participants.map((p, index) => {
              const isActive = index === currentIndex;
              const isScored = hasScore(p.currentScore);
              return (
                <button
                  key={p.id}
                  data-testid={`participant-list-item-${p.id}`}
                  onClick={() => onSelect(index)}
                  className={`w-full text-left p-3 sm:p-4 transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : isScored
                        ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Start number + name */}
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : isScored
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {p.startNumber ?? '?'}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{p.clubName}</p>
                      </div>
                    </div>

                    {/* Score + status indicator */}
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      {isScored ? (
                        <>
                          <p className="text-sm font-bold text-green-700">
                            {p.currentScore!.toFixed(2)}
                          </p>
                          <span className="text-xs text-green-600">✓</span>
                        </>
                      ) : isActive ? (
                        <span className="text-xs font-medium text-blue-600">→</span>
                      ) : (
                        <span className="text-xs text-gray-400">–</span>
                      )}
                      {p.statusName && (
                        <div className="mt-0.5">
                          <StatusBadge
                            label={p.statusName}
                            colorCode={p.statusColor}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
