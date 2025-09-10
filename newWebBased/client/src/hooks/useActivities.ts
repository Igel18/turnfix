import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

export interface ActivityItem {
  id: string;
  type: 'event' | 'participant' | 'competition' | 'score';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
  relatedId?: number;
  relatedName?: string;
}

export interface ActivityStatistics {
  totalEvents: number;
  totalParticipants: number;
  totalCompetitions: number;
  totalClubs: number;
  timestamp: Date;
}

export const useActivities = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiGet('/activities/recent');
      
      if (response.success) {
        // Convert timestamp strings to Date objects
        const activitiesWithDates = response.activities.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
        
        setActivities(activitiesWithDates);
      } else {
        setError(response.error || 'Failed to fetch activities');
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Network error while fetching activities');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await apiGet('/activities/statistics');
      
      if (response.success) {
        setStatistics({
          ...response.statistics,
          timestamp: new Date(response.statistics.timestamp)
        });
      } else {
        console.error('Failed to fetch statistics:', response.error);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const refreshActivities = () => {
    fetchActivities();
    fetchStatistics();
  };

  useEffect(() => {
    fetchActivities();
    fetchStatistics();
  }, []);

  return {
    activities,
    statistics,
    loading,
    error,
    refreshActivities
  };
};

export default useActivities;
