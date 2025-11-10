/**
 * SquadDetailPane Component
 * Column 3 (Detail Pane): Display selected squad's details
 * Extracted from SquadManagement.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ArrowLeft, Trophy } from 'lucide-react';
import type { Squad, Participant, CompetitionSelection } from '../SquadManagement.types';

interface SquadDetailPaneProps {
  selectedSquad: Squad | null;
  competitionSelection: CompetitionSelection;
  onRemoveParticipant: (participantId: number) => void;
  onCompetitionClick: (competitionId: number, competitionName: string) => void;
  participantHasSelectedCompetition: (participant: Participant) => boolean;
}

export const SquadDetailPane: React.FC<SquadDetailPaneProps> = ({
  selectedSquad,
  competitionSelection,
  onRemoveParticipant,
  onCompetitionClick,
  participantHasSelectedCompetition
}) => {
  const { t } = useTranslation();

  if (!selectedSquad) {
    return (
      <div className="lg:col-span-1">
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t('squadManagement.noSquadSelected.title')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('squadManagement.noSquadSelected.message')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('squadManagement.squadDetails.title', { name: selectedSquad.name })}
      </h3>
      <div className="bg-white rounded-lg border p-4">
        {/* Participants Section */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {t('squadManagement.squadDetails.participants', { count: selectedSquad.participants.length })}
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedSquad.participants.map(participant => {
              const isHighlighted = participantHasSelectedCompetition(participant);
              return (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-2 rounded transition-all ${
                    isHighlighted 
                      ? 'bg-blue-100 border border-blue-300 shadow-sm' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
                      {participant.firstname} {participant.lastname}
                    </p>
                    <p className="text-xs text-gray-500">
                      {participant.club}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveParticipant(participant.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title={t('squadManagement.actions.removeFromSquad')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Competitions Section */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">
            {t('squadManagement.squadDetails.assignedCompetitions')}
          </h4>
          <div className="space-y-1">
            {selectedSquad.competitions.map((comp, idx) => {
              const isSelected = comp.id === competitionSelection.id && comp.name === competitionSelection.name;
              return (
                <div 
                  key={`${comp.id}-${comp.name}-${idx}`}
                  onClick={() => onCompetitionClick(comp.id, comp.name)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white ring-2 ring-blue-600' 
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-900'}`}>
                    {comp.name}{comp.number ? ` (Nr. ${comp.number})` : ''}
                  </span>
                  <Trophy className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
