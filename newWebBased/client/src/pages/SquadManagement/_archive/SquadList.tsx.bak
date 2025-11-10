/**
 * SquadList Component
 * Column 1 (Master List): Display squads with selection
 * Extracted from SquadManagement.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type { Squad } from '../SquadManagement.types';

interface SquadListProps {
  squads: Squad[];
  selectedSquad: Squad | null;
  onSquadSelect: (squad: Squad) => void;
  onSquadDelete: (squadId: number | string) => void;
}

export const SquadList: React.FC<SquadListProps> = ({
  squads,
  selectedSquad,
  onSquadSelect,
  onSquadDelete
}) => {
  const { t } = useTranslation();

  return (
    <div className="lg:col-span-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('squadManagement.squads.listTitle', { count: squads.length })}
      </h3>
      <div className="space-y-3">
        {squads.map(squad => (
          <div
            key={squad.id}
            className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
              selectedSquad?.id === squad.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
            } ${squad.isVirtual ? 'border-l-4 border-l-orange-400' : ''}`}
            onClick={() => onSquadSelect(squad)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{squad.name}</h4>
                  {squad.isVirtual && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {t('squadManagement.squads.virtual')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {t('squadManagement.squads.participants', { count: squad.participantCount })}
                </p>
                {squad.isVirtual && squad.hints && (
                  <p className="text-xs text-orange-600 mt-1">
                    💾 {squad.hints.storage}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSquadDelete(squad.id);
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title={t('squadManagement.actions.deleteSquad')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {squad.competitions.slice(0, 2).map((comp, idx) => {
                  const compData = typeof comp === 'string' 
                    ? { name: comp, number: '' }
                    : comp;
                  return (
                    <span 
                      key={idx} 
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      title={`${compData.name}${compData.number ? ` (Nr. ${compData.number})` : ''}`}
                    >
                      {compData.name}{compData.number ? ` (Nr. ${compData.number})` : ''}
                    </span>
                  );
                })}
                {squad.competitions.length > 2 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {t('squadManagement.squads.moreCompetitions', { count: squad.competitions.length - 2 })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
