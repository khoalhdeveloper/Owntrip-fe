import { ENDPOINTS } from '../constants/api';
import axiosClient from './axiosClient';

export const authService = {
  login: async (email: string, password: string) => {
    return await axiosClient.post(ENDPOINTS.AUTH.LOGIN, { email, password });
  },

  register: async (email: string, password: string, displayName: string) => {
    return await axiosClient.post(ENDPOINTS.AUTH.REGISTER, { email, password, displayName });
  },

  googleLogin: async (idToken: string) => {
    return await axiosClient.post(ENDPOINTS.AUTH.GOOGLE_LOGIN, { idToken });
  },
};
