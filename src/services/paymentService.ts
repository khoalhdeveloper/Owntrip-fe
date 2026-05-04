import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface CreateBookingPaymentRequest {
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
}

export interface CreateBookingPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    bookingId: string;
    totalPrice: number;
    nights: number;
    status: string;
    paymentMethod: string;
    checkoutUrl: string | null;
    orderCode: number | null;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data: {
    bookingId: string;
    paymentStatus: 'unpaid' | 'paid' | 'refunded';
    bookingStatus: string;
    totalPrice: number;
    payosStatus: string | null;
    checkoutUrl: string | null;
  };
}

export interface CreatePaymentLinkRequest {
  bookingId: string;
  amount: number;
  description: string;
  hotelId?: string; // Thêm hotelId (tùy chọn)
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentLinkResponse {
  success: boolean;
  message: string;
  data?: {
    bin: string;
    checkoutUrl: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    orderCode: number;
    qrCode: string;
  };
}

export const paymentService = {
  /**
   * Tạo booking mới + PayOS payment link trong 1 request
   * Dùng khi user đặt phòng (hotel booking flow)
   */
  createBookingWithPayment: async (
    data: CreateBookingPaymentRequest
  ): Promise<CreateBookingPaymentResponse> => {
    try {
      const response = await axiosClient.post<any, CreateBookingPaymentResponse>(
        ENDPOINTS.PAYMENT.CREATE_BOOKING_PAYMENT,
        data
      );
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể tạo đơn đặt phòng';
      return { success: false, message };
    }
  },

  /**
   * Tạo PayOS payment link cho booking đã tồn tại
   * Dùng khi user nạp tiền vào ví
   */
  createPaymentLink: async (
    data: CreatePaymentLinkRequest
  ): Promise<CreatePaymentLinkResponse> => {
    try {
      const response = await axiosClient.post<any, CreatePaymentLinkResponse>(
        ENDPOINTS.PAYMENT.CREATE_PAYMENT_LINK,
        data
      );
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Không thể tạo link thanh toán';
      return { success: false, message };
    }
  },

  /**
   * Kiểm tra trạng thái thanh toán theo bookingId (dùng để polling)
   */
  checkPaymentStatus: async (bookingId: string): Promise<PaymentStatusResponse | null> => {
    try {
      const response = await axiosClient.get<any, PaymentStatusResponse>(
        ENDPOINTS.PAYMENT.STATUS(bookingId)
      );
      return response;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return null;
    }
  },

  /**
   * Hủy payment link
   */
  cancelPaymentLink: async (
    orderCode: string,
    cancellationReason?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axiosClient.put<any, any>(
        ENDPOINTS.PAYMENT.CANCEL(orderCode),
        { cancellationReason }
      );
      return { success: response?.success ?? false, message: response?.message ?? '' };
    } catch (error: any) {
      return { success: false, message: error?.response?.data?.message || 'Hủy thất bại' };
    }
  },
};
