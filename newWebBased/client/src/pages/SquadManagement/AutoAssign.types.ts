/**
 * Types for the Auto-Assign feature
 */

export interface AutoAssignCriteria {
  eventId: number;
  maxParticipantsPerSquad: number;
  separateGenders: boolean;
  keepClubsTogether: boolean;
  groupByAgeCategory: boolean;
  ageCategoryRanges: string;
  numberOfProposals: number;
  namingPrefix: 'gender' | 'number' | 'none';
  breakCount: number;
  keepExistingSquads: boolean;
}

export interface AutoAssignParticipant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  clubId: number;
  gender: 'male' | 'female' | 'other';
  age: number | null;
  birthYear: number | null;
}

export interface ProposedSquad {
  name: string;
  colorName: string;
  genderGroup: string;
  ageCategory: string | null;
  participants: AutoAssignParticipant[];
  isBreak: boolean;
}

export interface ProposalStats {
  totalSquads: number;
  totalParticipants: number;
  avgParticipantsPerSquad: number;
  minParticipantsPerSquad: number;
  maxParticipantsPerSquad: number;
  breakSquads: number;
  genderDistribution: Record<string, number>;
}

export interface Proposal {
  id: number;
  squads: ProposedSquad[];
  stats: ProposalStats;
}

export interface AutoAssignResponse {
  proposals: Proposal[];
  eventId: number;
  totalParticipants: number;
  unassignedParticipants?: number;
  existingSquads?: number;
  existingAssignedParticipants?: number;
  criteria: Omit<AutoAssignCriteria, 'eventId' | 'numberOfProposals'>;
}
