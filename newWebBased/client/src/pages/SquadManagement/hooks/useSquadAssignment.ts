/**
 * useSquadAssignment Hook
 * Manages participant assignment/unassignment to squads
 * Extracted from SquadManagement.tsx
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiPost, apiDelete } from '@/utils/api';
import type { Participant, Squad } from '../SquadManagement.types';

interface UseSquadAssignmentReturn {
  isLoading: boolean;
  assignParticipantToSquad: (participant: Participant, squadId: number | string) => Promise<void>;
  removeParticipantFromSquad: (participantId: number) => Promise<void>;
}

interface UseSquadAssignmentProps {
  eventId: string | null;
  squads: Squad[];
  onDataChange: () => Promise<void>;
}

export const useSquadAssignment = ({
  eventId,
  squads,
  onDataChange
}: UseSquadAssignmentProps): UseSquadAssignmentReturn => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Assign a participant to a squad
   */
  const assignParticipantToSquad = async (participant: Participant, squadId: number | string) => {
    const squadName = typeof squadId === 'string' 
      ? squadId 
      : squads.find(s => s.id === squadId)?.name;
    
    if (!squadName || !eventId) {
      console.error('Squad name or event ID not found');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiPost('/squad-management/assign', {
        participantId: participant.id,
        squadName: squadName,
        eventId: parseInt(eventId)
      });
      
      // Build feedback message with hints
      let message = response.message || 'Participant assigned successfully';
      if (response.notice) {
        message += `\n\n📝 ${response.notice}`;
      }
      if (response.hints) {
        message += `\n\n💡 Storage Info:`;
        if (response.hints.storage) message += `\n• ${response.hints.storage}`;
        if (response.hints.status) message += `\n• ${response.hints.status}`;
        if (response.hints.reason) message += `\n• ${response.hints.reason}`;
      }
      
      console.log('✅ Assignment completed:', message);
      
      // Reload data after successful assignment
      console.log('🔄 Force reloading data after participant assignment...');
      await onDataChange();
      console.log('✅ Force data reload completed after participant assignment');
    } catch (error: any) {
      console.error('Error assigning participant to squad:', error);
      
      // Handle specific error responses
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.constraint === 'varchar(5)') {
          throw new Error(t('squadManagement.messages.nameTooLong', {
            message: errorData.message,
            hint: errorData.hint,
            providedName: errorData.providedName,
            nameLength: errorData.nameLength
          }));
        } else {
          throw new Error(t('squadManagement.messages.assignmentFailed', { 
            message: errorData.message || 'Unknown error occurred' 
          }));
        }
      } else {
        throw new Error(t('squadManagement.messages.assignmentFailed', { 
          message: error instanceof Error ? error.message : 'Failed to assign participant to squad' 
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Remove a participant from their assigned squad
   */
  const removeParticipantFromSquad = async (participantId: number) => {
    if (!eventId) {
      console.error('Event ID not found');
      return;
    }
    
    setIsLoading(true);
    try {
      await apiDelete(`/squad-management/unassign?participantId=${participantId}&eventId=${eventId}`);
      
      // Reload data after successful removal
      console.log('🔄 Force reloading data after participant removal...');
      await onDataChange();
      console.log('✅ Force data reload completed after participant removal');
    } catch (error) {
      console.error('Error removing participant from squad:', error);
      throw new Error(error instanceof Error ? error.message : t('squadManagement.messages.removalFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    assignParticipantToSquad,
    removeParticipantFromSquad
  };
};
