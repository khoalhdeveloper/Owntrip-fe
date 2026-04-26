import axios from 'axios';
import { API_CONFIG } from '../constants/api';

const axiosClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự gắn token vào header
axiosClient.interceptors.request.use(
  async (config) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Tự lấy .data, bắt lỗi chung
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 429) {
        // API quota hết — chỉ warn, không error đỏ
        console.warn(`⚠️ API quota exceeded [429]:`, data?.message || 'Rate limited');
      } else if (status === 401 || status === 403) {
        console.warn('🔒 Token hết hạn hoặc bị từ chối! Đang xóa token...');
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.removeItem('token');
        } catch (e) {
          console.error('Error clearing token:', e);
        }
      } else {
        console.error(`API Error [${status}]:`, data);
      }
    } else if (error.request) {
      console.error('Lỗi mạng: Không nhận được phản hồi từ server');
    } else {
      console.error('Lỗi cấu hình:', error.message);
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
