/**
 * AvailableParticipantsList Component
 * Column 2 (Available Items): Display available participants with filtering
 * Extracted from SquadManagement.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Trophy, XCircle } from 'lucide-react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Participant, Squad, CompetitionSelection } from '../SquadManagement.types';

interface AvailableParticipantsListProps {
  participants: Participant[];
  selectedSquad: Squad | null;
  hasVirtualSquads: boolean;
  competitionSelection: CompetitionSelection;
  onAssign: (participant: Participant, squadId: number | string) => void;
  onCompetitionSelectionClear: () => void;
  participantHasSelectedCompetition: (participant: Participant) => boolean;
}

export const AvailableParticipantsList: React.FC<AvailableParticipantsListProps> = ({
  participants,
  selectedSquad,
  hasVirtualSquads,
  competitionSelection,
  onAssign,
  onCompetitionSelectionClear,
  participantHasSelectedCompetition
}) => {
  const { t } = useTranslation();

  return (
    <div className="lg:col-span-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('squadManagement.availableParticipants.title', { count: participants.length })}
        </h3>
        {!selectedSquad && participants.length > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            {t('squadManagement.availableParticipants.selectSquadHint')}
          </div>
        )}
      </div>
      
      {/* Competition Filter Info */}
      {competitionSelection.id && competitionSelection.name && selectedSquad && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <Trophy className="h-4 w-4 text-blue-700 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900">
                <p className="font-medium mb-1">Wettkampf-Filter aktiv</p>
                <p>Zeigt Teilnehmer für: <strong>{competitionSelection.name}</strong> <span className="opacity-60">(ID: {competitionSelection.id})</span></p>
              </div>
            </div>
            <button
              onClick={onCompetitionSelectionClear}
              className="text-blue-700 hover:text-blue-900"
              title="Filter entfernen"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Virtual Squad Info */}
      {participants.length > 0 && hasVirtualSquads && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">{t('squadManagement.availableParticipants.virtualAssignmentTitle')}</p>
              <p>{t('squadManagement.availableParticipants.virtualAssignmentInfo')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {participants.map(participant => {
          const isHighlighted = participantHasSelectedCompetition(participant);
          return (
            <div
              key={participant.id}
              className={`bg-white rounded-lg border p-3 transition-all ${
                isHighlighted 
                  ? 'border-blue-500 border-2 bg-blue-50 shadow-md ring-2 ring-blue-200' 
                  : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium truncate ${isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
                      {participant.firstname} {participant.lastname}
                    </p>
                    {selectedSquad && (
                      <button
                        onClick={() => onAssign(participant, selectedSquad.id)}
                        className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title={t('squadManagement.actions.assignToSquad')}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-1">
                    {participant.club} • {participant.gender} • {t('squadManagement.availableParticipants.age', { age: new Date().getFullYear() - participant.birthYear })}
                  </p>
                  {participant.competitions && participant.competitions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">
                        {t('squadManagement.availableParticipants.competitionsLabel', { count: participant.competitionCount })}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {participant.competitions.slice(0, 3).map((comp, idx) => {
                          const isCompSelected = comp.id === competitionSelection.id && comp.name === competitionSelection.name;
                          return (
                            <span 
                              key={idx} 
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                isCompSelected
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                              title={`Competition ID: ${comp.id}, Number: ${comp.number}`}
                            >
                              {comp.name} (Nr. {comp.number})
                            </span>
                          );
                        })}
                        {participant.competitions.length > 3 && (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            title={participant.competitionNames}
                          >
                            {t('squadManagement.availableParticipants.moreCompetitions', { count: participant.competitions.length - 3 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
