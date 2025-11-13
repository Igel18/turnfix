/**
 * Team Management Configuration for UnifiedAssignmentModal
 * Adapts Team/Participant assignment to the generic component pattern
 * 
 * Similar to Groups but with mandatory competition assignment:
 * - Each team MUST have exactly ONE competition (int_wettkaempfeid NOT NULL)
 * - Team belongs to ONE club (int_vereineid NOT NULL)
 * - Team has number, start number, and riege
 */

import { ArrowLeft, Building, Trophy } from 'lucide-react';
import type { AssignmentConfig } from '@/components/assignment';
import type { Team, TeamMember, Club, Competition, TeamFormData } from './Teams.types';
import { AssignmentFilters, type AssignmentFiltersState } from '@/components/filters';

interface CreateTeamConfigParams {
  t: (key: string, options?: any) => string;
  clubs: Club[]; // For future form implementation
  competitions: Competition[]; // For future form implementation
  saveTeam: (formData: TeamFormData, editingTeam: Team | null) => Promise<boolean>; // For future
  deleteTeam: (team: Team) => Promise<void>; // For future
  assignParticipant: (participantId: number) => Promise<void>;
  removeParticipant: (participantId: number) => Promise<void>;
  // Filter props
  filters?: AssignmentFiltersState;
  onToggleHidePlanned?: (value: boolean) => void;
  onToggleHideOtherClubs?: (value: boolean) => void;
  onResetFilters?: () => void;
}

export function createTeamConfig({
  t,
  clubs: _clubs, // Prefix with underscore to mark intentionally unused (for future use)
  competitions: _competitions, // Prefix with underscore (for future use)
  saveTeam: _saveTeam, // For future CRUD form implementation
  deleteTeam: _deleteTeam, // For future delete functionality
  assignParticipant,
  removeParticipant,
  filters,
  onToggleHidePlanned,
  onToggleHideOtherClubs,
  onResetFilters
}: CreateTeamConfigParams): AssignmentConfig<Team, TeamMember> {
  return {
    entityNames: {
      master: t('teams.entityNames.master'),
      available: t('teams.entityNames.available'),
      masterPlural: t('teams.entityNames.masterPlural'),
      availablePlural: t('teams.entityNames.availablePlural')
    },

    // Render filter buttons above available items (Column 2)
    renderAvailableHeader: () => {
      // Only render if filter props are provided
      if (!filters || !onToggleHidePlanned || !onToggleHideOtherClubs || !onResetFilters) {
        return null;
      }
      
      return (
        <AssignmentFilters
          filters={filters}
          onToggleHidePlanned={onToggleHidePlanned}
          onToggleHideOtherClubs={onToggleHideOtherClubs}
          onResetFilters={onResetFilters}
          translationPrefix="teams"
        />
      );
    },

    getMasterMetadata: (team: Team) => ({
      itemCount: team.memberCount || 0,
      subtitle: t('teams.details.members', { count: team.memberCount || 0 }),
      tags: [
        ...(team.clubName ? [{
          label: team.clubName,
          color: 'bg-blue-100 text-blue-800'
        }] : []),
        ...(team.competitionName ? [{
          label: team.competitionName,
          color: 'bg-purple-100 text-purple-800'
        }] : []),
        ...(team.number ? [{
          label: `Nr. ${team.number}`,
          color: 'bg-gray-100 text-gray-700'
        }] : [])
      ]
    }),

    getAvailableMetadata: (participant: TeamMember) => {
      const parts: string[] = [];
      
      // Add club name
      if (participant.clubName) {
        parts.push(participant.clubName);
      }
      
      // Add gender (localized text)
      if (participant.gender) {
        const genderKey = `common.gender.${participant.gender}`;
        parts.push(t(genderKey));
      }
      
      // Add age
      if (participant.age !== undefined) {
        parts.push(t('common.years', { count: participant.age }));
      }
      
      return {
        subtitle: parts.join(' • '),
        tags: []
      };
    },

    renderDetailPane: (team: Team) => (
      <>
        {/* Team Info Section */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-1">
            {team.name}
          </h4>
          <div className="space-y-1 text-sm">
            {team.clubName && (
              <div className="flex items-center text-gray-600">
                <Building className="h-4 w-4 mr-1" />
                {team.clubName}
              </div>
            )}
            {team.competitionName && (
              <div className="flex items-center text-purple-600">
                <Trophy className="h-4 w-4 mr-1" />
                {team.competitionName}
              </div>
            )}
            {team.number && (
              <div className="text-gray-600">
                {t('teams.details.teamNumber')}: {team.number}
              </div>
            )}
            {team.startNumber && (
              <div className="text-gray-600">
                {t('teams.details.startNumber')}: {team.startNumber}
              </div>
            )}
            {team.riege && (
              <div className="text-gray-600">
                {t('teams.details.riege')}: {team.riege}
              </div>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {t('teams.details.currentMembers', { count: team.members?.length || 0 })}
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(!team.members || team.members.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                {t('teams.members.noMembers')}
              </div>
            ) : (
              team.members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    {member.clubName && (
                      <p className="text-xs text-gray-500">
                        {member.clubName}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeParticipant(member.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title={t('common.remove')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    ),

    // Column-specific filter for master items (Teams)
    filterMasterItems: (teams: Team[], searchTerm: string) => {
      if (!searchTerm) return teams;
      
      const lowerSearch = searchTerm.toLowerCase();
      
      return teams.filter(team => {
        // Search in team name
        if (team.name.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in club name
        if (team.clubName?.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in competition name
        if (team.competitionName?.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in team number
        if (team.number && team.number.toString().includes(searchTerm)) {
          return true;
        }
        
        // Search in start number
        if (team.startNumber && team.startNumber.toString().includes(searchTerm)) {
          return true;
        }
        
        // Search in riege
        if (team.riege?.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in member names
        if (team.members) {
          return team.members.some(member => {
            const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
            const reverseName = `${member.lastName} ${member.firstName}`.toLowerCase();
            return fullName.includes(lowerSearch) || reverseName.includes(lowerSearch);
          });
        }
        
        return false;
      });
    },

    // Column-specific filter for available items (Participants)
    filterAvailableItems: (participants: TeamMember[], filters) => {
      const searchTerm = filters.columnSearches?.available || '';
      if (!searchTerm) return participants;
      
      const lowerSearch = searchTerm.toLowerCase();
      
      return participants.filter(participant => {
        // Search in name
        const fullName = `${participant.firstName} ${participant.lastName}`.toLowerCase();
        const reverseName = `${participant.lastName} ${participant.firstName}`.toLowerCase();
        if (fullName.includes(lowerSearch) || reverseName.includes(lowerSearch)) {
          return true;
        }
        
        // Search in club name
        if (participant.clubName?.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in start number
        if (participant.startNumber && participant.startNumber.toString().includes(searchTerm)) {
          return true;
        }
        
        return false;
      });
    },

    onAssign: async (participant: TeamMember, _teamId: number | string) => {
      await assignParticipant(participant.id);
    },

    onUnassign: async (_teamId: number | string, participantId: number | string) => {
      await removeParticipant(Number(participantId));
    },

    features: {
      allowCreate: true,
      allowDelete: true,
      allowExport: false,
      showFilters: true,
      showSearch: true,
      supportsVirtual: false
    }
  };
}
