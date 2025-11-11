/**
 * ParticipantCard Component
 * Standardized card layout for displaying participant information
 * 
 * Used across:
 * - Groups (available participants list)
 * - Squads (available participants list)
 * - EventParticipants (available participants list)
 * - Participants page (grid view)
 * 
 * Standard layout:
 * ┌────────────────────────────────────────┐
 * │ Max Mustermann              [Action]   │
 * │ 📅 19.1.2011 (14 Jahre)                │
 * │ ♂ (Gender Badge)                       │
 * │ 🏢 TV Beispiel                         │
 * │ # 123                                  │
 * │ 🏆 Reck, Barren +2                     │
 * └────────────────────────────────────────┘
 * 
 * Features:
 * - Name (large, bold)
 * - Birthdate with age in years: "19.1.2011 (14 Jahre)"
 * - Gender badge (localized)
 * - Club name with icon
 * - Start number with # icon
 * - Competitions (up to 2 shown, +count for more)
 * - Optional action button (assign/remove)
 */

import { Fragment } from 'react';
import { CalendarIcon, BuildingOfficeIcon, TrophyIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { GenderBadge } from '../GenderBadge';

export interface ParticipantCardData {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;        // Fallback if firstName/lastName not available
  age?: number;
  birthdate?: string | Date;  // Date of birth
  gender?: number;      // int_geschlecht format (1=male, 2=female)
  clubName?: string;
  startNumber?: number | string; // Start number
  competitions?: { id: number; name: string; number?: string }[]; // Assigned competitions
  competitionNames?: string; // Comma-separated competition names (fallback)
  additionalInfo?: string; // Optional additional line
}

export interface ParticipantCardProps {
  participant: ParticipantCardData;
  /** Optional action button (e.g., assign arrow, remove button) */
  actionButton?: React.ReactNode;
  /** Click handler for the card itself */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Highlight the card (e.g., when selected or featured) */
  isHighlighted?: boolean;
  /** Show compact version (smaller padding, text) */
  compact?: boolean;
}

/**
 * Standardized Participant Card
 * 
 * Features:
 * - Consistent Name/Age/Gender layout
 * - Localized gender badge
 * - Optional action button slot
 * - Hover effects
 * - Highlight mode
 * - Compact mode
 */
export function ParticipantCard({
  participant,
  actionButton,
  onClick,
  className = '',
  isHighlighted = false,
  compact = false
}: ParticipantCardProps) {
  
  // Build display name
  const displayName = participant.firstName && participant.lastName
    ? `${participant.firstName} ${participant.lastName}`
    : participant.name || `ID ${participant.id}`;

  // Format birthdate and age: "19.1.2011 (14 Jahre)"
  let birthdateDisplay: string | null = null;
  if (participant.birthdate) {
    const date = new Date(participant.birthdate);
    birthdateDisplay = date.toLocaleDateString('de-DE');
    if (participant.age !== undefined) {
      birthdateDisplay += ` (${participant.age} Jahre)`;
    }
  }

  // Build subtitle parts (Gender Badge only, birthdate shown separately)
  const subtitleParts: React.ReactNode[] = [];
  
  if (participant.gender !== undefined) {
    subtitleParts.push(
      <GenderBadge key="gender" value={participant.gender} />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-lg border transition-all
        ${isHighlighted 
          ? 'border-blue-500 border-2 bg-blue-50 shadow-md ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
        ${onClick ? 'cursor-pointer' : ''}
        ${compact ? 'p-2' : 'p-3'}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className={`
            font-medium truncate
            ${isHighlighted ? 'text-blue-900' : 'text-gray-900'}
            ${compact ? 'text-sm' : 'text-base'}
          `}>
            {displayName}
          </p>
          
          {/* Birthdate with Age: "19.1.2011 (14 Jahre)" */}
          {birthdateDisplay && (
            <p className={`text-gray-500 flex items-center mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              <CalendarIcon className="w-4 h-4 mr-1" />
              {birthdateDisplay}
            </p>
          )}
          
          {/* Gender Badge */}
          {subtitleParts.length > 0 && (
            <div className={`flex items-center gap-2 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              {subtitleParts.map((part, idx) => (
                <Fragment key={idx}>
                  {idx > 0 && <span className="text-gray-400">•</span>}
                  {part}
                </Fragment>
              ))}
            </div>
          )}
          
          {/* Club Name */}
          {participant.clubName && (
            <p className={`text-gray-500 flex items-center mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              <BuildingOfficeIcon className="w-4 h-4 mr-1" />
              {participant.clubName}
            </p>
          )}
          
          {/* Start Number */}
          {participant.startNumber && (
            <p className={`text-gray-500 flex items-center mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              <HashtagIcon className="w-4 h-4 mr-1" />
              {participant.startNumber}
            </p>
          )}
          
          {/* Competitions */}
          {participant.competitions && participant.competitions.length > 0 && (
            <div className={`mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              <div className="flex items-start text-gray-500">
                <TrophyIcon className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                <span className="flex-1">
                  {participant.competitions.slice(0, 2).map((comp, idx) => (
                    <Fragment key={comp.id}>
                      {idx > 0 && ', '}
                      {comp.name}
                      {comp.number && comp.number !== 'No Number' && ` (${comp.number})`}
                    </Fragment>
                  ))}
                  {participant.competitions.length > 2 && (
                    <span className="text-gray-400"> +{participant.competitions.length - 2}</span>
                  )}
                </span>
              </div>
            </div>
          )}
          
          {/* Additional Info */}
          {participant.additionalInfo && (
            <p className={`text-gray-500 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              {participant.additionalInfo}
            </p>
          )}
        </div>
        
        {/* Action Button Slot */}
        {actionButton && (
          <div className="ml-2 flex-shrink-0">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Utility: Transform various participant formats to ParticipantCardData
 */
export function toParticipantCardData(participant: any): ParticipantCardData {
  return {
    id: participant.id || participant.int_teilnehmerid,
    firstName: participant.firstName || participant.firstname || participant.var_vorname,
    lastName: participant.lastName || participant.lastname || participant.var_nachname,
    name: participant.name || participant.displayName,
    age: participant.age,
    birthdate: participant.birthdate || participant.dat_geburtstag,
    gender: participant.gender || participant.int_geschlecht,
    clubName: participant.clubName || participant.club || participant.verein_name,
    startNumber: participant.startNumber || participant.int_startnummer || participant.int_startpassnummer,
    competitions: participant.competitions,
    competitionNames: participant.competitionNames,
    additionalInfo: participant.additionalInfo
  };
}
