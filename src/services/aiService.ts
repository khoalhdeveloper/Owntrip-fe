import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface AIReorderResult {
  orderedPlaceIds: string[];
  replyMessage: string;
  summary?: string;
  changes?: string[];
}

export interface AIItineraryScoreResult {
  score: number;
  level: 'good' | 'warning' | 'too_busy';
  summary: string;
  warnings: string[];
  suggestions: string[];
  dayReviews: {
    day: number;
    score: number;
    warnings: string[];
    suggestions: string[];
  }[];
}

export const aiService = {
  /**
   * Gọi Backend API để tự động sắp xếp lại lịch trình dựa trên yêu cầu của người dùng.
   * @param userInput Lời thoại / yêu cầu của người dùng (VD: "Trời hôm nay mưa", "Cho tôi đi Dinh Độc Lập trước")
   * @param currentPlaces Danh sách các địa điểm hiện tại trong ngày
   * @returns Mảng các _id của địa điểm đã được sắp xếp mới và một câu trả lời thân thiện
   */
  rearrangeItineraryWithAI: async (userInput: string, currentPlaces: any[]): Promise<AIReorderResult | null> => {
    try {
      console.log("Goi BE API de sap xep lich trinh...");
      
      const response = await axiosClient.post<any, any>(ENDPOINTS.AI.REARRANGE, {
        userInput,
        currentPlaces
      });
      
      if (response && response.orderedPlaceIds) {
        return {
          orderedPlaceIds: response.orderedPlaceIds,
          summary: response.summary,
          changes: response.changes,
          replyMessage: response.replyMessage || "Đã sắp xếp xong!"
        };
      }
      return null;
    } catch (error: any) {
      console.error("Lỗi khi gọi BE AI Rearrange:", error);
      console.warn("⚠️ Gọi BE thất bại, dùng dữ liệu giả lập (Mock).");
      // Fake logic: Just reverse the order as a demonstration
      return {
        orderedPlaceIds: currentPlaces.map(p => p.place._id).reverse(),
        summary: 'AI đề xuất đổi thứ tự các điểm trong ngày.',
        replyMessage: "Dạ, vì mạng đang lỗi kết nối tới Server, em xin phép đổi ngược danh sách tạm thời ạ!"
      };
    }
  },

  /**
   * Gọi Backend API để tự động sinh lịch trình dựa trên các địa điểm gợi ý
   * @param days Số ngày của chuyến đi
   * @param availablePlaces Danh sách địa điểm gợi ý lấy từ API searchText
   * @returns Mảng JSON map dayId với danh sách placeId tương ứng
   */
  autoGenerateTripItinerary: async (days: any[], availablePlaces: any[]) => {
    try {
      console.log("Goi BE API de auto generate lich trinh...");
      
      const response = await axiosClient.post<any, any>(ENDPOINTS.AI.AUTO_GENERATE, {
        days,
        availablePlaces
      });

      if (response && response.itinerary) {
        return {
          itinerary: response.itinerary,
          replyMessage: response.replyMessage || "Lên lịch trình thành công!"
        };
      }
      return null;
    } catch (error: any) {
      console.error("Lỗi khi gọi BE Auto Generate AI:", error);
      console.warn("⚠️ Mạng bị nghẽn. Dùng Fallback (Mock) cho Auto Generate.");
      
      // MOCK FALLBACK: Tự động chia 3 địa điểm / ngày từ danh sách
      const fallbackItinerary = days.map((day, index) => {
        const startIdx = index * 3;
        const placesForDay = availablePlaces.slice(startIdx, startIdx + 3).map(p => p.placeId || p._id);
        return {
          dayId: day.dayId,
          placeIds: placesForDay
        };
      });
      
      return {
        itinerary: fallbackItinerary,
        replyMessage: "Dạ mạng hơi nghẽn nên em đã tự động nhặt ngẫu nhiên 3 địa điểm mỗi ngày cho lịch trình của mình ạ!"
      };
    }
  },

  scoreItinerary: async (trip: any, days: any[]): Promise<AIItineraryScoreResult | null> => {
    try {
      const response = await axiosClient.post<any, any>(ENDPOINTS.AI.ITINERARY_SCORE, {
        trip,
        days,
      });

      if (!response || typeof response.score !== 'number') return null;

      return {
        score: response.score,
        level: response.level || 'warning',
        summary: response.summary || '',
        warnings: Array.isArray(response.warnings) ? response.warnings : [],
        suggestions: Array.isArray(response.suggestions) ? response.suggestions : [],
        dayReviews: Array.isArray(response.dayReviews) ? response.dayReviews : [],
      };
    } catch (error: any) {
      console.error('Lỗi khi chấm điểm lịch trình bằng AI:', error);
      return null;
    }
  },
};
