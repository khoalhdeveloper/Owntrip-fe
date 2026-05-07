import axiosClient from './axiosClient';

export interface IHotelRequestData {
  hotelName: string;
  address: string;
  city: string;
  phone: string;
  description: string;
  images: string[];
}

export interface IHotelRequestResponse {
  success: boolean;
  message: string;
  data: any;
}

export const hotelRequestService = {
  submitRequest: async (data: IHotelRequestData): Promise<IHotelRequestResponse> => {
    try {
      const response = await axiosClient.post<any, IHotelRequestResponse>('/api/hotel-requests', data);
      return response as any;
    } catch (error: any) {
      console.error('Error submitting hotel request:', error);
      throw error.response?.data || { success: false, message: 'Đã có lỗi xảy ra' };
    }
  },

  getMyRequests: async (): Promise<IHotelRequestResponse> => {
    try {
      const response = await axiosClient.get<any, IHotelRequestResponse>('/api/hotel-requests/me');
      return response as any;
    } catch (error: any) {
      console.error('Error fetching my hotel requests:', error);
      throw error.response?.data || { success: false, message: 'Đã có lỗi xảy ra' };
    }
  }
};
