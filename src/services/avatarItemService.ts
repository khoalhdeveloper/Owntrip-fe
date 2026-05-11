import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface AvatarItem {
  _id: string;
  itemId: string;
  name: string;
  type: 'frame' | 'avatar';
  imageUrl: string;
  previewUrl?: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  description?: string;
}

export const avatarItemService = {
  getShopItems: async (type?: string): Promise<AvatarItem[]> => {
    try {
      const url = type ? `${ENDPOINTS.AVATAR_ITEMS.SHOP}?type=${type}` : ENDPOINTS.AVATAR_ITEMS.SHOP;
      const response: any = await axiosClient.get(url);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching shop items:', error);
      return [];
    }
  },

  purchaseItem: async (itemId: string, price: number): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Dùng point để thanh toán
      const payResponse: any = await axiosClient.post(ENDPOINTS.USERS.PAY_WITH_POINTS, {
        pointsToUse: price
      });

      if (!payResponse.success) {
        return { success: false, message: payResponse.message || 'Thanh toán thất bại' };
      }

      // 2. Sau khi thanh toán, lưu vào Inventory (Backend chưa có API Inventory cho User, dùng local tạm)
      // Note: Trong tương lai nên có API POST /api/inventory/add-item
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const userId = await AsyncStorage.getItem('userId');
      
      if (!userId) {
        return { success: false, message: 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.' };
      }
      
      const INVENTORY_KEY = `inventory_${userId}`;
      const localInventoryRaw = await AsyncStorage.getItem(INVENTORY_KEY);
      let localInventory = localInventoryRaw ? JSON.parse(localInventoryRaw) : [];
      
      const itemToSave = {
        id: itemId,
        name: (await avatarItemService.getShopItems()).find(i => i.itemId === itemId)?.name || 'Vật phẩm',
        image: (await avatarItemService.getShopItems()).find(i => i.itemId === itemId)?.imageUrl || '',
        type: (await avatarItemService.getShopItems()).find(i => i.itemId === itemId)?.type || 'item',
        purchasedAt: new Date().toISOString()
      };
      
      localInventory.push(itemToSave);
      await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(localInventory));

      return { success: true, message: 'Mua hàng thành công!' };
    } catch (error: any) {
      console.error('Purchase Error:', error);
      return { success: false, message: error.response?.data?.message || 'Lỗi hệ thống khi mua hàng' };
    }
  }
};
