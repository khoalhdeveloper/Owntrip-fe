const MOCK_API_DECORATIONS = 'https://69b52752be587338e7152945.mockapi.io/decorations';

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
  const hasPrice = typeof price === 'number' && !Number.isNaN(price)
    || (typeof price === 'string' && !Number.isNaN(Number(price)));
  return hasName && hasPrice;
}

export const decorationsService = {
  getList: async (): Promise<Decoration[]> => {
    try {
      const res = await fetch(MOCK_API_DECORATIONS);
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      return list.filter(isValidDecoration).map((item: Record<string, unknown>, index: number) => ({
        id: String(item.id ?? `dec-${index}`),
        name: String(item.name).trim() || 'Decoration',
        coins: Number(item.priceCoins ?? item.coins ?? item.amount ?? 0) || 0,
        image: String(item.image ?? '').trim() || '',
        type: typeof item.type === 'string' ? item.type : undefined,
        emoji: typeof item.emoji === 'string' ? item.emoji : undefined,
      }));
    } catch (e) {
      console.warn('decorationsService.getList error:', e);
      return [];
    }
  },
};
