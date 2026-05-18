export const BRAND = '#4A7CFF';

export const DAY_COLORS = [
  '#4A7CFF', // Day 1: Brand Blue
  '#F59E0B', // Day 2: Amber
  '#10B981', // Day 3: Emerald
  '#8B5CF6', // Day 4: Violet
  '#EC4899', // Day 5: Pink
  '#06B6D4', // Day 6: Cyan
  '#EF4444', // Day 7: Red
  '#14B8A6', // Day 8: Teal
  '#F97316', // Day 9: Orange
  '#6366F1', // Day 10: Indigo
];

export const getDayColor = (date: string, uniqueDates: string[]) => {
  if (!date || !uniqueDates) return DAY_COLORS[0];
  const index = uniqueDates.indexOf(date);
  if (index === -1) return DAY_COLORS[0];
  
  // Sủ dụng 10 màu gốc được thiết kế đẹp nhất cho 10 ngày đầu
  if (index < DAY_COLORS.length) {
    return DAY_COLORS[index];
  }
  
  // Nếu nhiều hơn 10 ngày, tự động sinh ra dải màu vô hạn không trùng lặp dựa trên góc Vàng (Golden Angle - 137.5 độ)
  const hue = (index * 137.5) % 360;
  return `hsl(${hue}, 75%, 55%)`;
};

/* ─── Mock data ─── */
export const MOCK_MEMORIES = [
  'Amazing atmosphere early in the morning. Got some beautiful silk lanterns!',
  'Iconic bridge — less crowded before noon.',
  'Absolutely magical at sunset. Must come back!',
  'Great local food, very affordable prices.',
  'The architecture here is stunning, worth every minute.',
  'Perfect spot for photos. Highly recommend!',
  'Hidden gem — not many tourists know about this place.',
  'Beautiful garden and peaceful atmosphere.',
];

export const MOCK_TIMES = [
  '9:15 AM',
  '10:45 AM',
  '12:30 PM',
  '2:00 PM',
  '3:30 PM',
  '5:00 PM',
  '6:30 PM',
  '8:00 PM',
];

export const MOCK_PLACES: { name: string; lat: number; lng: number; photo: string }[] = [
  {
    name: 'Ancient Town Market',
    lat: 15.8794,
    lng: 108.335,
    photo: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=200',
  },
  {
    name: 'Japanese Covered Bridge',
    lat: 15.8775,
    lng: 108.3263,
    photo: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200',
  },
  {
    name: 'Lantern Street',
    lat: 15.878,
    lng: 108.328,
    photo: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=200',
  },
];

export interface TimelineEntry {
  id: string;
  name: string;
  photo?: string;
  latitude: number;
  longitude: number;
  dayDate: string;
  mockTime: string;
  mockMemory: string;
  rating?: number;
  totalReviews?: number;
  address?: string;
  types?: string[];
}
