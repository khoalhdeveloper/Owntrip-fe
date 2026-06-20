import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';
import { CheckinFrame } from '../types/checkin.type';

export interface FrameQuery {
  province?: string;
  destination?: string;
  category?: string;
}

function buildFrameQuery(filters?: FrameQuery): string {
  if (!filters) return '';

  const pairs = Object.entries(filters).filter(([, value]) => {
    return typeof value === 'string' && value.trim().length > 0;
  });

  if (pairs.length === 0) return '';

  const query = pairs
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value).trim())}`)
    .join('&');

  return `?${query}`;
}

export const frameService = {
  getMyUnlockedFrames: async (filters?: FrameQuery): Promise<CheckinFrame[]> => {
    try {
      const response = await axiosClient.get<any, any>(
        `${ENDPOINTS.FRAMES.MY_UNLOCKED}${buildFrameQuery(filters)}`,
      );
      if (response && response.success && response.frames) {
        return response.frames.map((item: any) => ({
          _id: item._id,
          id: item._id,
          name: item.name,
          imageUrl: item.imageUrl ?? null,
          type: item.layoutType === 'filmstrip-4' ? 'film' : 'classic',
          layoutType: item.layoutType,
          slotsCount: item.slotsCount,
          isActive: item.isActive,
          order: item.order,
          province: item.province,
          destinationTags: item.destinationTags ?? [],
          category: item.category,
          isDefault: item.isDefault,
          unlockCondition: item.unlockCondition,
          isUnlocked: item.isUnlocked,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error in getMyUnlockedFrames:', error);
      return [];
    }
  },
};
