import { useState, useEffect } from 'react';
import { CheckinFrame } from '../types/checkin.type';
import { frameService, FrameQuery } from '../services/frameService';

// Frame mặc định luôn được prepend đầu danh sách
const NO_FRAME: CheckinFrame = {
  id:       'no-frame',
  name:     'Không khung',
  imageUrl: null,
  type:     'none',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseFetchFramesResult {
  frames: CheckinFrame[];
  loading: boolean;
  error: string | null;
}

export const useFetchFrames = (filters?: FrameQuery): UseFetchFramesResult => {
  const [frames,  setFrames]  = useState<CheckinFrame[]>([NO_FRAME]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const province = filters?.province;
  const destination = filters?.destination;
  const category = filters?.category;

  useEffect(() => {
    let cancelled = false;

    const fetchFrames = async () => {
      setLoading(true);
      setError(null);

      try {
        const mapped = await frameService.getMyUnlockedFrames({ province, destination, category });
        if (!cancelled) {
          setFrames([NO_FRAME, ...mapped]);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Không thể tải danh sách khung hình của bạn');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFrames();
    return () => { cancelled = true; };
  }, [province, destination, category]);

  return { frames, loading, error };
};

