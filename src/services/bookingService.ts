import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface CheckAvailabilityRequest {
  hotelId: string;
  roomTypeId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  roomCount: number;
}

export interface CheckAvailabilityResponse {
  success: boolean;
  available: boolean;
  totalPrice: number;
  nights: number;
  breakdown: {
    date: string;
    price: number;
    available: number;
    status: string;
  }[];
  message: string;
}

export interface CreateBookingRequest {
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  guestInfo: {
    fullName: string;
    phone: string;
    email: string;
    specialRequests?: string;
  };
  paymentMethod: 'balance' | 'credit_card' | 'bank_transfer';
}

export interface CreateBookingResponse {
  success: boolean;
  message: string;
  data?: {
    bookingId: string;
    totalPrice: number;
    status: string;
  };
}

export interface BookingSummary {
  bookingId: string;
  hotel: {
    name: string;
    address: string;
    image: string;
    stars: number;
  } | null;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface MyBookingsResponse {
  success: boolean;
  data: BookingSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const bookingService = {
  /**
   * Kiểm tra phòng trống
   */
  checkAvailability: async (
    data: CheckAvailabilityRequest,
  ): Promise<CheckAvailabilityResponse | null> => {
    try {
      const response = await axiosClient.post<any, CheckAvailabilityResponse>(
        ENDPOINTS.BOOKINGS.CHECK_AVAILABILITY,
        data,
      );
      return response;
    } catch (error) {
      console.error('Error checking availability:', error);
      return null;
    }
  },

  /**
   * Tạo đơn đặt phòng
   */
  createBooking: async (data: CreateBookingRequest): Promise<CreateBookingResponse> => {
    try {
      const response = await axiosClient.post<any, CreateBookingResponse>(
        ENDPOINTS.BOOKINGS.CREATE,
        data,
      );
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể đặt phòng';
      return { success: false, message };
    }
  },

  /**
   * Xem lịch sử đặt phòng
   */
  getMyBookings: async (
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<MyBookingsResponse | null> => {
    try {
      let url = `${ENDPOINTS.BOOKINGS.MY_BOOKINGS}?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      const response = await axiosClient.get<any, MyBookingsResponse>(url);
      return response;
    } catch (error) {
      console.error('Error fetching my bookings:', error);
      return null;
    }
  },

  /**
   * Xem chi tiết 1 booking
   */
  getBookingDetail: async (bookingId: string): Promise<any | null> => {
    try {
      const response = await axiosClient.get<any, any>(ENDPOINTS.BOOKINGS.DETAIL(bookingId));
      return response?.data ?? null;
    } catch (error) {
      console.error(`Error fetching booking ${bookingId}:`, error);
      return null;
    }
  },

  /**
   * Hủy đặt phòng
   */
  cancelBooking: async (
    bookingId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string; refundAmount?: number }> => {
    try {
      const response = await axiosClient.post<any, any>(ENDPOINTS.BOOKINGS.CANCEL(bookingId), {
        reason: reason || 'Người dùng hủy',
      });
      return {
        success: response?.success ?? false,
        message: response?.message ?? 'Hủy thành công',
        refundAmount: response?.data?.refundAmount,
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể hủy đặt phòng';
      return { success: false, message };
    }
  },

  /**
   * Lấy danh sách booking cho khách sạn (Hotel Owner)
   */
  getHotelBookings: async (
    hotelId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<any> => {
    try {
      let url = `${ENDPOINTS.BOOKINGS.HOTEL_BOOKINGS(hotelId)}?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      const response = await axiosClient.get<any, any>(url);
      return response;
    } catch (error) {
      console.error('Error fetching hotel bookings:', error);
      return null;
    }
  },

  /**
   * Lấy lịch sử giao dịch cho khách sạn (Hotel Owner)
   */
  getHotelTransactions: async (
    hotelId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> => {
    try {
      const url = `${ENDPOINTS.BOOKINGS.HOTEL_TRANSACTIONS(hotelId)}?page=${page}&limit=${limit}`;
      const response = await axiosClient.get<any, any>(url);
      return response;
    } catch (error) {
      console.error('Error fetching hotel transactions:', error);
      return null;
    }
  },

  /**
   * Lấy thông tin tồn kho phòng (kiểm tra phòng trống)
   */
  getInventory: async (
    hotelId: string,
    startDate: string,
    endDate: string,
    roomTypeId?: string,
  ): Promise<any> => {
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
   * Tạo booking + PayOS payment link trong 1 request (dùng cho thanh toán phòng)
   */
  createBookingWithPayment: async (
    data: CreateBookingRequest,
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      bookingId: string;
      totalPrice: number;
      nights: number;
      status: string;
      checkoutUrl: string | null;
      orderCode: number | null;
    };
  }> => {
    try {
      const { paymentMethod, ...rest } = data; // paymentMethod không cần cho endpoint này
      const response = await axiosClient.post<any, any>(
        ENDPOINTS.PAYMENT.CREATE_BOOKING_PAYMENT,
        rest,
      );
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể đặt phòng';
      return { success: false, message };
    }
  },
};
