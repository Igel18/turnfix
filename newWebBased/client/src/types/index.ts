export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'ORGANIZER' | 'JUDGE' | 'CLUB_ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Club {
  id: number;
  name: string;
  shortName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  participants?: Participant[];
  _count?: { participants: number };
}

export interface Participant {
  id: number;
  firstName?: string;
  lastName?: string;
  firstname?: string; // API uses lowercase
  lastname?: string; // API uses lowercase
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'MALE' | 'FEMALE' | 'OTHER';
  clubId?: number;
  club?: string;
  licenseNo?: string;
  nationality?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  squad_name?: string; // API uses this field
  age?: number;
  birthYear?: number;
  assignedCompetitions?: number[];
  isInEvent?: boolean;
  registrationDate?: string;
}

export interface Competition {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'MIXED';
  status: 'PLANNED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  maxParticipants?: number;
  registrationDeadline?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  disciplines?: Discipline[];
  entries?: CompetitionEntry[];
}

export interface Discipline {
  id: number;
  competitionId: number;
  name: string;
  description?: string;
  order: number;
  maxScore?: number;
  isActive: boolean;
  competition?: Competition;
}

export interface CompetitionEntry {
  id: number;
  competitionId: number;
  participantId: number;
  status: 'REGISTERED' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW';
  registeredAt: string;
  competition?: Competition;
  participant?: Participant;
}

export interface Result {
  id: number;
  competitionId: number;
  participantId: number;
  disciplineId: number;
  score: number;
  rank?: number;
  notes?: string;
  judgedAt: string;
  createdAt: string;
  updatedAt: string;
  competition?: Competition;
  participant?: Participant;
  discipline?: Discipline;
}
