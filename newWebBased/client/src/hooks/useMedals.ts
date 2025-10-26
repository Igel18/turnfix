import { useState, useEffect } from 'react';
import getSocket from '../utils/socket';

export interface MedalStanding {
  clubId: number;
  clubName: string;
  totalGold: number;
  totalSilver: number;
  totalBronze: number;
  totalMedals: number;
  totalStarters: number;
  competitions: {
    competitionId: number;
    competitionName: string;
    gold: number;
    silver: number;
    bronze: number;
    starters: number;
  }[];
}

export interface MedalData {
  eventId: number;
  eventName: string;
  standings: MedalStanding[];
}

export const useMedals = (eventId: number | null) => {
  const [medalData, setMedalData] = useState<MedalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedals = async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`/api/medals/${eventId}?_cb=${cacheBuster}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMedalData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch medal data');
      console.error('Error fetching medal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) {
      setMedalData(null);
      return;
    }

    fetchMedals();
  }, [eventId]);

  // Socket.IO: Listen for real-time medal and results updates
  useEffect(() => {
    if (!eventId) return;

    const socket = getSocket();
    socket.emit('join-competition', eventId);

    const handleUpdate = (data: any) => {
      if (data.eventId === Number(eventId)) {
        console.log('🔔 Medals or results updated, refetching medal data...');
        fetchMedals();
      }
    };

    socket.on('medals-updated', handleUpdate);
    socket.on('results-updated', handleUpdate);

    return () => {
      socket.emit('leave-competition', eventId);
      socket.off('medals-updated', handleUpdate);
      socket.off('results-updated', handleUpdate);
    };
  }, [eventId]);

  return { medalData, loading, error, refetch: fetchMedals };
};
