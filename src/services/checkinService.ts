import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';
import { CheckinMemory } from '../types/checkin.type';

export interface CheckinResponse {
  success: boolean;
  message?: string;
  checkin?: any;
  checkins?: any[];
}

export const checkinService = {
  createMemory: async (imageUri: string, title?: string, date?: string): Promise<CheckinMemory | null> => {
    try {
      const response = await axiosClient.post<any, CheckinResponse>(ENDPOINTS.CHECKINS.CREATE, {
        imageUri,
        title,
        date,
      });
      if (response && response.success && response.checkin) {
        const c = response.checkin;
        return {
          id: c._id || c.id,
          title: c.title,
          date: c.date,
          imageUri: c.imageUri,
          isFavorite: c.isFavorite,
        };
      }
      return null;
    } catch (error) {
      console.error('Error in createMemory:', error);
      return null;
    }
  },

  getMyMemories: async (): Promise<CheckinMemory[]> => {
    try {
      const response = await axiosClient.get<any, CheckinResponse>(ENDPOINTS.CHECKINS.MY);
      if (response && response.success && response.checkins) {
        return response.checkins.map((c: any) => ({
          id: c._id || c.id,
          title: c.title,
          date: c.date,
          imageUri: c.imageUri,
          isFavorite: c.isFavorite,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error in getMyMemories:', error);
      return [];
    }
  },

  toggleFavorite: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosClient.patch<any, CheckinResponse>(ENDPOINTS.CHECKINS.FAVORITE(id));
      return !!(response && response.success);
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return false;
    }
  },

  deleteMemory: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosClient.delete<any, CheckinResponse>(ENDPOINTS.CHECKINS.DELETE(id));
      return !!(response && response.success);
    } catch (error) {
      console.error('Error in deleteMemory:', error);
      return false;
    }
  },
};
