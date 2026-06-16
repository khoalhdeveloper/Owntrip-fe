import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';
import { CheckinFrame } from '../types/checkin.type';

export const frameService = {
  getMyUnlockedFrames: async (): Promise<CheckinFrame[]> => {
    try {
      const response = await axiosClient.get<any, any>(ENDPOINTS.FRAMES.MY_UNLOCKED);
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
        }));
      }
      return [];
    } catch (error) {
      console.error('Error in getMyUnlockedFrames:', error);
      return [];
    }
  },
};
