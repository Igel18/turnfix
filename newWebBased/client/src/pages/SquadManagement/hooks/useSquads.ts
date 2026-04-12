/**
 * useSquads Hook
 * Manages squad data loading, creation, deletion, and selection
 * Extracted from SquadManagement.tsx
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiDelete, apiPut } from '@/utils/api';
import { useServerSyncedSelection } from '@/hooks';
import type { Squad } from '../SquadManagement.types';

interface UseSquadsReturn {
  squads: Squad[];
  selectedSquad: Squad | null;
  isLoading: boolean;
  pendingDeleteSquadId: number | string | null;
  setSelectedSquad: (squad: Squad | null) => void;
  loadSquads: () => Promise<void>;
  forceLoadSquads: () => Promise<void>;
  createSquad: (name: string) => Promise<void>;
  updateSquad: (oldName: string, newName: string) => Promise<void>;
  requestDeleteSquad: (squadId: number | string) => Promise<void>;
  confirmDeleteSquad: () => Promise<void>;
  cancelDeleteSquad: () => void;
}

export const useSquads = (eventId: string | null): UseSquadsReturn => {
  const { t } = useTranslation();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDeleteSquadId, setPendingDeleteSquadId] = useState<number | string | null>(null);

  /**
   * Keep selected squad in sync with server data
   */
  const updateSelectedSquad = useServerSyncedSelection<Squad>({
    selectedItem: selectedSquad,
    onUpdate: setSelectedSquad,
    getId: (squad) => squad.id,
    getName: (squad) => squad.name
  });

  /**
   * Load squads with cache busting
   */
  const loadSquads = async () => {
    if (!eventId) return;
    
    try {
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management?eventId=${eventId}&_t=${timestamp}`);
      const rawSquads = data.squads || [];
      
      // Transform competition data from "id:name|number" format to objects
      const newSquads = transformSquads(rawSquads);
      setSquads(newSquads);
      
      // Update selected squad with fresh data if one is currently selected
      updateSelectedSquad(newSquads);
    } catch (error) {
      console.error('Error loading squads:', error);
      setSquads([]);
    }
  };

  /**
   * Force reload squads (bypasses cache completely)
   */
  const forceLoadSquads = async () => {
    if (!eventId) return;
    
    try {
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management?eventId=${eventId}&_t=${timestamp}&_force=true`);
      const rawSquads = data.squads || [];
      
      const newSquads = transformSquads(rawSquads);
      console.log('🔄 Force loading squads:', newSquads.length, 'squads loaded');
      setSquads(newSquads);
      
      updateSelectedSquad(newSquads);
    } catch (error) {
      console.error('Error force loading squads:', error);
      setSquads([]);
    }
  };

  /**
   * Transform raw squad data from API
   */
  const transformSquads = (rawSquads: any[]): Squad[] => {
    return rawSquads.map((squad: any) => ({
      ...squad,
      competitions: squad.competitions?.map((comp: string) => {
        if (typeof comp === 'string' && comp.includes(':') && comp.includes('|')) {
          const [idPart, nameAndNumber] = comp.split(':');
          const [name, number] = nameAndNumber.split('|');
          return {
            id: parseInt(idPart),
            name: name,
            number: number === 'No Number' ? '' : number
          };
        }
        // Fallback for unexpected format
        return typeof comp === 'string' 
          ? { id: 0, name: comp, number: '' }
          : comp;
      }) || []
    }));
  };

  /**
   * Create a new squad
   */
  const createSquad = async (name: string) => {
    if (!name.trim() || !eventId) {
      throw new Error('Squad name and event ID are required');
    }
    
    setIsLoading(true);
    try {
      const response = await apiPost('/squad-management/create', {
        eventId: parseInt(eventId),
        name: name
      });
      
      // Build success message with hints
      let message = t('squadManagement.messages.squadCreated', { name });
      if (response.notice) {
        message += `\n\n📝 ${response.notice}`;
      }
      if (response.hints) {
        message += `\n\n💡 Hints:`;
        if (response.hints.storage) message += `\n• Storage: ${response.hints.storage}`;
        if (response.hints.nextStep) message += `\n• Next: ${response.hints.nextStep}`;
        if (response.hints.deletion) message += `\n• Note: ${response.hints.deletion}`;
      }
      
      alert(message);
      
      // Reload data
      console.log('🔄 Force reloading data after squad creation...');
      await forceLoadSquads();
      console.log('✅ Force data reload completed after squad creation');
    } catch (error: any) {
      console.error('Error creating squad:', error);
      
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
        } else if (errorData.errors) {
          const errorMessages = errorData.errors.map((err: any) => err.message).join('\n');
          throw new Error(t('squadManagement.messages.validationFailed', { errors: errorMessages }));
        } else {
          throw new Error(t('squadManagement.messages.creationFailed', { 
            message: errorData.message || 'Unknown error occurred' 
          }));
        }
      } else {
        throw new Error(t('squadManagement.messages.creationFailed', { 
          message: error instanceof Error ? error.message : 'Failed to create squad. Please try again.' 
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Request delete — opens modal instead of native confirm
   */
  const requestDeleteSquad = async (squadId: number | string): Promise<void> => {
    setPendingDeleteSquadId(squadId);
  };

  const cancelDeleteSquad = () => {
    setPendingDeleteSquadId(null);
  };

  /**
   * Confirm and execute squad deletion
   */
  const confirmDeleteSquad = async () => {
    if (!eventId || pendingDeleteSquadId === null) return;
    const squadId = pendingDeleteSquadId;
    setPendingDeleteSquadId(null);

    const squadName = typeof squadId === 'string'
      ? squadId
      : squads.find(s => s.id === squadId)?.name;

    if (!squadName) {
      console.error('Squad not found');
      return;
    }

    try {
      await apiDelete(`/squad-management/delete?squadName=${encodeURIComponent(squadName)}&eventId=${eventId}`);

      console.log('🔄 Force reloading data after squad deletion...');
      await forceLoadSquads();
      console.log('✅ Force data reload completed after squad deletion');

      // Clear selection if deleted squad was selected
      if (selectedSquad && (selectedSquad.id === squadId || selectedSquad.name === squadName)) {
        setSelectedSquad(null);
      }
    } catch (error) {
      console.error('Error deleting squad:', error);
      throw new Error(error instanceof Error ? error.message : t('squadManagement.messages.deletionFailed'));
    }
  };

  /**
   * Update squad name
   */
  const updateSquad = async (oldName: string, newName: string) => {
    if (!oldName.trim() || !newName.trim() || !eventId) {
      throw new Error('Old squad name, new squad name and event ID are required');
    }

    if (oldName === newName) {
      // No change needed
      return;
    }

    setIsLoading(true);
    try {
      await apiPut('/squad-management/update', {
        eventId: parseInt(eventId),
        oldSquadName: oldName,
        newSquadName: newName
      });

      alert(t('squadManagement.messages.squadUpdated', { oldName, newName }));

      // Reload data
      console.log('🔄 Force reloading data after squad update...');
      await forceLoadSquads();
      console.log('✅ Force data reload completed after squad update');
    } catch (error: any) {
      console.error('Error updating squad:', error);

      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.constraint === 'varchar(5)') {
          throw new Error(t('squadManagement.messages.nameTooLong', {
            message: errorData.message,
            hint: errorData.hint,
            providedName: errorData.providedName,
            nameLength: errorData.nameLength
          }));
        } else if (errorData.errors) {
          const errorMessages = errorData.errors.map((err: any) => err.message).join('\n');
          throw new Error(t('squadManagement.messages.validationFailed', { errors: errorMessages }));
        } else {
          throw new Error(t('squadManagement.messages.updateFailed', { 
            message: errorData.message || 'Unknown error occurred' 
          }));
        }
      } else {
        throw new Error(t('squadManagement.messages.updateFailed', { 
          message: error instanceof Error ? error.message : 'Failed to update squad. Please try again.' 
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load squads on mount and when eventId changes
  useEffect(() => {
    if (eventId) {
      loadSquads();
    }
  }, [eventId]);

  return {
    squads,
    selectedSquad,
    isLoading,
    pendingDeleteSquadId,
    setSelectedSquad,
    loadSquads,
    forceLoadSquads,
    createSquad,
    updateSquad,
    requestDeleteSquad,
    confirmDeleteSquad,
    cancelDeleteSquad,
  };
};
