import axiosClient from './axiosClient';

// ===== TYPES =====
export interface IRoomType {
  roomTypeId: string;
  name: string;
  description?: string;
  basePrice: number;
  price?: number;
  capacity: number;
  totalRooms: number;
  images: string[];
  amenities: string[];
}

export interface IHotelManage {
  _id?: string;
  hotelId?: string;
  ownerId?: string;
  name: string;
  starRating: number;
  address: {
    fullAddress: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  images: string[];
  description?: string;
  amenities?: string[];
  tags?: string[];
  rooms: IRoomType[];
  reviewSummary?: {
    score: number;
    count: number;
    cleanliness: number;
    service: number;
    facilities?: number;
    valueForMoney?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// ===== SERVICE =====
export const hotelManagementService = {
  /**
   * Lấy danh sách khách sạn thuộc sở hữu của người dùng hiện tại
   */
  getMyHotels: async (): Promise<IHotelManage[]> => {
    try {
      const response = await axiosClient.get<any, any>('/api/hotels/my-hotels');
      return response?.data || [];
    } catch (error) {
      console.error('Error fetching my hotels:', error);
      return [];
    }
  },

  /**
   * Tạo khách sạn mới
   */
  createHotel: async (data: Partial<IHotelManage> & { inventorySetup?: any[] }): Promise<any> => {
    try {
      const response = await axiosClient.post<any, any>('/api/hotels/create', data);
      return response;
    } catch (error) {
      console.error('Error creating hotel:', error);
      throw error;
    }
  },

  /**
   * Cập nhật thông tin khách sạn
   */
  updateHotel: async (hotelId: string, data: Partial<IHotelManage>): Promise<any> => {
    try {
      const response = await axiosClient.patch<any, any>(`/api/hotels/${hotelId}`, data);
      return response;
    } catch (error) {
      console.error('Error updating hotel:', error);
      throw error;
    }
  },
};
