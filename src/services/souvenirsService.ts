const MOCK_API_SOUVENIRS = 'https://69b52752be587338e7152945.mockapi.io/souvenirs';

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
      const res = await fetch(MOCK_API_SOUVENIRS);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('souvenirsService.getList error:', e);
      return [];
    }
  },
};
