import { useState, useEffect } from 'react';

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
      const response = await fetch(`/api/medals/${eventId}`);
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

  return { medalData, loading, error, refetch: fetchMedals };
};
