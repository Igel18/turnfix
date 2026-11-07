/**
 * useResultsHelpers Hook
 * Point 123: Separation of Concerns - Utility Functions
 * 
 * Formatting, medals, and helper functions for Results page
 */

import { formatScore as formatScoreUtil, formatTotalScore as formatTotalScoreUtil } from '@/utils/scoreFormatter';

interface UseResultsHelpersReturn {
  formatScore: (score: number, disciplineCalculationType?: number) => string;
  formatTotalScore: (score: number, decimalPlaces?: number) => string;
  getMedalColor: (rank: number) => string;
  getMedalEmoji: (rank: number) => string;
}

export function useResultsHelpers(): UseResultsHelpersReturn {
  
  const formatScore = (score: number, disciplineCalculationType?: number) => {
    return formatScoreUtil(score, disciplineCalculationType);
  };

  const formatTotalScore = (score: number, decimalPlaces?: number) => {
    return formatTotalScoreUtil(score, decimalPlaces);
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-400 text-yellow-900';
      case 2: return 'bg-gray-300 text-gray-900';
      case 3: return 'bg-amber-600 text-amber-100';
      default: return 'bg-gray-100 text-gray-900';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank.toString();
    }
  };

  return {
    formatScore,
    formatTotalScore,
    getMedalColor,
    getMedalEmoji
  };
}
