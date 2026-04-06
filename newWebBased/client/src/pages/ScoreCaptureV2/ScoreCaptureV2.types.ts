/**
 * ScoreCaptureV2 Types
 * Point 125: Jury-style split-view score capture for management office.
 */

/** Status record loaded from /api/participant-status per participant */
export interface ParticipantStatusRecord {
  wertungenId: number;
  participantId: number;
  competitionId: number;
  statusId: number;
  statusName: string | null;
  statusColor: string | null;
}

/** A participant row item for the left sidebar list */
export interface ParticipantListItem {
  id: number;
  name: string;
  startNumber: number | null;
  clubName: string;
  /** Score in the currently selected discipline (null = not yet scored) */
  currentScore: number | null;
  statusId: number | null;
  statusName: string | null;
  statusColor: string | null;
}
