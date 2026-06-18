import { useState, useEffect } from 'react';
import { CheckinFrame } from '../types/checkin.type';
import { frameService } from '../services/frameService';

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

export const useFetchFrames = (): UseFetchFramesResult => {
  const [frames,  setFrames]  = useState<CheckinFrame[]>([NO_FRAME]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFrames = async () => {
      setLoading(true);
      setError(null);

      try {
        const mapped = await frameService.getMyUnlockedFrames();
        if (!cancelled) {
          setFrames([NO_FRAME, ...mapped]);
          setError(null);
        }
      } catch (fetchErr) {
        if (!cancelled) {
          setError('Không thể tải danh sách khung hình của bạn');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFrames();
    return () => { cancelled = true; };
  }, []);

  return { frames, loading, error };
};

