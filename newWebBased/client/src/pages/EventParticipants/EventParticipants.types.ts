/**
 * Type definitions for EventParticipants page
 * Point 122: Separation of Concerns - Extracted from EventParticipants.tsx
 */

import type { GenderValue } from '@/utils/genderHelpers';

// Participant data structure
export interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  clubId: number;
  gender: GenderValue;
  birthYear: number;
  age: number;
  squad_name?: string;
  startet_nicht: boolean;
  bol_ak: boolean;
  var_comment?: string;
  startNumber?: number | null;
  isInEvent: boolean;
  assignedCompetitions: number[];
  registrationDate?: string;
}

// Competition data structure
export interface Competition {
  id: number;
  name: string;
  number?: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  eventId: number;
  participantCount: number;
  maxParticipants?: number;
  registrationDeadline?: string;
}

// Form data for editing participants
export interface EditParticipantData {
  firstname: string;
  lastname: string;
  clubId: number;
  birthday: string;
  gender: GenderValue;
  squad_name: string;
  startet_nicht: boolean;
  bol_ak: boolean;
  var_comment: string;
  assignedCompetitions: number[];
}

// Club data structure
export interface Club {
  id: number;
  name: string;
}

// Props for EditParticipantForm component
export interface EditParticipantFormProps {
  participant: Participant;
  eventId: string;
  clubs: Club[];
  competitions: Competition[];
  onSave: (data: EditParticipantData) => Promise<void>;
  onCancel: () => void;
}

// Validation result for competition assignment
export interface CompetitionValidation {
  valid: boolean;
  reasons: string[];
}
