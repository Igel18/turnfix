/**
 * TimePlanning Types
 * Point 124: Separation of Concerns - Type Definitions
 * 
 * All TypeScript interfaces and types for TimePlanning module
 */

export interface TimeSettings {
  exerciseDurationMinutes: number // How long an exercise takes at a device
  breakBetweenDevicesMinutes: number // Break time when moving between devices
  warmupDurationMinutes: number // General warm-up time before competition
  rotationIntervalMinutes: number // Time interval for device rotations
}

export interface Competition {
  id: number
  name: string
  number: string
  round: number // session/durchgang
  int_bahn?: number | null // Bahn assignment
  startTime: string | null // HH:MM format
  startDate: string | null // YYYY-MM-DD format
  warmupTime: string | null // HH:MM format
  warmupDate: string | null // YYYY-MM-DD format
  disciplineCount: number
  participantCount: number
}

export interface Squad {
  name: string
  participantCount: number
  competitions: string[] // Competition names this squad participates in (legacy)
  competitionIds?: number[] // Competition IDs (new, preferred)
}

export interface DeviceSchedule {
  squadName: string
  deviceName: string
  startTime: string
  endTime: string
  competition: string
  isWarmup: boolean
  isFirstDevice?: boolean // true if this is the first device for the squad
}

export interface SessionGroup {
  session: number
  competitions: Competition[]
  startTime: string | null
  startDate: string | null
  squads: Squad[]
}

export interface GanttTimeSlot {
  time: string
  hour: number
  minute: number
}

export const DEFAULT_TIME_SETTINGS: TimeSettings = {
  exerciseDurationMinutes: 3,
  breakBetweenDevicesMinutes: 0,
  warmupDurationMinutes: 15,
  rotationIntervalMinutes: 20
}

// ── Schedule Matrix (Zeitplan-Tabelle) ───────────────────────────────────────
// Cell assignments stored in tfx_riegen_x_disziplinen without schema changes.
// int_runde = row (slot index), int_disziplinenid = column, var_riege = squad.

export interface MatrixDiscipline {
  id: number
  name: string
  shortName: string
}

export interface MatrixAssignment {
  disciplineId: number
  round: number
  squadName: string
  isFirstDevice: boolean
}

export interface MatrixData {
  disciplines: MatrixDiscipline[]
  /** All disciplines not yet shown as columns — used for the column picker. */
  availableDisciplines: MatrixDiscipline[]
  assignments: MatrixAssignment[]
  squads: string[]
  sessionDisciplineIds?: Record<string, number[]>
  sessionLaneDisciplineIds?: Record<string, Record<string, number[]>>
  maxRound: number
}
