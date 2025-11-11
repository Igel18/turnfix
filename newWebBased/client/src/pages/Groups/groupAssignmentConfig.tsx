/**
 * Group Management Configuration for UnifiedAssignmentModal
 * Adapts Group/Participant assignment to the generic component pattern
 * 
 * Similar to Squads but simpler:
 * - Single container (Group) instead of multiple Squads
 * - Direct participant assignment (no competitions involved)
 * - Club-scoped participants (only from same club as group)
 */

import { ArrowLeft, Building } from 'lucide-react';
import type { AssignmentConfig } from '@/components/assignment';
import type { Group, GroupMember } from './Groups.types';

interface CreateGroupConfigParams {
  t: (key: string, options?: any) => string;
  onRemoveMember: (memberId: number) => void;
}

export function createGroupConfig({
  t,
  onRemoveMember
}: CreateGroupConfigParams): AssignmentConfig<Group, GroupMember> {
  return {
    entityNames: {
      master: t('groups.entityNames.master'),
      available: t('groups.entityNames.available'),
      masterPlural: t('groups.entityNames.masterPlural'),
      availablePlural: t('groups.entityNames.availablePlural')
    },

    getMasterMetadata: (group: Group) => ({
      itemCount: group.memberCount,
      subtitle: t('groups.details.members', { count: group.memberCount }),
      tags: group.clubName ? [{ 
        label: group.clubName,
        color: 'bg-blue-100 text-blue-800'
      }] : []
    }),

  getAvailableMetadata: (participant: GroupMember) => {
    const parts: string[] = [];
    
    // Add club name
    if (participant.clubName) {
      parts.push(participant.clubName);
    }
    
    // Add gender (localized text like SquadManagement)
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

    renderDetailPane: (group: Group) => (
      <>
        {/* Group Info Section */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-1">
            {group.name}
          </h4>
          {group.clubName && (
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Building className="h-4 w-4 mr-1" />
              {group.clubName}
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {t('groups.details.currentMembers', { count: group.members?.length || 0 })}
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(!group.members || group.members.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                {t('groups.members.noMembers')}
              </div>
            ) : (
              group.members.map(member => (
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
                    onClick={() => onRemoveMember(member.id)}
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

    // Column-specific filter for master items (Groups)
    filterMasterItems: (groups: Group[], searchTerm: string) => {
      if (!searchTerm) return groups;
      
      const lowerSearch = searchTerm.toLowerCase();
      
      return groups.filter(group => {
        // Search in group name
        if (group.name.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in club name
        if (group.clubName?.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Search in member names
        if (group.members) {
          return group.members.some(member => {
            const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
            const reverseName = `${member.lastName} ${member.firstName}`.toLowerCase();
            return fullName.includes(lowerSearch) || reverseName.includes(lowerSearch);
          });
        }
        
        return false;
      });
    },

    // Column-specific filter for available items (Participants)
    filterAvailableItems: (participants: GroupMember[], filters) => {
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
      allowExport: false,
      showFilters: true,
      showSearch: true,
      supportsVirtual: false
    }
  };
}
