import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface ChatbotResponse {
  success: boolean;
  reply: string;
}

export const chatbotService = {
  sendMessage: async (message: string): Promise<string> => {
    try {
      const response = await axiosClient.post<any, ChatbotResponse>(ENDPOINTS.CHATBOT.CHAT, {
        message,
      });
      if (response && response.success) {
        return response.reply;
      }
      return "Xin lỗi, tôi không thể trả lời lúc này.";
    } catch (error) {
      console.error('Error in chatbot:', error);
      return "Xin lỗi, có lỗi xảy ra kết nối với máy chủ.";
    }
  },
};
