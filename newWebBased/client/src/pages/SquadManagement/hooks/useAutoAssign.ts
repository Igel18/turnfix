/**
 * useAutoAssign Hook
 * Manages the auto-assign workflow: load defaults, generate proposals, apply proposals.
 */

import { useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/api';
import type { AutoAssignCriteria, Proposal } from '../AutoAssign.types';

// Default criteria (matches server/config/app-settings.json)
const DEFAULT_CRITERIA: Omit<AutoAssignCriteria, 'eventId'> = {
  maxParticipantsPerSquad: 12,
  separateGenders: true,
  keepClubsTogether: true,
  groupByAgeCategory: false,
  ageCategoryRanges: '6-8,9-10,11-12,13-14,15-18',
  numberOfProposals: 3,
  namingPrefix: 'gender',
  breakCount: 0,
};

interface UseAutoAssignReturn {
  criteria: Omit<AutoAssignCriteria, 'eventId'>;
  setCriteria: React.Dispatch<React.SetStateAction<Omit<AutoAssignCriteria, 'eventId'>>>;
  proposals: Proposal[];
  isGenerating: boolean;
  isApplying: boolean;
  error: string | null;
  totalParticipants: number | null;
  generateProposals: (eventId: number) => Promise<void>;
  applyProposal: (eventId: number, proposal: Proposal) => Promise<void>;
  reset: () => void;
  loadDefaults: () => Promise<void>;
}

export const useAutoAssign = (): UseAutoAssignReturn => {
  const [criteria, setCriteria] = useState<Omit<AutoAssignCriteria, 'eventId'>>(DEFAULT_CRITERIA);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalParticipants, setTotalParticipants] = useState<number | null>(null);

  /**
   * Load default criteria from app settings
   */
  const loadDefaults = useCallback(async () => {
    try {
      const settings = await apiGet('/app-settings/squadAutoAssign');
      if (settings) {
        setCriteria({
          maxParticipantsPerSquad: settings.maxParticipantsPerSquad ?? DEFAULT_CRITERIA.maxParticipantsPerSquad,
          separateGenders: settings.separateGenders ?? DEFAULT_CRITERIA.separateGenders,
          keepClubsTogether: settings.keepClubsTogether ?? DEFAULT_CRITERIA.keepClubsTogether,
          groupByAgeCategory: settings.groupByAgeCategory ?? DEFAULT_CRITERIA.groupByAgeCategory,
          ageCategoryRanges: settings.ageCategoryRanges ?? DEFAULT_CRITERIA.ageCategoryRanges,
          numberOfProposals: settings.numberOfProposals ?? DEFAULT_CRITERIA.numberOfProposals,
          namingPrefix: settings.namingPrefix ?? DEFAULT_CRITERIA.namingPrefix,
          breakCount: settings.breakCount ?? DEFAULT_CRITERIA.breakCount,
        });
      }
    } catch (err) {
      console.warn('Could not load auto-assign defaults from settings, using built-in defaults');
    }
  }, []);

  /**
   * Generate proposals from server
   */
  const generateProposals = useCallback(async (eventId: number) => {
    setIsGenerating(true);
    setError(null);
    setProposals([]);

    try {
      const response = await apiPost('/squad-management/auto-assign/generate', {
        eventId,
        ...criteria,
      });
      setProposals(response.proposals || []);
      setTotalParticipants(response.totalParticipants || 0);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to generate proposals';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [criteria]);

  /**
   * Apply a chosen proposal
   */
  const applyProposal = useCallback(async (eventId: number, proposal: Proposal) => {
    setIsApplying(true);
    setError(null);

    try {
      const squads = proposal.squads.map(s => ({
        name: s.name,
        participantIds: s.participants.map(p => p.id),
      }));

      await apiPost('/squad-management/auto-assign/apply', {
        eventId,
        squads,
        clearExisting: true,
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to apply proposal';
      setError(message);
      throw err; // Re-throw so the dialog can handle it
    } finally {
      setIsApplying(false);
    }
  }, []);

  /**
   * Reset state (when dialog closes)
   */
  const reset = useCallback(() => {
    setProposals([]);
    setError(null);
    setTotalParticipants(null);
  }, []);

  return {
    criteria,
    setCriteria,
    proposals,
    isGenerating,
    isApplying,
    error,
    totalParticipants,
    generateProposals,
    applyProposal,
    reset,
    loadDefaults,
  };
};
