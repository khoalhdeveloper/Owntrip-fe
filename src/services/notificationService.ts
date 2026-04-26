import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  getAll: async (): Promise<Notification[]> => {
    try {
      const response: any = await axiosClient.get(ENDPOINTS.NOTIFICATIONS.GET_ALL);
      // Backend usually wraps data in a 'notifications' or 'data' key, 
      // or returns the array directly.
      const data = response?.notifications || response?.data || (Array.isArray(response) ? response : []);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  markAsRead: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(id));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },
};
