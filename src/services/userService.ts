import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InventoryItem {
  id: string;
  name: string;
  image: string;
  type: string;
  price: number;
  purchasedAt: string;
}

export interface UserProfile {
  _id?: string;
  userId: string;
  email: string;
  displayName: string;
  image?: string;
  balance: number;
  points: number;
  role: 'user' | 'admin' | 'hotel_owner';
  isVerified: boolean;
  inventory?: InventoryItem[];
  createdAt?: string;
}

export const userService = {
  getMyProfile: async (userId?: string): Promise<UserProfile | null> => {
    try {
      const baseUrl = userId ? ENDPOINTS.USERS.MY_PROFILE(userId) : ENDPOINTS.USERS.PROFILE;
      // Thêm nocache để ép server trả về dữ liệu mới nhất từ DB
      const url = `${baseUrl}?nocache=${Date.now()}`;
      
      const response = await axiosClient.get<any, any>(url);
      const data = response.data || response.user || response;
      if (!data) return null;

      return {
        _id: data._id,
        userId: data.userId || data._id || userId || '',
        email: data.email || '',
        displayName: data.displayName || data.name || 'User',
        image: data.image || '',
        balance: data.balance ?? 0,
        points: data.points ?? 0,
        role: data.role || 'user',
        isVerified: data.isVerified ?? false,
        inventory: data.inventory || [],
        createdAt: data.createdAt,
      };
    } catch (error) {
      return null;
    }
  },

  updateProfile: async (userId: string, data: Partial<UserProfile>): Promise<boolean> => {
    const url = ENDPOINTS.USERS.UPDATE_PROFILE(userId);
    try {
      // Đảm bảo Payload sạch tuyệt đối như Postman
      // Thêm t= vào link ảnh để ép Server nhận diện có sự thay đổi dữ liệu
      const freshImage = data.image ? `${data.image}${data.image.includes('?') ? '&' : '?'}v=${Date.now()}` : data.image;
      
      const payload = {
        displayName: data.displayName,
        image: freshImage
      };
      
      console.log('📡 [PUT] Sending strictly:', url, JSON.stringify(payload));
      const response: any = await axiosClient.put(url, payload);
      
      // Nếu server trả về success: true hoặc status success
      return response?.success === true || response?.status === 'success' || !!response;
    } catch (error: any) {
      console.error('❌ Update Error:', error?.response?.status, error?.response?.data);
      return false;
    }
  },

  purchaseItem: async (userId: string, item: { id: string, name: string, image: string, type: string, price: number }): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Gọi API thanh toán bằng point từ backend
      console.log('📡 [POST] Paying with points:', item.price);
      const response: any = await axiosClient.post(ENDPOINTS.USERS.PAY_WITH_POINTS, {
        pointsToUse: item.price
      });

      if (!response.success) {
        return { success: false, message: response.message || 'Payment with points failed' };
      }

      // 2. Nếu thanh toán thành công, quản lý Inventory cục bộ (vì backend chưa có API lưu inventory)
      const INVENTORY_KEY = `inventory_${userId}`;
      const localInventoryRaw = await AsyncStorage.getItem(INVENTORY_KEY);
      let localInventory: InventoryItem[] = localInventoryRaw ? JSON.parse(localInventoryRaw) : [];

      const newInventoryItem: InventoryItem = {
        ...item,
        purchasedAt: new Date().toISOString()
      };
      
      localInventory.push(newInventoryItem);
      await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(localInventory));

      return { success: true, message: 'Purchase successful' };
    } catch (error: any) {
      console.error('❌ Purchase Error:', error?.response?.data || error.message);
      const errorMsg = error?.response?.data?.message || 'System error during purchase';
      return { success: false, message: errorMsg };
    }
  },

  createVNPayPayment: async (amount: number): Promise<{ success: boolean; paymentUrl?: string; message?: string }> => {
    try {
      const response: any = await axiosClient.post(ENDPOINTS.USERS.VNPAY_CREATE, { amount });
      if (response.success && response.data?.paymentUrl) {
        return { success: true, paymentUrl: response.data.paymentUrl };
      }
      return { success: false, message: response.message || 'Failed to create payment' };
    } catch (error: any) {
      return { success: false, message: error?.response?.data?.message || 'System error' };
    }
  },

  topUpPoints: async (amountVND: number): Promise<{ success: boolean; pointsEarned?: number; message?: string }> => {
    try {
      const response: any = await axiosClient.post(ENDPOINTS.USERS.TOP_UP, { amount: amountVND });
      if (response.success) {
        return { success: true, pointsEarned: response.data?.pointsEarned };
      }
      return { success: false, message: response.message || 'Top up failed' };
    } catch (error: any) {
      return { success: false, message: error?.response?.data?.message || 'System error' };
    }
  },

  getLocalInventory: async (userId: string): Promise<InventoryItem[]> => {
    try {
      const INVENTORY_KEY = `inventory_${userId}`;
      const data = await AsyncStorage.getItem(INVENTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};
