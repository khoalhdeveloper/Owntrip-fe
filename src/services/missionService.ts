import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';
import { MissionProgress } from '../types/mission.type';

export const missionService = {
  getMissions: async (): Promise<any[]> => {
    try {
      const response = await axiosClient.get<any, any>(ENDPOINTS.MISSIONS.LIST);
      if (response) {
        if (Array.isArray(response)) return response;
        if (response.success) {
          return response.missions || response.data || [];
        }
        if (response.data && Array.isArray(response.data)) {
          return response.data;
        }
      }
      return [];
    } catch (error) {
      console.error('Error in getMissions:', error);
      return [];
    }
  },

  getMyProgress: async (): Promise<MissionProgress[]> => {
    try {
      const response = await axiosClient.get<any, any>(ENDPOINTS.MISSIONS.MY_PROGRESS);
      if (response) {
        if (Array.isArray(response)) {
          return response;
        }
        if (response.success) {
          const result = response.progress || response.data || response.missions || [];
          return result;
        }
        if (response.data) {
          if (Array.isArray(response.data)) {
            return response.data;
          }
          if (response.data.progress && Array.isArray(response.data.progress)) {
            return response.data.progress;
          }
          if (response.data.missions && Array.isArray(response.data.missions)) {
            return response.data.missions;
          }
        }
      }
      return [];
    } catch (error) {
      console.error('Error in getMyProgress:', error);
      return [];
    }
  },

  claimReward: async (id: string): Promise<{ success: boolean; message?: string; reward?: any } | null> => {
    try {
      const response = await axiosClient.post<any, any>(ENDPOINTS.MISSIONS.CLAIM_REWARD(id));
      return response;
    } catch (error: any) {
      console.error('Error in claimReward:', error);
      if (error?.response?.data) {
        return error.response.data;
      }
      return null;
    }
  },
};
