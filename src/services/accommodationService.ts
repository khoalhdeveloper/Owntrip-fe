import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

// ===== Interfaces matching Backend Hotel Model =====

export interface IRoomType {
  roomTypeId: string;
  name: string;
  description?: string;
  images?: string[];
  capacity: number;
  basePrice: number;
  price?: number;
  totalRooms?: number;
  availableRooms?: number;
  amenities?: string[];
}

export interface Accommodation {
  _id: string;
  hotelId: string;
  name: string;
  starRating: number;
  address: {
    fullAddress: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  images: string[];
  description?: string;
  rooms: IRoomType[];
  reviewSummary?: {
    score: number;
    count: number;
    cleanliness: number;
    service: number;
    facilities?: number;
    valueForMoney?: number;
  };
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  id?: string;
  phone?: string;
  website?: string;
  checkIn?: string;
  checkOut?: string;
  latitude?: number;
  longitude?: number;

  // ===== Computed helpers (populated by transformer) =====
  /** First image for display */
  primaryImage: string;
  /** Cheapest room base price */
  pricePerNight: number;
  /** reviewSummary.score */
  rating: number;
  /** reviewSummary.count */
  reviewsCount: number;
  /** All amenities from all rooms merged */
  amenities: string[];
}

export interface AccommodationReview {
  id: string;
  hotelId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

/**
 * Transform raw backend hotel object into a format
 * the frontend components can consume easily.
 */
function transformHotel(raw: any): Accommodation {
  // Nếu dữ liệu trả về từ Backend là cấu trúc mới (có cụm data.header)
  const data = raw.header ? raw : raw.data || raw;

  const header = data.header || {};
  const pricing = data.pricing || {};
  const location = data.location || {};

  const name = header.name || data.name || '';
  const images = header.images || data.images || [];
  const starRating = header.stars || data.starRating || 5;
  const address = header.address || data.address || { fullAddress: '' };

  const rooms: IRoomType[] = data.rooms || [];
  const cheapest =
    rooms.length > 0
      ? rooms.reduce((min, r) => {
          const rPrice = r.basePrice || r.price || 0;
          const minPrice = min.basePrice || min.price || 0;
          if (rPrice === 0) return min;
          if (minPrice === 0) return r;
          return rPrice < minPrice ? r : min;
        }, rooms[0])
      : null;

  // Merge unique amenities from all rooms
  const allAmenities: string[] = [];
  rooms.forEach((r) => {
    (r.amenities || []).forEach((a) => {
      if (!allAmenities.includes(a)) allAmenities.push(a);
    });
  });

  return {
    ...data,
    id: data.hotelId || data._id || data.id,
    name,
    images,
    starRating,
    address,
    primaryImage:
      images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000',
    pricePerNight:
      pricing.fromPrice ||
      (cheapest ? cheapest.basePrice || cheapest.price || 0 : data.minPrice || 0),
    rating: data.reviewSummary?.score || data.reviewDashboard?.score || 0,
    reviewsCount: data.reviewSummary?.count || data.reviewDashboard?.count || 0,
    amenities: allAmenities,
  };
}

export const accommodationService = {
  /**
   * Lấy danh sách khách sạn từ Backend (có thể lọc theo city)
   */
  getAll: async (city?: string): Promise<Accommodation[]> => {
    try {
      const params = city ? `?city=${encodeURIComponent(city)}` : '';
      const response = await axiosClient.get<any, any>(`${ENDPOINTS.HOTELS.LIST}${params}`);
      const hotels = response?.data || [];
      return hotels.map(transformHotel);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      return [];
    }
  },

  /**
   * Lấy chi tiết khách sạn theo hotelId (cần checkIn/checkOut)
   */
  getById: async (hotelId: string, checkIn?: string, checkOut?: string): Promise<any | null> => {
    try {
      let url = ENDPOINTS.HOTELS.DETAIL(hotelId);
      if (checkIn && checkOut) {
        url += `?checkIn=${checkIn}&checkOut=${checkOut}`;
      }
      const response = await axiosClient.get<any, any>(url);
      const hotelData = response?.data ?? null;
      return hotelData ? transformHotel(hotelData) : null;
    } catch (error) {
      console.error(`Error fetching hotel ${hotelId}:`, error);
      return null;
    }
  },

  /**
   * Lấy danh sách reviews cho khách sạn
   * TODO: Backend chưa có endpoint riêng cho list reviews — sử dụng topReviews từ getById
   */
  getReviews: async (hotelId: string): Promise<AccommodationReview[]> => {
    try {
      const hotel = await accommodationService.getById(hotelId);
      if (!hotel || !hotel.topReviews) return [];
      
      return hotel.topReviews.map((r: any) => ({
        id: r._id || r.id,
        hotelId: hotelId,
        userName: r.userName || 'Khách ẩn danh',
        userAvatar: r.userAvatar || 'https://i.pravatar.cc/100',
        rating: r.rating || 5,
        comment: r.comment || '',
        images: r.images || [],
        createdAt: r.createdAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  },

  /**
   * Gửi review mới (gọi POST /api/hotels/review)
   */
  submitReview: async (
    hotelId: string,
    review: { rating: number; comment: string; images?: string[] },
  ): Promise<boolean> => {
    try {
      const response = await axiosClient.post<any, any>(ENDPOINTS.HOTELS.REVIEW, {
        targetId: hotelId,
        rating: review.rating,
        comment: review.comment,
        criteria: {
          cleanliness: review.rating,
          service: review.rating,
          facilities: review.rating,
        },
      });
      return response?.success ?? false;
    } catch (error) {
      console.error('Error submitting review:', error);
      return false;
    }
  },

  /**
   * Lấy đánh giá của tôi cho khách sạn
   */
  getMyReview: async (hotelId: string): Promise<any | null> => {
    try {
      const response = await axiosClient.get<any, any>(`${ENDPOINTS.HOTELS.LIST}/${hotelId}/my-review`);
      return response?.data ?? null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Xóa đánh giá của tôi
   */
  deleteReview: async (hotelId: string): Promise<boolean> => {
    try {
      const response = await axiosClient.delete<any, any>(`${ENDPOINTS.HOTELS.LIST}/${hotelId}/review`);
      return response?.success ?? false;
    } catch (error) {
      console.error('Error deleting review:', error);
      return false;
    }
  },
};
