import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface AvatarItem {
  id: string;
  name: string;
  type: 'avatar' | 'frame';
  image: string;
  price: number;
  description?: string;
}

export const avatarShopService = {
  getItems: async (type?: 'avatar' | 'frame'): Promise<AvatarItem[]> => {
    try {
      const response = await axiosClient.get<any, any>(ENDPOINTS.AVT_ITEMS.SHOP, {
        params: { type }
      });
      
      const resData = response.data || response;
      const list = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
      
      return list.map((item: any) => ({
        id: item.itemId || item._id || item.id,
        name: item.name || 'Unnamed',
        type: item.type || 'avatar',
        image: item.imageUrl || item.image || '', // Backend uses imageUrl
        price: item.price || 0,
        description: item.description,
      }));
    } catch (error) {
      console.error('avatarShopService.getItems error:', error);
      return [];
    }
  },
};
