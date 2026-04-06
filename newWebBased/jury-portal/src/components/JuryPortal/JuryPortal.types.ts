/**
 * Type definitions for the Jury Portal.
 * 
 * Extracted from JuryPortal.tsx for Separation of Concerns.
 * Contains all interfaces used across jury portal components and hooks.
 */

export interface Participant {
  id: number;
  name: string;
  club: string;
  startNumber: number;
  currentScore?: number;
  status: 'completed' | 'current' | 'pending';
  participantId: number;
  firstName: string;
  lastName: string;
  firstname?: string; // API sometimes uses this format
  lastname?: string;  // API sometimes uses this format
  clubName: string;
  wertungenId?: number;
  assignedCompetitions?: number[];
  /** Participant status fields */
  statusId?: number | null;
  statusName?: string | null;
  statusColor?: string | null;
}

/** Available status option from /api/participant-status/statuses */
export interface JuryStatus {
  int_statusid: number;
  var_name: string;
  ary_colorcode: string | null;
}

export interface Squad {
  id: number;
  name: string;
  participants: Participant[];
}

export interface Device {
  id: number;
  name: string;
  icon: string; // Can be emoji or icon path
  iconPath?: string | null; // Optional: database icon path (web-accessible URL)
  disciplineId: number;
  maxScore?: number; // Maximum allowed score for this discipline
  int_berechnung?: number; // Number of decimal places (0-3)
  var_maske?: string; // Format pattern (e.g., "0.00", "0,000", "0:00:00")
  var_formel?: string; // Formula for calculation (e.g., "(10 + A) - B")
  int_formelid?: number; // Formula ID reference
  var_einheit?: string; // Display unit (e.g., Pkt., sec)
}

export interface DisciplineField {
  id: number;
  disciplineId: number;
  name: string;
  sortOrder: number;
  enabled: boolean;
  isEndValue: boolean;
  isStartValue: boolean;
}

export interface Competition {
  id: number;
  name: string;
  eventId: number;
  disciplines?: Device[];
}

export type JuryStep = 'event' | 'squad' | 'device' | 'scoring';

/** Per-squad time-based status returned by /api/time-planning/active-squads */
export interface ActiveSquadInfo {
  squadName: string;
  /** 'active'   — currently on the floor
   *  'upcoming' — starting within the next 30 minutes
   *  'past'     — all rotation slots have finished
   *  'unknown'  — no time planning data available */
  status: 'active' | 'upcoming' | 'past' | 'unknown';
  /** Name of the device the squad is (or will be) at */
  currentDeviceName: string | null;
  currentDisciplineId: number | null;
  /** Human-readable time string, e.g. "10:15 – 10:45 Uhr" or "ab 11:00 Uhr" */
  timeInfo: string;
}

export interface ActiveSquadsResponse {
  currentTime: string; // HH:MM
  squadInfos: ActiveSquadInfo[];
}

// API configuration — delegates to the shared serverOrigin utility
import { getApiBaseUrl } from '../../utils/serverOrigin';
export const API_BASE_URL = getApiBaseUrl();
