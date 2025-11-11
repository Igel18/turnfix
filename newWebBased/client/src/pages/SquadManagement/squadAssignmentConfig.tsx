/**
 * Squad Management Configuration for UnifiedAssignmentModal
 * Adapts Squad/Participant assignment to the generic component pattern
 */

import { ArrowLeft, Trophy } from 'lucide-react';
import type { AssignmentConfig } from '@/components/assignment';
import type { Squad, Participant } from './SquadManagement.types';

interface CreateSquadConfigParams {
  t: (key: string, options?: any) => string;
  competitionSelection: { id: number | null; name: string | null };
  onCompetitionClick: (competitionId: number, competitionName: string) => void;
  onRemoveParticipant: (participantId: number) => void;
  participantHasSelectedCompetition: (participant: Participant) => boolean;
}

export function createSquadConfig({
  t,
  competitionSelection,
  onCompetitionClick,
  onRemoveParticipant,
  participantHasSelectedCompetition
}: CreateSquadConfigParams): AssignmentConfig<Squad, Participant> {
  return {
    entityNames: {
      master: t('squadManagement.entityNames.master'),
      available: t('squadManagement.entityNames.available'),
      masterPlural: t('squadManagement.entityNames.masterPlural'),
      availablePlural: t('squadManagement.entityNames.availablePlural')
    },

    getMasterMetadata: (squad: Squad) => ({
      itemCount: squad.participantCount,
      subtitle: t('squadManagement.squads.participants', { count: squad.participantCount }),
      tags: squad.competitions.slice(0, 2).map((comp) => ({
        label: `${comp.name}${comp.number ? ` (Nr. ${comp.number})` : ''}`,
        color: 'bg-gray-100 text-gray-700'
      })),
      isVirtual: squad.isVirtual
    }),

    getAvailableMetadata: (participant: Participant) => {
      const age = new Date().getFullYear() - participant.birthYear;
      return {
        subtitle: `${participant.club} • ${participant.gender} • ${t('squadManagement.availableParticipants.age', { age })}`,
        tags: participant.competitions?.slice(0, 3).map((comp) => ({
          label: `${comp.name} (Nr. ${comp.number})`,
          color: 'bg-blue-100 text-blue-800',
          isHighlighted: comp.id === competitionSelection.id && comp.name === competitionSelection.name
        })) || []
      };
    },

    renderDetailPane: (squad: Squad) => (
      <>
        {/* Participants Section */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {t('squadManagement.squadDetails.participants', { count: squad.participants.length })}
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {squad.participants.map(participant => {
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
            {squad.competitions.map((comp, idx) => {
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
      </>
    ),

    // Column-specific filter for master items (Squads)
    filterMasterItems: (squads: Squad[], searchTerm: string) => {
      if (!searchTerm) return squads;
      
      const lowerSearch = searchTerm.toLowerCase();
      
      return squads.filter(squad => {
        // Search in squad name
        if (squad.name.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in competition names
        if (squad.competitions.some(comp => 
          comp.name.toLowerCase().includes(lowerSearch) ||
          (comp.number && comp.number.toString().includes(searchTerm))
        )) {
          return true;
        }
        
        // Search in participant names
        if (squad.participants.some(participant => {
          const fullName = `${participant.firstname} ${participant.lastname}`.toLowerCase();
          const reverseName = `${participant.lastname} ${participant.firstname}`.toLowerCase();
          return fullName.includes(lowerSearch) || reverseName.includes(lowerSearch);
        })) {
          return true;
        }
        
        // Search in clubs
        if (squad.participants.some(participant => 
          participant.club?.toLowerCase().includes(lowerSearch)
        )) {
          return true;
        }
        
        return false;
      });
    },

    // Column-specific filter for available items (Participants)
    filterAvailableItems: (participants: Participant[], filters) => {
      const searchTerm = filters.columnSearches?.available || '';
      if (!searchTerm) return participants;
      
      const lowerSearch = searchTerm.toLowerCase();
      
      return participants.filter(participant => {
        // Search in name
        const fullName = `${participant.firstname} ${participant.lastname}`.toLowerCase();
        const reverseName = `${participant.lastname} ${participant.firstname}`.toLowerCase();
        if (fullName.includes(lowerSearch) || reverseName.includes(lowerSearch)) {
          return true;
        }
        
        // Search in club
        if (participant.club?.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in competition names
        if (participant.competitions?.some(comp =>
          comp.name.toLowerCase().includes(lowerSearch) ||
          (comp.number && comp.number.toString().includes(searchTerm))
        )) {
          return true;
        }
        
        // Search in start number
        if (participant.startNumber && participant.startNumber.toString().includes(searchTerm)) {
          return true;
        }
        
        return false;
      });
    },

    onAssign: async () => {
      // Will be provided from parent component
      throw new Error('onAssign must be provided');
    },

    onUnassign: async () => {
      // Will be provided from parent component
      throw new Error('onUnassign must be provided');
    },

    features: {
      allowCreate: true,
      allowDelete: true,
      allowExport: true,
      showFilters: true,
      showSearch: true,
      supportsVirtual: true
    }
  };
}
