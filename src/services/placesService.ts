import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface Place {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  totalReviews?: number;
  types: string[];
  mapUrl: string;
  photo: string | null;
  photos: string[];
}

interface PlacesResponse {
  success: boolean;
  queryCount: number;
  total: number;
  places: Place[];
}

interface NearbyResponse {
  success: boolean;
  total: number;
  places: Place[];
}

interface SearchResponse {
  success: boolean;
  places: Place[];
}

export const placesService = {
  /**
   * Tìm kiếm địa điểm theo text (full search) - dùng cho Trending Now
   * GET /api/places/text?q=vui choi&q=phu quoc&limit=50&photoLimit=5
   */
  searchTrending: async (
    queries: string[] = ['núi bà đen', 'hồ tuyền lâm', 'bãi sau', 'chùa bửu long', 'khu du lịch']
  ): Promise<Place[]> => {
    try {
      const qs = queries
        .map((item) => `q=${encodeURIComponent(item)}`)
        .join('&');
      const url = `${ENDPOINTS.PLACES.TEXT_SEARCH}?${qs}`;

      console.log('🔵 Trending API URL:', url);
      const response = await axiosClient.get<any, PlacesResponse>(url);

      return response?.places ?? [];
    } catch {
      console.warn('⚠️ Trending API unavailable, using fallback data');
      // Fallback data
      return [
        {
          placeId: "mock_phuquoc",
          name: "Phú Quốc (Mock Data)",
          address: "Phú Quốc, Kiên Giang, Việt Nam",
          latitude: 10.289879,
          longitude: 103.98402,
          rating: 4.8,
          totalReviews: 6028,
          types: ["island", "natural_feature"],
          mapUrl: "https://maps.google.com/?cid=624445620472982747",
          photo: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=800",
          photos: [
            "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1596422846543-74c6e27a01d8?auto=format&fit=crop&q=80&w=800"
          ]
        },
        {
          placeId: "mock_nhatrang",
          name: "Nha Trang (Mock Data)",
          address: "Nha Trang, Khánh Hòa, Việt Nam",
          latitude: 12.238791,
          longitude: 109.196749,
          rating: 4.6,
          totalReviews: 4520,
          types: ["city", "point_of_interest"],
          mapUrl: "https://maps.google.com/?cid=12345",
          photo: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800",
          photos: [
            "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800"
          ]
        },
        {
          placeId: "mock_vungtau",
          name: "Vũng Tàu (Mock Data)",
          address: "Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam",
          latitude: 10.34599,
          longitude: 107.08426,
          rating: 4.5,
          totalReviews: 8320,
          types: ["city", "point_of_interest"],
          mapUrl: "https://maps.google.com/?cid=123456",
          photo: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800",
          photos: [
            "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800"
          ]
        }
      ];
    }
  },

  /**
   * Tìm kiếm địa điểm theo từ khóa (autocomplete)
   * GET /api/places/search?q=cafe dalat
   */
  search: async (query: string): Promise<Place[]> => {
    const response = await axiosClient.get<any, SearchResponse>(
      ENDPOINTS.PLACES.SEARCH,
      { params: { q: query } }
    );
    return response?.places ?? [];
  },

  /**
   * Tìm kiếm địa điểm gần vị trí
   * GET /api/places/nearby?lat=10.762622&lng=106.660172&radius=5000&type=lodging
   */
  searchNearby: async (params: {
    lat: number;
    lng: number;
    radius?: number;
    type?: string;
  }): Promise<Place[]> => {
    try {
      const response = await axiosClient.get<any, NearbyResponse>(
        ENDPOINTS.PLACES.NEARBY,
        { params }
      );
      return response?.places ?? [];
    } catch (error) {
      console.error('Error searching nearby places:', error);
      return [];
    }
  },

  /**
   * Tìm kiếm địa điểm theo text với location bias
   * GET /api/places/text?q=cafe&lat=11.94&lng=108.44&radius=5000
   */
  searchText: async (params: {
    q: string;
    lat?: number;
    lng?: number;
    radius?: number;
    type?: string;
    limit?: number;
    photoLimit?: number;
  }): Promise<Place[]> => {
    try {
      const response = await axiosClient.get<any, PlacesResponse>(
        ENDPOINTS.PLACES.TEXT_SEARCH,
        { params }
      );
      return response?.places ?? [];
    } catch (error) {
      console.error('Error searching text places:', error);
      return [];
    }
  },
};