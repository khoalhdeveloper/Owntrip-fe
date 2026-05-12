import axiosClient from './axiosClient';

export interface Decoration {
  id: string;
  name: string;
  coins: number;
  image: string;
  type?: string;
  emoji?: string;
}

export const decorationsService = {
  getList: async (): Promise<Decoration[]> => {
    try {
      // Replace with real API endpoint when available
      // const res = await axiosClient.get('/api/decorations');
      // return res.data;
      
      return []; // Removed fake data
    } catch (e) {
      console.warn('decorationsService.getList error:', e);
      return [];
    }
  },
};
