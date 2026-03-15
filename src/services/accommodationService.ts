import axios from 'axios';

// MockAPI URL
const MOCK_API_URL = 'https://6877a0dedba809d901f03ef1.mockapi.io/SE183675';

export interface RoomType {
  id: number;
  name: string;
  price: number;
  capacity: number;
}

export interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  country: string;
  city: string;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  currency: number;
  images: string;
  latitude: string;
  longitude: string;
  isAvailable: boolean;
  amenities: string[];
  star: number;
  category: string;
  distanceCenter: number;
  phone: string;
  email: string;
  website: string;
  checkIn: string;
  checkOut: string;
  roomTypes: RoomType[];
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

export const accommodationService = {
  /**
   * Lấy danh sách tất cả accommodations từ MockAPI
   */
  getAll: async (): Promise<Accommodation[]> => {
    try {
      const response = await axios.get<Accommodation[]>(MOCK_API_URL);
      return response.data ?? [];
    } catch (error) {
      console.error('Error fetching accommodations:', error);
      return [];
    }
  },

  /**
   * Lấy accommodation by ID
   */
  getById: async (id: string): Promise<Accommodation | null> => {
    try {
      const response = await axios.get<Accommodation>(
        `${MOCK_API_URL}/${id}`
      );
      return response.data ?? null;
    } catch (error) {
      console.error(`Error fetching accommodation ${id}:`, error);
      return null;
    }
  },

  /**
   * Lấy danh sách reviews cho khách sạn
   */
  getReviews: async (hotelId: string): Promise<AccommodationReview[]> => {
    try {
      // TODO: Replace with real API when available
      // const response = await axios.get(`${MOCK_API_URL}/${hotelId}/reviews`);
      // return response.data ?? [];

      // Mock reviews for now
      return MOCK_REVIEWS.filter((r) => r.hotelId === hotelId || true);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  },

  /**
   * Gửi review mới
   */
  submitReview: async (
    hotelId: string,
    review: { rating: number; comment: string; images?: string[] }
  ): Promise<boolean> => {
    try {
      // TODO: Replace with real API when available
      // await axios.post(`${MOCK_API_URL}/${hotelId}/reviews`, review);
      console.log('📝 Review submitted:', { hotelId, ...review });
      return true;
    } catch (error) {
      console.error('Error submitting review:', error);
      return false;
    }
  },
};

// ===== Mock Reviews Data =====
const MOCK_REVIEWS: AccommodationReview[] = [
  {
    id: '1',
    hotelId: '1',
    userName: 'Nguyễn Minh Anh',
    userAvatar: 'https://i.pravatar.cc/100?img=1',
    rating: 5,
    comment:
      'Khách sạn tuyệt vời! View hồ Tây đẹp lung linh, nhân viên thân thiện, đồ ăn sáng buffet rất phong phú. Chắc chắn sẽ quay lại.',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400',
    ],
    createdAt: '2026-03-10T08:30:00Z',
  },
  {
    id: '2',
    hotelId: '1',
    userName: 'Trần Đức Huy',
    userAvatar: 'https://i.pravatar.cc/100?img=3',
    rating: 4,
    comment:
      'Phòng rộng rãi, sạch sẽ. Hồ bơi đẹp. Chỉ hơi xa trung tâm một chút nhưng có shuttle bus nên cũng tiện.',
    createdAt: '2026-03-05T14:20:00Z',
  },
  {
    id: '3',
    hotelId: '1',
    userName: 'Lê Thị Hương',
    userAvatar: 'https://i.pravatar.cc/100?img=5',
    rating: 5,
    comment:
      'Spa tuyệt vời, massage rất chuyên nghiệp. Phòng Suite view hồ đáng đồng tiền bát gạo!',
    images: [
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400',
    ],
    createdAt: '2026-02-28T10:15:00Z',
  },
];
