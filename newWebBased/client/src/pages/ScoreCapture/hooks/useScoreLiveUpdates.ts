/**
 * useScoreLiveUpdates Hook
 * Point 123: Separation of Concerns - Real-time Score Updates
 * 
 * Handles Socket.IO integration for live score synchronization
 */

import { useEffect } from 'react';
import { getSocket } from '@/utils/socket';
import { apiGet } from '@/utils/api';
import type { Score } from '@/types/ScoreCapture.types';

interface UseScoreLiveUpdatesProps {
  eventId: string | undefined;
  setExistingScores: (scores: Score[]) => void;
}

export function useScoreLiveUpdates({
  eventId,
  setExistingScores
}: UseScoreLiveUpdatesProps) {

  useEffect(() => {
    if (!eventId) {
      console.log('⏭️ No eventId, skipping Socket.IO setup');
      return;
    }

    console.log('🔌 Setting up Socket.IO listener for eventId:', eventId);
    const socket = getSocket();
    
    socket.emit('join-competition', eventId);
    console.log('📡 Joined competition room:', eventId);

    const handleScoreUpdate = (data: any) => {
      console.log('🔔 Received score-updated event:', data);
      console.log('🔍 Comparing eventIds - received:', data.eventId, 'typeof:', typeof data.eventId, '| current:', eventId, 'typeof:', typeof eventId);
      
      // Convert both to numbers for comparison
      const receivedEventId = Number(data.eventId);
      const currentEventId = Number(eventId);
      
      if (receivedEventId === currentEventId) {
        console.log('✅ Score update is for our event, reloading data...');
        // Reload scores and re-initialize matrix with cache-buster
        const cacheBuster = Date.now();
        apiGet(`/scores?eventId=${eventId}&limit=1000&_cb=${cacheBuster}`).then((scoresData) => {
          const loadedScores = scoresData?.results || [];
          console.log('📊 Reloaded scores:', loadedScores.length, 'total');
          // Force new array reference to trigger useEffect
          setExistingScores([...loadedScores]);
          console.log('🔄 Triggering score matrix re-initialization via state update...');
        }).catch((error) => {
          console.error('❌ Error reloading scores:', error);
        });
      } else {
        console.log('⏭️ Score update is for different event - received:', receivedEventId, 'expected:', currentEventId);
      }
    };

    socket.on('score-updated', handleScoreUpdate);
    console.log('👂 Listening for score-updated events');

    return () => {
      console.log('🔌 Cleaning up Socket.IO listener for eventId:', eventId);
      socket.emit('leave-competition', eventId);
      socket.off('score-updated', handleScoreUpdate);
    };
  }, [eventId, setExistingScores]); // Only depend on eventId, not on participants/disciplines

}
