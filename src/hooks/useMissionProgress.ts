import { useState, useEffect, useCallback } from 'react';
import { missionService } from '../services/missionService';
import { MissionProgress } from '../types/mission.type';

export const useMissionProgress = () => {
  const [missions, setMissions] = useState<MissionProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await missionService.getMyProgress();
      setMissions(data);
    } catch (err: any) {
      console.error('Error in useMissionProgress:', err);
      setError('Không thể tải tiến độ nhiệm vụ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    missions,
    loading,
    error,
    refresh: fetchProgress,
  };
};
