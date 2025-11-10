/**
 * useSquads Hook
 * Manages squad data loading, creation, deletion, and selection
 * Extracted from SquadManagement.tsx
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import type { Squad } from '../SquadManagement.types';

interface UseSquadsReturn {
  squads: Squad[];
  selectedSquad: Squad | null;
  isLoading: boolean;
  setSelectedSquad: (squad: Squad | null) => void;
  loadSquads: () => Promise<void>;
  forceLoadSquads: () => Promise<void>;
  createSquad: (name: string) => Promise<void>;
  deleteSquad: (squadId: number | string) => Promise<void>;
}

export const useSquads = (eventId: string | null): UseSquadsReturn => {
  const { t } = useTranslation();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
   * Update selected squad with fresh data
   */
  const updateSelectedSquad = (newSquads: Squad[]) => {
    if (selectedSquad) {
      const updatedSquad = newSquads.find((s: Squad) => 
        s.id === selectedSquad.id || s.name === selectedSquad.name
      );
      if (updatedSquad) {
        console.log('📝 Updating selected squad with fresh data');
        setSelectedSquad(updatedSquad);
      } else {
        console.log('❌ Selected squad no longer exists, clearing selection');
        setSelectedSquad(null);
      }
    }
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
   * Delete a squad
   */
  const deleteSquad = async (squadId: number | string) => {
    if (!eventId) return;
    
    const squadName = typeof squadId === 'string' 
      ? squadId 
      : squads.find(s => s.id === squadId)?.name;
    
    if (!squadName) {
      console.error('Squad not found');
      return;
    }
    
    if (!confirm(t('squadManagement.messages.confirmDelete'))) return;
    
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
    setSelectedSquad,
    loadSquads,
    forceLoadSquads,
    createSquad,
    deleteSquad
  };
};
