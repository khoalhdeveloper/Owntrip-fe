export const BRAND = '#4A7CFF';

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
  '9:15 AM', '10:45 AM', '12:30 PM', '2:00 PM',
  '3:30 PM', '5:00 PM', '6:30 PM', '8:00 PM',
];

export const MOCK_PLACES: { name: string; lat: number; lng: number; photo: string }[] = [
  { name: 'Ancient Town Market', lat: 15.8794, lng: 108.3350, photo: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=200' },
  { name: 'Japanese Covered Bridge', lat: 15.8775, lng: 108.3263, photo: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200' },
  { name: 'Lantern Street', lat: 15.8780, lng: 108.3280, photo: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=200' },
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
}
