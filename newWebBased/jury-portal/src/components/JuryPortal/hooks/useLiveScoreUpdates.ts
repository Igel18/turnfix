/**
 * Custom hook for real-time score updates via Socket.IO in the Jury Portal.
 * 
 * Extracted from JuryPortal.tsx for Separation of Concerns.
 * Listens for 'score-updated' events and updates participant scores.
 */

import { useEffect } from 'react';
import getSocket from '../../../utils/socket';
import type { Participant, Device } from '../JuryPortal.types';

interface UseLiveScoreUpdatesParams {
  selectedEvent: number | null;
  selectedDevice: Device | null;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
}

export function useLiveScoreUpdates({
  selectedEvent,
  selectedDevice,
  setParticipants,
}: UseLiveScoreUpdatesParams): void {
  useEffect(() => {
    if (!selectedEvent || !selectedDevice) return;

    console.log('🔌 JURY: Setting up Socket.IO listeners for live score updates');
    const socket = getSocket();

    // Join the competition room to receive updates
    socket.emit('join-competition', selectedEvent);
    console.log(`🔌 JURY: Joined competition room: competition-${selectedEvent}`);

    const handleScoreUpdate = (data: any) => {
      console.log('📡 JURY: Received score-updated:', data);

      // Only update if it's for our current event and discipline
      if (data.eventId === selectedEvent && data.disciplineId === selectedDevice.disciplineId) {
        console.log('✅ JURY: Score update matches current context, updating participant list');

        setParticipants(prevParticipants => {
          return prevParticipants.map(participant => {
            const matchesById = participant.participantId === data.participantId;
            const matchesByWertungenId = participant.wertungenId && participant.wertungenId === data.wertungenId;

            if (matchesById || matchesByWertungenId) {
              console.log(`✅ JURY: Updating participant ${participant.name} with new score: ${data.score}`);
              return {
                ...participant,
                currentScore: data.score,
                status: 'completed' as const
              };
            }
            return participant;
          });
        });
      }
    };

    socket.on('score-updated', handleScoreUpdate);

    return () => {
      console.log('🔌 JURY: Cleaning up Socket.IO listeners');
      socket.emit('leave-competition', selectedEvent);
      socket.off('score-updated', handleScoreUpdate);
    };
  }, [selectedEvent, selectedDevice]);
}
