import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, ENDPOINTS } from '../constants/api';
import { CheckinFrame } from '../types/checkin.type';

// ─── Constants ────────────────────────────────────────────────────────────────
const CACHE_KEY      = 'cached_frames';
const CACHE_DURATION = 0; // Đổi về 0 để không lưu cache lúc test, luôn tải mới từ server

// Frame mặc định luôn được prepend đầu danh sách
const NO_FRAME: CheckinFrame = {
  id:       'no-frame',
  name:     'Không khung',
  imageUrl: null,
  type:     'none',
};

// ─── Helper: map API response → CheckinFrame ──────────────────────────────────
const mapApiFrame = (item: any): CheckinFrame => ({
  _id:        item._id,
  id:         item._id,           // Dùng _id MongoDB làm local id
  name:       item.name,
  imageUrl:   item.imageUrl ?? null,
  type:       item.layoutType === 'filmstrip-4' ? 'film' : 'classic',
  layoutType: item.layoutType,
  slotsCount: item.slotsCount,
  isActive:   item.isActive,
  order:      item.order,
});

// ─── Cache helpers ────────────────────────────────────────────────────────────
interface CachePayload {
  timestamp: number;
  frames: CheckinFrame[];
}

const readCache = async (): Promise<CheckinFrame[] | null> => {
  try {
    // Proactively clear cache to resolve old configuration issues
    await AsyncStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

const writeCache = async (frames: CheckinFrame[]): Promise<void> => {
  try {
    const payload: CachePayload = { timestamp: Date.now(), frames };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Lỗi ghi cache không ảnh hưởng trải nghiệm người dùng
  }
};

const readExpiredCache = async (): Promise<CheckinFrame[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload: CachePayload = JSON.parse(raw);
    return payload.frames ?? null;
  } catch {
    return null;
  }
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

      // 1. Thử đọc cache còn hạn trước
      const cached = await readCache();
      if (cached) {
        if (!cancelled) {
          setFrames([NO_FRAME, ...cached]);
          setLoading(false);
        }
        return; // Cache hợp lệ → dùng luôn, không fetch
      }

      // 2. Cache hết hạn hoặc chưa có → fetch API
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.FRAMES.LIST}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Lỗi từ server');

        const mapped: CheckinFrame[] = (data.frames as any[]).map(mapApiFrame);

        await writeCache(mapped); // Lưu cache mới

        if (!cancelled) {
          setFrames([NO_FRAME, ...mapped]);
          setError(null);
        }
      } catch (fetchErr) {
        // 3. Fetch lỗi → thử dùng cache cũ (dù hết hạn), không báo lỗi cho user
        const staleCache = await readExpiredCache();
        if (staleCache && staleCache.length > 0) {
          if (!cancelled) {
            setFrames([NO_FRAME, ...staleCache]);
            setError(null); // Có dữ liệu dự phòng → không hiện lỗi
          }
        } else {
          // Không có cache nào → báo lỗi
          if (!cancelled) {
            setError('Không thể tải danh sách khung hình');
          }
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
