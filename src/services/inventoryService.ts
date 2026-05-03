import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface InventoryStats {
  totalRecords: number;
  totalRevenuePotential: number;
  totalBooked: number;
  totalAvailable: number;
  occupancyRate: number;
}

export interface InventoryRecord {
  _id: string;
  hotelId: string;
  roomTypeId: string;
  date: string;
  totalInventory: number;
  bookedCount: number;
  priceAtDate: number;
  status: string;
}

export interface BulkCreateInventoryRequest {
  hotelId: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  totalInventory: number;
  basePrice: number;
}

export interface UpdateInventoryRequest {
  totalInventory?: number;
  priceAtDate?: number;
  status?: string;
}

export interface DashboardStats {
  dateRange: { start: string; end: string };
  roomTypeStats: Record<string, {
    totalInventory: number;
    totalBooked: number;
    totalRevenue: number;
    avgPrice: number;
    days: number;
    occupancyRate: string;
    availableRooms: number;
  }>;
  totalRecords: number;
}

export const inventoryService = {
  /**
   * Lấy inventory theo khoảng thời gian
   */
  getInventory: async (hotelId: string, startDate: string, endDate: string, roomTypeId?: string): Promise<{ data: InventoryRecord[], stats: InventoryStats } | null> => {
    try {
      let url = `${ENDPOINTS.INVENTORY.GET}?hotelId=${hotelId}&startDate=${startDate}&endDate=${endDate}`;
      if (roomTypeId) url += `&roomTypeId=${roomTypeId}`;
      const response = await axiosClient.get<any, any>(url);
      return response;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return null;
    }
  },

  /**
   * Tạo hoặc cập nhật inventory hàng loạt
   */
  bulkCreateInventory: async (data: BulkCreateInventoryRequest): Promise<any> => {
    try {
      const response = await axiosClient.post<any, any>(ENDPOINTS.INVENTORY.BULK_CREATE, data);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể tạo/cập nhật kho phòng';
      return { success: false, message };
    }
  },

  /**
   * Cập nhật inventory cho 1 ngày cụ thể
   */
  updateInventory: async (id: string, data: UpdateInventoryRequest): Promise<any> => {
    try {
      const response = await axiosClient.put<any, any>(ENDPOINTS.INVENTORY.UPDATE(id), data);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể cập nhật inventory';
      return { success: false, message };
    }
  },

  /**
   * Cập nhật giá hàng loạt
   */
  bulkPriceUpdate: async (data: { hotelId: string; startDate: string; endDate: string; roomTypeId?: string; priceMultiplier?: number; fixedPrice?: number }): Promise<any> => {
    try {
      const response = await axiosClient.post<any, any>(ENDPOINTS.INVENTORY.BULK_PRICE_UPDATE, data);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể cập nhật giá';
      return { success: false, message };
    }
  },

 
  getDashboard: async (hotelId: string): Promise<{ data: DashboardStats } | null> => {
    try {
      const response = await axiosClient.get<any, any>(`${ENDPOINTS.INVENTORY.DASHBOARD}?hotelId=${hotelId}`);
      return response;
    } catch (error) {
      console.error('Error fetching inventory dashboard:', error);
      return null;
    }
  }
};
