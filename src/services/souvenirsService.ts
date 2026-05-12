import axiosClient from './axiosClient';

export interface Souvenir {
  id: string;
  name: string;
  description: string;
  amount: number;
  type: string;
  image: string;
}

export const souvenirsService = {
  getList: async (): Promise<Souvenir[]> => {
    try {
      // Replace with real API endpoint
      // const res = await axiosClient.get('/api/souvenirs');
      // return res.data;
      
      return []; // Removed fake data
    } catch (e) {
      console.warn('souvenirsService.getList error:', e);
      return [];
    }
  },
};
