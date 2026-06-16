import { useState, useEffect, useCallback } from 'react';
import { checkinService } from '../services/checkinService';
import { NearbyPlace } from '../types/checkin.type';

export const useNearbyPlaces = (latitude?: number, longitude?: number) => {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearby = useCallback(async () => {
    if (latitude === undefined || longitude === undefined) {
      setPlaces([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await checkinService.getNearbyPlaces(latitude, longitude);
      setPlaces(data);
    } catch (err: any) {
      console.error('Error in useNearbyPlaces:', err);
      setError('Không thể lấy danh sách địa điểm xung quanh');
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  return {
    places,
    loading,
    error,
    refresh: fetchNearby,
  };
};
