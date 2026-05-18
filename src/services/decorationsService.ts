import axiosClient from './axiosClient';

export interface Decoration {
  id: string;
  name: string;
  coins: number;
  image: string;
  type?: string;
  emoji?: string;
}

function isValidDecoration(item: unknown): item is Record<string, unknown> {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  const hasName = typeof o.name === 'string';
  const price = o.priceCoins ?? o.coins ?? o.amount;
  const hasPrice =
    (typeof price === 'number' && !Number.isNaN(price)) ||
    (typeof price === 'string' && !Number.isNaN(Number(price)));
  return hasName && hasPrice;
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
