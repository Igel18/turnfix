/**
 * TypeScript type definitions for Squad Management
 * Extracted from SquadManagement.tsx for better code organization
 */

/**
 * Participant interface
 * Represents a gymnastics participant with squad and competition information
 */
export interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  gender: string;
  birthYear: number;
  squadId?: number;
  squadName?: string;
  competitions?: { id: number; name: string; number: string }[];
  competitionCount?: number;
  competitionNames?: string;
}

/**
 * Squad interface
 * Represents a gymnastics squad (Riege) with participants and competitions
 */
export interface Squad {
  id: number | string;
  name: string;
  eventId: number;
  participantCount: number;
  competitions: { id: number; name: string; number: string }[];
  participants: Participant[];
  isVirtual?: boolean;
  createdAt?: string;
  hints?: {
    storage?: string;
    status?: string;
    warning?: string;
  };
}

/**
 * Filter state interface
 * Manages all filter criteria for participants
 */
export interface FilterState {
  searchTerm: string;
  genderFilter: string;
  competitionFilter: string;
  clubFilter: string;
}

/**
 * Competition selection state interface
 * Used for highlighting participants by competition
 */
export interface CompetitionSelection {
  id: number | null;
  name: string | null;
}
